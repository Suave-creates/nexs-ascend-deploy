// src/app/courier-handover/page.tsx

'use client';

import { useEffect, useRef, useState } from 'react';

type Partner =
  | 'Purpledrone'
  | 'Delcart'
  | 'Blitz'
  | 'DOT'
  | 'Velocity'
  | 'Shadowfax'
  | 'XPressBees';

const PARTNERS: Partner[] = [
  'Purpledrone',
  'Delcart',
  'Blitz',
  'DOT',
  'Velocity',
  'Shadowfax',
  'XPressBees',
];

const RE: Record<Partner, RegExp> = {
  Purpledrone: /^PR[A-Za-z0-9]{11}$/i,
  Delcart: /^15\d{8}$/,
  Blitz: /^BK[A-Za-z0-9]{10}$/i,
  DOT: /^(?:\d{8}|NCR[A-Za-z0-9]{7})$/i,
  Velocity: /^LK[A-Za-z0-9]{9}$/i,
  Shadowfax: /^SF[A-Za-z0-9]{12}$/i,
  XPressBees: /^15\d{13}$/,
};

function validateForPartner(partner: Partner, awb: string) {
  return RE[partner].test((awb || '').trim());
}
function detectPartner(awb: string): Partner | null {
  const s = (awb || '').trim();
  for (const p of PARTNERS) if (RE[p].test(s)) return p;
  return null;
}

type Counters = { valid: number; invalid: number; total: number };

