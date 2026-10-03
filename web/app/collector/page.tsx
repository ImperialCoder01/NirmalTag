"use client";

import { useState } from "react";
import Image from "next/image";
import { QrCode, Camera, CheckCircle2, AlertOctagon, RefreshCw, Smartphone, Wifi, WifiOff } from "lucide-react";

export default function CollectorPage() {
  const [scannedCode, setScannedCode] = useState<string>("");
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [scanState, setScanState] = useState<"IDLE" | "SCANNING" | "VALIDATED" | "SUBMITTED" | "ERROR">("IDLE");
  const [aiResult, setAiResult] = useState<{ status: string; confidence: number } | null>(null);

  const handleSimulateScan = () => {
    setScanState("SCANNING");
    setTimeout(() => {
      setScannedCode("NMT-2026-89A4B-000492");
      setAiResult({ status: "VERIFIED", confidence: 0.94 });
      setScanState("VALIDATED");
    }, 1000);
  };

  const handleSubmitPickup = () => {
    setScanState("SUBMITTED");
  };

  return (
    <div className="max-w-md mx-auto py-6 px-4 space-y-6">
      {/* Mobile Collector Header */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-500">
            <Image src="/logo.jpg" alt="Logo" width={40} height={40} className="object-cover" />
          </div>
          <div>
            <h1 className="font-bold text-sm">Collector Field App</h1>
            <p className="text-[11px] text-slate-400">Worker ID: COL-4092 • Ward 42</p>
          </div>
        </div>

        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
            isOnline ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
          }`}
        >
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span>{isOnline ? "ONLINE" : "OFFLINE QUEUE"}</span>
        </button>
      </div>

      {/* Primary Field Scan Action */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
          <QrCode className="w-10 h-10" />
        </div>

        {scanState === "IDLE" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Scan Pouch QR Tag</h2>
              <p className="text-xs text-slate-500">Point camera at physical NirmalTag pouch QR code.</p>
            </div>
            <button
              onClick={handleSimulateScan}
              className="w-full py-4 brand-gradient text-white font-extrabold text-sm rounded-xl shadow-md hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              <span>Open Field Camera Scanner</span>
            </button>
          </div>
        )}

        {scanState === "SCANNING" && (
          <div className="py-8 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">Validating QR token & running on-device AI check...</p>
          </div>
        )}

        {scanState === "VALIDATED" && (
          <div className="space-y-5 text-left border-t border-slate-100 pt-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
              <div className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Authoritative Tag Check</div>
              <div className="text-xs font-mono font-bold text-slate-900">{scannedCode}</div>
              <div className="text-[11px] text-emerald-800 font-semibold">Status: ACTIVE • Category: Sanitary Waste</div>
            </div>

            {aiResult && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">On-Device AI Vision Check</div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span>Prediction: {aiResult.status}</span>
                  <span className="text-emerald-700">{(aiResult.confidence * 100).toFixed(0)}% Confidence</span>
                </div>
              </div>
            )}

            <button
              onClick={handleSubmitPickup}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Finalize Pickup</span>
            </button>
          </div>
        )}

        {scanState === "SUBMITTED" && (
          <div className="py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Pickup Transaction Verified!</h3>
            <p className="text-xs text-slate-500">Tag CLOSED permanently. ₹2.00 handling incentive added to wallet.</p>
            <button
              onClick={() => setScanState("IDLE")}
              className="px-6 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg shadow-sm"
            >
              Scan Next Pouch
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
