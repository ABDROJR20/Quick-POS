"use client";

import React, { useState } from "react";
import {
  subscriptionEngine,
  SubscriptionRecord,
} from "@/lib/subscription/subscription-engine";

interface AccountRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: SubscriptionRecord | null;
  onRefreshStatus: () => void;
  onToast: (msg: string) => void;
}

export function AccountRecoveryModal({
  isOpen,
  onClose,
  subscription,
  onRefreshStatus,
  onToast,
}: AccountRecoveryModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !subscription) return null;

  const policy = subscriptionEngine.getPolicy();
  const { paymentRecipientInfo } = policy;
  const isRestricted = subscription.status === "restricted";

  const handleCopy = (key: string, value: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedKey(key);
    onToast(`Copied ${key} to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleShareReferenceViaWhatsApp = () => {
    if (!submittedRef.trim()) {
      alert("Please enter your transaction reference ID before sending.");
      return;
    }
    const msg = `*Quick-POS Subscription Payment Submission*\n\nStore: ${subscription.storeName} (${subscription.storeCode})\nOwner: ${subscription.ownerName}\nPhone: ${subscription.phone}\nAmount: PKR ${subscription.monthlyAmountPkr}\nTransaction Reference: ${submittedRef.trim()}\n\nPlease verify and reactivate my billing terminal.`;
    window.open(`https://wa.me/923008271940?text=${encodeURIComponent(msg)}`, "_blank");
    onToast("Opened WhatsApp to send transaction proof to Quick-POS Admin");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className={`p-4 text-white shrink-0 ${isRestricted ? "bg-gradient-to-r from-rose-700 to-red-800" : "bg-gradient-to-r from-amber-600 to-orange-700"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">
                  {isRestricted ? "lock" : "schedule"}
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {isRestricted ? "Terminal In Read-Only Mode" : "Subscription Grace Period"}
                </h3>
                <p className="text-xs text-white/90">
                  {isRestricted ? "Billing & printing temporarily restricted" : `Due on ${subscription.dueDate} (Grace active)`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs text-slate-700 bg-slate-50">
          
          {/* Explanation Alert */}
          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <p className="font-semibold text-slate-900 leading-relaxed">
              {isRestricted
                ? "Your subscription grace period has expired. In accordance with platform policy, new billing and Bluetooth thermal receipt printing are temporarily restricted."
                : `Your subscription of PKR ${subscription.monthlyAmountPkr.toLocaleString()} was due on ${subscription.dueDate}. You have ${subscription.gracePeriodDays} days grace to remit payment.`}
            </p>
            <p className="text-[11px] text-slate-500">
              Historical transaction reports and customer Khata records remain viewable in read-only mode.
            </p>
          </div>

          {/* Amount Due Card */}
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-emerald-800 font-bold block uppercase tracking-wider">Payable Subscription Amount</span>
              <span className="text-lg font-black text-emerald-700">PKR {subscription.monthlyAmountPkr.toLocaleString()}</span>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-emerald-200/60 text-emerald-900 rounded-full">
              Monthly SaaS
            </span>
          </div>

          {/* Official Digital Payment Channels */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[#1447E6]">account_balance_wallet</span>
              <span>Official Digital Payment Channels</span>
            </h4>

            {/* Raast */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">State Bank Raast Instant ID</span>
                <span className="font-mono text-xs font-bold text-slate-900">{paymentRecipientInfo.raastId}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy("Raast ID", paymentRecipientInfo.raastId)}
                className="text-[11px] font-bold text-[#1447E6] hover:underline"
              >
                {copiedKey === "Raast ID" ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* EasyPaisa */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">EasyPaisa ({paymentRecipientInfo.easypaisaTitle})</span>
                <span className="font-mono text-xs font-bold text-slate-900">{paymentRecipientInfo.easypaisaNumber}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy("EasyPaisa", paymentRecipientInfo.easypaisaNumber)}
                className="text-[11px] font-bold text-[#1447E6] hover:underline"
              >
                {copiedKey === "EasyPaisa" ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* JazzCash Till */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">JazzCash Merchant Till</span>
                <span className="font-mono text-xs font-bold text-slate-900">{paymentRecipientInfo.jazzcashTill}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy("JazzCash Till", paymentRecipientInfo.jazzcashTill)}
                className="text-[11px] font-bold text-[#1447E6] hover:underline"
              >
                {copiedKey === "JazzCash Till" ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Bank Transfer */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">{paymentRecipientInfo.bankName}</span>
                <span className="font-mono text-[10px] text-slate-700 block truncate max-w-[240px]">{paymentRecipientInfo.iban}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy("Bank IBAN", paymentRecipientInfo.iban)}
                className="text-[11px] font-bold text-[#1447E6] hover:underline"
              >
                {copiedKey === "Bank IBAN" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Reference Submission Box */}
          <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-900">Already Paid? Submit Reference ID</h4>
            <p className="text-[11px] text-slate-500">
              Screenshots alone cannot activate the terminal. Enter your bank/wallet transaction TID:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={submittedRef}
                onChange={(e) => setSubmittedRef(e.target.value)}
                placeholder="e.g. JC-88912904 / RAAST-..."
                className="flex-1 h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-[#1447E6]"
              />
              <button
                type="button"
                onClick={handleShareReferenceViaWhatsApp}
                className="h-9 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shrink-0"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                <span>Send via WA</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onRefreshStatus();
              onToast("Checking latest subscription status from server...");
            }}
            className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">sync</span>
            <span>Check Status</span>
          </button>

          <a
            href="https://wa.me/923008271940?text=Quick-POS%20Help%20Subscription"
            target="_blank"
            rel="noreferrer"
            className="h-10 px-4 bg-[#1447E6] hover:bg-[#0F3BC4] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">support_agent</span>
            <span>WhatsApp Support</span>
          </a>
        </div>

      </div>
    </div>
  );
}
