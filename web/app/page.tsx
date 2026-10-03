"use client";

import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, QrCode, Cpu, Coins, Building2, Layers, CheckCircle2, ArrowRight } from "lucide-react";

export default function HomePage() {
  const roles = [
    { title: "Household Portal", href: "/household", desc: "View active single-use tags, request pickup, track earned credits, and redeem rewards.", icon: Coins },
    { title: "Collector App", href: "/collector", desc: "Offline-first mobile scanner, automated QR validation, evidence capture & AI checks.", icon: QrCode },
    { title: "Tag Officer Portal", href: "/tag-officer", desc: "Batch tag creation, inventory reconciliation, batch assignment & lifecycle management.", icon: Layers },
    { title: "RWA & BWG Dashboard", href: "/rwa", desc: "Residential society compliance rates, aggregate pickup volumes & dispute resolution.", icon: Building2 },
    { title: "MCD Executive Command", href: "/mcd", desc: "Ward/Zone civic analytics, sanitary waste volume monitoring, and hotspot trends.", icon: Cpu },
    { title: "System Administrator", href: "/admin", desc: "RBAC permissions, audit log viewer, AI model deployment & system security config.", icon: ShieldCheck },
  ];

  const wasteCategories = [
    { name: "Sanitary Waste", points: "10 Pts", incentive: "₹2.00", color: "bg-rose-50 border-rose-200 text-rose-800" },
    { name: "Child & Adult Diapers", points: "12 Pts", incentive: "₹2.50", color: "bg-amber-50 border-amber-200 text-amber-800" },
    { name: "Incontinence Care", points: "10 Pts", incentive: "₹2.00", color: "bg-blue-50 border-blue-200 text-blue-800" },
    { name: "Small Household Medical", points: "15 Pts", incentive: "₹3.00", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
    { name: "Special Care Waste", points: "15 Pts", incentive: "₹3.00", color: "bg-purple-50 border-purple-200 text-purple-800" },
  ];

  return (
    <div className="space-y-16 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl brand-gradient text-white p-8 md:p-12 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-6 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-100 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Production Civic Tech Architecture</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              AI-Verified Sanitary Segregation & Circular Credit Network
            </h1>
            <p className="text-emerald-100 text-base sm:text-lg leading-relaxed">
              NirmalTag empowers households and municipal authorities with tamper-evident single-use QR tags, on-device AI visual evidence verification, and double-entry reward ledgers.
            </p>            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/household"
                className="px-6 py-3 rounded-xl bg-white text-emerald-900 font-bold text-sm shadow-md hover:bg-emerald-50 transition-colors flex items-center gap-2"
              >
                <span>Household Resident</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/collector"
                className="px-6 py-3 rounded-xl bg-emerald-800/80 hover:bg-emerald-800 text-white font-semibold text-sm border border-emerald-500/30 backdrop-blur-md transition-colors flex items-center gap-2"
              >
                <span>Field Waste Collector</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="flex-shrink-0">
            <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
              <Image
                src="/logo.jpg"
                alt="NirmalTag Brand Logo"
                width={256}
                height={256}
                className="object-cover w-full h-full"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Role Portals Grid */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Role-Based Operational Portals</h2>
          <p className="text-slate-600 text-sm max-w-xl mx-auto">
            Fine-grained access control tailored for Households, Collectors, Officers, and Municipal Executives.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((r, i) => {
            const IconComponent = r.icon;
            return (
              <Link
                key={i}
                href={r.href}
                className="group p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <IconComponent className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center justify-between">
                    <span>{r.title}</span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{r.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Configurable Waste Categories */}
      <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Configurable Waste Categories</h3>
            <p className="text-xs text-slate-500">Each waste category features explicit handling rules and economic credit incentives.</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
            Policy Version v1.0
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {wasteCategories.map((c, i) => (
            <div key={i} className={`p-4 rounded-xl border ${c.color} space-y-2`}>
              <div className="font-bold text-sm">{c.name}</div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-black/10">
                <span>Household Reward:</span>
                <strong className="font-semibold">{c.points}</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Collector Incentive:</span>
                <strong className="font-semibold">{c.incentive}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
