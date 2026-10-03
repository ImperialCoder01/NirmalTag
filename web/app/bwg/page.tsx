"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { 
  Building, TrendingUp, CheckCircle2, AlertCircle, Plus, 
  Download, ShieldAlert, X, Scale, FileText, QrCode
} from "lucide-react";

export default function BWGPage() {
  const { role, setRole } = useAuth();

  // State
  const [wasteLogs, setWasteLogs] = useState([
    { id: "BWG-LOG-109", date: "2026-10-03", weightKg: 120, category: "Commercial Diaper & Sanitary", sealCode: "SEAL-9021-X", status: "VERIFIED" },
    { id: "BWG-LOG-108", date: "2026-10-02", weightKg: 115, category: "Commercial Diaper & Sanitary", sealCode: "SEAL-9020-X", status: "VERIFIED" },
    { id: "BWG-LOG-107", date: "2026-10-01", weightKg: 130, category: "Medical Non-Infectious", sealCode: "SEAL-9019-X", status: "VERIFIED" },
  ]);

  const [activeTagsCount, setActiveTagsCount] = useState<number>(48);

  // Modal States
  const [isLogVolumeOpen, setIsLogVolumeOpen] = useState(false);
  const [isRequestTagsOpen, setIsRequestTagsOpen] = useState(false);

  // Form States
  const [weightKg, setWeightKg] = useState<number>(100);
  const [category, setCategory] = useState("Commercial Diaper & Sanitary");
  const [requestedTagQty, setRequestedTagQty] = useState(500);

  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddWasteLog = (e: React.FormEvent) => {
    e.preventDefault();
    const newLog = {
      id: `BWG-LOG-${Math.floor(110 + Math.random() * 900)}`,
      date: new Date().toISOString().split("T")[0],
      weightKg: Number(weightKg),
      category: category,
      sealCode: `SEAL-${Math.floor(1000 + Math.random() * 9000)}-X`,
      status: "VERIFIED",
    };

    setWasteLogs([newLog, ...wasteLogs]);
    setIsLogVolumeOpen(false);
    showNotification(`Logged ${weightKg}kg ${category} volume. Seal: ${newLog.sealCode}`);
  };

  const handleRequestBulkTags = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveTagsCount(prev => prev + Number(requestedTagQty));
    setIsRequestTagsOpen(false);
    showNotification(`Requested ${requestedTagQty} bulk industrial tags from Tag Officer. Allocation approved!`);
  };

  const downloadCertificate = () => {
    showNotification("MCD Bulk Waste Compliance Certificate (PDF) generated & downloaded.");
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Role Banner / Guard Check */}
      {role !== "BWG_ADMIN" && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span className="text-xs font-semibold">
              Your active role is set as <strong>{role.replace("_", " ")}</strong>. You are previewing the BWG Administrator Portal.
            </span>
          </div>
          <button
            onClick={() => setRole("BWG_ADMIN")}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex-shrink-0"
          >
            Switch to BWG Admin Portal
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
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center flex-shrink-0">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bulk Waste Generator (BWG) Portal</h1>
            <p className="text-xs text-slate-500">Commercial & Institutional Special-Care Waste Compliance Hub • MCD Registration BWG-2026-902</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsLogVolumeOpen(true)}
            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
          >
            <Scale className="w-4 h-4" />
            <span>Log Daily Volume</span>
          </button>
          <button
            onClick={() => setIsRequestTagsOpen(true)}
            className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
          >
            <QrCode className="w-4 h-4" />
            <span>Request Bulk Tags</span>
          </button>
          <button
            onClick={downloadCertificate}
            className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Compliance Cert</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Daily Special Waste Volume</span>
          <div className="text-3xl font-extrabold text-slate-900">120 kg</div>
          <p className="text-[11px] text-emerald-600 font-semibold">100% Segregated at Source</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Active Authorized Bulk Tags</span>
          <div className="text-3xl font-extrabold text-emerald-700">{activeTagsCount} Tags</div>
          <p className="text-[11px] text-slate-500">MCD High-Capacity Vehicle Assigned</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">MCD Compliance Rating</span>
          <div className="text-3xl font-extrabold text-slate-900">Grade A</div>
          <p className="text-[11px] text-emerald-600 font-semibold">Eligible for 5% Municipal Rebate</p>
        </div>
      </div>

      {/* Waste Volume Log Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>Commercial Special Waste Logging History</span>
          </h2>
          <button
            onClick={() => setIsLogVolumeOpen(true)}
            className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Volume</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Log Entry ID</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Weight (Kg)</th>
                <th className="px-4 py-3">Waste Category</th>
                <th className="px-4 py-3">Container Seal Code</th>
                <th className="px-4 py-3">MCD Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {wasteLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{log.id}</td>
                  <td className="px-4 py-3 text-slate-500">{log.date}</td>
                  <td className="px-4 py-3 font-extrabold text-emerald-800">{log.weightKg} kg</td>
                  <td className="px-4 py-3">{log.category}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{log.sealCode}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: LOG WASTE VOLUME */}
      {isLogVolumeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button onClick={() => setIsLogVolumeOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900">Log Daily Commercial Waste Volume</h3>

            <form onSubmit={handleAddWasteLog} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Weight in Kilograms (Kg)</label>
                <input
                  type="number"
                  required
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Waste Stream Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300"
                >
                  <option value="Commercial Diaper & Sanitary">Commercial Diaper & Sanitary</option>
                  <option value="Medical Non-Infectious">Medical Non-Infectious</option>
                  <option value="Special Institutional Care">Special Institutional Care</option>
                </select>
              </div>

              <button type="submit" className="w-full py-3 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md">
                Log Volume & Generate Container Seal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REQUEST BULK TAGS */}
      {isRequestTagsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button onClick={() => setIsRequestTagsOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900">Request Industrial Bulk Tags</h3>

            <form onSubmit={handleRequestBulkTags} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity of Bulk Tags</label>
                <select
                  value={requestedTagQty}
                  onChange={(e) => setRequestedTagQty(Number(e.target.value))}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300"
                >
                  <option value={100}>100 Industrial Tags</option>
                  <option value={500}>500 Industrial Tags</option>
                  <option value={1000}>1,000 Industrial Tags</option>
                  <option value={5000}>5,000 Industrial Tags</option>
                </select>
              </div>

              <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md">
                Submit Bulk Tag Request to Tag Officer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
