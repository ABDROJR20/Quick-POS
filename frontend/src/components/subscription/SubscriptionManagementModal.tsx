"use client";

import React, { useState } from "react";
import {
  subscriptionEngine,
  SubscriptionRecord,
  ReminderTier,
} from "@/lib/subscription/subscription-engine";

interface SubscriptionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: SubscriptionRecord | null;
  onRefresh: () => void;
  onToast: (msg: string) => void;
}

export function SubscriptionManagementModal({
  isOpen,
  onClose,
  subscription,
  onRefresh,
  onToast,
}: SubscriptionManagementModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "remind" | "verify" | "history">("overview");
  const [selectedTier, setSelectedTier] = useState<ReminderTier>("DUE_IN_3_DAYS");

  // Payment Verification Form State
  const [paymentAmount, setPaymentAmount] = useState<number>(subscription?.monthlyAmountPkr || 1000);
  const [paymentMethod, setPaymentMethod] = useState<"jazzcash" | "easypaisa" | "raast" | "bank_transfer">("jazzcash");
  const [referenceId, setReferenceId] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [isSubmittingVerify, setIsSubmittingVerify] = useState(false);

  if (!isOpen || !subscription) return null;

  const reminder = subscriptionEngine.generateReminder(subscription, selectedTier);

  const handleSendReminder = (channel: "whatsapp_direct" | "whatsapp_cloud_api") => {
    subscriptionEngine.logReminderSent(subscription.tenantId, selectedTier, channel);
    if (channel === "whatsapp_direct") {
      window.open(reminder.whatsappUrl, "_blank");
      onToast(`Opened WhatsApp chat with ${subscription.ownerName} (${selectedTier})`);
    } else {
      onToast(`Dispatched Cloud API reminder template to ${subscription.phone}`);
    }
    onRefresh();
  };

  const handleVerifyAndReactivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceId.trim()) {
      alert("Error: Transaction Reference ID is mandatory. Reactivation solely from payment screenshots is strictly prohibited.");
      return;
    }

    setIsSubmittingVerify(true);
    const res = subscriptionEngine.verifyPaymentAndReactivate(subscription.tenantId, {
      amountPkr: paymentAmount,
      paymentMethod,
      referenceId: referenceId.trim(),
      verifiedByAdminUid: "SUPER-ADMIN-ROOT",
      notes: verificationNotes,
    });

    setIsSubmittingVerify(false);
    if (res.success) {
      onToast(res.message);
      onRefresh();
      setActiveTab("overview");
    } else {
      alert(res.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Active Paid</span>;
      case "due":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Due in 3 Days</span>;
      case "grace_period":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30 animate-pulse">Grace Period Active</span>;
      case "restricted":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">Terminal Restricted</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-200">
        
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-xl">event_repeat</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{subscription.storeName}</h3>
                {getStatusBadge(subscription.status)}
              </div>
              <p className="text-xs text-slate-400">
                {subscription.ownerName} • <span className="font-mono text-emerald-400">{subscription.phone}</span> • Code: <span className="font-mono text-slate-300">{subscription.storeCode}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 text-xs font-semibold">
          {[
            { id: "overview", label: "Subscription Health" },
            { id: "remind", label: "WhatsApp Reminders" },
            { id: "verify", label: "Verify & Reactivate" },
            { id: "history", label: "Payment Ledger" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`py-3 px-3 border-b-2 font-bold transition-colors ${
                activeTab === t.id
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-3">
              {/* Vital Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">Monthly SaaS</span>
                  <span className="text-base font-black text-emerald-400">PKR {subscription.monthlyAmountPkr.toLocaleString()}</span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">Due Date</span>
                  <span className="text-sm font-bold text-white font-mono">{subscription.dueDate}</span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">Grace Window</span>
                  <span className="text-sm font-bold text-amber-400">{subscription.gracePeriodDays} Days</span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">Grace Ends</span>
                  <span className="text-sm font-bold text-rose-400 font-mono">{subscription.graceEndsAt}</span>
                </div>
              </div>

              {/* Status Explanation Card */}
              <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-purple-400">shield</span>
                  <span>Enforcement & Restriction Policy</span>
                </h4>
                <p className="text-slate-400 leading-relaxed">
                  {subscription.status === "restricted"
                    ? "⛔ This terminal is currently in RESTRICTED / READ-ONLY mode. Cashier billing and thermal printing are disabled until a verified payment reference is reconciled."
                    : subscription.status === "grace_period"
                    ? "⚠️ Terminal is currently in the GRACE PERIOD. Billing continues safely, but reminders are escalated daily."
                    : subscription.status === "due"
                    ? "🔔 Subscription is due within 3 days. Automated polite reminders are queued."
                    : "✅ Subscription is in good standing. Unlimited billing, thermal printing, and cloud sync active."}
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">Plan: {subscription.planName}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[10px] text-slate-500">Offline Safe Grace: {subscription.offlineGraceDays || 7} Days</span>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("remind")}
                  className="flex-1 h-9 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">chat</span>
                  <span>Send WhatsApp Reminder</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("verify")}
                  className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">verified</span>
                  <span>Verify Payment</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: WHATSAPP REMINDERS */}
          {activeTab === "remind" && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Select 5-Tier Reminder Schedule
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    { id: "DUE_IN_3_DAYS", label: "1. Due in 3 Days", desc: "Polite Notice" },
                    { id: "DUE_TODAY", label: "2. Due Today", desc: "Renewal Date" },
                    { id: "IN_GRACE_PERIOD", label: "3. Grace Active", desc: "Urgent Warning" },
                    { id: "GRACE_EXPIRED_RESTRICTED", label: "4. Restricted Mode", desc: "Terminal Locked" },
                    { id: "PAYMENT_VERIFIED_REACTIVATED", label: "5. Reactivated", desc: "Payment Receipt" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTier(t.id as any)}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        selectedTier === t.id
                          ? "bg-purple-500/20 border-purple-500 text-white"
                          : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="font-bold text-[11px] block">{t.label}</span>
                      <span className="text-[9px] text-slate-500 block">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Live Preview (WhatsApp Bubble Look) */}
              <div className="p-3 bg-[#0B141A] rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-500 border-b border-slate-800 pb-1.5">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <span className="material-symbols-outlined text-xs">forum</span>
                    WhatsApp Template Preview
                  </span>
                  <span>To: {subscription.phone}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#005C4B] text-white text-xs font-sans whitespace-pre-wrap leading-relaxed shadow-md">
                  {reminder.bodyUrdu}
                </div>
              </div>

              {/* Action Dispatch Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSendReminder("whatsapp_direct")}
                  className="h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-950"
                >
                  <span className="material-symbols-outlined text-base">send</span>
                  <span>1-Click wa.me Chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendReminder("whatsapp_cloud_api")}
                  className="h-10 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">api</span>
                  <span>Cloud API Dispatch</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: VERIFY & REACTIVATE */}
          {activeTab === "verify" && (
            <form onSubmit={handleVerifyAndReactivate} className="space-y-3">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[11px] text-amber-300 space-y-1">
                <div className="flex items-center gap-1 font-bold text-amber-200">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  <span>Zero-Trust Reconciliation Policy</span>
                </div>
                <p>
                  Do not reactivate subscriptions solely from payment screenshots. A genuine gateway/bank transaction reference ID is strictly mandatory.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Payment Amount (PKR)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full h-9 bg-slate-800 border border-slate-700 rounded-xl px-3 font-mono text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full h-9 bg-slate-800 border border-slate-700 rounded-xl px-2 text-xs text-white"
                  >
                    <option value="jazzcash">JazzCash Till / Mobile Account</option>
                    <option value="easypaisa">EasyPaisa Digital Transfer</option>
                    <option value="raast">State Bank Raast Instant ID</option>
                    <option value="bank_transfer">Meezan Bank IBAN Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                  Bank / Gateway Transaction Reference ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  placeholder="e.g. JC-88912904, RAAST-1092849, EP-44210"
                  className="w-full h-9 bg-slate-800 border border-slate-700 rounded-xl px-3 font-mono text-xs text-emerald-400 placeholder-slate-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Audited Notes (Optional)</label>
                <input
                  type="text"
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="e.g. Month 3 subscription verified via Meezan statement"
                  className="w-full h-9 bg-slate-800 border border-slate-700 rounded-xl px-3 text-xs text-white placeholder-slate-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingVerify}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">verified_user</span>
                <span>{isSubmittingVerify ? "Verifying..." : "Verify Payment & Extend +30 Days"}</span>
              </button>
            </form>
          )}

          {/* TAB 4: HISTORY */}
          {activeTab === "history" && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400">Verified Payment Entries ({subscription.verifiedPayments?.length || 0})</h4>
              {(!subscription.verifiedPayments || subscription.verifiedPayments.length === 0) ? (
                <div className="py-8 text-center text-slate-500">
                  <span className="material-symbols-outlined text-2xl mb-1">receipt</span>
                  <p>No verified digital payments recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {subscription.verifiedPayments.map((p) => (
                    <div key={p.paymentId} className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">PKR {p.amountPkr.toLocaleString()}</span>
                          <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                            {p.paymentMethod}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">Ref: {p.referenceId}</p>
                      </div>
                      <div className="text-right text-[10px] text-slate-400">
                        <span className="text-emerald-400 font-bold block">Verified</span>
                        <span>{new Date(p.verifiedAt).toLocaleDateString("en-PK")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-mono">
            Subscription ID: {subscription.id}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
