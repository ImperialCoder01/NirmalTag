"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, Check, X } from "lucide-react";

export default function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("nirmaltag_cookie_consent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("nirmaltag_cookie_consent", "accepted");
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem("nirmaltag_cookie_consent", "declined");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-8 md:right-auto md:max-w-md z-50 bg-slate-900 text-white p-5 rounded-2xl shadow-2xl border border-slate-800 space-y-3 text-xs">
      <div className="flex items-start gap-3">
        <Cookie className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-sm text-slate-100">Cookie & Data Consent Notice</span>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            We use strictly necessary operational cookies to manage secure identity sessions in accordance with India's <strong>DPDP Act 2023</strong>.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
        <Link href="/cookies" className="text-emerald-400 font-semibold text-[11px] underline hover:text-emerald-300">
          Read Cookie Policy
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDecline}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] transition-colors"
          >
            Essential Only
          </button>
          <button
            onClick={handleAccept}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-colors"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
