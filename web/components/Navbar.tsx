"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth, UserRole } from "@/lib/auth-context";
import { ShieldCheck, User, UserPlus, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, role, setRole } = useAuth();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const roles: UserRole[] = [
    "HOUSEHOLD",
    "COLLECTOR",
    "TAG_OFFICER",
    "RWA_ADMIN",
    "BWG_ADMIN",
    "MCD_OFFICER",
    "SYSTEM_ADMIN"
  ];

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

        {/* Role Switcher */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              aria-label="Role Scope Selector"
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Role: <strong className="text-emerald-900">{role}</strong></span>
              <ChevronDown className="w-3 h-3 text-emerald-600" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50 text-xs font-medium">
                <div className="px-3 py-2 text-slate-400 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                  Select Portal Scope
                </div>
                {roles.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRole(r);
                      setRoleMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-emerald-50 transition-colors ${
                      role === r ? "bg-emerald-100 font-bold text-emerald-900" : "text-slate-700"
                    }`}
                  >
                    {r.replace("_", " ")}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-3 text-xs font-medium text-slate-700">
            <Link href="/household" className="hover:text-emerald-600 transition-colors">Household</Link>
            <Link href="/collector" className="hover:text-emerald-600 transition-colors">Collector</Link>
            <Link href="/tag-officer" className="hover:text-emerald-600 transition-colors">Tag Officer</Link>
            <Link href="/rwa" className="hover:text-emerald-600 transition-colors">RWA</Link>
            <Link href="/bwg" className="hover:text-emerald-600 transition-colors">BWG</Link>
            <Link href="/mcd" className="hover:text-emerald-600 transition-colors">MCD Dashboard</Link>
            <Link href="/admin" className="hover:text-emerald-600 transition-colors">Admin</Link>
          </nav>

          {/* Auth Action Buttons */}
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              aria-label="Sign In to Account"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
            <Link
              href="/register"
              aria-label="Create New Account"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white brand-gradient hover:opacity-95 rounded-lg shadow-sm transition-opacity"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
