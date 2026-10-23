# QUICK-POS — CHANGELOG

## [1.3.0] - 2026-10-24
### Standard 10: Bluetooth Thermal Printing Engine
- Upgraded ESC/POS printer driver (`frontend/src/lib/printer/escpos.ts`):
  - Tri-Mode architecture: Web Bluetooth API (BLE GATT), Android RawBT Companion Bridge (`rawbt:base64`), and Browser/System print fallback.
  - 58mm (32 chars) and 80mm (48 chars) strict monospace column rulers and table layout.
  - Cash drawer solenoid kick pulse (`ESC p 0 25 250`), paper feed (`ESC d n`), and auto-cutter (`GS V 66 0`).
  - Audited reprint mode with `*** DUPLICATE / REPRINT ***` watermark and guaranteed zero inventory deduction.
  - Comprehensive diagnostic hardware test slip generation.
  - Interactive Urdu / Roman Urdu and English troubleshooting guide for Pakistani retailers.
- Built high-fidelity UI components:
  - `frontend/src/components/printer/ThermalReceiptModal.tsx`: dynamic 58mm/80mm receipt preview, Bluetooth print, RawBT dispatch, and browser print fallback.
  - `frontend/src/components/printer/PrinterTroubleshootingModal.tsx`: accordion guide covering GPS permissions, pairing codes, thermal roll orientation, battery drops, and RawBT app.
- Integrated full printer control console in Customer POS (`/pos` under `subTab === "printer"`):
  - Real-time GATT connection state monitoring with connect/disconnect actions.
  - 5-Action Tactile Diagnostics Bento (Test Print, Paper Feed, Cut Paper, Cash Drawer, Sound Buzzer).
  - Printer configuration settings with persistence in `sqliteDb`.
  - Audited reprint actions in offline queue and transaction history.
- Authored authoritative specification: `docs/BLUETOOTH_THERMAL_PRINTING.md`.
- Automated test script: `scratch/test-printer.mjs` verifying byte sequences, rulers, and reprinting.

## [1.2.0] - 2026-10-20
### Section 4: Three Separate Role-Based Panels
- Created dedicated desktop-optimized **Panel A: Super Admin** (`/admin`) with full SaaS management:
  - Active shops, suspension/activation, and template management.
  - Printer hardware inventory tracking (serial number, model, assignment status).
  - Field Sales Representative management & incentive tracking.
  - Digital payment verification & reconciliation queue (JazzCash, EasyPaisa, Raast, Bank Transfer).
  - Configurable business policy modal.
- Created dedicated mobile-first **Panel B: Customer POS** (`/pos`) optimized for Android smartphones:
  - Fast touch billing, loose units (kg, pao, packet), and cash tender calculator.
  - Product & inventory management with low-stock alerts.
  - Customer Khata (Udhaar) ledger and WhatsApp balance reminder generator.
  - Purchases and wholesaler invoice tracking.
  - Cash drawer reconciliation and daily sales reports.
  - Staff & worker commission rules and settlements.
  - Offline SQLite transaction persistence & Web Bluetooth ESC/POS thermal printing.
- Created dedicated mobile-first **Panel C: Sales Representative** (`/sales`) for Shah Faisal Town field onboarding:
  - Personal dashboard with monthly targets (12 stores) and earned incentives (PKR 1,000 / store).
  - New merchant lead creation form.
  - Demonstration tracking and visit logs.
  - Security boundaries enforced: No access to shop inventories or customer accounts, and cash collection prohibited (digital payments only).
- Created shared navigation header [PanelHeader.tsx](file:///d:/Quick%20Pos/frontend/src/components/layout/PanelHeader.tsx) with `@skiper-ui/skiper40` animated links, BT printer status, and offline indicators.
- Created master launcher at root (`/`) providing 1-click access to all 3 panels.

## [1.1.0] - 2026-10-20
### Section 2: Business Objectives & Configurable Financial Policies
- Built dynamic business policy engine (`business_policies` table and frontend modal) to eliminate hardcoded assumptions.
- Structured configurable onboarding terms: PKR 150,000 seed capital budget, 12 shops/month target, PKR 11,000 onboarding package (Payment 1: PKR 5,000, Payment 2: PKR 6,000), and PKR 1,000/month recurring SaaS from Month 3.
- Engineered separate auditable ledgers for non-guaranteed financials: `hardware_procurements` (actual printer costs vs PKR 7,000 estimate), `tenant_payments` (verified installment receipts), and `operating_expenses` (field rep fuel/SIM data in Shah Faisal Town).
- Implemented real-time capital runway & bank cash balance metrics.
- Added Laravel migration `2026_10_20_000002_create_business_policies_and_financial_ledger_table.php` and `FinancialPolicyController.php`.

## [1.0.0] - 2026-10-20
### Initial Setup & Architectural Alignment
- Initialized Monorepo structure: `frontend/` (Next.js PWA + shadcn/ui + skiper-ui), `backend/` (Laravel 11 API), and `docs/`.
- Authored permanent Master Project Specification (`docs/PROJECT_SPEC.md`).
- Authored System Architecture (`docs/ARCHITECTURE.md`), Database Schema (`docs/DATABASE_SCHEMA.md`), and Security Model (`docs/SECURITY.md`).
- Configured Next.js frontend with Tailwind CSS, TypeScript, and `@skiper-ui/skiper40` animated links.
- Implemented SQLite client-side persistent billing engine and Web Bluetooth ESC/POS receipt printing engine.
