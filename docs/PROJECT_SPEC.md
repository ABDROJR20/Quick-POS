# QUICK-POS — MASTER PROJECT SPECIFICATION

**Version:** 1.0  
**Project:** Quick-POS  
**Market:** Pakistan  
**Primary Launch Area:** Shah Faisal Town, Karachi  
**Project Type:** Mobile-First POS SaaS with Offline Billing and Bluetooth Thermal Printing  
**Architecture:** Monorepo with Next.js PWA (`frontend/`) and Laravel API (`backend/`)

---

## 1. Role & Charter
Senior Full-Stack Engineer, Software Architect, Database Designer, UI/UX Designer, QA Engineer, and Technical Product Manager. Quick-POS is a commercial-grade, multi-tenant POS SaaS for Pakistani retail micro/SMEs. Not a generic demo or billing calculator.

## 2. Business Objectives & Market Model
- **Launch Territory:** Shah Faisal Town, Karachi (expansion: Gulshan-e-Iqbal, Gulistan-e-Johar).
- **Target:** 12 new stores per month.
- **Capital & Cost Structure:**
  - Initial seed capital: PKR 150,000.
  - Onboarding Package: PKR 11,000 (Installment 1: PKR 5,000, Installment 2: PKR 6,000).
  - Ongoing SaaS Subscription: PKR 1,000 / month / shop (starts Month 3).
  - Hardware procurement: ~PKR 7,000 per Bluetooth thermal printer unit.

## 3. Technology Stack (Approved Architectural Update)
- **Frontend / Mobile Client:** Next.js (TypeScript) PWA, Tailwind CSS, `shadcn/ui`, `@skiper-ui/skiper40`.
- **Backend API:** Laravel 11 / Sanctum REST API.
- **Database:** MySQL / PostgreSQL (multi-tenant with strict `tenant_id` scoping).
- **Offline Storage:** SQLite client-side persistent database with relational tables and ACID transactions.
- **Printing:** Web Bluetooth ESC/POS engine (58mm/80mm roll support).
- **Messaging:** WhatsApp Cloud API / provider for automated subscription billing alerts.
- **Payments:** Pakistani digital payment gateways (JazzCash, EasyPaisa, Raast, 1Link) with webhook verification.

## 4. The Three Panels
1. **Panel A (Super Admin):** SaaS dashboard, shop management, subscription lifecycle, printer inventory tracking, sales rep commission & territory management, audit logs.
2. **Panel B (Customer POS):** Android-first, high-contrast touch POS, quick billing, inventory, supplier purchase, udhaar/khata book, thermal printing, offline queue.
3. **Panel C (Sales Representative):** Android-optimized field portal for Shah Faisal Town merchant onboarding, printer dispatch/testing, visit logs, lead tracking.

## 5. Multi-Tenant Architecture & Isolation
- Every business table references `tenant_id`.
- Tenant scoping enforced at Laravel model global scopes and Sanctum token middleware.
- Client transactions carry unique idempotent IDs (`QP-TXN-...`).

## 6. Business Templates
- Template A: Kiryana / General Store (loose goods, kg/pao, barcode).
- Template B: Meat Shop (rate calculations, gram/kg, wastage).
- Template C: Biryani / Food Stall (half/full plate, portions, quick counter).
- Template D: Tailor (customer measurements, stitching status, advance/balance).
- Template E: Boutique / Mini-Mart (variants, sizes, colors, barcodes).
- Custom Template: Admin-configurable fields & workflows.

## 7. Staff & Worker Commission Management
- Commission types: % of sale, fixed per order, product-specific, tiered targets.
- Multi-worker attribution, settlement logs, refund/cancellation adjustments.

## 8. Offline Billing & Bluetooth Thermal Printing
- Web Bluetooth ESC/POS driver for 58mm and 80mm printers.
- Full receipt layout: Shop name, Karachi address, Phone, Invoice number, Date/Time, Items, Tax/Discounts, Khata balance, QR verification.
- Offline queue persists transactions locally and syncs idempotently when online.
