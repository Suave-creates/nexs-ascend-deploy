// src/app/page.tsx

import Image from "next/image";

export default function DashboardPage() {
  return (
    <main
      className="min-h-screen w-full flex items-start justify-start"
      style={{
        backgroundImage: "url(/images/home-bg.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div
        className="bg-white bg-opacity-90 rounded-xl shadow-lg px-8 py-6 mt-[133px] ml-8"
      >
        <h1 className="text-3xl font-bold" style={{ color: '#1f295c' }}>
          Welcome to NexS Ascend by ARYA
        </h1>
      </div>
    </main>
  );
}
