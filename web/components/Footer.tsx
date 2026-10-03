import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-emerald-500 flex-shrink-0">
              <Image
                src="/logo.jpg"
                alt="NirmalTag Brand Logo"
                width={40}
                height={40}
                className="object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-base">NirmalTag Platform</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  DPDP Act 2023 Compliant
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">AI-Verified Waste Segregation & Circular Credit Network</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-slate-300 font-medium text-xs">
            <Link href="/" className="hover:text-emerald-400 transition-colors">Home</Link>
            <Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy (DPDP 2023)</Link>
            <Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms of Service</Link>
            <Link href="/cookies" className="hover:text-emerald-400 transition-colors">Cookie Policy</Link>
            <Link href="/refund-policy" className="hover:text-emerald-400 transition-colors">Refund & Credit Policy</Link>
          </div>
        </div>

        {/* Business & Grievance Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 text-xs">
          <div className="space-y-2">
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Business Details & Office</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              NirmalTag Civic Tech Platform<br />
              Municipal Civic Center, Rohini Zone<br />
              New Delhi 110085, India
            </p>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">DPDP Grievance Redressal</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Grievance Officer: Legal Compliance Cell<br />
              Email: <a href="mailto:grievance@nirmaltag.org" className="text-emerald-400 font-semibold underline">grievance@nirmaltag.org</a>
            </p>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Public Legal Documentation</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-300 text-[11px] font-medium">
              <Link href="/privacy" className="hover:text-emerald-400 underline transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-emerald-400 underline transition-colors">Terms</Link>
              <Link href="/cookies" className="hover:text-emerald-400 underline transition-colors">Cookies</Link>
              <Link href="/refund-policy" className="hover:text-emerald-400 underline transition-colors">Refunds</Link>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800/80 text-slate-500 text-[11px] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© 2026 NirmalTag Civic Tech Platform. All rights reserved. Registered Municipal Civic Solution.</div>
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>DPDP Data Fiduciary Certified</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
