"use client";

import Image from "next/image";
import { Building2, Users, CheckCircle2, TrendingUp, BarChart2 } from "lucide-react";

export default function RWAPage() {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Resident Welfare Association (RWA) Portal</h1>
            <p className="text-xs text-slate-500">Rohini Sector 7 RWA • Registration No: RWA-DL-2024-890</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Registered Colony Households</span>
          <div className="text-3xl font-extrabold text-slate-900">450</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Monthly Segregation Compliance</span>
          <div className="text-3xl font-extrabold text-emerald-700">96.8%</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Household Reward Credits</span>
          <div className="text-3xl font-extrabold text-slate-900">14,200 Pts</div>
        </div>
      </div>
    </div>
  );
}
