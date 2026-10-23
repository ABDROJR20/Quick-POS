"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  ExternalLink,
  Layers,
  Copy,
  Check,
} from "lucide-react";
import {
  deviceAuthEngine,
  RegisteredDeviceRecord,
  StoreDevicePolicy,
} from "@/lib/device/device-auth-engine";

interface DeviceReplacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
  onDeviceAuthorized: (device: RegisteredDeviceRecord) => void;
}

export function DeviceReplacementModal({
  isOpen,
  onClose,
  storeId,
  storeName,
  onDeviceAuthorized,
}: DeviceReplacementModalProps) {
  const [activeTab, setActiveTab] = useState<"recovery_pin" | "whatsapp_admin" | "multi_counter">(
    "recovery_pin"
  );
  const [currentDeviceId, setCurrentDeviceId] = useState("");
  const [currentDeviceName, setCurrentDeviceName] = useState("");
  const [storePolicy, setStorePolicy] = useState<StoreDevicePolicy | null>(null);

  // Recovery PIN input state
  const [recoveryPin, setRecoveryPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [pinSuccessMsg, setPinSuccessMsg] = useState("");

  // WhatsApp OTP state
  const [otpData, setOtpData] = useState<{
    otp: string;
    expiresAt: string;
    whatsappUrl: string;
    deviceRecord: RegisteredDeviceRecord;
  } | null>(null);
  const [isCheckingOtpStatus, setIsCheckingOtpStatus] = useState(false);
  const [otpStatusMsg, setOtpStatusMsg] = useState("");
  const [copiedOtp, setCopiedOtp] = useState(false);

  useEffect(() => {
    if (isOpen && storeId) {
      const devId = deviceAuthEngine.getOrCreateDeviceId();
      const devName = deviceAuthEngine.getDeviceDisplayName();
      const policy = deviceAuthEngine.getStorePolicy(storeId);
      setCurrentDeviceId(devId);
      setCurrentDeviceName(devName);
      setStorePolicy(policy);
      setPinError("");
      setPinSuccessMsg("");
      setRecoveryPin("");
      setOtpStatusMsg("");

      // Automatically generate WhatsApp OTP ready in background
      const requestData = deviceAuthEngine.requestWhatsAppRemoteAuthorization(storeId);
      setOtpData(requestData);
    }
  }, [isOpen, storeId]);

  if (!isOpen) return null;

  const currentActiveDevices =
    storePolicy?.registeredDevices.filter((d) => d.status === "authorized") || [];

  const handleVerifyRecoveryPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");
    setPinSuccessMsg("");
    setIsVerifyingPin(true);

    setTimeout(() => {
      if (recoveryPin.trim().length !== 6) {
        setPinError("Please enter the complete 6-digit Store Master Recovery PIN.");
        setIsVerifyingPin(false);
        return;
      }

      const result = deviceAuthEngine.verifyRecoveryPinAndMigrate(storeId, recoveryPin);
      if (result.success && result.newDevice) {
        setPinSuccessMsg("Success! Terminal successfully migrated and authorized.");
        setTimeout(() => {
          onDeviceAuthorized(result.newDevice!);
          onClose();
        }, 1000);
      } else {
        setPinError(result.error || "Invalid PIN. Please check your onboarding receipt.");
      }
      setIsVerifyingPin(false);
    }, 400);
  };

  const handleCheckWhatsAppApproval = () => {
    setIsCheckingOtpStatus(true);
    setOtpStatusMsg("");

    setTimeout(() => {
      const evalResult = deviceAuthEngine.evaluateDeviceAccess(storeId, currentDeviceId);
      if (evalResult.status === "authorized" && evalResult.device) {
        setOtpStatusMsg("Authorized! Super Admin remotely approved your terminal.");
        setTimeout(() => {
          onDeviceAuthorized(evalResult.device!);
          onClose();
        }, 800);
      } else {
        setOtpStatusMsg("Approval pending: Super Admin has not yet approved this OTP code.");
      }
      setIsCheckingOtpStatus(false);
    }, 500);
  };

  const copyOtpToClipboard = () => {
    if (otpData?.otp && typeof navigator !== "undefined") {
      navigator.clipboard.writeText(otpData.otp);
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-4 sm:px-6 py-4 sm:py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-xs shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                Device Authorization Policy
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                New Phone Detected / نیا آلہ
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Store & Terminal Diagnostic Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
          <div className="truncate">
            <span className="text-slate-500">Store:</span>{" "}
            <span className="font-bold text-slate-900">{storeName}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-slate-500">Detected:</span>
            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 text-[11px] truncate max-w-[200px]">
              {currentDeviceName}
            </span>
          </div>
        </div>

        {/* Security Warning Notice */}
        <div className="px-4 sm:px-6 pt-3.5 shrink-0">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-900 flex items-start gap-2.5 sm:gap-3">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1 min-w-0">
              <p className="font-bold text-amber-950">
                Single-Counter Security Boundary Enforced
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                This store is restricted to authorized devices.
                {currentActiveDevices.length > 0 && (
                  <>
                    {" "}
                    Active device:{" "}
                    <span className="font-semibold text-slate-800">
                      {currentActiveDevices[0].deviceName}
                    </span>{" "}
                    (Registered:{" "}
                    {new Date(currentActiveDevices[0].registeredAt).toLocaleDateString("en-PK")}
                    ).
                  </>
                )}
              </p>
              <p className="text-[11px] text-emerald-800 font-medium">
                ✅ Zero Lockout Guarantee: You can migrate your phone instantly using your 6-digit Recovery PIN or WhatsApp Super Admin.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 pt-3 shrink-0">
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveTab("recovery_pin")}
              className={`py-2 px-1 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 text-center ${
                activeTab === "recovery_pin"
                  ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10px] sm:text-xs">Recovery PIN</span>
            </button>

            <button
              onClick={() => setActiveTab("whatsapp_admin")}
              className={`py-2 px-1 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 text-center ${
                activeTab === "whatsapp_admin"
                  ? "bg-white text-emerald-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-[10px] sm:text-xs">WhatsApp Admin</span>
            </button>

            <button
              onClick={() => setActiveTab("multi_counter")}
              className={`py-2 px-1 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 text-center ${
                activeTab === "multi_counter"
                  ? "bg-white text-purple-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="text-[10px] sm:text-xs">2nd Counter</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* TAB 1: MASTER RECOVERY PIN */}
          {activeTab === "recovery_pin" && (
            <form onSubmit={handleVerifyRecoveryPin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-0.5">
                  <span>Enter 6-Digit Store Master Recovery PIN</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (Provided on shop setup receipt)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={6}
                    value={recoveryPin}
                    onChange={(e) => setRecoveryPin(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="• • • • • •"
                    className="w-full h-12 text-center text-xl tracking-[0.4em] font-mono font-bold rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-hidden transition-all bg-slate-50 focus:bg-white"
                    autoFocus
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <KeyRound className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              {pinError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{pinError}</span>
                </div>
              )}

              {pinSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{pinSuccessMsg}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/60 text-slate-600 text-[11px] space-y-1">
                <p className="font-semibold text-blue-900">
                  ⚡ Instant Self-Service Replacement:
                </p>
                <p>
                  Entering your recovery PIN immediately retires the old phone and authorizes this
                  smartphone without waiting for administrative approval.
                </p>
              </div>

              <button
                type="submit"
                disabled={isVerifyingPin || recoveryPin.length !== 6}
                className="w-full h-12 rounded-xl bg-[#1447E6] hover:bg-[#1038B8] disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99]"
              >
                {isVerifyingPin ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Hardware Signature...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Authorize This Phone &amp; Retire Old Device</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setActiveTab("whatsapp_admin")}
                  className="text-xs text-slate-500 hover:text-blue-600 underline font-medium"
                >
                  Forgot Master Recovery PIN? Click here for WhatsApp Super Admin approval
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: WHATSAPP ADMIN APPROVAL */}
          {activeTab === "whatsapp_admin" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-col items-center text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                  Temporary Authorization Code (Valid 15 Mins)
                </span>
                <div className="flex items-center gap-3 my-1">
                  <span className="text-3xl font-black font-mono tracking-wider text-slate-900">
                    {otpData?.otp || "--- ---"}
                  </span>
                  <button
                    onClick={copyOtpToClipboard}
                    className="p-1.5 rounded-lg bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-700 transition-colors"
                    title="Copy OTP"
                  >
                    {copiedOtp ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Share this OTP with Super Admin or your assigned Sales Representative.
                </p>
              </div>

              {otpData?.whatsappUrl && (
                <a
                  href={otpData.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99]"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send Request to Super Admin on WhatsApp</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              {otpStatusMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    otpStatusMsg.includes("Authorized")
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                      : "bg-slate-100 border border-slate-200 text-slate-700"
                  }`}
                >
                  <RefreshCw
                    className={`w-4 h-4 shrink-0 ${
                      otpStatusMsg.includes("Authorized") ? "text-emerald-600" : "text-slate-500"
                    }`}
                  />
                  <span>{otpStatusMsg}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleCheckWhatsAppApproval}
                disabled={isCheckingOtpStatus}
                className="w-full h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-blue-600 ${isCheckingOtpStatus ? "animate-spin" : ""}`}
                />
                <span>Check Remote Approval Status</span>
              </button>
            </div>
          )}

          {/* TAB 3: MULTI-COUNTER UPGRADE */}
          {activeTab === "multi_counter" && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200/90 text-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>Do you want to use BOTH devices at the same time?</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  If you bought a second phone because your shop has two counters (e.g., peak evening
                  rush hours at Kiryana or Biryani stall), you don&apos;t need to retire your first phone!
                </p>
                <div className="bg-white p-3 rounded-xl border border-purple-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-purple-950">Multi-Counter Plan</p>
                    <p className="text-[10px] text-slate-500">Up to 3 simultaneous terminals + unified khata</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-lg">
                    +PKR 500/mo
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">How to activate 2nd counter:</p>
                <p>1. Contact Super Admin via WhatsApp (+92 313-1122334).</p>
                <p>2. Admin will upgrade your store device quota from 1 to 2 in 60 seconds.</p>
                <p>3. Once upgraded, this second phone will automatically log in without replacement!</p>
              </div>

              <a
                href={`https://wa.me/923131122334?text=${encodeURIComponent(
                  `Assalam-o-Alaikum Super Admin, I want to upgrade store ${storeName} to Multi-Counter (2 active phones).`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Request Multi-Counter Upgrade via WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-400">
          <span className="truncate">Quick-POS Zero-Lockout Architecture</span>
          <span className="font-mono text-[10px] sm:text-[11px] truncate shrink-0">Device: {currentDeviceId.substring(0, 10)}...</span>
        </div>
      </div>
    </div>
  );
}
