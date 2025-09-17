import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

// GET /api/courier/stats?partner=Delcart
export async function GET(req: Request) {
  const url = new URL(req.url);
  const partner = url.searchParams.get('partner');
  if (!partner) return NextResponse.json({ error: 'partner required' }, { status: 400 });

  const [valid, invalid] = await Promise.all([
    prisma.courierHandover.count({ where: { partner, isValid: true } }),
    prisma.courierHandover.count({ where: { partner, isValid: false } }),
  ]);

  return NextResponse.json({
    valid,
    invalid,
    total: valid + invalid,
  });
}
