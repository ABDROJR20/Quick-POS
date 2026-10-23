"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  Store,
  Printer,
  Users,
  CreditCard,
  Sliders,
  DollarSign,
  PiggyBank,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Check,
  X,
  RefreshCw,
  TrendingUp,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Lock,
  Key,
  Mail,
  LogOut,
  Eye,
  EyeOff,
  ShieldCheck,
  Copy,
  Share2,
  Sparkles,
  Send,
  Package,
  Boxes,
  KeyRound,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PanelHeader } from "@/components/layout/PanelHeader";
import { formatPKR } from "@/lib/utils";
import { storeRegistry, StoreAccount } from "@/lib/stores/store-registry";
import { ProductRecord } from "@/lib/offline/sqlite-db";

interface ShopRecord {
  id: string;
  name: string;
  owner_name: string;
  phone: string;
  area: string;
  template_type: "kiryana" | "meat" | "biryani" | "tailor" | "boutique" | "custom";
  status: "active" | "suspended" | "grace_period" | "trial";
  subscription_status: "paid" | "due" | "overdue";
  next_due_date: string;
  printer_assigned: string | null;
  enabled_modules: string[];
}

interface HardwarePrinter {
  serial_number: string;
  model: string;
  actual_cost: number;
  assigned_to_shop: string | null;
  status: "in_stock" | "dispatched" | "testing" | "faulty";
}

