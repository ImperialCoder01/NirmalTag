"use client";

import { useState } from "react";
import Image from "next/image";
import { Layers, Plus, RefreshCw, CheckCircle2, AlertTriangle, Search, QrCode } from "lucide-react";

export default function TagOfficerPage() {
  const [batchCount, setBatchCount] = useState<number>(1000);
  const [wasteCategory, setWasteCategory] = useState<string>("SANITARY");
  const [createdBatches, setCreatedBatches] = useState([
    { id: "BATCH-2026-001", count: 5000, category: "SANITARY", status: "ACTIVE", date: "2026-10-01", received: 5000, assigned: 4800 },
    { id: "BATCH-2026-002", count: 2500, category: "DIAPER", status: "ACTIVE", date: "2026-10-02", received: 2500, assigned: 2100 },
    { id: "BATCH-2026-003", count: 1000, category: "SMALL_MEDICAL", status: "IN_INVENTORY", date: "2026-10-03", received: 1000, assigned: 350 },
  ]);

  const [generatedQRs, setGeneratedQRs] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    setTimeout(() => {
      const newBatchId = `BATCH-2026-${(createdBatches.length + 1).toString().padStart(3, "0")}`;
      const sampleCodes = Array.from({ length: 5 }, (_, i) => `NMT-2026-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${(i + 1).toString().padStart(6, "0")}`);
      
      setCreatedBatches([
        { id: newBatchId, count: batchCount, category: wasteCategory, status: "IN_INVENTORY", date: new Date().toISOString().split("T")[0], received: batchCount, assigned: 0 },
        ...createdBatches
      ]);
      setGeneratedQRs(sampleCodes);
      setIsGenerating(false);
    }, 800);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tag Officer Inventory & Batch Management</h1>
            <p className="text-xs text-slate-500">Authorized batch tag creation, inventory reconciliation, distribution, and invalidation hub.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
            Scope: MCD Ward 42 (Rohini)
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Batch Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" />
            <span>Create Mass Tag Batch</span>
          </h2>

          <form onSubmit={handleCreateBatch} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Size (Quantity)</label>
              <select
                value={batchCount}
                onChange={(e) => setBatchCount(Number(e.target.value))}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              >
                <option value={100}>100 Tags</option>
                <option value={1000}>1,000 Tags</option>
                <option value={5000}>5,000 Tags</option>
                <option value={10000}>10,000 Tags</option>
                <option value={100000}>100,000 Tags (Background Job)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Waste Category</label>
              <select
                value={wasteCategory}
                onChange={(e) => setWasteCategory(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="SANITARY">Sanitary Waste</option>
                <option value="DIAPER">Child & Adult Diapers</option>
                <option value="INCONTINENCE">Incontinence Care</option>
                <option value="SMALL_MEDICAL">Small Household Medical</option>
                <option value="SPECIAL_CARE">Special Care Waste</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Generate Authorized Batch</span>
            </button>
          </form>

          {/* Sample Generated QR Codes Preview */}
          {generatedQRs.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-800">Generated QR Identifiers Sample:</span>
              <div className="space-y-2">
                {generatedQRs.map((code, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-mono">
                    <span className="text-emerald-800 font-semibold">{code}</span>
                    <QrCode className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Existing Batches Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Registered Tag Batches</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search batch number..."
                className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 w-48"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Batch ID</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Total Qty</th>
                  <th className="px-4 py-3">Assigned</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {createdBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-emerald-800">{b.id}</td>
                    <td className="px-4 py-3">{b.category}</td>
                    <td className="px-4 py-3 font-semibold">{b.count.toLocaleString()}</td>
                    <td className="px-4 py-3">{b.assigned.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{b.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
