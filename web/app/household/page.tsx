"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { 
  Coins, QrCode, Clock, Gift, CheckCircle2, RefreshCw,
  ShieldAlert, X, Lock
} from "lucide-react";

export default function HouseholdPage() {
  const { user, role, getIdToken } = useAuth();

  // State
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [assignedTags, setAssignedTags] = useState<Array<{
    id: string;
    code: string;
    category: string;
    status: string;
    assignedDate: string;
    activatedDate: string | null;
  }>>([]);

  const [pickupHistory, setPickupHistory] = useState<Array<{
    id: string;
    date: string;
    category: string;
    points: string;
    status: string;
  }>>([]);

  // Modal States
  const [isActivateOpen, setIsActivateOpen] = useState(false);
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [selectedTagToActivate, setSelectedTagToActivate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Rewards catalog items
  const rewardsList = [
    { id: "REW-1", title: "₹50 Electricity Bill Discount Voucher", cost: 50, provider: "BSES Yamuna / Rajdhani" },
    { id: "REW-2", title: "₹100 Delhi Metro / DTC Transit Pass", cost: 100, provider: "DMRC Transit Rewards" },
    { id: "REW-3", title: "1kg Organic Waste Compost Pack", cost: 30, provider: "MCD Green Rewards" },
    { id: "REW-4", title: "₹150 Grocery Discount Voucher", cost: 150, provider: "Mother Dairy / Safal" },
  ];

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchHouseholdData = async () => {
    try {
      const token = await getIdToken();
      if (!token) return;

      const headers = { "Authorization": `Bearer ${token}` };

      // Fetch assigned tags
      const resTags = await fetch("/api/v1/household/tags", { headers });
      if (resTags.ok) {
        const tagData = await resTags.json();
        if (tagData.success && Array.isArray(tagData.tags)) {
          setAssignedTags(tagData.tags);
        }
      }

      // Fetch credits & transactions
      const resCreds = await fetch("/api/v1/household/credits", { headers });
      if (resCreds.ok) {
        const credData = await resCreds.json();
        if (credData.success) {
          setCreditBalance(credData.balance || 0);
          if (Array.isArray(credData.transactions)) {
            setPickupHistory(credData.transactions);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch household data:", err);
    }
  };

  useEffect(() => {
    if (user && (role === "HOUSEHOLD" || role === "SYSTEM_ADMIN")) {
      fetchHouseholdData();
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
            Please sign in to your authorized account to access the Household Resident Portal.
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

  if (role !== "HOUSEHOLD" && role !== "SYSTEM_ADMIN") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">403 - Access Denied</h1>
          <p className="text-xs text-slate-500">
            Your account is assigned the role of <strong className="text-slate-900">{role.replace("_", " ")}</strong>. You do not have authorization to access the Household Resident portal.
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

  const handleActivateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTagToActivate) return;

    setIsSubmitting(true);
    try {
      const token = await getIdToken();
      if (!token) {
        showNotification("Authentication token missing.", "error");
        setIsSubmitting(false);
        return;
      }

      const res = await fetch("/api/v1/household/activate-tag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ tagId: selectedTagToActivate }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showNotification(data.message || "Tag activation failed.", "error");
        setIsSubmitting(false);
        return;
      }

      showNotification("Tag activated successfully! Ready for doorstep waste deposition.", "success");
      setIsActivateOpen(false);
      setSelectedTagToActivate("");
      await fetchHouseholdData();
    } catch (err: any) {
      showNotification(err.message || "Tag activation request failed.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRedeemReward = async (reward: typeof rewardsList[0]) => {
    if (creditBalance < reward.cost) {
      showNotification(`Insufficient credit points! You need ${reward.cost - creditBalance} more points.`, "error");
      return;
    }

    try {
      const token = await getIdToken();
      if (!token) {
        showNotification("Authentication token missing.", "error");
        return;
      }

      const res = await fetch("/api/v1/household/redeem-reward", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          rewardItemName: reward.title,
          creditsSpent: reward.cost,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showNotification(data.message || "Redemption request failed.", "error");
        return;
      }

      showNotification(`Successfully redeemed "${reward.title}"! ${reward.cost} points deducted.`, "success");
      setIsRedeemOpen(false);
      await fetchHouseholdData();
    } catch (err: any) {
      showNotification(err.message || "Failed to process reward redemption.", "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-xl border text-xs font-bold shadow-lg transition-all ${
          notification.type === "success" 
            ? "bg-emerald-900 text-white border-emerald-700" 
            : "bg-red-900 text-white border-red-700"
        }`}>
          {notification.message}
        </div>
      )}

      {/* Header & Balance Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-600 flex-shrink-0">
              <Image src="/logo.jpg" alt="Logo" width={64} height={64} className="object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Welcome, {user.displayName || user.email?.split("@")[0] || "Household Resident"}
              </h1>
              <p className="text-xs text-slate-500">
                {user.email ? `Account: ${user.email} • ` : ""}MCD Ward 42 Scope
              </p>
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Household Account (DPDP Compliant)</span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsActivateOpen(true)}
              className="flex-1 sm:flex-none py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <QrCode className="w-4 h-4" />
              <span>Activate Assigned Tag</span>
            </button>
          </div>
        </div>

        {/* Balance Card */}
        <div className="brand-gradient text-white p-6 rounded-2xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Circular Credit Balance (Ledger Derived)</span>
            <Coins className="w-6 h-6 text-emerald-300" />
          </div>
          <div className="py-2">
            <span className="text-4xl font-extrabold">{creditBalance}</span>
            <span className="text-sm font-semibold text-emerald-100 ml-2">Eco-Points</span>
          </div>
          <button
            onClick={() => setIsRedeemOpen(true)}
            className="w-full py-2 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Gift className="w-4 h-4" />
            <span>Redeem Rewards Catalog</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Pouch Tags */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" />
              <span>My Assigned Pouch Tags in Database</span>
            </h2>
          </div>

          <div className="space-y-3">
            {assignedTags.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                No tags currently assigned to your household profile. Contact your Tag Officer for serial allocation.
              </div>
            ) : (
              assignedTags.map((t, idx) => (
                <div key={t.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono font-bold text-emerald-900">{t.code}</div>
                    <div className="text-xs font-medium text-slate-600 mt-0.5">{t.category}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Assigned Date: {t.assignedDate}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      t.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" :
                      t.status === "ASSIGNED" ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-600"
                    }`}>
                      {t.status}
                    </span>
                    {t.status === "ASSIGNED" && (
                      <button
                        onClick={() => {
                          setSelectedTagToActivate(t.id);
                          setIsActivateOpen(true);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 text-white font-bold text-[10px] rounded-lg hover:bg-emerald-700"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pickup & Ledger History */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            <span>Verified Pickup Ledger History</span>
          </h2>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
            {pickupHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No verified pickup transactions recorded in your credit ledger yet.
              </div>
            ) : (
              pickupHistory.map((p, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">{p.category}</div>
                    <div className="text-[11px] text-slate-500">{p.date} • {p.id}</div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-extrabold ${p.points.startsWith("-") ? "text-red-600" : "text-emerald-700"}`}>
                      {p.points}
                    </span>
                    <span className="block text-[10px] text-slate-500 font-semibold">{p.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: ACTIVATE TAG */}
      {isActivateOpen && (
        <div onClick={() => setIsActivateOpen(false)} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsActivateOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                <span>Activate Assigned Pouch Tag</span>
              </h3>
              <p className="text-xs text-slate-500">Transition assigned tag status from ASSIGNED to ACTIVE for doorstep deposition.</p>
            </div>

            <form onSubmit={handleActivateTag} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Tag to Activate</label>
                <select
                  value={selectedTagToActivate}
                  onChange={(e) => setSelectedTagToActivate(e.target.value)}
                  required
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Choose tag --</option>
                  {assignedTags.filter(t => t.status === "ASSIGNED").map(t => (
                    <option key={t.id} value={t.id}>
                      {t.code} ({t.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl text-[11px] text-emerald-900 space-y-1">
                <strong>Authorization Invariant:</strong>
                <p>You can only activate tags assigned to your authenticated household identity in PostgreSQL.</p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !selectedTagToActivate}
                className="w-full py-3 brand-gradient text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Activate Tag for Pickup</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REDEEM REWARDS CATALOG */}
      {isRedeemOpen && (
        <div onClick={() => setIsRedeemOpen(false)} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsRedeemOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-emerald-600" />
                  <span>Circular Credit Rewards Catalog</span>
                </h3>
                <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                  {creditBalance} Points
                </span>
              </div>
              <p className="text-xs text-slate-500">Redeem points for utility discounts, transit passes, and eco-vouchers.</p>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {rewardsList.map((reward) => {
                const canAfford = creditBalance >= reward.cost;
                return (
                  <div key={reward.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{reward.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Partner: {reward.provider}</p>
                      <div className="mt-1 text-xs font-extrabold text-emerald-700">{reward.cost} Points</div>
                    </div>
                    <button
                      onClick={() => handleRedeemReward(reward)}
                      disabled={!canAfford}
                      className={`px-3 py-2 text-xs font-bold rounded-xl shadow-sm transition-all ${
                        canAfford 
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" 
                          : "bg-slate-200 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      {canAfford ? "Redeem Now" : "Need Points"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
