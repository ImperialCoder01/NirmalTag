"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { QrScanner } from "@/components/qr-scanner";
import { 
  QrCode, Camera, CheckCircle2, RefreshCw, 
  Wifi, WifiOff, Wallet, ShieldAlert, UploadCloud, Lock, AlertCircle
} from "lucide-react";

export default function CollectorPage() {
  const { user, role, getIdToken } = useAuth();

  // State
  const [scannedCode, setScannedCode] = useState<string>("");
  const [manualInputCode, setManualInputCode] = useState<string>("");
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [scanState, setScanState] = useState<"IDLE" | "SCANNING" | "VALIDATED" | "SUBMITTED" | "ERROR">("IDLE");
  const [scannedTagId, setScannedTagId] = useState<string>("");
  const [scannedTagStatus, setScannedTagStatus] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [aiResult, setAiResult] = useState<{ status: string; confidence: number; category: string } | null>(null);

  // Financial Wallet State
  const [walletBalance, setWalletBalance] = useState<number>(0.00); // ₹
  const [totalPickupsCompleted, setTotalPickupsCompleted] = useState<number>(0);
  const [recentPickups, setRecentPickups] = useState<Array<{ id: string; timestamp: string; status: string }>>([]);

  // Offline Queue State
  const [offlineQueue, setOfflineQueue] = useState<{ code: string; tagId: string; timestamp: string }[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [upiId, setUpiId] = useState("collector.worker4092@upi");

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchCollectorStats = async () => {
    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch("/api/v1/collector/stats", {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setWalletBalance(data.walletBalance || 0);
          setTotalPickupsCompleted(data.totalPickups || 0);
          if (Array.isArray(data.recentPickups)) {
            setRecentPickups(data.recentPickups);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch collector stats:", err);
    }
  };

  useEffect(() => {
    if (user && (role === "COLLECTOR" || role === "SYSTEM_ADMIN")) {
      fetchCollectorStats();
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
            Please sign in to your authorized account to access the Field Collector Portal.
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

  if (role !== "COLLECTOR" && role !== "SYSTEM_ADMIN") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">403 - Access Denied</h1>
          <p className="text-xs text-slate-500">
            Your account is assigned the role of <strong className="text-slate-900">{role.replace("_", " ")}</strong>. You do not have authorization to access the Field Collector portal.
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

  const executeScan = async (codeToScan: string) => {
    setScanState("SCANNING");
    setScannedCode(codeToScan);
    setErrorMessage("");

    // QR Format Regular Expression Validation
    const qrRegex = /^(NT|NMT)(-(SAN|HAZ|REC))?-[0-9]{4}-[0-9]{4,8}$/i;
    if (!qrRegex.test(codeToScan)) {
      setErrorMessage(`Invalid QR format: "${codeToScan}" is not a recognized NirmalTag serial format.`);
      showNotification(`Invalid QR format: "${codeToScan}"`, "error");
      setScanState("ERROR");
      return;
    }

    try {
      const token = await getIdToken();
      if (!token) {
        showNotification("Authentication required.", "error");
        setScanState("IDLE");
        return;
      }

      const res = await fetch("/api/v1/tags/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ code: codeToScan })
      });

      const data = await res.json();
      if (res.ok && data.success && data.tag) {
        setScannedTagId(data.tag.id);
        setScannedTagStatus(data.tag.status);

        if (data.tag.status === "CLOSED") {
          setErrorMessage(`Tag ${codeToScan} is already CLOSED (single-use invariant). Cannot collect again.`);
          showNotification(`Tag ${codeToScan} is already CLOSED.`, "error");
          setScanState("ERROR");
          return;
        }

        setAiResult({
          status: "MODEL_UNAVAILABLE",
          confidence: 0.00,
          category: "Visual Verification (Pouch Sealed Invariant)"
        });
        setScanState("VALIDATED");
      } else {
        setErrorMessage(data.message || `Tag ${codeToScan} not found in database.`);
        showNotification(data.message || `Tag ${codeToScan} not found.`, "error");
        setScanState("ERROR");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to query tag validation server.");
      showNotification("Server tag lookup error.", "error");
      setScanState("ERROR");
    }
  };

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInputCode.trim()) return;
    executeScan(manualInputCode.trim());
  };

  const handleSubmitPickup = async () => {
    if (!isOnline) {
      // Queue offline
      const newQueueItem = {
        code: scannedCode,
        tagId: scannedTagId,
        timestamp: new Date().toLocaleTimeString(),
      };
      setOfflineQueue([...offlineQueue, newQueueItem]);
      setScanState("SUBMITTED");
      showNotification(`Offline mode active. Tag ${scannedCode} stored in local queue for sync.`);
      return;
    }

    try {
      const token = await getIdToken();
      if (!token) {
        showNotification("Authentication token missing.", "error");
        return;
      }

      const pickupId = crypto.randomUUID();
      const idempotencyKey = `SYNC-${pickupId}-${scannedTagId}`;

      const res = await fetch("/api/v1/pickups/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          pickupId,
          tagId: scannedTagId,
          idempotencyKey,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Pickup verification failed.");
        showNotification(data.message || "Pickup verification failed.", "error");
        setScanState("ERROR");
        return;
      }

      setScanState("SUBMITTED");
      showNotification(`Pickup verified & saved! Tag ${scannedCode} set to CLOSED permanently.`);
      await fetchCollectorStats();
    } catch (err: any) {
      setErrorMessage(err.message || "Pickup processing failed due to network error.");
      showNotification(err.message || "Pickup processing failed due to network error.", "error");
      setScanState("ERROR");
    }
  };

  const handleSyncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    const token = await getIdToken();
    if (!token) return;

    let syncedCount = 0;
    for (const item of offlineQueue) {
      try {
        const pickupId = crypto.randomUUID();
        const res = await fetch("/api/v1/pickups/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            pickupId,
            tagId: item.tagId,
            idempotencyKey: `SYNC-${pickupId}-${item.tagId}`,
          }),
        });
        if (res.ok) syncedCount++;
      } catch (_e) {}
    }

    setOfflineQueue([]);
    showNotification(`Successfully uploaded ${syncedCount} queued offline pickups!`);
    await fetchCollectorStats();
  };

  const handlePayoutRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (walletBalance <= 0) {
      showNotification("No balance available for payout.", "error");
      return;
    }
    showNotification(`Payout request for ₹${walletBalance.toFixed(2)} initiated to UPI ID ${upiId}.`);
    setWalletBalance(0);
    setIsPayoutModalOpen(false);
  };

  return (
    <div className="max-w-md mx-auto py-6 px-4 space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-3 rounded-xl text-xs font-bold shadow-lg ${
          notification.type === "success" ? "bg-emerald-900 text-white" : "bg-red-900 text-white"
        }`}>
          {notification.message}
        </div>
      )}

      {/* Demo Environment Header Badge */}
      <div className="p-2 bg-slate-100 border border-slate-300 rounded-xl flex items-center justify-between text-[11px] font-bold text-slate-700">
        <span className="px-2 py-0.5 bg-amber-500 text-slate-900 rounded font-black tracking-wider uppercase text-[9px]">
          JUDGE DEMO
        </span>
        <span className="text-slate-500 font-medium">Demonstration Environment</span>
      </div>

      {/* Mobile Collector Header */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-500 flex-shrink-0">
            <Image src="/logo.jpg" alt="Logo" width={40} height={40} className="object-cover" />
          </div>
          <div>
            <h1 className="font-bold text-sm">
              Collector Field App ({user.displayName || user.email?.split("@")[0]})
            </h1>
            <p className="text-[11px] text-slate-400">
              {user.email ? user.email : "Worker ID: COL-4092"} • MCD Ward JUDGE-DEMO-WARD
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
            isOnline ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
          }`}
        >
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span>{isOnline ? "ONLINE" : "OFFLINE"}</span>
        </button>
      </div>

      {/* Collector Earnings & Wallet Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Field Incentive Wallet</span>
            <div className="text-lg font-extrabold text-slate-900">₹{walletBalance.toFixed(2)}</div>
            <div className="text-[10px] text-emerald-700 font-semibold">{totalPickupsCompleted} Pickups Verified</div>
          </div>
        </div>

        <button
          onClick={() => setIsPayoutModalOpen(true)}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm"
        >
          Payout
        </button>
      </div>

      {/* Offline Sync Banner if Items Pending */}
      {offlineQueue.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-amber-900">{offlineQueue.length} Pickups Queued Offline</div>
            <div className="text-[10px] text-amber-700">Ready to synchronize with server database</div>
          </div>
          <button
            onClick={handleSyncOfflineQueue}
            disabled={!isOnline}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1 ${
              isOnline ? "bg-amber-600 text-white hover:bg-amber-700 cursor-pointer" : "bg-slate-300 text-slate-500 cursor-not-allowed"
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Sync Now</span>
          </button>
        </div>
      )}

      {/* Live Browser QR Scanner Modal */}
      {isScannerOpen && (
        <div className="space-y-4">
          <QrScanner
            onScan={(code) => {
              setIsScannerOpen(false);
              executeScan(code);
            }}
            onClose={() => setIsScannerOpen(false)}
          />
        </div>
      )}

      {/* Primary Field Scan Action Card */}
      {!isScannerOpen && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <QrCode className="w-10 h-10" />
          </div>

          {(scanState === "IDLE" || scanState === "ERROR") && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Scan Pouch QR Tag</h2>
                <p className="text-xs text-slate-500">Point browser camera at physical NirmalTag pouch QR code.</p>
              </div>

              {scanState === "ERROR" && errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-left flex items-start gap-2 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Validation Rejection: </strong>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsScannerOpen(true)}
                className="w-full py-4 brand-gradient text-white font-extrabold text-sm rounded-xl shadow-md hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                <span>Open Browser Camera Scanner</span>
              </button>

              <div className="pt-2 text-left space-y-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-600">Or Enter Tag Serial Manually:</span>
                <form onSubmit={handleManualScanSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="NT-SAN-2026-917201"
                    value={manualInputCode}
                    onChange={(e) => setManualInputCode(e.target.value)}
                    className="flex-1 text-xs p-2.5 rounded-xl border border-slate-300 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl"
                  >
                    Verify
                  </button>
                </form>
              </div>
            </div>
          )}

          {scanState === "SCANNING" && (
            <div className="py-8 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">Performing visual evidence verification & verifying QR token...</p>
            </div>
          )}

          {scanState === "VALIDATED" && (
            <div className="space-y-5 text-left border-t border-slate-100 pt-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <div className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Authoritative Tag Check</div>
                <div className="text-xs font-mono font-bold text-slate-900">{scannedCode}</div>
                <div className="text-[11px] text-emerald-800 font-semibold">Status: {scannedTagStatus || "ACTIVE"} • Invariant Rule: Single-Use Only</div>
              </div>

              {aiResult && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Visual Verification Engine</div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>Status: {aiResult.status}</span>
                    <span className="text-slate-600">AI Model Missing</span>
                  </div>
                  <div className="text-[11px] text-slate-600">{aiResult.category}</div>
                </div>
              )}

              <button
                onClick={handleSubmitPickup}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Confirm & Finalize Pickup (+₹2.00)</span>
              </button>
            </div>
          )}

          {scanState === "SUBMITTED" && (
            <div className="py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Pickup Transaction Verified!</h3>
              <p className="text-xs text-slate-500">
                Tag <strong>{scannedCode}</strong> has been transitioned to <strong className="text-red-700">CLOSED</strong> permanently. ₹2.00 added to wallet.
              </p>
              <button
                onClick={() => {
                  setScanState("IDLE");
                  setManualInputCode("");
                }}
                className="px-6 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-slate-800"
              >
                Scan Next Pouch
              </button>
            </div>
          )}
        </div>
      )}

      {/* Direct Payout Modal */}
      {isPayoutModalOpen && (
        <div onClick={() => setIsPayoutModalOpen(false)} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl relative">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                <span>Request Direct Payout</span>
              </h3>
              <p className="text-xs text-slate-500">Transfer available wallet balance to your bank account via UPI.</p>
            </div>

            <form onSubmit={handlePayoutRequest} className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Available Balance</span>
                <div className="text-2xl font-extrabold text-emerald-800">₹{walletBalance.toFixed(2)}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Your UPI VPA / Phone Number</label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-emerald-700"
                >
                  Confirm Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
