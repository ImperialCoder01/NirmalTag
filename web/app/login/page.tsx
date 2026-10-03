"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useAuth, UserRole, getRedirectPath } from "@/lib/auth-context";
import { ShieldCheck, LogIn, Mail, Lock, UserPlus, AlertCircle, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { role, setRole } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hasAgreedConsent, setHasAgreedConsent] = useState(true);
  const [error, setError] = useState("");
  const [firebaseSetupError, setFirebaseSetupError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const roleOptions: { role: UserRole; label: string; path: string }[] = [
    { role: "HOUSEHOLD", label: "Household Resident", path: "/household" },
    { role: "COLLECTOR", label: "Field Waste Collector", path: "/collector" },
    { role: "TAG_OFFICER", label: "Tag Officer (Inventory)", path: "/tag-officer" },
    { role: "RWA_ADMIN", label: "RWA Administrator", path: "/rwa" },
    { role: "BWG_ADMIN", label: "BWG Administrator", path: "/bwg" },
    { role: "MCD_OFFICER", label: "MCD Municipal Officer", path: "/mcd" },
    { role: "SYSTEM_ADMIN", label: "System Administrator", path: "/admin" },
  ];

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAgreedConsent) {
      setError("You must agree to the Privacy Policy & Terms of Service to continue.");
      return;
    }

    setLoading(true);
    setError("");
    setFirebaseSetupError(false);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      const targetPath = getRedirectPath(role);
      router.push(targetPath);
    } catch (err: any) {
      if (err.code === "auth/configuration-not-found" || err.message?.includes("configuration-not-found") || err.code === "auth/unauthorized-domain") {
        setFirebaseSetupError(true);
        setError(err.message || "Firebase Authentication provider needs setup in Firebase Console.");
      } else {
        setError(err.message || "Failed to sign in. Please check credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!hasAgreedConsent) {
      setError("You must agree to the Privacy Policy & Terms of Service to continue.");
      return;
    }

    setLoading(true);
    setError("");
    setFirebaseSetupError(false);

    try {
      await signInWithPopup(auth, googleProvider);
      const targetPath = getRedirectPath(role);
      router.push(targetPath);
    } catch (err: any) {
      if (err.code === "auth/configuration-not-found" || err.message?.includes("configuration-not-found") || err.code === "auth/unauthorized-domain") {
        setFirebaseSetupError(true);
        setError(err.message || "Firebase Authentication provider needs setup in Firebase Console.");
      } else {
        setError(err.message || "Failed to sign in with Google.");
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
            <h1 className="text-2xl font-bold text-slate-900">Sign In to NirmalTag</h1>
            <p className="text-xs text-slate-500">Select your User Type & authenticate to access your portal</p>
          </div>
        </div>

        {/* 1. SELECT USER TYPE BEFORE LOGIN */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5" htmlFor="role-select">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Step 1: Select Your User Type</span>
          </label>
          <select
            id="role-select"
            value={role}
            onChange={(e) => handleRoleChange(e.target.value as UserRole)}
            className="w-full text-xs p-3 rounded-xl border border-slate-300 font-bold bg-white text-emerald-900 focus:ring-2 focus:ring-emerald-500 shadow-sm"
          >
            {roleOptions.map((opt) => (
              <option key={opt.role} value={opt.role}>
                {opt.label} ({opt.path})
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-500 italic">
            You will be signed in & redirected directly to <strong className="text-emerald-800">{getRedirectPath(role)}</strong>.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {firebaseSetupError && (
              <div className="pt-2 border-t border-red-200/60 text-[11px] text-red-800 space-y-1 font-normal">
                <strong>How to enable Google Auth in your Firebase Console:</strong>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline font-bold">Firebase Console</a> → Project <strong>nirmaltag</strong>.</li>
                  <li>Click <strong>Authentication</strong> → <strong>Sign-in method</strong> → Enable <strong>Google</strong> and <strong>Email/Password</strong>.</li>
                  <li>In <strong>Settings</strong> → <strong>Authorized domains</strong>, add <code className="bg-red-100 px-1 py-0.5 rounded font-mono font-bold">nirmaltag.vercel.app</code>.</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* 1-Click Google Sign In */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          aria-label="Sign In with Google"
          className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-300 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Sign In as {role.replace("_", " ")} with Google</span>
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400"><span className="bg-white px-2">Or continue with email</span></div>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="email-input">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                id="email-input"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="password-input">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                id="password-input"
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
            aria-label="Sign In"
            className="w-full py-3 brand-gradient text-white font-bold text-xs rounded-xl shadow-md hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? "Authenticating..." : `Sign In as ${role.replace("_", " ")}`}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center space-y-2">
          <p className="text-xs text-slate-600 font-medium">Don't have an account yet?</p>
          <Link
            href="/register"
            className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-colors inline-flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <span>Create New NirmalTag Account</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
