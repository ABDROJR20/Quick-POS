"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Store,
  Users,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  QrCode,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Link001,
  Link005,
} from "@/components/ui/skiper-ui/skiper40";

export default function MasterPlatformHub() {
  const [showQrModal, setShowQrModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col selection:bg-[#1447E6] selection:text-white">
      
      {/* Top Application Bar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white/95 px-6 backdrop-blur-md sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1447E6] font-black text-white shadow-md shadow-blue-500/20">
            QP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-[#0F172A]">Quick-POS</span>
              <Badge variant="outline" className="border-blue-200 bg-[#EFF4FF] text-[#1447E6] text-[10px] font-bold">
                Pakistan SaaS Platform
              </Badge>
            </div>
            <p className="text-[11px] text-[#64748B]">Shah Faisal Town, Karachi Pilot</p>
          </div>
        </div>

        {/* Public Navigation - Only Customer POS and Sales Rep (Admin is private) */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold">
          <Link href="/pos" className="text-[#1447E6]">
            <Link001 href="/pos">Customer POS (Mobile Only)</Link001>
          </Link>
          <Link href="/sales" className="text-slate-700 hover:text-[#1447E6]">
            <Link005 href="/sales">Sales Rep Field Portal (Mobile Only)</Link005>
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EFF4FF] border border-[#DBEAFE] text-[#1447E6] text-xs font-bold hover:bg-blue-100 transition-colors"
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>Scan on Mobile</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-6 sm:p-10 space-y-10">
        <div className="text-center space-y-3 max-w-3xl mx-auto pt-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#1447E6] border border-blue-100 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Mobile-First Architecture
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-[#0F172A] tracking-tight leading-tight">
            Commercial Point of Sale SaaS, <br />
            <span className="text-[#1447E6]">
              Designed for Pakistani Retailers
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Quick-POS operates directly on Android smartphones with portable 58mm/80mm Bluetooth thermal printers and offline SQLite database.
          </p>
        </div>

        {/* Public Panels Grid: Customer POS & Sales Rep ONLY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          
          {/* Panel B: Customer POS */}
          <Card className="border-[#E2E8F0] bg-white flex flex-col justify-between hover:border-[#1447E6] transition-all hover:shadow-xl hover:shadow-blue-500/10 group rounded-2xl">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1447E6]">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 text-[10px] font-bold">
                    Mobile Only
                  </Badge>
                  <Badge variant="outline" className="border-blue-200 bg-[#EFF4FF] text-[#1447E6] font-mono text-[10px]">
                    PORTAL
                  </Badge>
                </div>
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-[#1447E6] transition-colors">
                Customer POS Terminal
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                For Shop Owners &amp; Cashiers on Android smartphones. Requires Cashier PIN.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-xs text-slate-600 space-y-2 border-t border-slate-100 pt-3">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#1447E6] shrink-0" />
                  <span>Cobalt Precision POS Google Stitch Design</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#1447E6] shrink-0" />
                  <span>Web Bluetooth 58mm/80mm thermal receipt printing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#1447E6] shrink-0" />
                  <span>Offline SQLite billing engine &amp; stock sync</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#1447E6] shrink-0" />
                  <span>Customer Udhaar Khata ledger with WhatsApp reminders</span>
                </li>
              </ul>

              <Link href="/pos" className="block pt-2">
                <button className="w-full h-11 bg-[#1447E6] hover:bg-[#0F3BC4] font-bold text-white text-xs rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(20,71,230,0.25)] transition-all">
                  Open POS Terminal (Mobile Device) <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </CardContent>
          </Card>

          {/* Panel C: Sales Rep */}
          <Card className="border-[#E2E8F0] bg-white flex flex-col justify-between hover:border-[#1447E6] transition-all hover:shadow-xl hover:shadow-blue-500/10 group rounded-2xl">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1447E6]">
                  <Users className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 text-[10px] font-bold">
                    Mobile Only
                  </Badge>
                  <Badge variant="outline" className="border-blue-200 bg-[#EFF4FF] text-[#1447E6] font-mono text-[10px]">
                    FIELD
                  </Badge>
                </div>
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-[#1447E6] transition-colors">
                Sales Rep Field Portal
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                For Field Sales Reps visiting shops in Shah Faisal Town.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-xs text-slate-600 space-y-2 border-t border-slate-100 pt-3">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#1447E6] shrink-0" />
                  <span>Lead capture form with GPS territory</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#1447E6] shrink-0" />
                  <span>Store onboarding pipeline tracker</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#1447E6] shrink-0" />
                  <span>Printer demonstration checklist</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#1447E6] shrink-0" />
                  <span>Strict no-cash collection guardrail policy</span>
                </li>
              </ul>

              <Link href="/sales" className="block pt-2">
                <button className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all">
                  Open Field Sales Portal <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </CardContent>
          </Card>

        </div>
      </main>

      {/* QR Code Scan Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center border border-slate-200 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900">Scan to Open on Mobile</h3>
            <p className="text-xs text-slate-500 mt-1">
              Open your Android smartphone camera or QR reader to open the customer POS terminal.
            </p>

            <div className="w-48 h-48 mx-auto my-4 bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-center">
              <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                <rect x="0" y="0" width="30" height="30" rx="3" />
                <rect x="5" y="5" width="20" height="20" fill="white" />
                <rect x="10" y="10" width="10" height="10" />
                
                <rect x="70" y="0" width="30" height="30" rx="3" />
                <rect x="75" y="5" width="20" height="20" fill="white" />
                <rect x="80" y="10" width="10" height="10" />
                
                <rect x="0" y="70" width="30" height="30" rx="3" />
                <rect x="5" y="75" width="20" height="20" fill="white" />
                <rect x="10" y="80" width="10" height="10" />
                
                <rect x="40" y="10" width="8" height="20" fill="#1447E6" />
                <rect x="52" y="20" width="12" height="10" />
                <rect x="40" y="40" width="20" height="20" rx="2" fill="#1447E6" />
                <rect x="10" y="40" width="10" height="10" />
                <rect x="70" y="40" width="10" height="10" />
                <rect x="85" y="55" width="10" height="15" />
                <rect x="40" y="70" width="15" height="10" />
                <rect x="60" y="75" width="25" height="15" />
              </svg>
            </div>

            <p className="text-xs font-mono text-slate-600 bg-slate-100 py-1.5 px-2 rounded-lg">
              http://localhost:3000/pos
            </p>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full h-10 mt-4 rounded-xl bg-[#1447E6] text-white text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
