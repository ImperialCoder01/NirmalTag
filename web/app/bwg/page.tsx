"use client";

import Image from "next/image";
import { Building, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";

export default function BWGPage() {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bulk Waste Generator (BWG) Portal</h1>
            <p className="text-xs text-slate-500">Commercial & Institutional Special-Care Waste Management</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Daily Special Waste Volume</span>
          <div className="text-3xl font-extrabold text-slate-900">120 kg</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Verified Authorized Batches</span>
          <div className="text-3xl font-extrabold text-emerald-700">48 Tags</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">MCD Compliance Rating</span>
          <div className="text-3xl font-extrabold text-slate-900">Grade A</div>
        </div>
      </div>
    </div>
  );
}
