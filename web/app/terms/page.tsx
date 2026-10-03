import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, FileCheck, Layers, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Terms & Conditions — NirmalTag Platform",
  description: "Official Terms and Conditions for NirmalTag Waste Segregation & Circular Credit Network",
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-600 flex-shrink-0">
            <Image src="/logo.jpg" alt="NirmalTag Logo" width={56} height={56} className="object-cover" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Terms & Conditions of Service</h1>
            <p className="text-xs text-slate-500">Last Updated: October 3, 2026 • Platform Rules & Single-Use Invariants</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8 text-slate-700 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-600" />
            <span>1. Acceptance of Platform Terms</span>
          </h2>
          <p>
            By accessing or using the NirmalTag platform (web portal or mobile scanner application), you agree to be bound by these Terms & Conditions. NirmalTag is an authorized civic waste management system operating in coordination with municipal entities (MCD, RWAs, BWGs).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <span>2. Single-Use Tag Invariants & Proper Pouch Use</span>
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-slate-600">
            <li><strong>Single-Use Invariant</strong>: Physical QR tags attached to pouches represent ONE collection cycle. Once closed, tags become permanently `CLOSED` and cannot be reused.</li>
            <li><strong>Authorized Categories</strong>: Household residents must use designated pouches strictly for authorized waste categories (`SANITARY`, `DIAPER`, `INCONTINENCE`, `SMALL_MEDICAL`, `SPECIAL_CARE`).</li>
            <li><strong>Prohibited Tampering</strong>: Copying, photographing, replaying, or altering QR codes to claim duplicate rewards is strictly prohibited and subject to account suspension and municipal reporting.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>3. Non-Economic Representation of Rewards</span>
          </h2>
          <p>
            Household Segregation Credits are non-monetary points awarded for compliant segregation. Credits are non-transferable, carry no legal cash equivalent, and may be redeemed solely for designated catalog rewards or partner municipal benefit vouchers per policy rules.
          </p>
        </section>
      </div>
    </div>
  );
}
