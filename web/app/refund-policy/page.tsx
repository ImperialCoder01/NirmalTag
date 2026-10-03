import Image from "next/image";
import { Coins, RefreshCw, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Refund & Credit Policy — NirmalTag Platform",
  description: "Official Refund and Circular Credit Adjustment Policy for NirmalTag",
};

export default function RefundPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-600 flex-shrink-0">
            <Image src="/logo.jpg" alt="NirmalTag Logo" width={56} height={56} className="object-cover" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Refund & Credit Adjustment Policy</h1>
            <p className="text-xs text-slate-500">Circular Credit Ledgers & Handling Incentive Adjustments</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 text-slate-700 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-600" />
            <span>1. Credit Points & Rewards Policy</span>
          </h2>
          <p>
            Household Segregation Credits are non-cash rewards. In the event of a disputed or rejected collection, compensating transactions (`REVERSAL` or `ADJUST`) are recorded in the immutable database ledger without deleting transaction audit history.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-emerald-600" />
            <span>2. Defective Pouch Tag Replacement</span>
          </h2>
          <p>
            If a physical pouch tag is damaged, defective, or misprinted upon distribution, households or Tag Officers may request a zero-cost replacement via the Tag Officer portal.
          </p>
        </section>
      </div>
    </div>
  );
}
