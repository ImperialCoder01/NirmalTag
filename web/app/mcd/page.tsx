"use client";

import Image from "next/image";
import { Building2, TrendingUp, ShieldCheck, AlertCircle, BarChart3, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function MCDDashboardPage() {
  const wardComplianceData = [
    { ward: "Ward 41", pickups: 4200, verified: 3950, rate: "94%" },
    { ward: "Ward 42", pickups: 5800, verified: 5600, rate: "96%" },
    { ward: "Ward 43", pickups: 3100, verified: 2850, rate: "92%" },
    { ward: "Ward 44", pickups: 4900, verified: 4500, rate: "91%" },
    { ward: "Ward 45", pickups: 6200, verified: 6050, rate: "97%" },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Executive Command Header */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-500 flex-shrink-0">
            <Image src="/logo.jpg" alt="Logo" width={56} height={56} className="object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">MCD Municipal Executive Command</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950 uppercase">
                Zone: North Delhi
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Real-Time Civic Compliance & Special-Care Waste Aggregated Telemetry</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
            <span className="block text-slate-400 text-[10px]">Active Ward Coverage</span>
            <strong className="text-slate-100 text-sm">12 Wards</strong>
          </div>
          <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
            <span className="block text-slate-400 text-[10px]">Monthly Segregation Rate</span>
            <strong className="text-emerald-400 text-sm">95.4%</strong>
          </div>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Verified Pickups</span>
          <div className="text-3xl font-extrabold text-slate-900">24,250</div>
          <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1 pt-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+12.4% vs last month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Household Pouches</span>
          <div className="text-3xl font-extrabold text-slate-900">18,900</div>
          <div className="text-xs text-slate-500 pt-1">Single-use tags active in field</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Verification Precision</span>
          <div className="text-3xl font-extrabold text-emerald-700">98.2%</div>
          <div className="text-xs text-slate-500 pt-1">MobileNetV3 on-device model</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Disputes & Review Queue</span>
          <div className="text-3xl font-extrabold text-amber-600">14</div>
          <div className="text-xs text-slate-500 pt-1">Low-confidence items for officer review</div>
        </div>
      </div>

      {/* Ward Volume Bar Chart & Breakdown Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span>Ward-Wise Sanitary Waste Collection Volume</span>
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wardComplianceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="ward" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="verified" fill="#0D5C3A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Ward Compliance Summary</h2>
          <div className="space-y-3">
            {wardComplianceData.map((w, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{w.ward}</div>
                  <div className="text-slate-500">{w.verified.toLocaleString()} verified pickups</div>
                </div>
                <span className="px-2.5 py-1 rounded-full font-extrabold bg-emerald-100 text-emerald-800">
                  {w.rate} Compliance
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
