"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Printer,
  Wifi,
  WifiOff,
  Store,
  Shield,
  Briefcase,
  Layers,
  ArrowRight,
  Smartphone,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Link001,
  Link002,
  Link003,
  Link004,
  Link005,
} from "@/components/ui/skiper-ui/skiper40";
import { escposPrinter } from "@/lib/printer/escpos";
import { sqliteDb } from "@/lib/offline/sqlite-db";

interface PanelHeaderProps {
  currentPanel: "admin" | "pos" | "sales";
}

export function PanelHeader({ currentPanel }: PanelHeaderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setPendingSyncCount(sqliteDb.getPendingSyncCount());
    setPrinterConnected(escposPrinter.isConnected());

    const prevOnStatusChange = escposPrinter.onStatusChange;
    escposPrinter.onStatusChange = (status) => {
      setPrinterConnected(status === "CONNECTED");
      if (prevOnStatusChange) prevOnStatusChange(status);
    };

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleConnectPrinter = async () => {
    try {
      if (escposPrinter.isConnected()) {
        escposPrinter.disconnect();
        setPrinterConnected(false);
        sqliteDb.updatePrinterConfig({ is_connected: 0 });
        return;
      }
      const connected = await escposPrinter.connect();
      setPrinterConnected(connected);
      sqliteDb.updatePrinterConfig({ is_connected: connected ? 1 : 0 });
    } catch (err: any) {
      alert("Bluetooth printer error: " + (err.message || err));
    }
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/95 px-3 sm:px-4 backdrop-blur-md z-40">
      {/* Brand & Active Panel Info */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 font-black text-white shadow-lg shadow-emerald-950/60 shrink-0 text-xs sm:text-sm">
            QP
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white truncate">Quick-POS</span>
              {currentPanel === "admin" && (
                <Badge variant="outline" className="border-purple-500/40 text-purple-400 text-[10px] py-0 px-1.5 font-mono shrink-0">
                  <span className="sm:hidden">Admin</span>
                  <span className="hidden sm:inline">Super Admin [Panel A]</span>
                </Badge>
              )}
              {currentPanel === "pos" && (
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px] py-0 px-1.5 font-mono shrink-0">
                  <span className="sm:hidden">POS</span>
                  <span className="hidden sm:inline">Customer POS [Panel B]</span>
                </Badge>
              )}
              {currentPanel === "sales" && (
                <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px] py-0 px-1.5 font-mono shrink-0">
                  <span className="sm:hidden">Sales</span>
                  <span className="hidden sm:inline">Field Rep [Panel C]</span>
                </Badge>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 hidden xs:flex items-center gap-1.5 truncate">
              <span>Shah Faisal Town, Karachi</span> • <span className="text-slate-500 font-mono">Pilot v1.0</span>
            </p>
          </div>
        </Link>
      </div>

      {/* Skiper-UI Animated Links for Panel Switching */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-semibold">
        <Link001
          href="/pos"
          className={currentPanel === "pos" ? "text-emerald-400 font-bold" : "text-slate-400 hover:text-slate-200"}
        >
          Customer POS
        </Link001>

        <Link005
          href="/sales"
          className={currentPanel === "sales" ? "text-amber-400 font-bold" : "text-slate-400 hover:text-slate-200"}
        >
          Sales Rep Field Portal
        </Link005>

        {currentPanel === "admin" && (
          <span className="text-purple-400 font-bold text-xs bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-500/20">
            Super Admin Console
          </span>
        )}
      </nav>

      {/* Action Controls & Hardware Sync */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Bluetooth Thermal Printer */}
        <Button
          size="sm"
          variant={printerConnected ? "default" : "outline"}
          onClick={handleConnectPrinter}
          className={`h-8 sm:h-9 px-2 sm:px-3 gap-1 sm:gap-1.5 text-xs font-semibold ${
            printerConnected
              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
              : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <Printer className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">
            {printerConnected ? "Printer Paired" : "Connect BT Printer"}
          </span>
          <span className="sm:hidden">{printerConnected ? "BT" : "Pair"}</span>
        </Button>

        {/* Offline SQLite Status */}
        <div className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-slate-800 bg-slate-900 px-2 sm:px-3 py-1 text-xs">
          {isOnline ? (
            <span className="flex items-center gap-1 sm:gap-1.5 text-emerald-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="hidden sm:inline">Online</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 sm:gap-1.5 text-amber-400 font-medium">
              <WifiOff className="h-3.5 w-3.5 shrink-0" />
              <span>Offline</span>
            </span>
          )}
          {pendingSyncCount > 0 && (
            <Badge variant="warning" className="ml-1 text-[10px] py-0 px-1 font-mono">
              {pendingSyncCount} queued
            </Badge>
          )}
        </div>

        {/* Mobile Hamburger Navigation Button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          className="md:hidden h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800 shrink-0"
          aria-label="Toggle panel menu"
        >
          {isMobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>
    </header>

    {/* Mobile & Tablet Panel Navigation Drawer */}
    {isMobileNavOpen && (
      <div className="md:hidden border-b border-slate-800 bg-slate-900/98 px-3.5 py-3 space-y-2 backdrop-blur-md z-40 shadow-xl animate-in slide-in-from-top-2 duration-150 shrink-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1">
          Switch POS Portal
        </div>
        <div className="space-y-1">
          <Link
            href="/pos"
            onClick={() => setIsMobileNavOpen(false)}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              currentPanel === "pos"
                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Store className="h-4 w-4 text-emerald-400" />
              <span>Customer POS Terminal [Panel B]</span>
            </div>
            {currentPanel === "pos" && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-500/40 text-emerald-400 font-mono">
                Active
              </Badge>
            )}
          </Link>

          <Link
            href="/sales"
            onClick={() => setIsMobileNavOpen(false)}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              currentPanel === "sales"
                ? "bg-amber-600/20 text-amber-300 border border-amber-500/30"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Briefcase className="h-4 w-4 text-amber-400" />
              <span>Sales Rep Field Portal [Panel C]</span>
            </div>
            {currentPanel === "sales" && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-500/40 text-amber-400 font-mono">
                Active
              </Badge>
            )}
          </Link>

          <Link
            href="/admin"
            onClick={() => setIsMobileNavOpen(false)}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              currentPanel === "admin"
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Shield className="h-4 w-4 text-purple-400" />
              <span>Super Admin Console [Panel A]</span>
            </div>
            {currentPanel === "admin" && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-purple-500/40 text-purple-400 font-mono">
                Active
              </Badge>
            )}
          </Link>
        </div>
      </div>
    )}
    </>
  );
}
