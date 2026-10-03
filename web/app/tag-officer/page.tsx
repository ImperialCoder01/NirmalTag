"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { 
  Layers, Plus, RefreshCw, Search, QrCode, 
  ShieldAlert, Ban, FileSpreadsheet, Lock
} from "lucide-react";

export default function TagOfficerPage() {
  const { user, role, getIdToken } = useAuth();

  // Form State
  const [batchCount, setBatchCount] = useState<number>(1000);
  const [wasteCategory, setWasteCategory] = useState<string>("SANITARY");
  const [targetWard, setTargetWard] = useState<string>("Ward 42 (Rohini)");

  const [createdBatches, setCreatedBatches] = useState<Array<{
    id: string;
    count: number;
    category: string;
    ward: string;
    status: string;
    date: string;
    assigned: number;
  }>>([]);

  const [generatedQRs, setGeneratedQRs] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Tag Search & Modifier state
  const [searchedTagCode, setSearchedTagCode] = useState("");
  const [tagDetails, setTagDetails] = useState<{
    id: string;
    code: string;
    category: string;
    status: string;
    assignedHousehold: string;
    createdAt: string;
  } | null>(null);

  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Fetch real registered batches from database
  const fetchBatches = async () => {
    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch("/api/v1/tag-batches", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.batches)) {
          const mapped = data.batches.map((b: any) => ({
            id: b.batch_name || b.batch_number || b.id,
            count: b.total_tags || b.total_quantity || 0,
            category: wasteCategory,
            ward: "Ward 42",
            status: "REGISTERED",
            date: b.created_at ? new Date(b.created_at).toISOString().split("T")[0] : "2026-10-04",
            assigned: 0,
          }));
          setCreatedBatches(mapped);
        }
      }
    } catch (err) {
      console.error("Failed to fetch batches:", err);
    }
  };

  useEffect(() => {
    if (user && (role === "TAG_OFFICER" || role === "SYSTEM_ADMIN")) {
      fetchBatches();
    }
  }, [user, role]);

  // STRICT ACCESS CONTROL GUARD
  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Authentication Required</h1>
          <p className="text-xs text-slate-500">
            Please sign in to your authorized account to access the Tag Officer Portal.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-md"
          >
            Sign In to Account
          </Link>
        </div>
      </div>
    );
  }

  if (role !== "TAG_OFFICER" && role !== "SYSTEM_ADMIN") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">403 - Access Denied</h1>
          <p className="text-xs text-slate-500">
            Your account is assigned the role of <strong className="text-slate-900">{role.replace("_", " ")}</strong>. You do not have authorization to access the Tag Officer portal.
          </p>
          <Link
            href={`/${role.toLowerCase().replace("_", "-")}`}
            className="inline-flex items-center justify-center px-6 py-3 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors shadow-md"
          >
            Return to My Authorized Portal
          </Link>
        </div>
      </div>
    );
  }

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const token = await getIdToken();
      if (!token) {
        showNotification("Authentication token missing. Please re-authenticate.", "error");
        setIsGenerating(false);
        return;
      }

      const batchName = `NT-BATCH-${Date.now().toString().slice(-6)}`;
      const res = await fetch("/api/v1/tag-batches", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          batchName,
          quantity: batchCount,
          wardId: "123e4567-e89b-12d3-a456-426614174000",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showNotification(data.message || "Tag batch creation failed.", "error");
        setIsGenerating(false);
        return;
      }

      const result = data.result || {};
      const createdCount = result.tags_created || batchCount;
      const startSerial = result.start_serial || "NT-SAN-2026-1000";

      const sampleCodes: string[] = Array.from({ length: Math.min(5, createdCount) }, (_, i) => {
        const parts = startSerial.split("-");
        const baseSeq = parseInt(parts[parts.length - 1] || "1000", 10);
        return `NT-SAN-2026-${baseSeq + i}`;
      });

      setGeneratedQRs(sampleCodes);
      showNotification(`Authorized Tag Batch ${result.batch_name || batchName} created successfully with ${createdCount} tags!`, "success");
      await fetchBatches();
    } catch (err: any) {
      showNotification(err.message || "Failed to submit batch creation request.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSearchTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchedTagCode.trim()) return;

    setIsSearching(true);
    try {
      const token = await getIdToken();
      if (!token) {
        showNotification("Authentication token missing.", "error");
        setIsSearching(false);
        return;
      }

      const res = await fetch("/api/v1/tags/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ code: searchedTagCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.tag) {
        showNotification(data.message || `No tag found with code: ${searchedTagCode}`, "error");
        setTagDetails(null);
        setIsSearching(false);
        return;
      }

      const t = data.tag;
      setTagDetails({
        id: t.id,
        code: t.code,
        category: wasteCategory,
        status: t.status,
        assignedHousehold: t.assignedHouseholdId || "Unassigned",
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString().split("T")[0] : "2026-10-04",
      });
      showNotification(`Tag ${t.code} retrieved successfully.`, "success");
    } catch (err: any) {
      showNotification(err.message || "Tag search request failed.", "error");
    } finally {
      setIsSearching(false);
    }
  };

  const handleUpdateTagStatus = async (newStatus: "SUSPENDED" | "INVALIDATED" | "ACTIVE" | "REGISTERED" | "IN_INVENTORY") => {
    if (!tagDetails) return;

    if (tagDetails.status === "CLOSED") {
      showNotification("Single-Use Invariant Violation: CLOSED tags are immutable and can NEVER be reactivated or altered.", "error");
      return;
    }

    try {
      const token = await getIdToken();
      if (!token) {
        showNotification("Authentication token missing.", "error");
        return;
      }

      const res = await fetch("/api/v1/tags/lifecycle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          tagId: tagDetails.id,
          newStatus,
          reason: "Tag Officer Web UI Invariant Override",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showNotification(data.message || `Tag state transition to ${newStatus} failed.`, "error");
        return;
      }

      setTagDetails({ ...tagDetails, status: newStatus });
      showNotification(`Tag ${tagDetails.code} status successfully updated to ${newStatus}.`, "success");
    } catch (err: any) {
      showNotification(err.message || "Tag lifecycle status update failed.", "error");
    }
  };

  const exportCSV = () => {
    if (generatedQRs.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," + ["Tag Serial Number,Category,Status", ...generatedQRs.map(c => `${c},${wasteCategory},CREATED`)].join("\n");
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
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-xl text-xs font-bold shadow-lg transition-all ${
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
            <h1 className="text-2xl font-bold text-slate-900">
              Tag Officer Inventory & Supply Chain Management ({user.displayName || user.email?.split("@")[0]})
            </h1>
            <p className="text-xs text-slate-500">
              Logged as: {user.email} • Authoritative tag batch creation, inventory tracking, and lifecycle override.
            </p>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Size (Quantity: 1 to 5,000)</label>
              <select
                value={batchCount}
                onChange={(e) => setBatchCount(Number(e.target.value))}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              >
                <option value={100}>100 Tags</option>
                <option value={1000}>1,000 Tags</option>
                <option value={5000}>5,000 Tags (Maximum Allowed)</option>
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
                <span className="text-xs font-bold text-slate-800">Batch Serial Preview Sample:</span>
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

        {/* Existing Batches Table & Tag Lookup */}
        <div className="lg:col-span-2 space-y-6">
          {/* TAG LIFECYCLE SEARCH & OVERRIDE CARD */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-600" />
              <span>Tag Code Lookup & Lifecycle Override</span>
            </h2>

            <form onSubmit={handleSearchTag} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter tag serial code (e.g. NT-SAN-2026-1045) or Tag UUID"
                value={searchedTagCode}
                onChange={(e) => setSearchedTagCode(e.target.value)}
                className="flex-1 text-xs p-2.5 rounded-xl border border-slate-300 font-mono"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-2"
              >
                {isSearching && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Lookup Tag</span>
              </button>
            </form>

            {tagDetails && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-900">{tagDetails.code}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    tagDetails.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" :
                    tagDetails.status === "CLOSED" ? "bg-slate-900 text-white" :
                    tagDetails.status === "CREATED" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"
                  }`}>
                    Status: {tagDetails.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600">Assigned Household: {tagDetails.assignedHousehold}</div>
                <div className="text-[11px] text-slate-600">Registered Date: {tagDetails.createdAt}</div>

                {tagDetails.status === "CLOSED" ? (
                  <div className="p-2.5 bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold flex items-center gap-2">
                    <Ban className="w-4 h-4 text-slate-600" />
                    <span>Single-Use Invariant: CLOSED tags are immutable and cannot be re-activated or modified.</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
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
                        Activate Tag
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
              <h2 className="text-lg font-bold text-slate-900">Registered Tag Batches in Database</h2>
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
              {filteredBatches.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No registered tag batches found in database. Create a new batch above to populate inventory.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Batch Name / ID</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Ward Scope</th>
                      <th className="px-4 py-3">Total Qty</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredBatches.map((b, idx) => (
                      <tr key={b.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-emerald-800">{b.id}</td>
                        <td className="px-4 py-3">{b.category}</td>
                        <td className="px-4 py-3 text-slate-500">{b.ward}</td>
                        <td className="px-4 py-3 font-semibold">{b.count.toLocaleString()}</td>
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
