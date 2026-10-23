"use client";

import React, { useState } from "react";
import {
  digitalPaymentEngine,
  DigitalPaymentRecord,
} from "@/lib/payments/digital-payment-engine";

interface PaymentReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: DigitalPaymentRecord | null;
  onRefresh: () => void;
  onToast: (msg: string) => void;
}

export function PaymentReconciliationModal({
  isOpen,
  onClose,
  payment,
  onRefresh,
  onToast,
}: PaymentReconciliationModalProps) {
  const [activeTab, setActiveTab] = useState<"details" | "verify" | "refund" | "webhook_sim">("details");

  // Verification Form
  const [confirmedTid, setConfirmedTid] = useState(payment?.paymentReference || "");
  const [verifierRole, setVerifierRole] = useState<"super_admin" | "sales_rep">("super_admin");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Refund Form
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState(payment?.amountPkr || 0);
  const [isRefunding, setIsRefunding] = useState(false);

  // Webhook Simulator State
  const [webhookStatus, setWebhookStatus] = useState<"SUCCESS" | "FAILED">("SUCCESS");
  const [webhookEventId, setWebhookEventId] = useState(`wh_sim_${Date.now().toString().slice(-6)}`);
  const [webhookLog, setWebhookLog] = useState<string | null>(null);

  if (!isOpen || !payment) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);

    const res = digitalPaymentEngine.verifyPayment(payment.id, {
      uid: verifierRole === "super_admin" ? "admin-root" : "rep-hamza",
      role: verifierRole,
      confirmedTid: confirmedTid || payment.paymentReference,
      notes: verificationNotes,
    });

    setIsVerifying(false);

    if (res.success) {
      onToast(`Payment #${payment.id} verified and reconciled!`);
      onRefresh();
      onClose();
    } else {
      alert(`Access Denied: ${res.error}`);
    }
  };

  const handleRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundReason.trim()) {
      alert("Please provide a reason for the refund or reversal.");
      return;
    }

    setIsRefunding(true);
    const res = digitalPaymentEngine.refundOrReversePayment(payment.id, {
      amountPkr: refundAmount || payment.amountPkr,
      reason: refundReason.trim(),
      operatorUid: "admin-root",
      operatorRole: "super_admin",
      notes: "Audited reversal via Super Admin Portal",
    });

    setIsRefunding(false);
    if (res.success) {
      onToast(`Payment #${payment.id} reversed and marked as REFUNDED.`);
      onRefresh();
      onClose();
    } else {
      alert(`Error: ${res.error}`);
    }
  };

  const handleSimulateWebhook = (isDuplicateDelivery: boolean) => {
    const payload = {
      eventId: isDuplicateDelivery ? webhookEventId : `wh_sim_${Date.now().toString().slice(-6)}`,
      gatewayProvider: payment.paymentProvider,
      transactionReference: payment.paymentReference,
      amountPkr: payment.amountPkr,
      tenantId: payment.tenantId,
      storeCode: payment.storeCode,
      storeName: payment.storeName,
      paymentPurpose: payment.paymentPurpose,
      gatewayStatus: webhookStatus,
    };

    if (!isDuplicateDelivery) {
      setWebhookEventId(payload.eventId);
    }

    const res = digitalPaymentEngine.ingestGatewayWebhook(payload);
    setWebhookLog(
      JSON.stringify(
        {
          deliveryAttempt: isDuplicateDelivery ? "REPEATED / RETRY WEBHOOK" : "INITIAL DELIVERY",
          eventId: payload.eventId,
          idempotentResult: res.idempotent,
          statusReturned: res.status,
          message: res.message,
        },
        null,
        2
      )
    );

    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                {payment.id}
              </span>
              <h2 className="text-base font-bold text-white">{payment.storeName}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ref: <span className="font-mono text-slate-200">{payment.paymentReference}</span> &bull; Provider:{" "}
              <span className="uppercase text-emerald-400 font-semibold">{payment.paymentProvider}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-3 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("details")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors shrink-0 ${
              activeTab === "details"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Overview &amp; Audit
          </button>
          <button
            onClick={() => setActiveTab("verify")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors shrink-0 ${
              activeTab === "verify"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Reconcile &amp; RBAC
          </button>
          <button
            onClick={() => setActiveTab("refund")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors shrink-0 ${
              activeTab === "refund"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Refund / Reversal
          </button>
          <button
            onClick={() => setActiveTab("webhook_sim")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors shrink-0 ${
              activeTab === "webhook_sim"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Idempotent Webhook Sim
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-slate-200">
          
          {/* TAB 1: DETAILS & AUDIT */}
          {activeTab === "details" && (
            <div className="space-y-3.5">
              {/* Highlight Cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Transaction Amount</span>
                  <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">
                    PKR {payment.amountPkr.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Currency: {payment.currency}</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Payment Status</span>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                      payment.status === "verified"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : payment.status === "pending"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : payment.status === "refunded"
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {payment.status}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Channel: {payment.paymentProvider.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Revenue Category Callout */}
              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">Revenue Accounting Classification:</span>
                  <span className="font-mono text-[11px] font-bold text-purple-300 uppercase px-2 py-0.5 rounded bg-purple-900/50">
                    {payment.revenueCategory.replace("_", " ")}
                  </span>
                </div>
                <p className="text-[11px] text-purple-200/80 mt-1">
                  {payment.revenueCategory === "hardware_capex"
                    ? "Hardware Capital Recovery: Kept strictly isolated from recurring SaaS MRR."
                    : payment.revenueCategory === "recurring_saas"
                    ? "Monthly SaaS Platform License: Counted directly toward Monthly Recurring Revenue (MRR)."
                    : "Merchant Counter Gross Billings: Retail register sales collected via Raast QR / Wallet."}
                </p>
              </div>

              {/* Key Specifications Grid */}
              <div className="space-y-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px]">
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-400">Payment Purpose</span>
                  <span className="font-semibold text-white capitalize">{payment.paymentPurpose.replace(/_/g, " ")}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-400">Transaction TID / Reference</span>
                  <span className="font-mono text-emerald-400 font-bold">{payment.paymentReference}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-400">Created Timestamp</span>
                  <span className="text-slate-300 font-mono">{new Date(payment.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-400">Verified Timestamp</span>
                  <span className="text-slate-300 font-mono">
                    {payment.verificationTimestamp ? new Date(payment.verificationTimestamp).toLocaleString() : "Not yet verified"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Verified By &amp; Role</span>
                  <span className="text-slate-300">
                    {payment.verifiedByUid || "N/A"} ({payment.verifiedByRole || "None"})
                  </span>
                </div>
              </div>

              {/* Reversal / Refund Info if present */}
              {payment.reversal && (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/40 space-y-1">
                  <div className="flex items-center justify-between text-rose-300 font-bold">
                    <span>Reversal / Refund Logged</span>
                    <span className="font-mono">{payment.reversal.refundId}</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Reason: <span className="font-semibold text-rose-300">{payment.reversal.reason}</span> &bull; Amount:{" "}
                    <strong>PKR {payment.reversal.amountPkr.toLocaleString()}</strong>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Reversed on {new Date(payment.reversal.reversedAt).toLocaleString()} by{" "}
                    {payment.reversal.reversedByUid} ({payment.reversal.reversedByRole})
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RECONCILE & RBAC SIMULATION */}
          {activeTab === "verify" && (
            <form onSubmit={handleVerify} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/30 text-amber-200">
                <div className="font-bold mb-0.5">Role-Based Access Control Rule:</div>
                <p className="text-[11px] text-amber-300/90 leading-relaxed">
                  Sales Representatives are <strong>strictly prohibited</strong> from manually marking payments as verified.
                  Only authorized Super Administrators or automated bank webhooks may reconcile payments.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Simulate Verifying Operator Role</label>
                <select
                  value={verifierRole}
                  onChange={(e) => setVerifierRole(e.target.value as any)}
                  className="w-full h-9 rounded-xl bg-slate-950 border border-slate-700 px-3 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                >
                  <option value="super_admin">Super Administrator (Authorized)</option>
                  <option value="sales_rep">Sales Representative (Restricted / Blocked)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  Confirmed Bank/Wallet Transaction Reference (TID)
                </label>
                <input
                  type="text"
                  required
                  value={confirmedTid}
                  onChange={(e) => setConfirmedTid(e.target.value)}
                  placeholder="e.g. JC-882910123 / RAAST-998811"
                  className="w-full h-9 rounded-xl bg-slate-950 border border-slate-700 px-3 text-emerald-400 font-mono font-bold text-xs focus:outline-none focus:border-purple-500 uppercase"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Verify against live bank portal statement before confirming.
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Reconciliation Audit Notes (Optional)</label>
                <input
                  type="text"
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="e.g. Reconciled against Meezan Bank Shah Faisal statement"
                  className="w-full h-9 rounded-xl bg-slate-950 border border-slate-700 px-3 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isVerifying}
                  className={`w-full h-10 rounded-xl font-bold text-white transition-all shadow-md flex items-center justify-center gap-1.5 ${
                    verifierRole === "sales_rep"
                      ? "bg-rose-700 hover:bg-rose-800"
                      : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30"
                  }`}
                >
                  {isVerifying ? (
                    "Processing Reconcile..."
                  ) : verifierRole === "sales_rep" ? (
                    "Test Verification (Expect Rejection)"
                  ) : (
                    "Authorize & Reconcile Payment"
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: REFUND / REVERSAL */}
          {activeTab === "refund" && (
            <form onSubmit={handleRefund} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-800/30 text-rose-200 text-[11px]">
                <div className="font-bold mb-0.5">Payment Reversal Protocol:</div>
                <p>
                  Reversing a payment transitions the record to <strong>REFUNDED</strong> and generates an immutable
                  reversal identifier. If applied to a subscription, the tenant account status will be re-evaluated.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Refund Amount (PKR)</label>
                <input
                  type="number"
                  required
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="w-full h-9 rounded-xl bg-slate-950 border border-slate-700 px-3 text-white font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Reason for Reversal / Refund</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Accidental double transfer by merchant / Cancelled onboarding"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full h-9 rounded-xl bg-slate-950 border border-slate-700 px-3 text-slate-200 text-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isRefunding || payment.status === "refunded"}
                  className="w-full h-10 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-white transition-all shadow-md shadow-rose-900/30 disabled:opacity-50"
                >
                  {isRefunding ? "Processing Reversal..." : "Execute Audited Reversal & Refund"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: IDEMPOTENT WEBHOOK SIMULATOR */}
          {activeTab === "webhook_sim" && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="font-bold text-white mb-1">Gateway Webhook Delivery &amp; Idempotency Simulator</div>
                <p className="text-[11px] text-slate-400">
                  Simulate gateway IPN delivery. Demonstrates safe handling of duplicate webhook deliveries (idempotency
                  key guarantee).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Gateway Status</label>
                  <select
                    value={webhookStatus}
                    onChange={(e) => setWebhookStatus(e.target.value as any)}
                    className="w-full h-8 rounded-lg bg-slate-950 border border-slate-700 px-2 text-white text-xs"
                  >
                    <option value="SUCCESS">SUCCESS (Mark Verified)</option>
                    <option value="FAILED">FAILED (Mark Failed)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Current Event ID</label>
                  <input
                    type="text"
                    value={webhookEventId}
                    onChange={(e) => setWebhookEventId(e.target.value)}
                    className="w-full h-8 rounded-lg bg-slate-950 border border-slate-700 px-2 text-purple-300 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSimulateWebhook(false)}
                  className="h-9 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors"
                >
                  Simulate Initial Webhook
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateWebhook(true)}
                  className="h-9 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors"
                >
                  Simulate Retry / Duplicate
                </button>
              </div>

              {webhookLog && (
                <div className="mt-3 p-3 rounded-xl bg-black border border-slate-850 font-mono text-[10px] text-emerald-400 overflow-x-auto">
                  <pre>{webhookLog}</pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span>Central Digital Payment Engine &bull; Standard 12</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
