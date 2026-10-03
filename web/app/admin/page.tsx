"use client";

import { useState } from "react";
import Image from "next/image";
import { ShieldCheck, Users, Key, FileText, Cpu, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function SystemAdminPage() {
  const [auditLogs, setAuditLogs] = useState([
    { id: "AUD-901", actor: "officer_rohini_42", action: "TAG_BATCH_CREATED", target: "BATCH-2026-003", time: "2026-10-03 10:15 AM", scope: "WARD_42" },
    { id: "AUD-900", actor: "sys_admin_main", action: "USER_ROLE_GRANTED", target: "collector_col_4092", time: "2026-10-02 04:30 PM", scope: "SYSTEM" },
    { id: "AUD-899", actor: "mcd_evaluator", action: "PICKUP_REVIEWED", target: "PKP-9021", time: "2026-10-02 02:10 PM", scope: "ZONE_NORTH" },
  ]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Admin Header */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500 flex-shrink-0">
            <Image src="/logo.jpg" alt="Logo" width={48} height={48} className="object-cover" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Administration & Security Control</h1>
            <p className="text-xs text-slate-400">RBAC Role Permissions, Security Audit Log Viewer, and AI Model Configuration</p>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          <span>MFA Enforced</span>
        </div>
      </div>

      {/* Admin Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">User Provisioning & Scopes</h2>
          <p className="text-xs text-slate-500">Manage officer badge assignments, RWA/BWG org mapping, and permission scopes.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">AI Model Registry</h2>
          <p className="text-xs text-slate-500">Deploy & evaluate MobileNetV3 quantized visual evidence verification models.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Key className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Security & Policy Engine</h2>
          <p className="text-xs text-slate-500">Configure single-use tag state invariants, RLS policies, and credit multipliers.</p>
        </div>
      </div>

      {/* System Audit Trail */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" />
          <span>System Immutable Security Audit Log</span>
        </h2>

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
              {auditLogs.map((log) => (
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
    </div>
  );
}
