"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth, UserRole, getRedirectPath } from "@/lib/auth-context";
import { 
  Coins, QrCode, Clock, Gift, CheckCircle2, Plus, 
  Calendar, ShieldAlert, ShoppingBag, X, Sparkles, ArrowRight
} from "lucide-react";

export default function HouseholdPage() {
  const { user, role, setRole } = useAuth();

  // State
  const [creditBalance, setCreditBalance] = useState<number>(140);
  const [assignedTags, setAssignedTags] = useState([
    { code: "NMT-2026-89A4B-000492", category: "Sanitary Waste", status: "ACTIVE", assignedDate: "2026-10-02" },
    { code: "NMT-2026-89A4B-000493", category: "Child & Adult Diapers", status: "ACTIVE", assignedDate: "2026-10-02" },
    { code: "NMT-2026-89A4B-000490", category: "Sanitary Waste", status: "CLOSED", assignedDate: "2026-09-28" },
  ]);

  const [pickupHistory, setPickupHistory] = useState([
    { id: "PKP-9021", date: "2026-09-28 09:15 AM", category: "Sanitary Waste", points: "+10 Pts", status: "VERIFIED" },
    { id: "PKP-8910", date: "2026-09-24 08:30 AM", category: "Diapers", points: "+12 Pts", status: "VERIFIED" },
    { id: "PKP-8540", date: "2026-09-20 10:00 AM", category: "Sanitary Waste", points: "+10 Pts", status: "VERIFIED" },
  ]);

  // Modal States
  const [isRegisterTagOpen, setIsRegisterTagOpen] = useState(false);
  const [isBookPickupOpen, setIsBookPickupOpen] = useState(false);
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);

  // Form Fields
  const [newTagCode, setNewTagCode] = useState("");
  const [newTagCategory, setNewTagCategory] = useState("Sanitary Waste");
  const [selectedTagForPickup, setSelectedTagForPickup] = useState("");
  const [pickupDate, setPickupDate] = useState("2026-10-04");
  const [pickupTimeSlot, setPickupTimeSlot] = useState("08:00 AM - 11:00 AM");
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
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRegisterNewTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tagCode = newTagCode.trim() || `NMT-2026-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
    
    const newTag = {
      code: tagCode,
      category: newTagCategory,
      status: "ACTIVE",
      assignedDate: new Date().toISOString().split("T")[0],
    };

    setAssignedTags([newTag, ...assignedTags]);
    setNewTagCode("");
    setIsRegisterTagOpen(false);
    showNotification(`Successfully registered new tag ${tagCode}!`);
  };

  const handleBookPickup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTagForPickup) {
      showNotification("Please select an active tag to book pickup.", "error");
      return;
    }

    const newPickup = {
      id: `PKP-${Math.floor(1000 + Math.random() * 9000)}`,
      date: `${pickupDate} (${pickupTimeSlot})`,
      category: assignedTags.find(t => t.code === selectedTagForPickup)?.category || "Sanitary Waste",
      points: "+10 Pts (Pending Verification)",
      status: "SCHEDULED",
    };

    setPickupHistory([newPickup, ...pickupHistory]);
    setIsBookPickupOpen(false);
    showNotification(`Pickup request ${newPickup.id} scheduled for ${pickupDate}!`);
  };

  const handleRedeemReward = (reward: typeof rewardsList[0]) => {
    if (creditBalance < reward.cost) {
      showNotification(`Insufficient credit points! You need ${reward.cost - creditBalance} more points.`, "error");
      return;
    }

    setCreditBalance(prev => prev - reward.cost);
    setPickupHistory([
      {
        id: `RED-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toLocaleString(),
        category: `Reward: ${reward.title}`,
        points: `-${reward.cost} Pts`,
        status: "REDEEMED",
      },
      ...pickupHistory,
    ]);
    showNotification(`Successfully redeemed "${reward.title}"! Voucher code sent to email.`);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Role Banner / Guard Check */}
      {role !== "HOUSEHOLD" && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span className="text-xs font-semibold">
              Your active role is currently set as <strong>{role.replace("_", " ")}</strong>. You are previewing the Household Resident Portal.
            </span>
          </div>
          <button
            onClick={() => setRole("HOUSEHOLD")}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex-shrink-0"
          >
            Switch Role to Household
          </button>
        </div>
      )}

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
                Welcome, {user ? (user.displayName || user.email?.split("@")[0] || "Household Resident") : "Household Resident"}
              </h1>
              <p className="text-xs text-slate-500">
                {user?.email ? `Account: ${user.email} • ` : ""}Rohini Sector 7, Block B, Flat 402 • MCD Ward 42
              </p>
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Household Account (DPDP Compliant)</span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsRegisterTagOpen(true)}
              className="flex-1 sm:flex-none py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Register Tag</span>
            </button>
            <button
              onClick={() => setIsBookPickupOpen(true)}
              className="flex-1 sm:flex-none py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Book Pickup</span>
            </button>
          </div>
        </div>

        {/* Balance Card */}
        <div className="brand-gradient text-white p-6 rounded-2xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Circular Credit Balance</span>
            <Coins className="w-6 h-6 text-emerald-300" />
          </div>
          <div className="py-2">
            <span className="text-4xl font-extrabold">{creditBalance}</span>
            <span className="text-sm font-semibold text-emerald-100 ml-2">Points</span>
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
              <span>My Assigned Pouch Tags</span>
            </h2>
            <button
              onClick={() => setIsRegisterTagOpen(true)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New</span>
            </button>
          </div>

          <div className="space-y-3">
            {assignedTags.map((t, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono font-bold text-emerald-900">{t.code}</div>
                  <div className="text-xs font-medium text-slate-600 mt-0.5">{t.category}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Assigned: {t.assignedDate}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    t.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                  }`}>
                    {t.status}
                  </span>
                  {t.status === "ACTIVE" && (
                    <button
                      onClick={() => {
                        setSelectedTagForPickup(t.code);
                        setIsBookPickupOpen(true);
                      }}
                      className="px-2.5 py-1 bg-emerald-600 text-white font-bold text-[10px] rounded-lg hover:bg-emerald-700"
                    >
                      Book
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pickup & Ledger History */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            <span>Pickup & Reward History</span>
          </h2>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
            {pickupHistory.map((p, idx) => (
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
            ))}
          </div>
        </div>
      </div>

      {/* MODAL 1: REGISTER TAG */}
      {isRegisterTagOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsRegisterTagOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                <span>Register Single-Use Pouch Tag</span>
              </h3>
              <p className="text-xs text-slate-500">Scan or enter code printed on your official NirmalTag pouch.</p>
            </div>

            <form onSubmit={handleRegisterNewTag} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tag QR Code (Leave blank to generate demo code)</label>
                <input
                  type="text"
                  placeholder="e.g. NMT-2026-89A4B-000495"
                  value={newTagCode}
                  onChange={(e) => setNewTagCode(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Waste Category</label>
                <select
                  value={newTagCategory}
                  onChange={(e) => setNewTagCategory(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Sanitary Waste">Sanitary Waste (Pads/Tampons)</option>
                  <option value="Child & Adult Diapers">Child & Adult Diapers</option>
                  <option value="Incontinence Care">Incontinence Care Products</option>
                  <option value="Special Household Medical">Special Household Medical Waste</option>
                </select>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl text-[11px] text-emerald-900 space-y-1">
                <strong>Single-Use Invariant Notice:</strong>
                <p>Once scanned and verified by the collector during pickup, this tag will transition to CLOSED permanently and cannot be reused.</p>
              </div>

              <button
                type="submit"
                className="w-full py-3 brand-gradient text-white font-bold text-xs rounded-xl shadow-md hover:opacity-95"
              >
                Register Pouch Tag
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BOOK PICKUP */}
      {isBookPickupOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsBookPickupOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <span>Schedule Doorstep Pickup</span>
              </h3>
              <p className="text-xs text-slate-500">Request authorized municipal collector doorstep visit.</p>
            </div>

            <form onSubmit={handleBookPickup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Active Pouch Tag</label>
                <select
                  value={selectedTagForPickup}
                  onChange={(e) => setSelectedTagForPickup(e.target.value)}
                  required
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Choose active tag --</option>
                  {assignedTags.filter(t => t.status === "ACTIVE").map(t => (
                    <option key={t.code} value={t.code}>
                      {t.code} ({t.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pickup Date</label>
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time Window</label>
                  <select
                    value={pickupTimeSlot}
                    onChange={(e) => setPickupTimeSlot(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="08:00 AM - 11:00 AM">Morning (08:00 - 11:00 AM)</option>
                    <option value="11:00 AM - 02:00 PM">Noon (11:00 AM - 02:00 PM)</option>
                    <option value="04:00 PM - 07:00 PM">Evening (04:00 - 07:00 PM)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md"
              >
                Confirm Pickup Schedule
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REDEEM REWARDS CATALOG */}
      {isRedeemOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative">
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
                  {creditBalance} Points Available
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
