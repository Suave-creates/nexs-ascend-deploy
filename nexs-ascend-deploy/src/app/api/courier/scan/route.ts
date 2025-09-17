import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateForPartner, detectPartner } from '../validators';

// Request body:
// { partner: string, awb: string, personId?: string, deviceId?: string }
export async function POST(req: Request) {
  try {
    const { partner, awb, personId, deviceId } = await req.json() as {
      partner?: string;
      awb?: string;
      personId?: string;
      deviceId?: string;
    };

    if (!partner || !awb) {
      return NextResponse.json({ ok: false, error: 'partner and awb are required' }, { status: 400 });
    }

    const awbTrim = awb.trim().toUpperCase();

    // 1) Partner mismatch → BLOCK (do NOT write to DB)
    const detected = detectPartner(awbTrim);
    const partnerMismatch = !!detected && detected !== partner;
    if (partnerMismatch) {
      return NextResponse.json({
        ok: false,
        partnerMismatch: true,
        detectedPartner: detected,
        message: `Shipment belongs to ${detected}`,
      }, { status: 409 }); // 409 Conflict is apt for blocking UX
    }

    // 2) Validity for selected partner (invalids still stored for audit)
    const isValid = validateForPartner(partner as any, awbTrim);
    const invalidReason = isValid ? null : 'SYNTAX_MISMATCH';

    // 3) Duplicate semantics:
    // - Requirement: "No duplicate counts at all; if scanned duplicate give duplicate pop and store only the LAST value"
    // - We achieve this by: check existing → if exists, UPDATE (refresh scannedAt & fields) and tell UI it's duplicate.
    const existing = await prisma.courierHandover.findUnique({
      where: { partner_awb: { partner, awb: awbTrim } }, // @@unique([partner, awb])
      select: { id: true },
    });

    let duplicate = false;

    if (existing) {
      duplicate = true;
      // Update in-place (keep only the latest value + timestamp)
      await prisma.courierHandover.update({
        where: { partner_awb: { partner, awb: awbTrim } },
        data: {
          personId: personId || null,
          deviceId: deviceId || null,
          isValid,
          invalidReason,
          detectedPartner: detected || null,
          scannedAt: new Date(), // refresh to "now"
        },
      });
    } else {
      // Fresh insert
      await prisma.courierHandover.create({
        data: {
          partner,
          awb: awbTrim,
          personId: personId || null,
          deviceId: deviceId || null,
          isValid,
          invalidReason,
          detectedPartner: detected || null,
          // scannedAt defaults to now()
        },
      });
    }

    // 4) Return
    return NextResponse.json({
      ok: true,
      isValid,
      invalidReason,
      duplicate,              // UI will show duplicate popup if true
      partnerMismatch: false, // already blocked above if true
    });
  } catch (err: any) {
    console.error('courier/scan error:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
