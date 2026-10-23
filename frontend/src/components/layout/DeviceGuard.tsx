"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Smartphone,
  MonitorX,
  QrCode,
  ShieldAlert,
  Sparkles,
  Check,
  Copy,
  ExternalLink,
  Share2,
  ScanLine,
  ArrowRight,
  PlusSquare,
  Lock,
} from "lucide-react";
import QRCode from "qrcode";

interface DeviceGuardProps {
  children: React.ReactNode;
  panelTitle: string;
  panelType: "pos" | "sales";
}

export function DeviceGuard({ children, panelTitle, panelType }: DeviceGuardProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [emulatorMode, setEmulatorMode] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [mobileUrl, setMobileUrl] = useState("");
  const [scannableQrData, setScannableQrData] = useState<string>("");
  const [qrViewMode, setQrViewMode] = useState<"branded" | "scannable">("branded");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      const pathname = window.location.pathname;
      const fullUrl = window.location.href;
      setCurrentUrl(fullUrl);

      // Create mobile direct URL with device bypass param
      const targetMobileUrl = `${origin}${pathname}?device=mobile&pwa=1`;
      setMobileUrl(targetMobileUrl);

      // Generate scannable QR code data URL for camera scanning
      QRCode.toDataURL(
        targetMobileUrl,
        {
          width: 320,
          margin: 2,
          color: {
            dark: "#0F172A",
            light: "#FFFFFF",
          },
          errorCorrectionLevel: "H",
        },
        (err, url) => {
          if (!err && url) {
            setScannableQrData(url);
          }
        }
      );
    }

    const checkDevice = () => {
      // 1. PWA Standalone Mode Check (Installed on Home Screen)
      const isStandalone =
        (typeof window !== "undefined" &&
          (window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as unknown as { standalone?: boolean }).standalone === true)) ||
        false;

      if (isStandalone) {
        setIsDesktop(false);
        return;
      }

      // 2. Explicit query parameter override (for testing or QR scan bypass)
      if (typeof window !== "undefined") {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get("device") === "desktop" || searchParams.get("view") === "desktop") {
          setIsDesktop(true);
          return;
        }
        if (
          searchParams.get("device") === "mobile" ||
          searchParams.get("view") === "mobile" ||
          searchParams.get("pwa") === "1"
        ) {
          setIsDesktop(false);
          return;
        }
      }

      // 3. Comprehensive Mobile & Tablet User Agent Check
      const isMobileUA =
        typeof navigator !== "undefined" &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS|FxiOS|Tablet|tablet/i.test(
          navigator.userAgent
        );

      if (isMobileUA) {
        setIsDesktop(false);
        return;
      }

      // 4. Viewport Width Check (Smartphone & Tablet screens < 1024px)
      if (typeof window !== "undefined") {
        if (window.innerWidth < 1024 || (window.screen && window.screen.width < 1024)) {
          setIsDesktop(false);
          return;
        }

        // 5. Touch Devices with screen width under 1200px
        const isTouch =
          ("ontouchstart" in window || navigator.maxTouchPoints > 0) &&
          window.innerWidth < 1200;
        if (isTouch) {
          setIsDesktop(false);
          return;
        }
      }

      // Only widescreen desktop / laptop (>= 1024px) shows the desktop barrier
      setIsDesktop(true);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-[#F8FAFC]" />;
  }

  // Mobile smartphone or tablet: Direct access to Login / Terminal (NEVER show barrier)
  if (!isDesktop) {
    return <>{children}</>;
  }

  // Desktop Simulator Mode: Render inside an interactive smartphone mockup
  if (emulatorMode) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        {/* Top Control Bar for Simulator */}
        <div className="w-full max-w-md mb-3 flex items-center justify-between bg-slate-900/95 border border-slate-800 rounded-2xl px-4 py-2.5 shadow-xl backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-200">Mobile Device Simulator</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
              390 × 844
            </span>
          </div>
          <button
            onClick={() => setEmulatorMode(false)}
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg"
          >
            <MonitorX className="w-3.5 h-3.5" />
            Exit Simulator
          </button>
        </div>

        {/* Mobile Device Mockup Frame (390px x 844px) */}
        <div className="w-[390px] h-[844px] bg-black rounded-[52px] p-3 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] border-4 border-slate-700 relative overflow-hidden flex flex-col ring-1 ring-white/10">
          {/* Dynamic Island Notch */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-50 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 mr-2 ring-1 ring-slate-800" />
            <div className="w-2 h-2 rounded-full bg-blue-950/80" />
          </div>

          {/* Smartphone Screen Content */}
          <div className="w-full h-full bg-[#F8FAFC] rounded-[42px] overflow-y-auto no-scrollbar relative flex flex-col">
            {children}
          </div>

          {/* Home Indicator Bar */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-36 h-1 bg-white/40 rounded-full pointer-events-none z-50" />
        </div>

        <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          Simulation Mode active. In production on mobile devices, users land directly on Store Login.
        </p>
      </div>
    );
  }

  // Desktop Web View Barrier Screen with High-Fidelity QR Code Card
  const shareText = encodeURIComponent(
    `Quick-POS Mobile Terminal (${panelTitle}):\n${mobileUrl || currentUrl}\n\nScan or open on your Android phone to install.`
  );
  const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 sm:p-6 text-slate-900 selection:bg-[#1447E6] selection:text-white">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-[0_20px_45px_rgba(15,23,42,0.07)] flex flex-col items-center text-center">
        
        {/* Device Restriction Icon Badge */}
        <div className="relative mb-3">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF4FF] border border-[#DBEAFE] flex items-center justify-center text-[#1447E6] shadow-xs">
            <Smartphone className="w-7 h-7" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow text-xs">
            <MonitorX className="w-3 h-3" />
          </div>
        </div>

        {/* Title & Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#1447E6] border border-blue-100 text-[11px] font-bold uppercase tracking-wider mb-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Mobile-First POS Terminal
        </div>

        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
          {panelTitle}
        </h1>

        <p className="text-xs text-slate-600 mt-1 max-w-sm leading-relaxed">
          Quick-POS is designed exclusively for Android smartphones with portable 58mm Bluetooth thermal printers.
        </p>

        {/* QR Code Presentation Container */}
        <div className="w-full mt-5 p-5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col items-center">
          
          {/* QR Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 mb-3.5 shadow-2xs">
            <button
              onClick={() => setQrViewMode("branded")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                qrViewMode === "branded"
                  ? "bg-[#1447E6] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Branded QR Design
            </button>
            <button
              onClick={() => setQrViewMode("scannable")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                qrViewMode === "scannable"
                  ? "bg-[#1447E6] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <ScanLine className="w-3 h-3" />
              Live Camera Scannable
            </button>
          </div>

          {/* QR Display Card (Exact Stitch Motif / Live Scannable) */}
          <div className="w-52 h-52 bg-white p-3.5 rounded-2xl border border-blue-100 shadow-md flex items-center justify-center relative">
            {qrViewMode === "branded" ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <Image
                  src="/quickpos-qr-design.png"
                  alt="Quick-POS Branded QR Code"
                  width={180}
                  height={180}
                  priority
                  className="rounded-xl object-contain"
                />
              </div>
            ) : scannableQrData ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={scannableQrData}
                  alt="Live Scannable QR Code"
                  className="w-full h-full object-contain rounded-lg"
                />
                {/* Center Quick-POS Badge in high-correction QR code */}
                <div className="absolute inset-0 m-auto w-9 h-9 rounded-lg bg-[#1447E6] text-white flex items-center justify-center shadow-md font-extrabold text-[11px] border-2 border-white pointer-events-none">
                  QP
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400">Loading scannable QR...</div>
            )}
          </div>

          {/* Helper caption below QR */}
          <p className="text-[11px] font-semibold text-slate-500 mt-2.5">
            {qrViewMode === "branded"
              ? "Official Quick-POS Design Motif"
              : "Point your phone camera or Google Lens directly at the screen"}
          </p>

          {/* URL Pill with Copy and WhatsApp Actions */}
          <div className="w-full flex flex-col sm:flex-row items-center gap-2 mt-3">
            <div className="flex-1 w-full flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs overflow-hidden">
              <span className="text-[11px] font-mono font-medium text-slate-600 truncate">
                {mobileUrl || currentUrl || "http://localhost:3000/pos"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
              <button
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText(mobileUrl || currentUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2200);
                  }
                }}
                className="flex-1 sm:flex-none h-8 px-3 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 text-[#1447E6] text-xs font-bold transition-all flex items-center justify-center gap-1"
                title="Copy Mobile Direct URL"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none h-8 px-3 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all flex items-center justify-center gap-1"
                title="Share link via WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        {/* Step-by-Step Instructions: Scan & Add to Home Screen */}
        <div className="w-full mt-4 space-y-2 text-left">
          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/70">
            <div className="w-6 h-6 rounded-full bg-[#1447E6] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
              1
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Scan QR Code With Android Smartphone</p>
              <p className="text-[11px] text-slate-500">
                Open your smartphone camera or Google Lens to immediately load the mobile terminal.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/70">
            <div className="w-6 h-6 rounded-full bg-[#1447E6] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
              2
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 flex items-center gap-1">
                <span>Add to Home Screen (PWA Shortcut)</span>
                <PlusSquare className="w-3 h-3 text-[#1447E6]" />
              </p>
              <p className="text-[11px] text-slate-500">
                Tap the browser menu (⋮ in Chrome) and tap &quot;Add to Home Screen&quot; or &quot;Install App&quot;.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/70">
            <div className="w-6 h-6 rounded-full bg-[#1447E6] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
              3
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 flex items-center gap-1">
                <span>Direct Access &amp; Store Terminal Sign In</span>
                <Lock className="w-3 h-3 text-emerald-600" />
              </p>
              <p className="text-[11px] text-slate-500">
                On mobile, you are routed directly to the Login page with Store ID &amp; PIN (no desktop warning).
              </p>
            </div>
          </div>
        </div>

        {/* Simulator Button for Desktop Testing */}
        <div className="w-full mt-4">
          <button
            onClick={() => setEmulatorMode(true)}
            className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200/90 text-slate-800 font-bold text-xs border border-slate-200 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <Smartphone className="w-4 h-4 text-[#1447E6]" />
            <span>Preview Mobile Screen (Simulation Mode)</span>
          </button>
        </div>

        {/* Footnote */}
        <p className="text-[11px] text-slate-400 mt-3.5">
          Quick-POS SaaS • Device Guard v1.2 • Shah Faisal Town Pilot, Karachi
        </p>
      </div>
    </div>
  );
}
