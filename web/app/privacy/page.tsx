import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, FileText, Lock, CheckCircle2, UserCheck } from "lucide-react";

export const metadata = {
  title: "Privacy Policy (DPDP Act 2023 Compliant) — NirmalTag",
  description: "Official Privacy Policy compliant with Digital Personal Data Protection Act 2023 (India)",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-600 flex-shrink-0">
            <Image src="/logo.jpg" alt="NirmalTag Logo" width={56} height={56} className="object-cover" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>DPDP Act 2023 Compliant (India)</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-2">Privacy Policy & Data Fiduciary Notice</h1>
            <p className="text-xs text-slate-500">Effective Date: October 3, 2026 • Version 1.0</p>
          </div>
        </div>
      </div>

      {/* Main Legal Content */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8 text-slate-700 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>1. Data Fiduciary & Identity Information</span>
          </h2>
          <p>
            NirmalTag Civic Tech Platform (“NirmalTag”, “We”, “Us”) operates as a Data Fiduciary under the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> of India. We process personal data solely for municipal waste management verification, doorstep sanitary collection tracking, and credit ledger rewards.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-600" />
            <span>2. Data Minimization — Only Necessary Data Collected</span>
          </h2>
          <p>We adhere to strict data minimization principles. We collect ONLY data required for operational verification:</p>
          <ul className="list-disc pl-6 space-y-1 text-slate-600">
            <li><strong>Household Data</strong>: Full name, email address, physical address, and assigned ward ID. (No financial or unneeded PII).</li>
            <li><strong>Collector Field Data</strong>: Collector worker ID, assigned ward scope, and active collection timestamps.</li>
            <li><strong>Visual Evidence Images</strong>: On-device visual evidence photos of pouch sealing condition. Images contain NO personal faces or household identity details.</li>
            <li><strong>QR Identifiers</strong>: QR tags carry only unprivileged system identifiers (`NMT-2026-XXXXX`), never personal data.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <span>3. Data Principal Rights Under DPDP Act 2023</span>
          </h2>
          <p>As a Data Principal under Indian law, you possess explicit rights:</p>
          <ul className="list-disc pl-6 space-y-1 text-slate-600">
            <li><strong>Right to Access Summary</strong>: View all personal data processed by NirmalTag in your Household Portal.</li>
            <li><strong>Right to Correction & Erasure</strong>: Update inaccurate profile information or request account deletion.</li>
            <li><strong>Right to Withdraw Consent</strong>: Withdraw consent for data processing at any time by contacting our Data Protection Officer.</li>
            <li><strong>Grievance Redressal</strong>: File complaints with our designated Grievance Redressal Officer.</li>
          </ul>
        </section>

        <section className="space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">4. Designated Data Protection & Grievance Officer</h2>
          <p className="text-xs text-slate-600">For DPDP inquiries, consent withdrawal, or data rights requests, contact our officer:</p>
          <div className="text-xs font-medium text-slate-800 pt-2 space-y-1">
            <div><strong>Grievance Officer</strong>: DPDP Legal Compliance Cell, NirmalTag</div>
            <div><strong>Email</strong>: <a href="mailto:grievance@nirmaltag.org" className="text-emerald-700 font-bold underline">grievance@nirmaltag.org</a></div>
            <div><strong>Official Address</strong>: Municipal Civic Center, Rohini Zone, New Delhi 110085, India</div>
          </div>
        </section>
      </div>
    </div>
  );
}
