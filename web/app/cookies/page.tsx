import Image from "next/image";
import { Cookie, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Cookie Policy — NirmalTag Platform",
  description: "Cookie Policy and Tracking Preference Transparency for NirmalTag",
};

export default function CookiePolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-600 flex-shrink-0">
            <Image src="/logo.jpg" alt="NirmalTag Logo" width={56} height={56} className="object-cover" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Cookie Policy & Consent Transparency</h1>
            <p className="text-xs text-slate-500">Zero Invasive Ad Trackers • Strictly Necessary Operational Cookies Only</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 text-slate-700 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Cookie className="w-5 h-5 text-emerald-600" />
            <span>Strictly Necessary Technical Cookies</span>
          </h2>
          <p>
            NirmalTag uses ONLY essential session cookies required for authentication and security tokens (`firebase_auth_state`, `supabase_session_token`). We do NOT use third-party advertising cookies or cross-site behavioral tracking scripts.
          </p>
        </section>
      </div>
    </div>
  );
}