interface PaymentVerificationItem {
  id: string;
  shop_name: string;
  stage: "Installment 1" | "Installment 2" | "Monthly SaaS";
  amount: number;
  method: "JazzCash" | "EasyPaisa" | "Raast" | "Bank Transfer";
  reference: string;
  timestamp: string;
  status: "pending" | "verified" | "rejected";
}

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "shops" | "subscriptions" | "printers" | "reps" | "payments" | "audit"
  >("overview");

  // Super Admin Authentication State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const session = sessionStorage.getItem("quickpos_admin_session");
    if (session === "active") {
      setIsAdminAuthenticated(true);
    }
    setAuthChecked(true);
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsSubmittingAuth(true);

    setTimeout(() => {
      const email = adminEmail.trim().toLowerCase();
      if (
        (email === "admin@quickpos.pk" && adminPassword === "admin123") ||
        (email === "root@quickpos.pk" && adminPassword === "admin123") ||
        (email === "admin" && adminPassword === "admin")
      ) {
        sessionStorage.setItem("quickpos_admin_session", "active");
        setIsAdminAuthenticated(true);
        setLoginError("");
      } else {
        setLoginError("Invalid credentials. Try admin@quickpos.pk / admin123");
      }
      setIsSubmittingAuth(false);
    }, 350);
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem("quickpos_admin_session");
    setIsAdminAuthenticated(false);
    setAdminEmail("");
    setAdminPassword("");
    setLoginError("");
  };

  // Section 2 Business Policies State
  const [businessPolicy, setBusinessPolicy] = useState({
    seedCapital: 150000,
    onboardingTotal: 11000,
    installment1: 5000,
    installment2: 6000,
    monthlySaas: 1000,
    printerCostEstimate: 7000,
    printerOwnership: "Merchant-owned after Installment 2",
    monthlyTarget: 12,
    launchTerritory: "Shah Faisal Town, Karachi",
  });
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState({ ...businessPolicy });

  // Shops State from storeRegistry
  const [shops, setShops] = useState<StoreAccount[]>([]);
  const [isAddShopModalOpen, setIsAddShopModalOpen] = useState(false);
  const [viewingCatalogShop, setViewingCatalogShop] = useState<StoreAccount | null>(null);
  const [editingPinShop, setEditingPinShop] = useState<StoreAccount | null>(null);
  const [newPinInput, setNewPinInput] = useState("");

  const [newCatalogItem, setNewCatalogItem] = useState({
    name: "",
    category: "",
    sale_price: 100,
    cost_price: 75,
    unit: "pcs",
    stock_quantity: 50,
    image_url: "",
  });

  const [newShopForm, setNewShopForm] = useState({
    name: "",
    owner_name: "",
    phone: "",
    area: "Shah Faisal Colony # 2",
    template_type: "kiryana" as "kiryana" | "meat" | "biryani" | "tailor" | "boutique" | "custom",
    custom_pin: "",
    custom_store_code: "",
    custom_category_name: "",
    initial_custom_products: [] as Array<{
      id: string;
      name: string;
      category: string;
      barcode: string;
      unit: string;
      cost_price: number;
      sale_price: number;
      stock_quantity: number;
      min_stock_alert: number;
      is_active: number;
      image_url?: string;
    }>,
    temp_item_name: "",
    temp_item_price: "",
    temp_item_category: "",
    temp_item_unit: "pcs",
    temp_item_image: "",
  });

  const [createdCredentialsModal, setCreatedCredentialsModal] = useState<{
    store_code: string;
    login_pin: string;
    name: string;
    owner_name: string;
    phone: string;
    template: string;
    productCount: number;
  } | null>(null);
  const [copiedShopId, setCopiedShopId] = useState<string | null>(null);

  useEffect(() => {
    setShops(storeRegistry.getStores());
  }, []);

  const handleAddTempCustomItem = () => {
    if (!newShopForm.temp_item_name.trim()) return;
    const price = parseFloat(newShopForm.temp_item_price) || 100;
    const item = {
      id: `cst-${Date.now()}`,
      name: newShopForm.temp_item_name.trim(),
      category:
        newShopForm.temp_item_category.trim() ||
        newShopForm.custom_category_name.trim() ||
        "General Products",
      barcode: `${Date.now()}`.slice(-12),
      unit: newShopForm.temp_item_unit || "pcs",
      cost_price: Math.round(price * 0.75),
      sale_price: price,
      stock_quantity: 50,
      min_stock_alert: 5,
      is_active: 1,
      image_url: newShopForm.temp_item_image.trim() || undefined,
    };

    setNewShopForm({
      ...newShopForm,
      initial_custom_products: [...newShopForm.initial_custom_products, item],
      temp_item_name: "",
      temp_item_price: "",
      temp_item_image: "",
    });
  };

  const handleRemoveTempItem = (index: number) => {
    const updated = [...newShopForm.initial_custom_products];
    updated.splice(index, 1);
    setNewShopForm({ ...newShopForm, initial_custom_products: updated });
  };

  const handleCreateNewShop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopForm.name || !newShopForm.owner_name || !newShopForm.phone) return;

    const created = storeRegistry.createStore({
      name: newShopForm.name,
      owner_name: newShopForm.owner_name,
      phone: newShopForm.phone,
      area: newShopForm.area,
      template_type: newShopForm.template_type,
      custom_pin: newShopForm.custom_pin || undefined,
      custom_store_code: newShopForm.custom_store_code || undefined,
      custom_products:
        newShopForm.initial_custom_products.length > 0
          ? newShopForm.initial_custom_products
          : undefined,
    });

    setShops(storeRegistry.getStores());
    setIsAddShopModalOpen(false);
    setCreatedCredentialsModal({
      store_code: created.store_code,
      login_pin: created.login_pin,
      name: created.name,
      owner_name: created.owner_name,
      phone: created.phone,
      template: created.template_type,
      productCount: created.products?.length || 0,
    });
    setNewShopForm({
      name: "",
      owner_name: "",
      phone: "",
      area: "Shah Faisal Colony # 2",
      template_type: "kiryana",
      custom_pin: "",
      custom_store_code: "",
      custom_category_name: "",
      initial_custom_products: [],
      temp_item_name: "",
      temp_item_price: "",
      temp_item_category: "",
      temp_item_unit: "pcs",
      temp_item_image: "",
    });
  };

  const handleAddProductToStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingCatalogShop || !newCatalogItem.name.trim()) return;

    const prod: ProductRecord = {
      id: `prod-${Date.now()}`,
      name: newCatalogItem.name.trim(),
      category: newCatalogItem.category.trim() || "General",
      barcode: `${Date.now()}`.slice(-12),
      unit: newCatalogItem.unit || "pcs",
      cost_price: Number(newCatalogItem.cost_price) || 0,
      sale_price: Number(newCatalogItem.sale_price) || 10,
      stock_quantity: Number(newCatalogItem.stock_quantity) || 50,
      min_stock_alert: 5,
      is_active: 1,
      image_url: newCatalogItem.image_url.trim() || undefined,
    };

    storeRegistry.addStoreProduct(viewingCatalogShop.id, prod);
    const updated = storeRegistry.getStores();
    setShops(updated);
    const updatedTarget = updated.find((s) => s.id === viewingCatalogShop.id) || null;
    setViewingCatalogShop(updatedTarget);
    setNewCatalogItem({
      name: "",
      category: "",
      sale_price: 100,
      cost_price: 75,
      unit: "pcs",
      stock_quantity: 50,
      image_url: "",
    });
  };

  const handleUpdateStorePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPinShop || !newPinInput.trim()) return;

    storeRegistry.updateStorePin(editingPinShop.id, newPinInput.trim());
    const updated = storeRegistry.getStores();
    setShops(updated);
    setEditingPinShop(null);
    setNewPinInput("");
  };

  const handleCopyCredentials = (shop: StoreAccount) => {
    const slip = `*Quick-POS Store Terminal Credentials*\n\n🏪 Store Name: ${shop.name}\n👤 Owner: ${shop.owner_name}\n🏷️ Business Type: ${shop.template_type.toUpperCase()}\n\n🔑 STORE ID / CODE: ${shop.store_code}\n🔒 LOGIN PIN: ${shop.login_pin}\n\n📱 POS Link: http://localhost:3000/pos?device=mobile\n\nInstructions:\n1. Open the link on your Android smartphone.\n2. Tap (⋮) -> 'Add to Home Screen' to save app shortcut.\n3. Enter Store ID & PIN to start billing.\n(Note: Public sign-ups are disabled. Keep credentials secure.)`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(slip);
      setCopiedShopId(shop.id);
      setTimeout(() => setCopiedShopId(null), 2500);
    }
  };

  // Printers Inventory
  const [printers, setPrinters] = useState<HardwarePrinter[]>([
    { serial_number: "PRN-58-001", model: "POS-58 Bluetooth", actual_cost: 6950, assigned_to_shop: "Madina Kiryana Store", status: "dispatched" },
    { serial_number: "PRN-58-002", model: "POS-58 Bluetooth", actual_cost: 6950, assigned_to_shop: "Al-Makkah Meat", status: "dispatched" },
    { serial_number: "PRN-58-003", model: "POS-58 Bluetooth", actual_cost: 7100, assigned_to_shop: "Karachi Biryani", status: "dispatched" },
    { serial_number: "PRN-58-004", model: "POS-58 Bluetooth", actual_cost: 6950, assigned_to_shop: null, status: "testing" },
    { serial_number: "PRN-58-005", model: "POS-58 Bluetooth", actual_cost: 7000, assigned_to_shop: null, status: "in_stock" },
    { serial_number: "PRN-58-006", model: "POS-58 Bluetooth", actual_cost: 7000, assigned_to_shop: null, status: "in_stock" },
  ]);

  // Payment Verification Queue
  const [payments, setPayments] = useState<PaymentVerificationItem[]>([
    {
      id: "PMT-101",
      shop_name: "Madina Kiryana Store",
      stage: "Installment 1",
      amount: 5000,
      method: "JazzCash",
      reference: "JC-882910123",
      timestamp: "2026-10-15 14:30",
      status: "verified",
    },
    {
      id: "PMT-102",
      shop_name: "Madina Kiryana Store",
      stage: "Installment 2",
      amount: 6000,
      method: "Bank Transfer",
      reference: "HBL-44910299",
      timestamp: "2026-10-18 11:20",
      status: "verified",
    },
    {
      id: "PMT-103",
      shop_name: "Al-Makkah Meat & Poultry",
      stage: "Installment 1",
      amount: 5000,
      method: "EasyPaisa",
      reference: "EP-99120488",
      timestamp: "2026-10-19 16:45",
      status: "verified",
    },
    {
      id: "PMT-104",
      shop_name: "Karachi Biryani & Pulao",
      stage: "Installment 1",
      amount: 5000,
      method: "Raast",
      reference: "RAAST-88129033",
      timestamp: "2026-10-20 10:15",
      status: "pending",
    },
  ]);

  // Field Sales Representatives
  const salesReps = [
    {
      name: "Hamza Farooq",
      phone: "0313-1122334",
      territory: "Shah Faisal Block 1 & 2",
      onboarded_stores: 2,
      target: 6,
      commission_earned: 2000,
      commission_paid: 2000,
    },
    {
      name: "Usman Tariq",
      phone: "0321-5566778",
      territory: "Shah Faisal Block 3 & Colony",
      onboarded_stores: 2,
      target: 6,
      commission_earned: 2000,
      commission_paid: 1000,
    },
  ];

  const handleVerifyPayment = (id: string) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "verified" } : p))
    );
  };

  const handleToggleShopStatus = (shopId: string) => {
    setShops((prev) =>
      prev.map((s) => {
        if (s.id === shopId) {
          const nextStatus = s.status === "active" ? "suspended" : "active";
          return { ...s, status: nextStatus };
        }
        return s;
      })
    );
  };

  if (!authChecked) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  // If Super Admin is NOT authenticated, display the secure root login screen
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between p-4 selection:bg-purple-600 selection:text-white">
        {/* Top Minimal Bar */}
        <header className="flex items-center justify-between py-2 px-4 max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-purple-900/50">
              QP
            </div>
            <span className="font-extrabold text-sm tracking-tight text-white">Quick-POS SaaS</span>
          </div>
          <span className="text-[11px] font-mono text-purple-400 bg-purple-950/70 border border-purple-800/50 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            Restricted Admin Area
          </span>
        </header>

        {/* Center Login Box */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500" />

            <div className="text-center space-y-2 mb-6">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shadow-inner">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">Super Admin Portal</h1>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Authorized Platform Administrators Only. Shah Faisal Pilot Control Console.
              </p>
            </div>

            {loginError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Admin Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@quickpos.pk"
                    className="w-full h-11 bg-slate-950 border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl pl-10 pr-4 text-xs text-white placeholder-slate-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Master Password
                  </label>
                  <span className="text-[11px] text-slate-500">256-bit AES</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 bg-slate-950 border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl pl-10 pr-10 text-xs text-white placeholder-slate-500 transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Demo Credentials Auto-fill button */}
              <button
                type="button"
                onClick={() => {
                  setAdminEmail("admin@quickpos.pk");
                  setAdminPassword("admin123");
                  setLoginError("");
                }}
                className="w-full text-left p-2 rounded-lg bg-purple-950/40 border border-purple-800/40 hover:bg-purple-900/40 text-[11px] text-purple-300 flex items-center justify-between transition-colors"
              >
                <span>Click to auto-fill demo credentials</span>
                <span className="font-mono font-bold text-white bg-purple-600/60 px-1.5 py-0.5 rounded">Fill</span>
              </button>

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmittingAuth ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Authenticating Root Access...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Secure Sign In</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-800 text-center">
              <p className="text-[11px] text-slate-500">
                Quick-POS SaaS • Shah Faisal Town Pilot • Root Console
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-2 text-[11px] text-slate-600">
          Protected by Hardware Security Module &bull; Multi-Tenant Isolated
        </footer>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-slate-950 font-sans text-slate-100 overflow-hidden">
      <PanelHeader currentPanel="admin" />

      {/* Main Admin Console Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Admin Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col border-r border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            Platform Management
          </div>

          <button
            onClick={() => setActiveTab("overview")}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
              activeTab === "overview"
                ? "bg-purple-600/20 text-purple-400 border border-purple-500/30"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <TrendingUp className="h-4 w-4" /> Dashboard Overview
          </button>

          <button
            onClick={() => setActiveTab("shops")}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
              activeTab === "shops"
                ? "bg-purple-600/20 text-purple-400 border border-purple-500/30"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Store className="h-4 w-4" /> Shop Management ({shops.length})
          </button>

          <button
            onClick={() => setActiveTab("payments")}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
              activeTab === "payments"
                ? "bg-purple-600/20 text-purple-400 border border-purple-500/30"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <CreditCard className="h-4 w-4" /> Payment Verification
            </div>
            {payments.filter((p) => p.status === "pending").length > 0 && (
              <Badge variant="warning" className="text-[10px] py-0 px-1.5 font-mono">
                {payments.filter((p) => p.status === "pending").length}
              </Badge>
            )}
          </button>

          <button
            onClick={() => setActiveTab("printers")}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
              activeTab === "printers"
                ? "bg-purple-600/20 text-purple-400 border border-purple-500/30"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Printer className="h-4 w-4" /> Printer Inventory ({printers.length})
          </button>

          <button
            onClick={() => setActiveTab("reps")}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
              activeTab === "reps"
                ? "bg-purple-600/20 text-purple-400 border border-purple-500/30"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Users className="h-4 w-4" /> Sales Representatives
          </button>

          <div className="pt-4 border-t border-slate-800 mt-4 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            System & Policies
          </div>

          <button
            onClick={() => {
              setPolicyForm({ ...businessPolicy });
              setIsPolicyModalOpen(true);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition-all"
          >
            <Sliders className="h-4 w-4" /> Configurable Policies
          </button>

          <div className="pt-4 border-t border-slate-800 mt-4 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Security & Session
          </div>

          <button
            onClick={handleAdminLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 border border-rose-900/30 transition-all"
          >
            <LogOut className="h-4 w-4" /> Lock &amp; Sign Out
          </button>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h1 className="text-2xl font-black text-white">Super Admin Control Center</h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Launch Territory: <span className="text-emerald-400 font-semibold">{businessPolicy.launchTerritory}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setPolicyForm({ ...businessPolicy });
                      setIsPolicyModalOpen(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5"
                  >
                    <Sliders className="h-4 w-4" /> Business Policies
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAdminLogout}
                    className="border-rose-900/50 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 text-xs gap-1.5"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign Out
                  </Button>
                </div>
              </div>

              {/* High-level KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-800 bg-slate-900/80">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center justify-between">
                      <span>Initial Seed Capital</span>
                      <PiggyBank className="h-4 w-4 text-emerald-400" />
                    </CardDescription>
                    <CardTitle className="text-2xl font-extrabold text-white">
                      {formatPKR(businessPolicy.seedCapital)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-400">
                    Current Cash in Bank: <span className="font-bold text-emerald-400">PKR 125,550</span>
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900/80">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center justify-between">
                      <span>Monthly Onboarding Target</span>
                      <Store className="h-4 w-4 text-teal-400" />
                    </CardDescription>
                    <CardTitle className="text-2xl font-extrabold text-teal-400">
                      {shops.length} / {businessPolicy.monthlyTarget} Shops
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-400">
                    Month 1 Target in Shah Faisal Town
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900/80">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center justify-between">
                      <span>Verified Revenue Collected</span>
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                    </CardDescription>
                    <CardTitle className="text-2xl font-extrabold text-emerald-400">
                      PKR 21,000
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-400">
                    Installment 1 & 2 actual verified receipts
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900/80">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center justify-between">
                      <span>Printers Deployed</span>
                      <Printer className="h-4 w-4 text-amber-400" />
                    </CardDescription>
                    <CardTitle className="text-2xl font-extrabold text-amber-400">
                      {printers.filter((p) => p.status === "dispatched").length} / {printers.length} Units
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-400">
                    In Stock: {printers.filter((p) => p.status === "in_stock").length} units
                  </CardContent>
                </Card>
              </div>

              {/* Active Onboarding Package Overview Card */}
              <Card className="border-slate-800 bg-slate-900/60">
                <CardHeader className="pb-3 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-white">Active Onboarding Package & Pricing Model</CardTitle>
                      <CardDescription className="text-xs">
                        Configurable parameters governing merchant onboarding packages
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
                      Active Policy
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <span className="text-slate-400">Total Package</span>
                    <p className="text-lg font-bold text-white mt-1">{formatPKR(businessPolicy.onboardingTotal)}</p>
                    <p className="text-[11px] text-slate-500">Includes setup & printer</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <span className="text-slate-400">1st Payment (Onboarding)</span>
                    <p className="text-lg font-bold text-emerald-400 mt-1">{formatPKR(businessPolicy.installment1)}</p>
                    <p className="text-[11px] text-slate-500">App install & testing</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <span className="text-slate-400">2nd Payment (Delivery)</span>
                    <p className="text-lg font-bold text-emerald-400 mt-1">{formatPKR(businessPolicy.installment2)}</p>
                    <p className="text-[11px] text-slate-500">Hardware handover</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <span className="text-slate-400">Monthly SaaS (From Month 3)</span>
                    <p className="text-lg font-bold text-teal-400 mt-1">{formatPKR(businessPolicy.monthlySaas)} / shop</p>
                    <p className="text-[11px] text-slate-500">Software license fee</p>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Shop Registrations */}
              <Card className="border-slate-800 bg-slate-900/60">
                <CardHeader className="pb-3 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-white">Registered Stores in Shah Faisal Town</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab("shops")} className="text-xs text-purple-400">
                      View All Shops →
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-800 text-xs">
                    {shops.map((shop) => (
                      <div key={shop.id} className="flex items-center justify-between p-3">
                        <div>
                          <p className="font-semibold text-slate-200">{shop.name}</p>
                          <p className="text-[11px] text-slate-400">
                            {shop.owner_name} • {shop.phone} • {shop.area}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize text-[10px]">
                            {shop.template_type}
                          </Badge>
                          <Badge variant={shop.status === "active" ? "success" : "warning"}>
                            {shop.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: SHOPS MANAGEMENT */}
          {activeTab === "shops" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h1 className="text-2xl font-black text-white">Shop & Merchant Management</h1>
                  <p className="text-xs text-slate-400">
                    Admin generates and assigns credentials directly to store owners. No public signup allowed.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsAddShopModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-md shadow-emerald-950/40"
                >
                  <Plus className="h-4 w-4" /> Onboard Store & Generate Credentials
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {shops.map((shop) => (
                  <Card key={shop.id} className="border-slate-800 bg-slate-900/80 p-4 relative overflow-hidden">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Shop Info */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-base text-white">{shop.name}</h3>
                          <Badge variant={shop.status === "active" ? "success" : "warning"} className="capitalize text-[11px]">
                            {shop.status}
                          </Badge>
                          <Badge variant="outline" className="border-slate-700 capitalize text-[11px] text-purple-300 bg-purple-950/30">
                            Template: {shop.template_type}
                          </Badge>
                          <Badge variant="outline" className="border-blue-800 text-blue-400 bg-blue-950/30 text-[10px]">
                            {shop.products?.length || 0} Products Cataloged
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400">
                          Owner: <span className="text-slate-200 font-semibold">{shop.owner_name}</span> • Phone: <span className="text-slate-200 font-mono font-semibold">{shop.phone}</span> • Area: <span className="text-slate-200">{shop.area}</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Assigned Printer: <span className="font-mono text-emerald-400">{shop.printer_assigned || "None"}</span> • Next Subscription Due: <span className="text-slate-300">{shop.next_due_date}</span>
                        </p>

                        {/* Store Credentials Pill (Issued by Admin) */}
                        <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center gap-3">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            Store Login Credentials:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400">Store ID:</span>
                            <span className="text-xs font-mono font-extrabold text-purple-400 bg-purple-950/60 px-2.5 py-0.5 rounded border border-purple-800/50">
                              {shop.store_code}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400">PIN:</span>
                            <span className="text-xs font-mono font-extrabold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800/50">
                              {shop.login_pin}
                            </span>
                          </div>

                          <div className="ml-auto flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => setViewingCatalogShop(shop)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-colors border border-purple-800/40"
                              title="View and edit store product catalog"
                            >
                              <Boxes className="w-3.5 h-3.5" />
                              <span>Catalog ({shop.products?.length || 0})</span>
                            </button>
                            <button
                              onClick={() => {
                                setEditingPinShop(shop);
                                setNewPinInput(shop.login_pin);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center gap-1 transition-colors border border-amber-800/40"
                              title="Change store access PIN"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>PIN</span>
                            </button>
                            <button
                              onClick={() => handleCopyCredentials(shop)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
                            >
                              <Copy className="w-3.5 h-3.5 text-blue-400" />
                              <span>{copiedShopId === shop.id ? "Slip Copied!" : "Copy Slip"}</span>
                            </button>
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(
                                `*Quick-POS Store Credentials*\n\nStore: ${shop.name}\nOwner: ${shop.owner_name}\nStore ID: ${shop.store_code}\nPIN: ${shop.login_pin}\nTerminal URL: http://localhost:3000/pos?device=mobile\n\nLogin on your Android smartphone.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-800/50 text-xs font-bold flex items-center gap-1.5 transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex lg:flex-col items-center justify-end gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant={shop.status === "active" ? "destructive" : "default"}
                          onClick={() => handleToggleShopStatus(shop.id)}
                          className="h-8 text-xs font-semibold w-full"
                        >
                          {shop.status === "active" ? "Suspend Store" : "Activate Store"}
                        </Button>
                      </div>

                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENT VERIFICATION */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h1 className="text-2xl font-black text-white">Payment Verification & Reconciliation</h1>
                  <p className="text-xs text-slate-400">Review and verify merchant digital onboarding & subscription payments</p>
                </div>
              </div>

              <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/80 text-xs">
                {payments.map((pmt) => (
                  <div key={pmt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{pmt.shop_name}</span>
                        <Badge variant="outline" className="border-slate-700 text-slate-300">
                          {pmt.stage}
                        </Badge>
                        <Badge variant={pmt.status === "verified" ? "success" : "warning"}>
                          {pmt.status}
                        </Badge>
                      </div>
                      <p className="text-slate-400">
                        Method: <span className="text-slate-200 font-semibold">{pmt.method}</span> • Ref: <span className="font-mono text-emerald-400">{pmt.reference}</span> • Received: {pmt.timestamp}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-base font-extrabold text-emerald-400">
                        {formatPKR(pmt.amount)}
                      </span>
                      {pmt.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => handleVerifyPayment(pmt.id)}
                          className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                        >
                          Verify & Activate
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PRINTER INVENTORY */}
          {activeTab === "printers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h1 className="text-2xl font-black text-white">Bluetooth Printer Inventory</h1>
                  <p className="text-xs text-slate-400">Track procured hardware, serial numbers, and shop deployments</p>
                </div>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5">
                  <Plus className="h-4 w-4" /> Add Printer Batch
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {printers.map((prn) => (
                  <Card key={prn.serial_number} className="border-slate-800 bg-slate-900/80 p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-xs text-white">{prn.serial_number}</span>
                      <Badge variant={prn.status === "dispatched" ? "success" : "secondary"} className="capitalize text-[10px]">
                        {prn.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">{prn.model}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Procurement Cost: <span className="font-bold text-slate-200">{formatPKR(prn.actual_cost)}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Assigned Shop: <span className="text-emerald-400 font-semibold">{prn.assigned_to_shop || "Unassigned"}</span>
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: SALES REPS */}
          {activeTab === "reps" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h1 className="text-2xl font-black text-white">Sales Representatives (Field Team)</h1>
                  <p className="text-xs text-slate-400">Shah Faisal Town merchant acquisition team & incentive performance</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {salesReps.map((rep) => (
                  <Card key={rep.name} className="border-slate-800 bg-slate-900/80 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-white">{rep.name}</h3>
                        <p className="text-xs text-slate-400">Territory: {rep.territory} • {rep.phone}</p>
                      </div>
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-xs">
                        Active Field Rep
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center text-xs">
                      <div className="rounded bg-slate-950 p-2">
                        <span className="text-slate-400">Onboarded</span>
                        <p className="font-bold text-white mt-0.5">{rep.onboarded_stores} / {rep.target}</p>
                      </div>
                      <div className="rounded bg-slate-950 p-2">
                        <span className="text-slate-400">Commission</span>
                        <p className="font-bold text-emerald-400 mt-0.5">{formatPKR(rep.commission_earned)}</p>
                      </div>
                      <div className="rounded bg-slate-950 p-2">
                        <span className="text-slate-400">Paid Out</span>
                        <p className="font-bold text-teal-400 mt-0.5">{formatPKR(rep.commission_paid)}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Policy Modal */}
      <Dialog open={isPolicyModalOpen} onOpenChange={setIsPolicyModalOpen}>
        <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sliders className="h-5 w-5 text-emerald-400" />
              Configure Business Policies
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Update pricing, payment schedules, and targets. Policies apply dynamically without hardcoded logic.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Seed Capital Budget (PKR)</label>
                <Input
                  type="number"
                  value={policyForm.seedCapital}
                  onChange={(e) => setPolicyForm({ ...policyForm, seedCapital: Number(e.target.value) })}
                  className="bg-slate-800 border-slate-700 h-9"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Monthly Shop Target</label>
                <Input
                  type="number"
                  value={policyForm.monthlyTarget}
                  onChange={(e) => setPolicyForm({ ...policyForm, monthlyTarget: Number(e.target.value) })}
                  className="bg-slate-800 border-slate-700 h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Total Package (PKR)</label>
                <Input
                  type="number"
                  value={policyForm.onboardingTotal}
                  onChange={(e) => setPolicyForm({ ...policyForm, onboardingTotal: Number(e.target.value) })}
                  className="bg-slate-800 border-slate-700 h-9"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1">1st Payment (PKR)</label>
                <Input
                  type="number"
                  value={policyForm.installment1}
                  onChange={(e) => setPolicyForm({ ...policyForm, installment1: Number(e.target.value) })}
                  className="bg-slate-800 border-slate-700 h-9 text-emerald-400 font-bold"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1">2nd Payment (PKR)</label>
                <Input
                  type="number"
                  value={policyForm.installment2}
                  onChange={(e) => setPolicyForm({ ...policyForm, installment2: Number(e.target.value) })}
                  className="bg-slate-800 border-slate-700 h-9 text-emerald-400 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Monthly SaaS Fee (PKR)</label>
                <Input
                  type="number"
                  value={policyForm.monthlySaas}
                  onChange={(e) => setPolicyForm({ ...policyForm, monthlySaas: Number(e.target.value) })}
                  className="bg-slate-800 border-slate-700 h-9 text-teal-400 font-bold"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Est. Printer Cost (PKR)</label>
                <Input
                  type="number"
                  value={policyForm.printerCostEstimate}
                  onChange={(e) => setPolicyForm({ ...policyForm, printerCostEstimate: Number(e.target.value) })}
                  className="bg-slate-800 border-slate-700 h-9"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Launch Territory</label>
              <Input
                value={policyForm.launchTerritory}
                onChange={(e) => setPolicyForm({ ...policyForm, launchTerritory: e.target.value })}
                className="bg-slate-800 border-slate-700 h-9"
              />
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Printer Ownership Policy</label>
              <select
                value={policyForm.printerOwnership}
                onChange={(e) => setPolicyForm({ ...policyForm, printerOwnership: e.target.value })}
                className="w-full h-9 rounded-md border border-slate-700 bg-slate-800 px-3 text-xs text-slate-100"
              >
                <option value="Merchant-owned after Installment 2">Merchant-owned after Installment 2</option>
                <option value="Company-owned (Lease model)">Company-owned (Lease model)</option>
                <option value="Upfront Merchant Purchase">Upfront Merchant Purchase</option>
              </select>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                className="flex-1 border-slate-700 bg-slate-800 text-slate-300"
                onClick={() => setIsPolicyModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 font-bold text-white"
                onClick={() => {
                  setBusinessPolicy({ ...policyForm });
                  setIsPolicyModalOpen(false);
                }}
              >
                Save Business Policy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ONBOARD NEW STORE & GENERATE CREDENTIALS (CUSTOM REQUIREMENTS BUILDER) */}
      <Dialog open={isAddShopModalOpen} onOpenChange={setIsAddShopModalOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Onboard Store &amp; Issue Credentials
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Admin generates and provisions credentials directly. If the store owner has specific requirements, configure their custom products below.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNewShop} className="space-y-4 pt-2 text-xs">
            <div>
              <label className="text-slate-300 font-bold block mb-1">Store / Business Name *</label>
              <Input
                required
                placeholder="e.g. Al-Madad Auto Parts &amp; Oils"
                value={newShopForm.name}
                onChange={(e) => setNewShopForm({ ...newShopForm, name: e.target.value })}
                className="bg-slate-800 border-slate-700 h-9 text-white font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Owner Full Name *</label>
                <Input
                  required
                  placeholder="e.g. M. Tariq"
                  value={newShopForm.owner_name}
                  onChange={(e) => setNewShopForm({ ...newShopForm, owner_name: e.target.value })}
                  className="bg-slate-800 border-slate-700 h-9"
                />
              </div>
              <div>
                <label className="text-slate-300 font-bold block mb-1">Owner Phone (WhatsApp) *</label>
                <Input
                  required
                  placeholder="0300-1234567"
                  value={newShopForm.phone}
                  onChange={(e) => setNewShopForm({ ...newShopForm, phone: e.target.value })}
                  className="bg-slate-800 border-slate-700 h-9 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Business Template / Category</label>
              <select
                value={newShopForm.template_type}
                onChange={(e) =>
                  setNewShopForm({
                    ...newShopForm,
                    template_type: e.target.value as "kiryana" | "meat" | "biryani" | "tailor" | "boutique" | "custom",
                  })
                }
                className="w-full h-9 rounded-md border border-slate-700 bg-slate-800 px-3 text-xs text-slate-100"
              >
                <option value="kiryana">Kiryana / General Store (Groceries, Spices, Oils)</option>
                <option value="meat">Meat &amp; Poultry Shop (Fresh Beef, Mutton, Broiler with KG billing)</option>
                <option value="biryani">Food Stall / Biryani Counter (Portion billing, Raita, Drinks)</option>
                <option value="tailor">Tailoring &amp; Fabric Studio (Stitching services &amp; fabrics)</option>
                <option value="boutique">Boutique &amp; Fashion (Pret, Unstitched Suits, Dupattas)</option>
                <option value="custom">Custom Specific Store (Auto Parts, Pan Shop, Electronics, Services)</option>
              </select>
            </div>

            {/* Custom Category Specifics */}
            {newShopForm.template_type === "custom" && (
              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 space-y-2">
                <label className="text-[11px] font-bold text-purple-300 block">
                  Specific Store Category / Niche Description
                </label>
                <Input
                  placeholder="e.g. Motorcycle Spare Parts &amp; Lubricants"
                  value={newShopForm.custom_category_name}
                  onChange={(e) => setNewShopForm({ ...newShopForm, custom_category_name: e.target.value })}
                  className="bg-slate-900 border-purple-800/50 h-8 text-xs text-white"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Territory / Area</label>
                <Input
                  placeholder="Shah Faisal Colony # 2"
                  value={newShopForm.area}
                  onChange={(e) => setNewShopForm({ ...newShopForm, area: e.target.value })}
                  className="bg-slate-800 border-slate-700 h-9"
                />
              </div>
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Custom Store ID / Code (Optional)
                </label>
                <Input
                  placeholder="e.g. ALMADAD-01"
                  value={newShopForm.custom_store_code}
                  onChange={(e) => setNewShopForm({ ...newShopForm, custom_store_code: e.target.value.toUpperCase() })}
                  className="bg-slate-800 border-slate-700 h-9 font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-bold">Store Access PIN</label>
                <span className="text-[11px] text-slate-500">Leave blank to auto-generate 4-digit PIN</span>
              </div>
              <Input
                placeholder="Auto-generated e.g. 5832"
                maxLength={6}
                value={newShopForm.custom_pin}
                onChange={(e) => setNewShopForm({ ...newShopForm, custom_pin: e.target.value })}
                className="bg-slate-800 border-slate-700 h-9 font-mono"
              />
            </div>

            {/* Quick Add Custom Inventory Items (For Stores with Specific Requirements) */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-purple-400" />
                  Specific Store Products (Optional / Custom Items)
                </span>
                <span className="text-[10px] text-purple-400 font-mono">
                  {newShopForm.initial_custom_products.length} added
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Item Name"
                  value={newShopForm.temp_item_name}
                  onChange={(e) => setNewShopForm({ ...newShopForm, temp_item_name: e.target.value })}
                  className="bg-slate-900 border-slate-700 h-8 text-xs col-span-2"
                />
                <Input
                  placeholder="Price (PKR)"
                  type="number"
                  value={newShopForm.temp_item_price}
                  onChange={(e) => setNewShopForm({ ...newShopForm, temp_item_price: e.target.value })}
                  className="bg-slate-900 border-slate-700 h-8 text-xs"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <Input
                  placeholder="Category (e.g. Engine Oil, Filters)"
                  value={newShopForm.temp_item_category}
                  onChange={(e) => setNewShopForm({ ...newShopForm, temp_item_category: e.target.value })}
                  className="bg-slate-900 border-slate-700 h-8 text-xs flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddTempCustomItem}
                  className="h-8 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shrink-0 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>

              {/* Added Items Chips */}
              {newShopForm.initial_custom_products.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pt-1 border-t border-slate-800">
                  {newShopForm.initial_custom_products.map((item, idx) => (
                    <div key={item.id} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                      <div>
                        <span className="font-semibold text-white">{item.name}</span>
                        <span className="text-slate-400 ml-2">({item.category})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-emerald-400 font-bold">{formatPKR(item.sale_price)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTempItem(idx)}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-slate-700 bg-slate-800 text-slate-300"
                onClick={() => setIsAddShopModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-purple-600 hover:bg-purple-500 font-bold text-white shadow-md shadow-purple-900/40"
              >
                Issue Credentials &amp; Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: CREDENTIALS GENERATED SLIP */}
      {createdCredentialsModal && (
        <Dialog open={!!createdCredentialsModal} onOpenChange={() => setCreatedCredentialsModal(null)}>
          <DialogContent className="border-purple-500/30 bg-slate-900 text-slate-100 max-w-sm">
            <DialogHeader>
              <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <DialogTitle className="text-center text-lg font-bold text-white">
                Store Credentials Generated!
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-slate-400">
                Provide these credentials to the merchant. They can log in immediately on their Android smartphone.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Store Name</span>
                <p className="text-sm font-extrabold text-white">{createdCredentialsModal.name}</p>
                <p className="text-[11px] text-slate-400">Owner: {createdCredentialsModal.owner_name} • {createdCredentialsModal.phone}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-900">
                <div className="bg-purple-950/40 border border-purple-800/40 rounded-xl p-2.5">
                  <span className="text-[10px] text-purple-300 uppercase font-bold block">Store ID / Code</span>
                  <p className="text-base font-mono font-black text-purple-400 mt-0.5">
                    {createdCredentialsModal.store_code}
                  </p>
                </div>
                <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-2.5">
                  <span className="text-[10px] text-emerald-300 uppercase font-bold block">Login PIN</span>
                  <p className="text-base font-mono font-black text-emerald-400 mt-0.5">
                    {createdCredentialsModal.login_pin}
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-800 font-mono text-center">
                Terminal URL: http://localhost:3000/pos?device=mobile
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                onClick={() => {
                  const slip = `*Quick-POS Store Credentials*\n\n🏪 Store: ${createdCredentialsModal.name}\n👤 Owner: ${createdCredentialsModal.owner_name}\n\n🔑 Store ID / Code: ${createdCredentialsModal.store_code}\n🔒 Login PIN: ${createdCredentialsModal.login_pin}\n\n📱 POS Link: http://localhost:3000/pos?device=mobile\n\nInstructions:\n1. Open link on your Android smartphone.\n2. Tap browser menu (⋮) -> 'Add to Home Screen'.\n3. Enter Store ID & PIN to start billing.\n(Note: Public signups disabled. Keep credentials secure.)`;
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText(slip);
                  }
                  alert("Credentials slip copied to clipboard!");
                }}
                className="w-full bg-[#1447E6] hover:bg-[#0F3BC4] text-white font-bold text-xs gap-2"
              >
                <Copy className="w-4 h-4" /> Copy Credentials Slip
              </Button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `*Quick-POS Store Credentials*\n\n🏪 Store: ${createdCredentialsModal.name}\n👤 Owner: ${createdCredentialsModal.owner_name}\n\n🔑 Store ID: ${createdCredentialsModal.store_code}\n🔒 Login PIN: ${createdCredentialsModal.login_pin}\n\n📱 Terminal Link: http://localhost:3000/pos?device=mobile\n\nLogin on your Android phone.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full h-9 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" /> Share Directly on WhatsApp
              </a>

              <Button
                variant="outline"
                onClick={() => setCreatedCredentialsModal(null)}
                className="w-full border-slate-700 bg-slate-800 text-slate-300 text-xs"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 4: STORE CATALOG & INVENTORY INSPECTION */}
      {viewingCatalogShop && (
        <Dialog open={!!viewingCatalogShop} onOpenChange={() => setViewingCatalogShop(null)}>
          <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-purple-400" />
                  <span>{viewingCatalogShop.name} — Catalog ({viewingCatalogShop.products?.length || 0})</span>
                </div>
                <Badge variant="outline" className="text-purple-400 border-purple-800 font-mono text-xs">
                  {viewingCatalogShop.store_code}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Products loaded in this merchant&apos;s mobile POS terminal. Admin can add new items or customize prices anytime.
              </DialogDescription>
            </DialogHeader>

            {/* Quick Add Product to this Store Form with Image Support */}
            <form onSubmit={handleAddProductToStore} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-purple-400" />
                  <span>+ Add Item with Product Image to {viewingCatalogShop.name}</span>
                </span>
                <span className="text-[10px] text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800">
                  Syncs to Merchant POS
                </span>
              </div>

              {/* Row 1: Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <Input
                  required
                  placeholder="Item Name (e.g. Brake Oil 500ml)"
                  value={newCatalogItem.name}
                  onChange={(e) => setNewCatalogItem({ ...newCatalogItem, name: e.target.value })}
                  className="bg-slate-900 border-slate-700 h-8 text-xs sm:col-span-2 text-white"
                />
                <Input
                  placeholder="Category (e.g. Spare Parts)"
                  value={newCatalogItem.category}
                  onChange={(e) => setNewCatalogItem({ ...newCatalogItem, category: e.target.value })}
                  className="bg-slate-900 border-slate-700 h-8 text-xs text-white"
                />
                <Input
                  required
                  type="number"
                  placeholder="Sale Price (PKR)"
                  value={newCatalogItem.sale_price}
                  onChange={(e) => setNewCatalogItem({ ...newCatalogItem, sale_price: Number(e.target.value) })}
                  className="bg-slate-900 border-slate-700 h-8 text-xs text-emerald-400 font-mono font-bold"
                />
              </div>

              {/* Row 2: Image URL, Upload & Live Preview */}
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                      Product Image (URL or Local Device Upload)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Image URL (e.g. https://... or choose preset below)"
                        value={newCatalogItem.image_url}
                        onChange={(e) => setNewCatalogItem({ ...newCatalogItem, image_url: e.target.value })}
                        className="bg-slate-950 border-slate-700 h-8 text-[11px] text-white flex-1"
                      />
                      <label className="h-8 px-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors">
                        <Upload className="w-3.5 h-3.5 text-purple-400" />
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => {
                                setNewCatalogItem({ ...newCatalogItem, image_url: reader.result as string });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Live Preview Box */}
                  <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden relative">
                    {newCatalogItem.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={newCatalogItem.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[9px] text-slate-500 text-center font-bold">No Img</span>
                    )}
                  </div>
                </div>

                {/* Quick Pakistani Image Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold">Quick Presets:</span>
                  {[
                    { label: "Shan Masala", url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCn7jhdetb6Kze7i8w4JVJ3adVIcIhzeCToVnZbmwGLDiWsDLGAlOthqu7cj2-JSReIdrw0N0CY4NfwH5tBsceos_Op5obrxVnw93jCf6Nn2far1GX2yJg9lw3UjvHpIJ0Dx091CjGDtn7bkloZACwknx9jJ9V07wV9AP7FLUAodf9xTXPkZgdsZcLbq6UBqZk_qQdOthGEy8aU4y7E3XX0qKIAfz-ZRPDjq-GxZcNTNQ3AZmC9HW-l" },
                    { label: "Tapal Tea", url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDeYaoF85vkHVipEU_pSLFzypaDhSon3Tr5kfnN1Zafd749PhrYeVgeYLIc3Hx3pqtAbJQx3piKk7xHpKeOtM57PJQVHNTASVhl7gzcRC78COw-xAUYDlbEJYqXEJZ1dFhxn_HY_l_av1dvwffqYXpuyMUOlCeHH1A7FrcDoZnv9tHIGMyE-EnUkegp_I4nbBZtLbKUfcRuE8BTd0a7Z8mMTZUJUfyzKjrAhWTrKdUU5wexacxE9zPv" },
                    { label: "Lawn Kurti", url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCn7jhdetb6Kze7i8w4JVJ3adVIcIhzeCToVnZbmwGLDiWsDLGAlOthqu7cj2-JSReIdrw0N0CY4NfwH5tBsceos_Op5obrxVnw93jCf6Nn2far1GX2yJg9lw3UjvHpIJ0Dx091CjGDtn7bkloZACwknx9jJ9V07wV9AP7FLUAodf9xTXPkZgdsZcLbq6UBqZk_qQdOthGEy8aU4y7E3XX0qKIAfz-ZRPDjq-GxZcNTNQ3AZmC9HW-l" },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setNewCatalogItem({ ...newCatalogItem, image_url: p.url })}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700 transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                  {newCatalogItem.image_url && (
                    <button
                      type="button"
                      onClick={() => setNewCatalogItem({ ...newCatalogItem, image_url: "" })}
                      className="text-[10px] text-rose-400 hover:underline ml-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-1">
                <Button type="submit" size="sm" className="h-8 bg-purple-600 hover:bg-purple-500 font-bold text-xs px-4">
                  Add Item with Image
                </Button>
              </div>
            </form>

            {/* Products Table with Photo Column */}
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-2.5 font-bold w-12 text-center">Photo</th>
                      <th className="p-2.5 font-bold">Item Name</th>
                      <th className="p-2.5 font-bold">Category</th>
                      <th className="p-2.5 font-bold">Sale Price</th>
                      <th className="p-2.5 font-bold">Cost</th>
                      <th className="p-2.5 font-bold">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(viewingCatalogShop.products || []).map((prod) => (
                      <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-2 text-center">
                          <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-700 overflow-hidden mx-auto flex items-center justify-center">
                            {prod.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={prod.image_url}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-4 h-4 text-slate-600" />
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 font-semibold text-white">{prod.name}</td>
                        <td className="p-2.5 text-slate-400">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] border border-slate-700">
                            {prod.category}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono font-bold text-emerald-400">{formatPKR(prod.sale_price)}</td>
                        <td className="p-2.5 font-mono text-slate-400">{formatPKR(prod.cost_price)}</td>
                        <td className="p-2.5 font-mono text-slate-300">{prod.stock_quantity} {prod.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingCatalogShop(null)}
                className="border-slate-700 bg-slate-800 text-slate-300"
              >
                Close Catalog
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 5: CHANGE / RESET STORE PIN */}
      {editingPinShop && (
        <Dialog open={!!editingPinShop} onOpenChange={() => setEditingPinShop(null)}>
          <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Reset PIN: {editingPinShop.name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Update the 4-digit terminal login PIN for this store.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateStorePin} className="space-y-3.5 pt-2 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">New 4-Digit Access PIN</label>
                <Input
                  required
                  maxLength={6}
                  placeholder="e.g. 7860"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  className="bg-slate-800 border-slate-700 h-10 font-mono font-bold text-emerald-400 text-base tracking-widest text-center"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingPinShop(null)}
                  className="flex-1 border-slate-700 bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-500 font-bold text-white text-xs"
                >
                  Save New PIN
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
