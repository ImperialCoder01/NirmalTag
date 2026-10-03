import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs py-10 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-emerald-500">
            <Image
              src="/logo.jpg"
              alt="NirmalTag Logo"
              width={32}
              height={32}
              className="object-cover"
            />
          </div>
          <div>
            <span className="font-bold text-slate-100 text-sm">NirmalTag Platform</span>
            <p className="text-slate-500 text-[11px]">AI-Verified Waste Segregation & Circular Credit Network</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 text-slate-400">
          <Link href="/household" className="hover:text-emerald-400 transition-colors">Household Portal</Link>
          <Link href="/collector" className="hover:text-emerald-400 transition-colors">Collector Workflow</Link>
          <Link href="/tag-officer" className="hover:text-emerald-400 transition-colors">Tag Officer Batch Hub</Link>
          <Link href="/mcd" className="hover:text-emerald-400 transition-colors">MCD Analytics</Link>
          <Link href="/admin" className="hover:text-emerald-400 transition-colors">System Admin</Link>
        </div>

        <div className="text-slate-500 text-[11px] text-center md:text-right">
          © 2026 NirmalTag Civic Tech. Production Grade Architecture.
        </div>
      </div>
    </footer>
  );
}
