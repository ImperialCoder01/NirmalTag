"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth, UserRole, getRedirectPath } from "@/lib/auth-context";
import { ShieldCheck, User, UserPlus, ChevronDown, LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { user, role, setRole, signOut } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const router = useRouter();

  const roles: { role: UserRole; label: string; path: string }[] = [
    { role: "HOUSEHOLD", label: "Household Resident", path: "/household" },
    { role: "COLLECTOR", label: "Field Collector", path: "/collector" },
    { role: "TAG_OFFICER", label: "Tag Officer", path: "/tag-officer" },
    { role: "RWA_ADMIN", label: "RWA Admin", path: "/rwa" },
    { role: "BWG_ADMIN", label: "BWG Admin", path: "/bwg" },
    { role: "MCD_OFFICER", label: "MCD Officer", path: "/mcd" },
    { role: "SYSTEM_ADMIN", label: "System Admin", path: "/admin" },
  ];

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
    router.push("/login");
  };

  const handleRoleSelect = (newRole: UserRole) => {
    setRole(newRole);
    setRoleMenuOpen(false);
    router.push(getRedirectPath(newRole));
  };

  const currentRoleLabel = roles.find((r) => r.role === role)?.label || role;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-600 shadow-md transition-transform group-hover:scale-105">
            <Image
              src="/logo.jpg"
              alt="NirmalTag Brand Logo"
              width={40}
              height={40}
              className="object-cover w-full h-full"
            />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
              Nirmal<span className="text-emerald-600">Tag</span>
            </span>
            <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              Civic Waste Platform
            </span>
          </div>
        </Link>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-4">
          {/* LOGGED IN NAVIGATION */}
          {user ? (
            <div className="flex items-center gap-3">
              {/* Role Scope Selector (Admin or Role Switching) */}
              <div className="relative">
                <button
                  onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                  aria-label="Role Selector"
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Role: <strong className="text-emerald-950 font-bold">{currentRoleLabel}</strong></span>
                  <ChevronDown className="w-3 h-3 text-emerald-600" />
                </button>

                {roleMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-xs font-medium">
                    <div className="px-4 py-2 text-slate-400 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                      Switch Portal Role
                    </div>
                    {roles.map((r) => (
                      <button
                        key={r.role}
                        onClick={() => handleRoleSelect(r.role)}
                        className={`w-full text-left px-4 py-2 hover:bg-emerald-50 transition-colors flex items-center justify-between ${
                          role === r.role ? "bg-emerald-100 font-bold text-emerald-950" : "text-slate-700"
                        }`}
                      >
                        <span>{r.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{r.path}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Direct Link to My Active Portal */}
              <Link
                href={getRedirectPath(role)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors border border-emerald-300"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-emerald-700" />
                <span>My Portal</span>
              </Link>

              {/* User Account Menu / Badge */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-label="User Account Menu"
                  className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-extrabold uppercase">
                    {(user.displayName || user.email || "U")[0]}
                  </div>
                  <span className="max-w-[120px] truncate">{user.displayName || user.email?.split("@")[0]}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 z-50 space-y-2 text-xs">
                    <div className="px-4 pb-2 border-b border-slate-100">
                      <div className="font-bold text-slate-900">{user.displayName || "NirmalTag User"}</div>
                      <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                      <div className="mt-1 inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                        {role.replace("_", " ")}
                      </div>
                    </div>

                    <div className="px-2 space-y-1">
                      <Link
                        href={getRedirectPath(role)}
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold"
                      >
                        <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                        <span>Go to {currentRoleLabel} Portal</span>
                      </Link>

                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 font-bold transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-red-600" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* LOGGED OUT NAVIGATION */
            <div className="flex items-center gap-3">
              <nav className="hidden md:flex items-center gap-4 text-xs font-semibold text-slate-700">
                <Link href="/" className="hover:text-emerald-600 transition-colors">Home</Link>
                <Link href="/privacy" className="hover:text-emerald-600 transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-emerald-600 transition-colors">Terms</Link>
                <Link href="/cookies" className="hover:text-emerald-600 transition-colors">Cookies</Link>
              </nav>

              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  aria-label="Sign In to Account"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/register"
                  aria-label="Create New Account"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white brand-gradient hover:opacity-95 rounded-xl shadow-md transition-opacity"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
