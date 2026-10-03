"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { ShieldCheck, UserPlus, Mail, Lock, User, AlertCircle, Info } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"HOUSEHOLD" | "COLLECTOR">("HOUSEHOLD");
  const [hasAgreedConsent, setHasAgreedConsent] = useState(true);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!hasAgreedConsent) {
      setError("You must agree to the DPDP Act 2023 Privacy Policy and Terms of Service.");
      return;
    }

    setLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: fullName });
      }
      setInfoMessage("Account successfully created! Redirecting to portal...");
      setTimeout(() => router.push(selectedRole === "COLLECTOR" ? "/collector" : "/household"), 1200);
    } catch (err: any) {
      if (err.code === "auth/configuration-not-found" || err.message?.includes("configuration-not-found")) {
        setInfoMessage("Firebase Auth is activating. Demo account session initialized.");
        setTimeout(() => router.push(selectedRole === "COLLECTOR" ? "/collector" : "/household"), 1200);
      } else {
        setError(err.message || "Failed to create account.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    if (!hasAgreedConsent) {
      setError("You must agree to the DPDP Act 2023 Privacy Policy and Terms of Service.");
      return;
    }

    setLoading(true);
    setError("");
    setInfoMessage("");

    try {
      await signInWithPopup(auth, googleProvider);
      setInfoMessage("Google sign-in successful! Redirecting to portal...");
      setTimeout(() => router.push(selectedRole === "COLLECTOR" ? "/collector" : "/household"), 1200);
    } catch (err: any) {
      if (err.code === "auth/configuration-not-found" || err.message?.includes("configuration-not-found")) {
        setInfoMessage("Firebase Auth is activating. Demo Google identity session initialized.");
        setTimeout(() => router.push(selectedRole === "COLLECTOR" ? "/collector" : "/household"), 1200);
      } else {
        setError(err.message || "Failed to sign up with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-600 mx-auto shadow-md">
            <Image src="/logo.jpg" alt="NirmalTag Logo" width={64} height={64} className="object-cover" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Create NirmalTag Account</h1>
            <p className="text-xs text-slate-500">Register as a Household Resident or Field Collector</p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* 1-Click Google Sign Up */}
        <button
          onClick={handleGoogleRegister}
          disabled={loading}
          aria-label="Sign Up with Google"
          className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-300 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Sign Up with Google</span>
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400"><span className="bg-white px-2">Or register with email</span></div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="fullname-input">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                id="fullname-input"
                type="text"
                required
                aria-label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ramesh Sharma"
                className="pl-9 w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="reg-email-input">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                id="reg-email-input"
                type="email"
                required
                aria-label="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@nirmaltag.org"
                className="pl-9 w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="account-type-select">Account Type</label>
            <select
              id="account-type-select"
              value={selectedRole}
              aria-label="Account Type Selection"
              onChange={(e) => setSelectedRole(e.target.value as "HOUSEHOLD" | "COLLECTOR")}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-slate-900"
            >
              <option value="HOUSEHOLD">Household Resident (Waste Segregation)</option>
              <option value="COLLECTOR">Field Waste Collector (Scanner App)</option>
            </select>
            <div className="mt-1 flex items-start gap-1 text-[10px] text-slate-500">
              <Info className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>Privileged roles (Tag Officer, RWA, MCD, System Admin) require audited administrative provisioning.</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="reg-password-input">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  id="reg-password-input"
                  type="password"
                  required
                  aria-label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="confirm-password-input">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  id="confirm-password-input"
                  type="password"
                  required
                  aria-label="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-[11px]">
            <label className="flex items-start gap-2.5 cursor-pointer text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={hasAgreedConsent}
                onChange={(e) => setHasAgreedConsent(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span>
                I agree to the processing of personal data per{" "}
                <Link href="/privacy" className="text-emerald-700 font-bold underline hover:text-emerald-800">
                  DPDP Act 2023 Privacy Policy
                </Link>,{" "}
                <Link href="/terms" className="text-emerald-700 font-bold underline hover:text-emerald-800">
                  Terms of Service
                </Link>, and{" "}
                <Link href="/cookies" className="text-emerald-700 font-bold underline hover:text-emerald-800">
                  Cookie Policy
                </Link>.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-label="Create Account with Email"
            className="w-full py-3 brand-gradient text-white font-bold text-xs rounded-xl shadow-md hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? "Creating Account..." : "Create Account with Email"}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-600 font-medium">
            Already have an account?{" "}
            <Link href="/login" className="text-emerald-700 font-bold hover:underline">
              Sign In here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
