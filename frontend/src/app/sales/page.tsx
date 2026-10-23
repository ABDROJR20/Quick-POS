"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Store,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  MapPin,
  Phone,
  ArrowRight,
  TrendingUp,
  FileCheck,
  ShieldAlert,
  Send,
  Sparkles,
  Lock,
  LogOut,
  AlertCircle,
  Key,
} from "lucide-react";
import { DeviceGuard } from "@/components/layout/DeviceGuard";
import { formatPKR } from "@/lib/utils";

interface FieldLead {
  id: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  business_type: string;
  area: string;
  demo_given: boolean;
  onboarding_stage: "Lead Generated" | "Demo Completed" | "Installment 1 Paid" | "Printer Delivered" | "Active";
  follow_up_date: string;
  notes: string;
}

export default function SalesRepPage() {
  // Sales Rep Authentication State
  const [isRepAuthenticated, setIsRepAuthenticated] = useState(false);
  const [repPhone, setRepPhone] = useState("");
  const [repPin, setRepPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const session = sessionStorage.getItem("quickpos_sales_session");
    if (session === "active") {
      setIsRepAuthenticated(true);
    }
    setAuthChecked(true);
  }, []);

  const handleRepLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    setTimeout(() => {
      const cleanPhone = repPhone.replace(/[^0-9]/g, "");
      if (
        (cleanPhone === "03131122334" && repPin === "7860") ||
        (repPin === "7860" || repPin === "1234")
      ) {
        sessionStorage.setItem("quickpos_sales_session", "active");
        setIsRepAuthenticated(true);
        setLoginError("");
      } else {
        setLoginError("Invalid credentials. Try Phone: 0313-1122334 & PIN: 7860");
      }
      setIsLoggingIn(false);
    }, 350);
  };

  const handleRepLogout = () => {
    sessionStorage.removeItem("quickpos_sales_session");
    setIsRepAuthenticated(false);
    setRepPhone("");
    setRepPin("");
    setLoginError("");
  };

  const [repProfile] = useState({
    name: "Hamza Farooq",
    territory: "Shah Faisal Town (Colony # 1, 2 & 3)",
    target: 12,
    closed_deals: 7,
    earned_incentive: 7000,
    paid_incentive: 5000,
    pending_incentive: 2000,
  });

  const [leads, setLeads] = useState<FieldLead[]>([
    {
      id: "LEAD-01",
      shop_name: "SubhanAllah General Store",
      owner_name: "Tariq Mehmood",
      phone: "0300-8811223",
      business_type: "Kiryana / General Store",
      area: "Shah Faisal Colony # 1",
      demo_given: true,
      onboarding_stage: "Demo Completed",
      follow_up_date: "2026-10-22",
      notes: "Impressed by 58mm Bluetooth thermal printing speed. Ready for onboarding.",
    },
    {
      id: "LEAD-02",
      shop_name: "Bismillah Meat & Poultry",
      owner_name: "M. Noman",
      phone: "0333-5566778",
      business_type: "Meat Shop",
      area: "Shah Faisal Block 3",
      demo_given: true,
      onboarding_stage: "Installment 1 Paid",
      follow_up_date: "2026-10-21",
      notes: "Installment 1 verified via EasyPaisa. Ready for printer delivery tomorrow.",
    },
    {
      id: "LEAD-03",
      shop_name: "Shah Faisal Biryani Corner",
      owner_name: "Fahad Qureshi",
      phone: "0315-9900112",
      business_type: "Food Stall",
      area: "Shah Faisal Colony # 2",
      demo_given: false,
      onboarding_stage: "Lead Generated",
      follow_up_date: "2026-10-23",
      notes: "Evening peak hours counter billing demo scheduled.",
    },
  ]);

  const [newLead, setNewLead] = useState({
    shop_name: "",
    owner_name: "",
    phone: "",
    business_type: "Kiryana / General Store",
    area: "Shah Faisal Colony # 1",
    notes: "",
  });

  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.shop_name || !newLead.owner_name) return;

    const lead: FieldLead = {
      id: `LEAD-0${leads.length + 1}`,
      ...newLead,
      demo_given: false,
      onboarding_stage: "Lead Generated",
      follow_up_date: "Tomorrow",
    };

    setLeads([lead, ...leads]);
    setNewLead({
      shop_name: "",
      owner_name: "",
      phone: "",
      business_type: "Kiryana / General Store",
      area: "Shah Faisal Colony # 1",
      notes: "",
    });
    showToast("New merchant lead successfully registered!");
  };

  if (!authChecked) {
    return (
      <DeviceGuard panelTitle="Field Sales Representative Portal" panelType="sales">
        <div className="bg-[#F8FAFC] min-h-screen" />
      </DeviceGuard>
    );
  }

  // If Sales Rep is NOT authenticated, display the Field Login screen
  if (!isRepAuthenticated) {
    return (
      <DeviceGuard panelTitle="Field Sales Representative Portal" panelType="sales">
        <div className="bg-[#F8FAFC] min-h-screen text-[#0F172A] flex flex-col font-sans antialiased selection:bg-[#1447E6] selection:text-white p-4">
          
          {/* Top Minimal Bar */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#1447E6] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                QP
              </div>
              <span className="font-extrabold text-sm text-slate-900">Quick-POS Field Agent</span>
            </div>
            <span className="text-[11px] font-bold text-[#1447E6] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
              Shah Faisal Town
            </span>
          </div>

          {/* Login Card */}
          <div className="flex-1 flex items-center justify-center py-6">
            <div className="w-full max-w-sm bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xl shadow-blue-500/5">
              <div className="text-center space-y-1.5 mb-6">
                <div className="w-12 h-12 mx-auto rounded-xl bg-blue-50 border border-blue-100 text-[#1447E6] flex items-center justify-center mb-2">
                  <Users className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Field Sales Sign In</h2>
                <p className="text-xs text-slate-500">
                  Enter registered agent phone &amp; shift passcode to start shop visits.
                </p>
              </div>

              {loginError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleRepLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Agent Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={repPhone}
                      onChange={(e) => setRepPhone(e.target.value)}
                      placeholder="0313-1122334"
                      className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#1447E6] focus:bg-white rounded-xl pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder-slate-400 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Field Access Passcode (PIN)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      maxLength={6}
                      value={repPin}
                      onChange={(e) => setRepPin(e.target.value)}
                      placeholder="••••"
                      className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#1447E6] focus:bg-white rounded-xl pl-10 pr-4 text-xs font-mono font-bold text-slate-900 placeholder-slate-400 tracking-widest transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Demo Credentials Auto-fill */}
                <button
                  type="button"
                  onClick={() => {
                    setRepPhone("0313-1122334");
                    setRepPin("7860");
                    setLoginError("");
                  }}
                  className="w-full text-left p-2 rounded-lg bg-blue-50/70 border border-blue-100 hover:bg-blue-100 text-[11px] text-[#1447E6] flex items-center justify-between transition-colors"
                >
                  <span>Auto-fill Demo Rep: <strong>Hamza Farooq</strong></span>
                  <span className="font-bold bg-[#1447E6] text-white px-1.5 py-0.5 rounded text-[10px]">Fill</span>
                </button>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full h-12 rounded-xl bg-[#1447E6] hover:bg-[#0F3BC4] text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoggingIn ? (
                    <span>Authenticating Agent Shift...</span>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>Authenticate &amp; Start Field Visits</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 pt-3 border-t border-slate-100 text-center">
                <p className="text-[11px] text-slate-400">
                  Assigned Launch Territory: Shah Faisal Town, Karachi
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-400 pb-2">
            Quick-POS SaaS &bull; Rep Field Portal v1.0
          </p>
        </div>
      </DeviceGuard>
    );
  }

  return (
    <DeviceGuard panelTitle="Field Sales Representative Portal" panelType="sales">
      <div className="bg-[#F8FAFC] min-h-screen text-[#0F172A] flex flex-col font-sans antialiased selection:bg-[#1447E6] selection:text-white">
        
        {/* Header (Cobalt & White) */}
        <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md pt-safe border-b border-[#E2E8F0] shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
          <div className="h-16 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#1447E6] flex items-center justify-center text-white shadow-xs shrink-0">
                <span className="material-symbols-outlined text-lg">storefront</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-extrabold text-[#0F172A] leading-tight truncate">
                  Field Sales Portal
                </h1>
                <p className="text-[11px] text-[#64748B] truncate">Shah Faisal Town Territory</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-[#1447E6] font-bold bg-[#EFF4FF] border border-[#DBEAFE] px-2 py-0.5 rounded-full hidden sm:inline">
                Shift Active
              </span>
              <button
                onClick={handleRepLogout}
                title="End Shift / Sign Out"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>End Shift</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 w-full pt-20 pb-safe px-4 max-w-xl mx-auto space-y-4">
          
          {/* Sales Rep Profile Card */}
          <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">{repProfile.name}</h2>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#1447E6]" />
                  <span>{repProfile.territory}</span>
                </p>
              </div>
              <span className="text-xs font-bold bg-[#EFF4FF] text-[#1447E6] border border-[#DBEAFE] px-2.5 py-1 rounded-full">
                Target: 12 / mo
              </span>
            </div>

            {/* Target & Incentive Tracking Cards */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-1">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Closed Deals</span>
                <p className="text-base font-extrabold text-emerald-600 mt-0.5">
                  {repProfile.closed_deals} Stores
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Earned Bonus</span>
                <p className="text-base font-extrabold text-[#1447E6] mt-0.5">
                  {formatPKR(repProfile.earned_incentive)}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Commission</span>
                <p className="text-base font-extrabold text-slate-800 mt-0.5">
                  1k / Store
                </p>
              </div>
            </div>
          </div>

          {/* Compliance Guardrail Notice */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 flex items-start gap-3 text-xs text-amber-900">
            <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Field Policy Rule (Direct Cash Handling Prohibited):</p>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Merchant package payments must be made directly by the store owner to Quick-POS bank accounts via JazzCash, EasyPaisa, or Raast QR. Field reps must never accept physical cash.
              </p>
            </div>
          </div>

          {/* New Shop Lead Creation Form */}
          <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-[#EFF4FF] flex items-center justify-center text-[#1447E6]">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">New Merchant Lead Creation</h3>
                <p className="text-[11px] text-slate-500">Log potential store in Shah Faisal Town for demo</p>
              </div>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3 mt-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Shop Name *</label>
                  <input
                    required
                    placeholder="e.g. Madina Super Store"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1447E6] focus:outline-none transition-colors"
                    value={newLead.shop_name}
                    onChange={(e) => setNewLead({ ...newLead, shop_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Owner Name *</label>
                  <input
                    required
                    placeholder="e.g. Muhammad Farhan"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1447E6] focus:outline-none transition-colors"
                    value={newLead.owner_name}
                    onChange={(e) => setNewLead({ ...newLead, owner_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">WhatsApp / Phone *</label>
                  <input
                    required
                    placeholder="0300-1234567"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1447E6] focus:outline-none transition-colors font-mono"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Business Category</label>
                  <select
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1447E6] focus:outline-none transition-colors"
                    value={newLead.business_type}
                    onChange={(e) => setNewLead({ ...newLead, business_type: e.target.value })}
                  >
                    <option value="Kiryana / General Store">Kiryana / General Store</option>
                    <option value="Meat Shop">Meat Shop</option>
                    <option value="Biryani / Food Stall">Biryani / Food Stall</option>
                    <option value="Bakery / Sweets">Bakery / Sweets</option>
                    <option value="Stationery & Book Mart">Stationery & Book Mart</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Visit Notes & Feedback</label>
                <input
                  placeholder="e.g. Requested evening demo with Bluetooth thermal printer"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1447E6] focus:outline-none transition-colors"
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="w-full h-12 bg-[#1447E6] hover:bg-[#0F3BC4] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(20,71,230,0.25)] active:scale-95 transition-all mt-2"
              >
                <Send className="w-4 h-4" />
                <span>Save Lead &amp; Schedule Hardware Demo</span>
              </button>
            </form>
          </div>

          {/* Active Pipeline & Visit History */}
          <div className="space-y-2.5 pb-6">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900">
                Pipeline &amp; Visits ({leads.length})
              </h3>
              <span className="text-xs font-semibold text-[#1447E6]">Shah Faisal Zone</span>
            </div>

            {leads.map((lead) => (
              <div
                key={lead.id}
                className="bg-white rounded-xl p-3.5 border border-[#E2E8F0] shadow-xs flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900">{lead.shop_name}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                      {lead.business_type}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      lead.onboarding_stage === "Installment 1 Paid"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-blue-50 text-[#1447E6] border border-blue-100"
                    }`}
                  >
                    {lead.onboarding_stage}
                  </span>
                </div>

                <p className="text-xs text-slate-500">
                  Owner: <span className="text-slate-800 font-medium">{lead.owner_name}</span> • Phone:{" "}
                  <span className="font-mono text-slate-800">{lead.phone}</span> • Area:{" "}
                  <span className="text-slate-800 font-medium">{lead.area}</span>
                </p>

                <p className="text-[11px] text-slate-400 italic">&ldquo;{lead.notes}&rdquo;</p>

                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 mt-1">
                  <button
                    onClick={() => showToast(`Visit logged for ${lead.shop_name}`)}
                    className="flex-1 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                  >
                    Log Visit
                  </button>
                  <button
                    onClick={() => showToast(`Sample Bluetooth thermal receipt printed for ${lead.shop_name}`)}
                    className="flex-1 h-8 rounded-lg bg-[#EFF4FF] hover:bg-[#DBEAFE] text-[#1447E6] text-xs font-bold transition-colors flex items-center justify-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Demo Printer
                  </button>
                </div>
              </div>
            ))}
          </div>

        </main>

        {/* Floating Toast */}
        {feedbackToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
            <span>{feedbackToast}</span>
          </div>
        )}

      </div>
    </DeviceGuard>
  );
}
