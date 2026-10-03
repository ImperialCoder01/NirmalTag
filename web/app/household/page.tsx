"use client";

import { useState } from "react";
import Image from "next/image";
import { Coins, QrCode, Clock, Gift, CheckCircle2, ArrowUpRight } from "lucide-react";

export default function HouseholdPage() {
  const [creditBalance, setCreditBalance] = useState<number>(140);
  const [assignedTags, setAssignedTags] = useState([
    { code: "NMT-2026-89A4B-000492", category: "Sanitary Waste", status: "ACTIVE", assignedDate: "2026-10-02" },
    { code: "NMT-2026-89A4B-000493", category: "Child & Adult Diapers", status: "ACTIVE", assignedDate: "2026-10-02" },
    { code: "NMT-2026-89A4B-000490", category: "Sanitary Waste", status: "CLOSED", assignedDate: "2026-09-28" },
  ]);

  const [pickupHistory, setPickupHistory] = useState([
    { id: "PKP-9021", date: "2026-09-28 09:15 AM", category: "Sanitary Waste", points: "+10 Pts", status: "VERIFIED" },
    { id: "PKP-8910", date: "2026-09-24 08:30 AM", category: "Diapers", points: "+12 Pts", status: "VERIFIED" },
    { id: "PKP-8540", date: "2026-09-20 10:00 AM", category: "Sanitary Waste", points: "+10 Pts", status: "VERIFIED" },
  ]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header & Balance Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-600 flex-shrink-0">
            <Image src="/logo.jpg" alt="Logo" width={64} height={64} className="object-cover" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Welcome, Household Resident</h1>
            <p className="text-xs text-slate-500">Rohini Sector 7, Block B, Flat 402 • Ward 42</p>
            <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Household Account</span>
            </div>
          </div>
        </div>

        <div className="brand-gradient text-white p-6 rounded-2xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Circular Credit Balance</span>
            <Coins className="w-6 h-6 text-emerald-300" />
          </div>
          <div className="py-2">
            <span className="text-4xl font-extrabold">{creditBalance}</span>
            <span className="text-sm font-semibold text-emerald-100 ml-2">Points</span>
          </div>
          <button className="w-full py-2 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5">
            <Gift className="w-4 h-4" />
            <span>Redeem Rewards Catalog</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Pouch Tags */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-600" />
            <span>My Assigned Pouch Tags</span>
          </h2>

          <div className="space-y-3">
            {assignedTags.map((t, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono font-bold text-emerald-900">{t.code}</div>
                  <div className="text-xs font-medium text-slate-600 mt-0.5">{t.category}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Assigned: {t.assignedDate}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  t.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                }`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pickup & Ledger History */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            <span>Pickup & Reward History</span>
          </h2>

          <div className="divide-y divide-slate-100">
            {pickupHistory.map((p, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">{p.category}</div>
                  <div className="text-[11px] text-slate-500">{p.date} • {p.id}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-emerald-700">{p.points}</span>
                  <span className="block text-[10px] text-emerald-600 font-semibold">{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