export default function CourierHandoverPage() {
  const [partner, setPartner] = useState<Partner>('XPressBees');
  const [personId, setPersonId] = useState('');
  const [awb, setAwb] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [errorSticky, setErrorSticky] = useState<string | null>(null);

  const [polled, setPolled] = useState<Counters>({ valid: 0, invalid: 0, total: 0 });
  const [baseline, setBaseline] = useState<Counters>({ valid: 0, invalid: 0, total: 0 });

  const [mismatchModal, setMismatchModal] = useState<{ show: boolean; awb: string; detected: Partner | null }>({
    show: false, awb: '', detected: null,
  });
  const [duplicateModal, setDuplicateModal] = useState<{ show: boolean; awb: string }>({ show: false, awb: '' });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => inputRef.current?.focus(), 700);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/courier/stats?partner=${encodeURIComponent(partner)}`, { cache: 'no-store' });
        if (!r.ok) return;
        const s = await r.json();
        if (!stop) setPolled({ valid: s.valid ?? 0, invalid: s.invalid ?? 0, total: s.total ?? 0 });
      } catch {}
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => { stop = true; clearInterval(iv); };
  }, [partner]);

  const visible: Counters = {
    valid: Math.max(0, polled.valid - baseline.valid),
    invalid: Math.max(0, polled.invalid - baseline.invalid),
    total: Math.max(0, polled.total - baseline.total),
  };

  const doResetVisibleCounters = () => setBaseline(polled);

  useEffect(() => {
    const awbTrim = awb.trim().toUpperCase();
    if (!awbTrim || !personId) return;

    const detected = detectPartner(awbTrim);
    if (detected && detected !== partner) {
      setMismatchModal({ show: true, awb: awbTrim, detected });
      return;
    }

    if (validateForPartner(partner, awbTrim)) {
      (async () => {
        try {
          const res = await fetch('/api/courier/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ partner, awb: awbTrim, personId }),
          });

          if (res.status === 409) {
            const j = await res.json();
            setMismatchModal({ show: true, awb: awbTrim, detected: j.detectedPartner ?? null });
            return;
          }

          const j = await res.json();

          if (!res.ok || !j.ok) {
            setErrorSticky(j.error || 'Server error');
            return;
          }

          if (j.duplicate) {
            setDuplicateModal({ show: true, awb: awbTrim });
          } else {
            setMsg(j.isValid ? '✔️ Recorded' : '⚠️ Syntax mismatch stored for audit');
            setTimeout(() => setMsg(null), 1200);
          }
        } catch (e: any) {
          setErrorSticky(e?.message || 'Network/Server error');
        } finally {
          setAwb('');
        }
      })();
    }
  }, [awb, partner, personId]);

  return (
    <div
      className="min-h-screen w-full px-4 py-6"
      style={{
        backgroundImage: "url('/images/manual-warehouse-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <h1 className="text-2xl font-bold mb-4" style={{ color: '#1f295c' }}>
          Courier Handover Counter
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-black">
          {/* Left: Form */}
          <div className="md:col-span-2 bg-white/95 rounded-2xl p-5 shadow text-gray-800">
            {msg && (
              <div className="mb-3 text-center rounded bg-gray-100 py-2 font-semibold text-black">
                {msg}
              </div>
            )}
            {errorSticky && (
              <div className="mb-3 text-center rounded bg-red-100 text-red-700 py-2 font-semibold flex items-center justify-between px-3">
                <span>❌ {errorSticky}</span>
                <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={() => setErrorSticky(null)}>
                  Dismiss
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="font-medium text-black">Courier Partner</span>
                <select
                  value={partner}
                  onChange={(e) => setPartner(e.target.value as Partner)}
                  className="mt-1 w-full border rounded p-2 text-gray-900"
                >
                  {PARTNERS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="font-medium text-black">Person ID (present)</span>
                <input
                  type="text"
                  value={personId}
                  onChange={(e) => setPersonId(e.target.value.toUpperCase())}
                  placeholder="e.g., ARYA01"
                  className="mt-1 w-full border rounded p-2 text-gray-900"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="font-medium text-black">AWB</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={awb}
                  onChange={(e) => setAwb(e.target.value.toUpperCase())}
                  placeholder="Scan here…"
                  className="mt-1 w-full border-2 border-gray-400 rounded-xl p-3 text-2xl tracking-widest text-black"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Auto-submits as soon as the AWB matches <b>{partner}</b> syntax.
                </p>
              </label>
            </div>
          </div>

          {/* Right: Stats */}
          <div className="bg-white/95 rounded-2xl p-6 shadow flex flex-col items-center justify-center text-gray-900">
            <div className="text-sm text-gray-600 mb-2">Live Counter</div>
            <div className="text-6xl font-extrabold text-black">{visible.total}</div>

            <div className="mt-4 grid grid-cols-3 gap-3 w-full text-center">
              <div className="p-3 rounded bg-green-50 text-black">
                <div className="text-xs text-gray-700">Valid</div>
                <div className="text-3xl font-bold">{visible.valid}</div>
              </div>
              <div className="p-3 rounded bg-yellow-50 text-black">
                <div className="text-xs text-gray-700">Invalid</div>
                <div className="text-3xl font-bold">{visible.invalid}</div>
              </div>
              <div className="p-3 rounded bg-gray-50 text-black">
                <div className="text-xs text-gray-700">Partner</div>
                <div className="text-sm font-semibold">{partner}</div>
              </div>
            </div>

            <button
              className="mt-5 px-4 py-2 rounded-xl bg-[#1f295c] text-white hover:opacity-90"
              onClick={doResetVisibleCounters}
            >
              Reset Counter
            </button>
          </div>
        </div>
      </div>

      {/* Modals remain unchanged */}
      {mismatchModal.show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-[92%] text-center shadow-2xl text-gray-900">
            <div className="text-2xl font-extrabold mb-3 text-[#1f295c]">🚨 Shipment Partner Mismatch</div>
            <div className="text-lg mb-1">AWB: <b>{mismatchModal.awb}</b></div>
            <div className="mb-6">
              This shipment belongs to <b>{mismatchModal.detected ?? 'Unknown'}</b>, not <b>{partner}</b>.
            </div>
            <div className="flex gap-3 justify-center">
              <button
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300"
                onClick={() => setMismatchModal({ show: false, awb: '', detected: null })}
              >
                OK
              </button>
              {mismatchModal.detected && (
                <button
                  className="px-4 py-2 rounded-xl bg-[#1f295c] text-white hover:opacity-90"
                  onClick={() => {
                    setPartner(mismatchModal.detected!);
                    setMismatchModal({ show: false, awb: '', detected: null });
                  }}
                >
                  Switch to {mismatchModal.detected}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {duplicateModal.show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-[92%] text-center shadow-2xl text-gray-900">
            <div className="text-2xl font-extrabold mb-3 text-[#1f295c]">⚠️ Duplicate Scan</div>
            <div className="text-lg mb-6">
              AWB <b>{duplicateModal.awb}</b> was already scanned.<br />
              Latest scan overwrote the previous record.
            </div>
            <button
              className="px-4 py-2 rounded-xl bg-[#1f295c] text-white hover:opacity-90"
              onClick={() => setDuplicateModal({ show: false, awb: '' })}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
