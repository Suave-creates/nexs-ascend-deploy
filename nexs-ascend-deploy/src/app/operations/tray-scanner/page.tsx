'use client';

import { useState, useEffect } from 'react';

export default function TrayScannerPage() {
  const [trayId, setTrayId] = useState<string>('');
  const [lastScans, setLastScans] = useState<string[]>([]);
  const [fastTrack, setFastTrack] = useState<{ id: string; city: string }[]>([]);
  const [isMatch, setIsMatch] = useState<boolean>(false);
  const [matchedTray, setMatchedTray] = useState<string>('');

  const handleScan = async (id: string) => {
    setLastScans(prev => [id, ...prev.filter(item => item !== id)].slice(0, 10));
    setTrayId('');

    // Format check CT00000
    if (!/^CT\d{5}$/i.test(id)) {
      setIsMatch(false);
      return;
    }

    try {
      const res = await fetch(`/api/operations/metadata?locationId=${id}`);
      const data = await res.json();

      if (data.found) {
        setIsMatch(true);
        setMatchedTray(id);
        setFastTrack(prev => [{ id, city: data.cityOdd }, ...prev]);
      } else {
        setIsMatch(false);
      }
    } catch (err) {
      setIsMatch(false);
    }
  };

  useEffect(() => {
    if (isMatch) {
      const timer = setTimeout(() => {
        setIsMatch(false);
        setMatchedTray('');
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [isMatch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Auto-clear if more than 8 characters
    if (value.length > 8) {
      setTrayId('');
      return;
    }

    setTrayId(value);
    if (/^[A-Za-z]{2}\d{5}$/.test(value)) {
      void handleScan(value);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 relative">
      <h1 className="text-center text-3xl font-bold text-[#1f295c] mb-8">
        TRAY SCANNER
      </h1>

      <div className="max-w-xl mx-auto">
        <input
          type="text"
          placeholder="Enter Tray ID..."
          value={trayId}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#1f295c]"
        />
      </div>

      {isMatch && (
        <div className="fixed inset-0 bg-orange-500 text-white flex flex-col items-center justify-center z-50">
          <h2 className="text-5xl font-extrabold mb-4">Pick it up</h2>
          <p className="text-4xl tracking-wide">{matchedTray}</p>
        </div>
      )}

      <div className="max-w-4xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold mb-4 text-black">Last Ten Scans</h2>
          <ul className="list-disc list-inside text-black">
            {lastScans.length > 0 ? (
              lastScans.map((id, idx) => <li key={idx}>{id}</li>)
            ) : (
              <li>No scans yet</li>
            )}
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold mb-4 text-black">NDD Fast-Track</h2>
          {fastTrack.length > 0 ? (
            fastTrack.map((item, idx) => (
              <p key={idx} className="text-black">
                {item.id} – {item.city}
              </p>
            ))
          ) : (
            <p className="text-black">— Fast-track details will appear here —</p>
          )}
        </div>
      </div>
    </div>
  );
}
