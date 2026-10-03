"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { 
  Building2, Users, CheckCircle2, TrendingUp, BarChart2, Plus, 
  AlertTriangle, ShieldAlert, X, Send, Award
} from "lucide-react";

export default function RWAPage() {
  const { user, role, setRole } = useAuth();

  // State
  const [registeredHouseholds, setRegisteredHouseholds] = useState([
    { id: "HH-402", name: "Sharma Family", address: "Block B, Flat 402", category: "Sanitary + Diapers", compliance: "98%", status: "VERIFIED" },
    { id: "HH-403", name: "Verma Family", address: "Block B, Flat 403", category: "Sanitary Waste", compliance: "95%", status: "VERIFIED" },
    { id: "HH-404", name: "Gupta Family", address: "Block B, Flat 404", category: "Special Care", compliance: "92%", status: "VERIFIED" },
  ]);

  const [leaderboard, setLeaderboard] = useState([
    { block: "Block B (Sector 7)", households: 120, rate: "98.2%", points: "5,400 Pts" },
    { block: "Block A (Sector 7)", households: 110, rate: "96.4%", points: "4,800 Pts" },
    { block: "Block C (Sector 7)", households: 115, rate: "94.8%", points: "4,000 Pts" },
  ]);

  // Modal States
  const [isAddHouseholdOpen, setIsAddHouseholdOpen] = useState(false);
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);

  // Form Fields
  const [residentName, setResidentName] = useState("");
  const [flatAddress, setFlatAddress] = useState("");
  const [wasteType, setWasteType] = useState("Sanitary Waste");
  const [disputeSubject, setDisputeSubject] = useState("Uncollected Sanitary Pouch");
  const [disputeDetails, setDisputeDetails] = useState("");

  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddHousehold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!residentName || !flatAddress) return;

    const newHh = {
      id: `HH-${Math.floor(500 + Math.random() * 500)}`,
      name: residentName,
      address: flatAddress,
      category: wasteType,
      compliance: "100%",
      status: "VERIFIED",
    };

    setRegisteredHouseholds([newHh, ...registeredHouseholds]);
    setIsAddHouseholdOpen(false);
    setResidentName("");
    setFlatAddress("");
    showNotification(`Registered ${residentName} (${flatAddress}) in RWA directory.`);
  };

  const handleSendDispute = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDisputeOpen(false);
    setDisputeDetails("");
    showNotification(`Dispute report "${disputeSubject}" submitted to MCD Municipal Command.`);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Role Banner / Guard Check */}
      {role !== "RWA_ADMIN" && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span className="text-xs font-semibold">
              Your active role is set as <strong>{role.replace("_", " ")}</strong>. You are previewing the RWA Administrator Portal.
            </span>
          </div>
          <button
            onClick={() => setRole("RWA_ADMIN")}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex-shrink-0"
          >
            Switch to RWA Admin Portal
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
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Resident Welfare Association (RWA) Portal {user ? `(${user.displayName || user.email?.split("@")[0]})` : ""}
            </h1>
            <p className="text-xs text-slate-500">
              {user?.email ? `Admin: ${user.email} • ` : ""}Rohini Sector 7 RWA • Registration No: RWA-DL-2024-890 • MCD Ward 42
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsAddHouseholdOpen(true)}
            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Resident</span>
          </button>
          <button
            onClick={() => setIsDisputeOpen(true)}
            className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Report Incident</span>
          </button>
        </div>
      </div>

      {/* RWA Statistics KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Registered Colony Households</span>
          <div className="text-3xl font-extrabold text-slate-900">450</div>
          <p className="text-[11px] text-emerald-600 font-semibold">+12 newly registered this month</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Monthly Segregation Compliance</span>
          <div className="text-3xl font-extrabold text-emerald-700">96.8%</div>
          <p className="text-[11px] text-slate-500">Target: 95.0% (MCD Benchmark Met)</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Household Reward Credits</span>
          <div className="text-3xl font-extrabold text-slate-900">14,200 Pts</div>
          <p className="text-[11px] text-slate-500">Colony Eco-Incentive Pool</p>
        </div>
      </div>

      {/* Colony Directory & Leaderboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* RWA Registered Households */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>RWA Registered Household Directory</span>
            </h2>
            <button
              onClick={() => setIsAddHouseholdOpen(true)}
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Resident ID</th>
                  <th className="px-4 py-3">Household Name</th>
                  <th className="px-4 py-3">Flat / Address</th>
                  <th className="px-4 py-3">Waste Category</th>
                  <th className="px-4 py-3">Compliance</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {registeredHouseholds.map((hh) => (
                  <tr key={hh.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{hh.id}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-900">{hh.name}</td>
                    <td className="px-4 py-3 text-slate-600">{hh.address}</td>
                    <td className="px-4 py-3">{hh.category}</td>
                    <td className="px-4 py-3 font-bold text-emerald-700">{hh.compliance}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {hh.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RWA Block Segregation Leaderboard */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <span>Colony Block Leaderboard</span>
          </h2>

          <div className="space-y-3">
            {leaderboard.map((lb, idx) => (
              <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span>#{idx + 1} {lb.block}</span>
                  <span className="text-emerald-700 font-extrabold">{lb.rate}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{lb.households} Households</span>
                  <span>{lb.points}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL 1: ADD HOUSEHOLD */}
      {isAddHouseholdOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button onClick={() => setIsAddHouseholdOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900">Register Resident in RWA</h3>

            <form onSubmit={handleAddHousehold} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Resident Family Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kapoor Family"
                  value={residentName}
                  onChange={(e) => setResidentName(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Flat & Block Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Block B, Flat 501"
                  value={flatAddress}
                  onChange={(e) => setFlatAddress(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Waste Stream Category</label>
                <select
                  value={wasteType}
                  onChange={(e) => setWasteType(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300"
                >
                  <option value="Sanitary Waste">Sanitary Waste</option>
                  <option value="Sanitary + Diapers">Sanitary + Diapers</option>
                  <option value="Special Household Medical">Special Household Medical</option>
                </select>
              </div>

              <button type="submit" className="w-full py-3 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md">
                Register Resident & Issue Tags
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REPORT DISPUTE */}
      {isDisputeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button onClick={() => setIsDisputeOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>Submit Incident Report to MCD</span>
            </h3>

            <form onSubmit={handleSendDispute} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Category</label>
                <select
                  value={disputeSubject}
                  onChange={(e) => setDisputeSubject(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300"
                >
                  <option value="Uncollected Sanitary Pouch">Uncollected Sanitary Pouch</option>
                  <option value="Missing Tag Delivery">Missing Tag Delivery to Block</option>
                  <option value="Bin Contamination Incident">Bin Contamination Incident</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Details</label>
                <textarea
                  rows={3}
                  placeholder="Describe location, block number, and issue..."
                  value={disputeDetails}
                  onChange={(e) => setDisputeDetails(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300"
                ></textarea>
              </div>

              <button type="submit" className="w-full py-3 bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                <span>Submit Official Report</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
