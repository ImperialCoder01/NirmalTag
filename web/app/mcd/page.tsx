"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { 
  Building2, TrendingUp, ShieldCheck, AlertCircle, BarChart3, CheckCircle2, 
  ShieldAlert, Filter, Send, X, Check, ThumbsUp, ThumbsDown
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function MCDDashboardPage() {
  const { user, role, setRole } = useAuth();

  // State
  const [selectedWardFilter, setSelectedWardFilter] = useState<string>("ALL");

  const [disputesQueue, setDisputesQueue] = useState([
    { id: "DSP-101", ward: "Ward 42", tagCode: "NMT-2026-89A4B-000492", collector: "COL-4092", category: "Sanitary Waste", confidence: "68%", reason: "Blurry evidence image - visual check required" },
    { id: "DSP-102", ward: "Ward 41", tagCode: "NMT-2026-89A4B-000499", collector: "COL-4088", category: "Diapers", confidence: "71%", reason: "Unsealed outer bag warning" },
    { id: "DSP-103", ward: "Ward 43", tagCode: "NMT-2026-89A4B-000512", collector: "COL-4104", category: "Medical Non-Infectious", confidence: "64%", reason: "Low lighting during field scan" },
  ]);

  const [wardData, setWardData] = useState([
    { ward: "Ward 41", pickups: 4200, verified: 3950, rate: 94 },
    { ward: "Ward 42", pickups: 5800, verified: 5600, rate: 96 },
    { ward: "Ward 43", pickups: 3100, verified: 2850, rate: 92 },
    { ward: "Ward 44", pickups: 4900, verified: 4500, rate: 91 },
    { ward: "Ward 45", pickups: 6200, verified: 6050, rate: 97 },
  ]);

  // Modal State
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("Sanitary Waste Segregation Drive");
  const [broadcastMessage, setBroadcastMessage] = useState("");

  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleResolveDispute = (id: string, action: "APPROVE" | "REJECT") => {
    const target = disputesQueue.find(d => d.id === id);
    setDisputesQueue(disputesQueue.filter(d => d.id !== id));

    if (action === "APPROVE") {
      showNotification(`Dispute ${id} approved! Pickup verified and points credited to resident.`);
    } else {
      showNotification(`Dispute ${id} rejected. Notice issued to collector/resident.`, "error");
    }
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    setIsBroadcastOpen(false);
    setBroadcastMessage("");
    showNotification(`Ward Advisory "${broadcastTitle}" broadcasted to all RWAs and BWGs in ${selectedWardFilter === "ALL" ? "All Wards" : selectedWardFilter}.`);
  };

  const filteredWardData = selectedWardFilter === "ALL" 
    ? wardData 
    : wardData.filter(w => w.ward === selectedWardFilter);

  const filteredDisputes = selectedWardFilter === "ALL"
    ? disputesQueue
    : disputesQueue.filter(d => d.ward === selectedWardFilter);

  const totalPickupsCount = filteredWardData.reduce((acc, w) => acc + w.verified, 0);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Role Banner / Guard Check */}
      {role !== "MCD_OFFICER" && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span className="text-xs font-semibold">
              Your active role is set as <strong>{role.replace("_", " ")}</strong>. You are previewing the MCD Municipal Officer Portal.
            </span>
          </div>
          <button
            onClick={() => setRole("MCD_OFFICER")}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex-shrink-0"
          >
            Switch to MCD Officer Portal
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

      {/* Executive Command Header */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-500 flex-shrink-0">
            <Image src="/logo.jpg" alt="Logo" width={56} height={56} className="object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                MCD Municipal Executive Command {user ? `(${user.displayName || user.email?.split("@")[0]})` : ""}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950 uppercase">
                Zone: North Delhi
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {user?.email ? `Officer: ${user.email} • ` : ""}Real-Time Civic Compliance & Special-Care Waste Aggregated Telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Ward Selector Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-2 rounded-xl border border-slate-700 text-xs font-semibold">
            <Filter className="w-4 h-4 text-emerald-400" />
            <select
              value={selectedWardFilter}
              onChange={(e) => setSelectedWardFilter(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Municipal Wards</option>
              <option value="Ward 41" className="bg-slate-900 text-white">Ward 41 (Pitampura)</option>
              <option value="Ward 42" className="bg-slate-900 text-white">Ward 42 (Rohini)</option>
              <option value="Ward 43" className="bg-slate-900 text-white">Ward 43 (Shalimar Bagh)</option>
              <option value="Ward 44" className="bg-slate-900 text-white">Ward 44 (Model Town)</option>
              <option value="Ward 45" className="bg-slate-900 text-white">Ward 45 (Ashok Vihar)</option>
            </select>
          </div>

          <button
            onClick={() => setIsBroadcastOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span>Issue Ward Notice</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Verified Pickups</span>
          <div className="text-3xl font-extrabold text-slate-900">{totalPickupsCount.toLocaleString()}</div>
          <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1 pt-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Active in {selectedWardFilter === "ALL" ? "5 Wards" : selectedWardFilter}</span>
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
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Dispute Queue</span>
          <div className="text-3xl font-extrabold text-amber-600">{filteredDisputes.length}</div>
          <div className="text-xs text-slate-500 pt-1">Low-confidence items for officer review</div>
        </div>
      </div>

      {/* Ward Volume Bar Chart & Breakdown Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span>Ward-Wise Sanitary Waste Collection Volume ({selectedWardFilter})</span>
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredWardData}>
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
            {filteredWardData.map((w, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{w.ward}</div>
                  <div className="text-slate-500">{w.verified.toLocaleString()} verified pickups</div>
                </div>
                <span className="px-2.5 py-1 rounded-full font-extrabold bg-emerald-100 text-emerald-800">
                  {w.rate}% Compliance
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI DISPUTE REVIEW QUEUE */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <span>AI Verification Dispute Review Queue</span>
          </h2>
          <span className="text-xs font-bold text-slate-500">{filteredDisputes.length} Disputes Pending</span>
        </div>

        {filteredDisputes.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-500 text-xs font-medium">
            No pending disputes in this ward filter. All visual AI checks passed!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Dispute ID</th>
                  <th className="px-4 py-3">Ward Scope</th>
                  <th className="px-4 py-3">Tag Code</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">AI Score</th>
                  <th className="px-4 py-3">Flag Reason</th>
                  <th className="px-4 py-3">Officer Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredDisputes.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{d.id}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-900">{d.ward}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{d.tagCode}</td>
                    <td className="px-4 py-3">{d.category}</td>
                    <td className="px-4 py-3 font-bold text-amber-600">{d.confidence}</td>
                    <td className="px-4 py-3 text-slate-500">{d.reason}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResolveDispute(d.id, "APPROVE")}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg flex items-center gap-1"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleResolveDispute(d.id, "REJECT")}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg flex items-center gap-1"
                        >
                          <ThumbsDown className="w-3 h-3" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BROADCAST MODAL */}
      {isBroadcastOpen && (
        <div onClick={() => setIsBroadcastOpen(false)} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button onClick={() => setIsBroadcastOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-600" />
              <span>Issue Official Municipal Advisory</span>
            </h3>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Advisory Subject Title</label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Broadcast Message Body</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter official advisory directive for RWAs, BWGs, and field collectors..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300"
                ></textarea>
              </div>

              <button type="submit" className="w-full py-3 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md">
                Publish Advisory to Selected Ward
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
