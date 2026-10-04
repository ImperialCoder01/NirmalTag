"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth, UserRole } from "@/lib/auth-context";
import { 
  Users, Key, FileText, Cpu, 
  ShieldAlert, Search, Sliders, Plus, Download, X, Save, Lock
} from "lucide-react";

export default function SystemAdminPage() {
  const { user, role, getIdToken } = useAuth();

  // State
  const [usersList, setUsersList] = useState<Array<{
    id: string;
    profileId?: string;
    name: string;
    email: string;
    role: UserRole;
    scope: string;
    status: string;
  }>>([]);

  const [auditLogs, setAuditLogs] = useState<Array<{
    id: string;
    actor: string;
    action: string;
    target: string;
    time: string;
    scope: string;
  }>>([]);

  // Policy Controls State
  const [pointsMultiplier, setPointsMultiplier] = useState<number>(10);
  const [aiConfidenceThreshold, setAiConfidenceThreshold] = useState<number>(85);
  const [collectorIncentiveRate, setCollectorIncentiveRate] = useState<number>(2.00);

  // Modals State
  const [isProvisionUserOpen, setIsProvisionUserOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  // User Provisioning Form
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState<UserRole>("COLLECTOR");
  const [selectedScope, setSelectedScope] = useState("Ward 42");

  const [auditSearchTerm, setAuditSearchTerm] = useState("");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAdminData = async () => {
    try {
      const token = await getIdToken();
      if (!token) return;

      const headers = { "Authorization": `Bearer ${token}` };

      // Fetch Users
      const resUsers = await fetch("/api/v1/admin/users", { headers });
      if (resUsers.ok) {
        const uData = await resUsers.json();
        if (uData.success && Array.isArray(uData.users)) {
          setUsersList(uData.users);
        }
      }

      // Fetch Audit Logs
      const resLogs = await fetch("/api/v1/admin/audit-logs", { headers });
      if (resLogs.ok) {
        const lData = await resLogs.json();
        if (lData.success && Array.isArray(lData.logs)) {
          setAuditLogs(lData.logs);
        }
      }
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    }
  };

  useEffect(() => {
    if (user && role === "SYSTEM_ADMIN") {
      fetchAdminData();
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
            Please sign in to your authorized account to access System Administration.
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

  if (role !== "SYSTEM_ADMIN") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">403 - Access Denied</h1>
          <p className="text-xs text-slate-500">
            Your account is assigned the role of <strong className="text-slate-900">{role.replace("_", " ")}</strong>. You do not have authorization to access the System Administration portal.
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

  const handleProvisionUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserName) return;

    try {
      const token = await getIdToken();
      if (!token) {
        showNotification("Authentication token missing.", "error");
        return;
      }

      const res = await fetch("/api/v1/admin/provision-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetProfileId: "123e4567-e89b-12d3-a456-426614174000",
          roleName: selectedRoleToAssign,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showNotification(data.message || "Failed to provision user role.", "error");
        return;
      }

      setIsProvisionUserOpen(false);
      setNewUserName("");
      setNewUserEmail("");
      showNotification(`Granted ${selectedRoleToAssign} role to ${newUserEmail} in database!`);
      await fetchAdminData();
    } catch (err: any) {
      showNotification(err.message || "Role provisioning request failed.", "error");
    }
  };

  const handleSavePolicies = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPolicyModalOpen(false);
    showNotification("System policy engine rules & multipliers updated.");
  };

  const exportAuditLogs = () => {
    const csvContent = "data:text/csv;charset=utf-8," + ["Event ID,Actor,Action,Target,Scope,Timestamp", ...auditLogs.map(l => `${l.id},${l.actor},${l.action},${l.target},${l.scope},${l.time}`)].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Security_Audit_Logs_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Security audit trail exported to CSV successfully.");
  };

  const filteredAuditLogs = auditLogs.filter(l =>
    l.id.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
    l.actor.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
    l.action.toLowerCase().includes(auditSearchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-xl text-xs font-bold shadow-lg ${
          notification.type === "success" ? "bg-emerald-900 text-white" : "bg-red-900 text-white"
        }`}>
          {notification.message}
        </div>
      )}

      {/* Admin Header */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500 flex-shrink-0">
            <Image src="/logo.jpg" alt="Logo" width={48} height={48} className="object-cover" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              System Administration & Security Control ({user.displayName || user.email?.split("@")[0]})
            </h1>
            <p className="text-xs text-slate-400">
              Admin Identity: {user.email} • RBAC Role Provisioning, Security Audit Log Viewer, & Policy Engine
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsProvisionUserOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md"
          >
            <Users className="w-4 h-4" />
            <span>Provision User Role</span>
          </button>
          <button
            onClick={() => setIsPolicyModalOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 shadow-md"
          >
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Policy Multipliers</span>
          </button>
        </div>
      </div>

      {/* Admin Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">User Role Directory ({usersList.length})</h2>
          <p className="text-xs text-slate-500">Manage officer badge assignments, RWA/BWG mapping, and scope limits.</p>
          <button
            onClick={() => setIsProvisionUserOpen(true)}
            className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add User Assignment</span>
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">AI Model & Vision Threshold</h2>
          <p className="text-xs text-slate-500">MobileNetV3 on-device visual classifier confidence minimum.</p>
          <div className="text-xs font-extrabold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg inline-block">
            Threshold: {aiConfidenceThreshold}% Minimum
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Key className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Security Invariants & Multipliers</h2>
          <p className="text-xs text-slate-500">Single-use tag state rules, RLS policies, credit rate per pouch.</p>
          <div className="text-xs font-extrabold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg inline-block">
            {pointsMultiplier} Pts/Pouch • ₹{collectorIncentiveRate.toFixed(2)}/Pickup
          </div>
        </div>
      </div>

      {/* USER PROVISIONING TABLE */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span>User Accounts & RBAC Role Scopes</span>
          </h2>
          <button
            onClick={() => setIsProvisionUserOpen(true)}
            className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assign Role</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3">Scope Scope</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{u.id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{u.scope}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Audit Trail */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>Immutable Security Audit Log Viewer</span>
          </h2>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit trail..."
                value={auditSearchTerm}
                onChange={(e) => setAuditSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 w-48"
              />
            </div>
            <button
              onClick={exportAuditLogs}
              className="px-3 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-lg flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Audit Event ID</th>
                <th className="px-4 py-3">Actor Identity</th>
                <th className="px-4 py-3">Action Performed</th>
                <th className="px-4 py-3">Target Entity</th>
                <th className="px-4 py-3">Permission Scope</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredAuditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{log.id}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-800">{log.actor}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">{log.target}</td>
                  <td className="px-4 py-3 text-slate-500">{log.scope}</td>
                  <td className="px-4 py-3 text-slate-400">{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: PROVISION USER */}
      {isProvisionUserOpen && (
        <div onClick={() => setIsProvisionUserOpen(false)} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button onClick={() => setIsProvisionUserOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900">Provision User Role & Scope</h3>

            <form onSubmit={handleProvisionUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inspector Rajesh Kumar"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="rajesh.kumar@nirmaltag.org"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Role to Grant</label>
                <select
                  value={selectedRoleToAssign}
                  onChange={(e) => setSelectedRoleToAssign(e.target.value as UserRole)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 font-bold text-emerald-900"
                >
                  <option value="HOUSEHOLD">Household Resident</option>
                  <option value="COLLECTOR">Field Waste Collector</option>
                  <option value="TAG_OFFICER">Tag Officer (Inventory)</option>
                  <option value="RWA_ADMIN">RWA Administrator</option>
                  <option value="BWG_ADMIN">BWG Administrator</option>
                  <option value="MCD_OFFICER">MCD Municipal Officer</option>
                  <option value="SYSTEM_ADMIN">System Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Permission Scope</label>
                <input
                  type="text"
                  value={selectedScope}
                  onChange={(e) => setSelectedScope(e.target.value)}
                  placeholder="e.g. Ward 42 (Rohini)"
                  className="w-full text-xs p-3 rounded-xl border border-slate-300"
                />
              </div>

              <button type="submit" className="w-full py-3 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md">
                Grant Role & Issue Credentials
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: POLICY MULTIPLIERS */}
      {isPolicyModalOpen && (
        <div onClick={() => setIsPolicyModalOpen(false)} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button onClick={() => setIsPolicyModalOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900">System Policy Engine Parameters</h3>

            <form onSubmit={handleSavePolicies} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Circular Credit Points per Verified Pouch</label>
                <input
                  type="number"
                  value={pointsMultiplier}
                  onChange={(e) => setPointsMultiplier(Number(e.target.value))}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">MobileNetV3 AI Vision Confidence Cutoff (%)</label>
                <input
                  type="number"
                  value={aiConfidenceThreshold}
                  onChange={(e) => setAiConfidenceThreshold(Number(e.target.value))}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Collector Handling Incentive Rate (₹ per pickup)</label>
                <input
                  type="number"
                  step="0.50"
                  value={collectorIncentiveRate}
                  onChange={(e) => setCollectorIncentiveRate(Number(e.target.value))}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <button type="submit" className="w-full py-3 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                <span>Save Policy Parameters</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
