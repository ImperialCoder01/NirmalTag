"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { 
  Coins, QrCode, Clock, Gift, CheckCircle2, RefreshCw,
  ShieldAlert, X, Lock, PackagePlus, Calendar, AlertCircle, Eye, Bell
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

  const [pouchRequests, setPouchRequests] = useState<Array<any>>([]);
  const [pickupAppointments, setPickupAppointments] = useState<Array<any>>([]);
  const [availableSlots, setAvailableSlots] = useState<Array<any>>([]);
  const [notifications, setNotifications] = useState<Array<any>>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);

  // Modal States
  const [isActivateOpen, setIsActivateOpen] = useState(false);
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [isPouchOrderOpen, setIsPouchOrderOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedTagForQr, setSelectedTagForQr] = useState<any>(null);

  // Form States
  const [selectedTagToActivate, setSelectedTagToActivate] = useState("");
  const [orderCategory, setOrderCategory] = useState("SANITARY");
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [bookingTagId, setBookingTagId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTimeWindow, setBookingTimeWindow] = useState("09:00–11:00");
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

      // Fetch pouch requests
      const resPouches = await fetch("/api/v1/household/pouch-request", { headers });
      if (resPouches.ok) {
        const data = await resPouches.json();
        if (data.success) setPouchRequests(data.requests || []);
      }

      // Fetch pickup appointments
      const resPickups = await fetch("/api/v1/household/pickup-request", { headers });
      if (resPickups.ok) {
        const data = await resPickups.json();
        if (data.success) setPickupAppointments(data.pickupRequests || []);
      }

      // Fetch notifications
      const resNotifs = await fetch("/api/v1/notifications", { headers });
      if (resNotifs.ok) {
        const data = await resNotifs.json();
        if (data.success) {
          setNotifications(data.notifications || []);
          setUnreadNotificationCount(data.unreadCount || 0);
        }
      }

      // Fetch slots
      const resSlots = await fetch("/api/v1/household/slots", { headers });
      if (resSlots.ok) {
        const data = await resSlots.json();
        if (data.success) {
          setAvailableSlots(data.slots || []);
          if (data.slots && data.slots.length > 0) {
            setBookingDate(data.slots[0].date);
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

  const handleOrderPouchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/v1/household/pouch-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ categoryCode: orderCategory, quantity: orderQuantity })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`Pouch order submitted! Request ID: ${data.requestId.slice(0, 8)}...`);
        setIsPouchOrderOpen(false);
        await fetchHouseholdData();
      } else {
        showNotification(data.message || "Failed to submit pouch request.", "error");
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to order pouch.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookPickupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingTagId || !bookingDate || !bookingTimeWindow) {
      showNotification("Please select a tag, pickup date, and time window.", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/v1/household/pickup-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ tagId: bookingTagId, pickupDate: bookingDate, timeWindow: bookingTimeWindow })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`Pickup booked for ${bookingDate} (${bookingTimeWindow})!`);
        setIsBookingOpen(false);
        await fetchHouseholdData();
      } else {
        showNotification(data.message || "Pickup booking failed.", "error");
      }
    } catch (err: any) {
      showNotification(err.message || "Booking failed.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelPickup = async (requestId: string) => {
    try {
      const token = await getIdToken();
      const res = await fetch("/api/v1/household/pickup-request", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ requestId, action: "CANCEL", reason: "Cancelled by resident" })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification("Pickup appointment cancelled.");
        await fetchHouseholdData();
      } else {
        showNotification(data.message || "Cancellation failed.", "error");
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to cancel appointment.", "error");
    }
  };

  const handleActivateTagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTagToActivate) return;
    setIsSubmitting(true);

    try {
      const token = await getIdToken();
      const res = await fetch("/api/v1/household/activate-tag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ tagId: selectedTagToActivate })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`Tag activated successfully! Status set to ACTIVE.`);
        setIsActivateOpen(false);
        await fetchHouseholdData();
      } else {
        showNotification(data.message || "Failed to activate tag.", "error");
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to activate tag.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-2xl text-xs font-bold shadow-xl flex items-center justify-between ${
          notification.type === "success" ? "bg-emerald-900 text-white" : "bg-red-900 text-white"
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Demo Badge Header */}
      <div className="p-3 bg-slate-100 border border-slate-300 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-700">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-amber-500 text-slate-900 rounded font-black tracking-wider uppercase text-[10px]">
            JUDGE DEMO
          </span>
          <span>Green Park Colony A-101 • Municipal Ward 42</span>
        </div>
        {unreadNotificationCount > 0 && (
          <div className="flex items-center gap-1 bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full text-[10px] font-bold">
            <Bell className="w-3 h-3 text-amber-700" />
            <span>{unreadNotificationCount} Unread Notifications</span>
          </div>
        )}
      </div>

      {/* Welcome Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-lg">
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
            Verified Resident Portal
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Welcome, {user.displayName || "Household Resident"}
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Order leak-proof sanitary pouches, view scannable QR tags, schedule doorstep pickups, and earn circular waste credits.
          </p>
        </div>

        {/* Action Buttons Header */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => setIsPouchOrderOpen(true)}
            className="flex-1 md:flex-none px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Order Pouch</span>
          </button>

          <button
            onClick={() => setIsBookingOpen(true)}
            className="flex-1 md:flex-none px-4 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-2xl shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Pickup</span>
          </button>
        </div>
      </div>

      {/* Credit Balance & Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Coins className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
              Active Ledger
            </span>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Circular Credit Balance</div>
            <div className="text-3xl font-black text-slate-900 mt-1">{creditBalance} <span className="text-xs text-slate-500 font-semibold">pts</span></div>
            <p className="text-[11px] text-slate-500 mt-1">10 credits = 1 verified sanitary pickup</p>
          </div>
          <button
            onClick={() => setIsRedeemOpen(true)}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <Gift className="w-4 h-4 text-emerald-400" />
            <span>Redeem Rewards</span>
          </button>
        </div>

        {/* Upcoming Appointments Summary */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 md:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Upcoming Pickup Appointments ({pickupAppointments.length})</span>
            </h3>
            <button
              onClick={() => setIsBookingOpen(true)}
              className="text-xs font-bold text-emerald-600 hover:underline"
            >
              + Book New
            </button>
          </div>

          {pickupAppointments.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-300" />
              <p>No active pickup appointments scheduled.</p>
              <button
                onClick={() => setIsBookingOpen(true)}
                className="px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl"
              >
                Schedule First Pickup
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {pickupAppointments.map((app) => (
                <div key={app.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900">
                      {app.pickup_date} • {app.time_window}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Tag: {app.tags?.canonical_code || "NT-SAN-2026"} ({app.waste_categories?.display_name || "Sanitary"})
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                      app.status === "CONFIRMED" || app.status === "ASSIGNED"
                        ? "bg-emerald-100 text-emerald-800"
                        : app.status === "CANCELLED"
                        ? "bg-red-100 text-red-800"
                        : "bg-slate-200 text-slate-700"
                    }`}>
                      {app.status}
                    </span>

                    {app.status !== "CANCELLED" && app.status !== "COMPLETED" && (
                      <button
                        onClick={() => handleCancelPickup(app.id)}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[10px] rounded-lg"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MY NIRMALTAG POUCHES (INVENTORY & QR VIEW) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" />
              <span>My NirmalTag Pouches & QR Inventory</span>
            </h2>
            <p className="text-xs text-slate-500">Every pouch has an authoritative single-use QR tag linked to your household identity.</p>
          </div>
          <button
            onClick={() => setIsPouchOrderOpen(true)}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl"
          >
            + Order More
          </button>
        </div>

        {assignedTags.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-3">
            <PackagePlus className="w-10 h-10 text-slate-300 mx-auto" />
            <p>No active pouches issued yet. Request a pouch order to get started.</p>
            <button
              onClick={() => setIsPouchOrderOpen(true)}
              className="px-5 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md"
            >
              Order Pouch Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {assignedTags.map((tag) => (
              <div key={tag.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-slate-900">{tag.code}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    tag.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-800"
                      : tag.status === "CLOSED"
                      ? "bg-slate-200 text-slate-700"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {tag.status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 space-y-1">
                  <div>Category: <strong>{tag.category || "Sanitary Waste"}</strong></div>
                  <div>Issued Date: {tag.assignedDate ? tag.assignedDate.split("T")[0] : "Recent"}</div>
                </div>

                <div className="flex gap-2 pt-1 border-t border-slate-200/60">
                  <button
                    onClick={() => {
                      setSelectedTagForQr(tag);
                      setIsQrModalOpen(true);
                    }}
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View QR</span>
                  </button>

                  {tag.status === "ASSIGNED" && (
                    <button
                      onClick={() => {
                        setSelectedTagToActivate(tag.id);
                        setIsActivateOpen(true);
                      }}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* POUCH ORDER MODAL */}
      {isPouchOrderOpen && (
        <div onClick={() => setIsPouchOrderOpen(false)} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-emerald-600" />
                <span>Request NirmalTag Pouch</span>
              </h3>
              <button onClick={() => setIsPouchOrderOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleOrderPouchSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Waste Category</label>
                <select
                  value={orderCategory}
                  onChange={(e) => setOrderCategory(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300"
                >
                  <option value="SANITARY">Sanitary Waste (Pads, tampons, liners)</option>
                  <option value="SPECIAL_CARE">Special Care Waste (Medical incontinence, bio-care)</option>
                  <option value="DIAPER">Child & Adult Diapers</option>
                  <option value="SMALL_MEDICAL">Small Household Medical Waste</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pouch Quantity</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(parseInt(e.target.value) || 1)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                <div className="font-bold">Operational Supply Info</div>
                <p className="text-[11px] leading-relaxed">
                  Pouches are issued with single-use tamper-evident seals and pre-printed QR code tags assigned to your household address.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPouchOrderOpen(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  {isSubmitting ? "Submitting..." : "Confirm Pouch Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PICKUP APPOINTMENT BOOKING MODAL */}
      {isBookingOpen && (
        <div onClick={() => setIsBookingOpen(false)} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <span>Book Doorstep Pickup Appointment</span>
              </h3>
              <button onClick={() => setIsBookingOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleBookPickupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Pouch QR Tag</label>
                <select
                  value={bookingTagId}
                  onChange={(e) => setBookingTagId(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 font-mono"
                  required
                >
                  <option value="">-- Choose Sealed Pouch Tag --</option>
                  {assignedTags.filter(t => t.status === "ACTIVE" || t.status === "ASSIGNED").map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} ({t.category || "Sanitary"}) — {t.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pickup Date</label>
                <select
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300"
                  required
                >
                  {availableSlots.map((s) => (
                    <option key={s.date} value={s.date}>
                      {s.date}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Available Time Slot</label>
                <select
                  value={bookingTimeWindow}
                  onChange={(e) => setBookingTimeWindow(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300"
                  required
                >
                  <option value="09:00–11:00">09:00–11:00 (Morning Slot)</option>
                  <option value="11:00–13:00">11:00–13:00 (Midday Slot)</option>
                  <option value="14:00–16:00">14:00–16:00 (Afternoon Slot)</option>
                  <option value="16:00–18:00">16:00–18:00 (Evening Slot)</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-900">Atomic Capacity Guard</div>
                <p>Slots are locked on the server to prevent overbooking. Capacity is reserved for your ward upon confirmation.</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBookingOpen(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  {isSubmitting ? "Reserving..." : "Confirm Appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW QR MODAL */}
      {isQrModalOpen && selectedTagForQr && (
        <div onClick={() => setIsQrModalOpen(false)} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl text-center relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                <span>Physical QR Code</span>
              </h3>
              <button onClick={() => setIsQrModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl inline-block">
              {/* Visual Printable QR Representation */}
              <div className="w-48 h-48 bg-white p-3 border border-slate-200 rounded-xl mx-auto flex flex-col items-center justify-center shadow-inner">
                <div className="w-full h-full bg-slate-900 p-2 rounded flex flex-col items-center justify-center text-white">
                  <QrCode className="w-32 h-32 text-emerald-400" />
                </div>
              </div>
              <div className="mt-3 font-mono font-extrabold text-sm text-slate-900">{selectedTagForQr.code}</div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Single-Use Sealed Pouch QR Tag</div>
            </div>

            <p className="text-xs text-slate-500">
              Display this QR code to your Field Collector or present the physical printed tag attached to your sealed pouch.
            </p>

            <button
              onClick={() => setIsQrModalOpen(false)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ACTIVATE TAG MODAL */}
      {isActivateOpen && (
        <div onClick={() => setIsActivateOpen(false)} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl relative">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Activate Issued Pouch Tag</h3>
              <p className="text-xs text-slate-500">Transition tag from ASSIGNED to ACTIVE when pouch is ready for use.</p>
            </div>

            <form onSubmit={handleActivateTagSubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Selected Tag</span>
                <div className="text-xs font-mono font-bold text-slate-900">
                  {assignedTags.find(t => t.id === selectedTagToActivate)?.code || selectedTagToActivate}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsActivateOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-emerald-700"
                >
                  {isSubmitting ? "Activating..." : "Confirm Activation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REDEEM REWARDS MODAL */}
      {isRedeemOpen && (
        <div onClick={() => setIsRedeemOpen(false)} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-emerald-600" />
                  <span>Redeem Circular Rewards</span>
                </h3>
                <p className="text-xs text-slate-500">Available Balance: <strong className="text-emerald-700">{creditBalance} credits</strong></p>
              </div>
              <button onClick={() => setIsRedeemOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="space-y-3">
              {rewardsList.map((item) => (
                <div key={item.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="font-bold text-xs text-slate-900">{item.title}</div>
                    <div className="text-[10px] text-slate-500">{item.provider}</div>
                    <div className="text-xs font-bold text-emerald-800">{item.cost} Credits</div>
                  </div>

                  <button
                    disabled={creditBalance < item.cost}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl ${
                      creditBalance >= item.cost
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-sm"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    Redeem
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
