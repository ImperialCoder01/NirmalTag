"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { 
  Layers, Plus, RefreshCw, CheckCircle2, AlertTriangle, Search, QrCode, 
  Download, ShieldAlert, Ban, Check, AlertCircle, FileSpreadsheet
} from "lucide-react";

export default function TagOfficerPage() {
  const { role, setRole } = useAuth();

  // Form State
  const [batchCount, setBatchCount] = useState<number>(1000);
  const [wasteCategory, setWasteCategory] = useState<string>("SANITARY");
  const [targetWard, setTargetWard] = useState<string>("Ward 42 (Rohini)");

  const [createdBatches, setCreatedBatches] = useState([
    { id: "BATCH-2026-001", count: 5000, category: "SANITARY", ward: "Ward 42", status: "DISTRIBUTED", date: "2026-10-01", assigned: 4800 },
    { id: "BATCH-2026-002", count: 2500, category: "DIAPER", ward: "Ward 42", status: "DISTRIBUTED", date: "2026-10-02", assigned: 2100 },
    { id: "BATCH-2026-003", count: 1000, category: "SMALL_MEDICAL", ward: "Ward 41", status: "IN_INVENTORY", date: "2026-10-03", assigned: 350 },
  ]);

  const [generatedQRs, setGeneratedQRs] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Tag Search & Modifier state
  const [searchedTagCode, setSearchedTagCode] = useState("");
  const [tagDetails, setTagDetails] = useState<{
    code: string;
    category: string;
    status: "ACTIVE" | "CLOSED" | "SUSPENDED" | "INVALIDATED";
    assignedHousehold: string;
    createdAt: string;
  } | null>(null);

  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      // Call API
      const res = await fetch("/api/v1/tag-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_count: batchCount,
          category: wasteCategory,
        }),
      });
      const data = await res.json();

      const newBatchId = data.batch_id || `BATCH-2026-${(createdBatches.length + 1).toString().padStart(3, "0")}`;
      const sampleCodes: string[] = data.sample_tags || Array.from({ length: 5 }, (_, i) => 
        `NMT-2026-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${(i + 1).toString().padStart(6, "0")}`
      );

      setCreatedBatches([
        {
          id: newBatchId,
          count: batchCount,
          category: wasteCategory,
          ward: targetWard.split(" ")[0] + " " + targetWard.split(" ")[1],
          status: "IN_INVENTORY",
          date: new Date().toISOString().split("T")[0],
          assigned: 0,
        },
        ...createdBatches,
      ]);

      setGeneratedQRs(sampleCodes);
      showNotification(`Batch ${newBatchId} created with ${batchCount} tags!`);
    } catch (err) {
      showNotification("Batch generated locally.", "success");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSearchTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchedTagCode.trim()) return;

    // Simulate search lookup
    const code = searchedTagCode.trim().toUpperCase();
    setTagDetails({
      code: code,
      category: "SANITARY",
      status: code.endsWith("490") ? "CLOSED" : "ACTIVE",
      assignedHousehold: "Flat 402, Block B, Rohini Sec 7",
      createdAt: "2026-10-01",
    });
  };

  const handleUpdateTagStatus = (newStatus: "SUSPENDED" | "INVALIDATED" | "ACTIVE") => {
    if (!tagDetails) return;
    if (tagDetails.status === "CLOSED") {
      showNotification("CLOSED tags are single-use invariants and can NEVER be reactivated or modified.", "error");
      return;
    }

    setTagDetails({ ...tagDetails, status: newStatus });
    showNotification(`Tag ${tagDetails.code} status updated to ${newStatus}.`);
  };

  const exportCSV = () => {
    if (generatedQRs.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," + ["Tag Serial Number,Category,Status", ...generatedQRs.map(c => `${c},${wasteCategory},IN_INVENTORY`)].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `NirmalTag_Batch_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Tag batch exported to CSV successfully.");
  };

  const filteredBatches = createdBatches.filter(b => 
    b.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Role Banner / Guard Check */}
      {role !== "TAG_OFFICER" && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span className="text-xs font-semibold">
              Your active role is set as <strong>{role.replace("_", " ")}</strong>. You are previewing the Tag Officer Portal.
            </span>
          </div>
          <button
            onClick={() => setRole("TAG_OFFICER")}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex-shrink-0"
          >
            Switch to Tag Officer Portal
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-xl text-xs font-bold shadow-lg ${
          notification.type === "success" ? "bg-emerald-900 text-white" : "bg-red-900 text-white"
        }`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tag Officer Inventory & Batch Management</h1>
            <p className="text-xs text-slate-500">Authoritative batch tag creation, inventory reconciliation, distribution, and status override.</p>
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
        {/* Create Batch Form & Export */}
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
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              >
                <option value={100}>100 Tags</option>
                <option value={1000}>1,000 Tags</option>
                <option value={5000}>5,000 Tags</option>
                <option value={10000}>10,000 Tags</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Waste Category</label>
              <select
                value={wasteCategory}
                onChange={(e) => setWasteCategory(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="SANITARY">Sanitary Waste</option>
                <option value="DIAPER">Child & Adult Diapers</option>
                <option value="INCONTINENCE">Incontinence Care</option>
                <option value="SMALL_MEDICAL">Small Household Medical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Ward Allocation</label>
              <select
                value={targetWard}
                onChange={(e) => setTargetWard(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Ward 42 (Rohini)">Ward 42 (Rohini)</option>
                <option value="Ward 41 (Pitampura)">Ward 41 (Pitampura)</option>
                <option value="Ward 43 (Shalimar Bagh)">Ward 43 (Shalimar Bagh)</option>
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

          {/* Generated QR Codes Preview */}
          {generatedQRs.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Batch Preview Sample:</span>
                <button
                  onClick={exportCSV}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {generatedQRs.map((code, idx) => (
                  <div key={idx} className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-mono">
                    <span className="text-emerald-800 font-semibold">{code}</span>
                    <QrCode className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Existing Batches Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* TAG LIFECYCLE SEARCH & OVERRIDE CARD */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-600" />
              <span>Tag Code Lookup & Invariant Override</span>
            </h2>

            <form onSubmit={handleSearchTag} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter tag code (e.g. NMT-2026-89A4B-000492)"
                value={searchedTagCode}
                onChange={(e) => setSearchedTagCode(e.target.value)}
                className="flex-1 text-xs p-2.5 rounded-xl border border-slate-300 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Lookup Tag
              </button>
            </form>

            {tagDetails && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-900">{tagDetails.code}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    tagDetails.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" :
                    tagDetails.status === "CLOSED" ? "bg-slate-900 text-white" : "bg-red-100 text-red-800"
                  }`}>
                    Status: {tagDetails.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600">Assigned: {tagDetails.assignedHousehold}</div>

                {tagDetails.status === "CLOSED" ? (
                  <div className="p-2.5 bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold flex items-center gap-2">
                    <Ban className="w-4 h-4 text-slate-600" />
                    <span>Single-Use Invariant: CLOSED tags are immutable and cannot be altered.</span>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleUpdateTagStatus("SUSPENDED")}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg"
                    >
                      Suspend Tag
                    </button>
                    <button
                      onClick={() => handleUpdateTagStatus("INVALIDATED")}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg"
                    >
                      Invalidate Tag
                    </button>
                    {tagDetails.status !== "ACTIVE" && (
                      <button
                        onClick={() => handleUpdateTagStatus("ACTIVE")}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* REGISTERED BATCHES TABLE */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Registered Tag Batches</h2>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter batch ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                    <th className="px-4 py-3">Ward Scope</th>
                    <th className="px-4 py-3">Total Qty</th>
                    <th className="px-4 py-3">Assigned</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredBatches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-emerald-800">{b.id}</td>
                      <td className="px-4 py-3">{b.category}</td>
                      <td className="px-4 py-3 text-slate-500">{b.ward}</td>
                      <td className="px-4 py-3 font-semibold">{b.count.toLocaleString()}</td>
                      <td className="px-4 py-3">{b.assigned.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === "DISTRIBUTED" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                        }`}>
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
    </div>
  );
}
