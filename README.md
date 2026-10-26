# Shahzaib Traders - Enterprise Inventory Management & POS System

[![Electron](https://img.shields.io/badge/Electron-44.7.0-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL%20Mode-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B%20%2F%2024.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-0078D6?logo=windows&logoColor=white)](https://microsoft.com)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success)](#)

---

## 📖 Executive Summary

**Shahzaib Traders Inventory Management System (IMS)** is a desktop Enterprise Resource Planning (ERP), Point of Sale (POS), and Accounting platform designed for wholesale, retail, and distribution enterprises. Built using **Electron** and native **SQLite (`node:sqlite` DatabaseSync)**, the software provides sub-millisecond local data access, complete transactional integrity (ACID), zero internet dependencies, and a resilient multi-tier pricing and party ledger architecture.

---

## 🌟 Core System Modules

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             SHAHZAIB TRADERS PLATFORM                            │
├─────────────────┬─────────────────┬──────────────────┬───────────────────────────┤
│  🏢 GENERAL INFO│   📦 INVENTORY  │   🛒 PURCHASES   │       ⚡ SALES POS        │
│  Parties & Areas│  Catalog & WAC  │ Stock & Rate Mod │ Wholesale/Retail Invoicing│
├─────────────────┼─────────────────┼──────────────────┼───────────────────────────┤
│   💼 ACCOUNTS   │   📊 REPORTS    │    🔒 SECURITY   │     💾 DATA PIPELINE      │
│ Vouchers/Ledgers│ Bill/Party/P&L  │ PIN Auth & Roles │ SQLite WAL & Auto Backups │
└─────────────────┴─────────────────┴──────────────────┴───────────────────────────┘
```

---

### 1. 🏢 General Info & Entity Master Management
- **Party Categorization Engine**: Native support for 7 specialized party classifications:
  - `Customer` (End consumers & commercial buyers)
  - `Vendor / Supplier` (Direct manufacturers & stock suppliers)
  - `Wholesaler` (Bulk purchase & distribution channels)
  - `Retailer` (Retail outlets & partner shops)
  - `Distributor` (Regional logistics & distributors)
  - `Electrician` (Technical contractors & technicians)
  - `Investor` (Capital partners & financial accounts)
- **Party Profile & Audit Directory**: Comprehensive profiles with Party/Business Name, Contact Person, Phone, Email, NTN number, Province, Area, City, and Full Address.
- **Color-Coded Status Badges**: Visual identification tags across all ledger views and POS tables.
- **Geographic Hierarchies**: Province-to-Area normalization for logistical clustering and route reporting.
- **Audit-Protected Opening Balances**: Prevents balance tampering once initial ledger balance is confirmed.

---

### 2. 📦 Product Catalog & Multi-Tier Pricing Architecture
- **Multi-Rate Visibility**: Each product maintains three distinct price tiers:
  - **Trade / Purchase Price**: Procurement baseline cost.
  - **Wholesale Price**: Discounted volume pricing tier.
  - **Retail / Individual Price**: Standard customer counter rate.
- **Weighted Average Cost (WAC)**: Automatic cost averaging dynamically recalculated upon incoming purchases:
  $$\text{New WAC} = \frac{(\text{Existing Stock} \times \text{Current WAC}) + (\text{Incoming Qty} \times \text{Purchase Price})}{\text{Existing Stock} + \text{Incoming Qty}}$$
- **Profit Margin Analytics**: Real-time margin percentages computed instantly against trade vs retail rates.
- **Pack & Loose Unit Support**: Configurable pack sizes (e.g., pieces per carton, meters per roll, boxes).
- **Barcode & Label Integration**: Built-in automated code generation, barcode printing, and EAN scanner compatibility.
- **Stock Threshold Alerts**: Visual indicators for Reorder Levels and Minimum Safe Quantities.

---

### 3. 🛒 Purchasing & Stock Inward Engine
- **Enterprise Purchase Voucher Workflow**: Auto-incrementing vouchers with manual reference tracking, supplier selection, and due dates.
- **Detailed Line-Item Inward**:
  - `Pack Qty` and `Unit Qty` calculations based on item pack size.
  - `Bonus` unit handling without distorting inventory cost.
  - `Trade Offer (T.Offer)` and percentage discount deductions.
- **Live Substance Price Modification**:
  - **Inline Adjustment**: Direct editing of Trade Price, Wholesale Price, and Retail Price during voucher entry.
  - **Dedicated "Change Substance Price" Modal**: One-click modal accessible from table rows or the entry drawer to review rates, live margin percentages, and stock counts.
  - **Master Catalog Sync**: Toggleable option (`Update Master Prices in Catalog`) that updates product rates system-wide upon saving the purchase voucher.
- **Automatic Financial Posting**: Updates the supplier's balance in accounts payable and ledger registers immediately.

---

### 4. ⚡ High-Speed Sales & Point of Sale (POS)
- **Keyboard-Optimized Entry**: Built for fast keyboard navigation without requiring mouse interaction:
  - `F1`: Instant searchable Product Catalog lookup with dual-price preview.
  - `Enter`: Rapid item addition and quantity progression.
- **Flexible Rate Selection**: Automatic toggle between Wholesale and Retail pricing based on party type or manual override.
- **Customer Ledger & Credit Controls**: Real-time previous balance, receivable limit checks, and live net balance display.
- **Multi-Format Receipt Printing**:
  - 80mm / 58mm Thermal Receipt Slip generation.
  - Standard A4 / Half-A4 Commercial Invoices with business logo, NTN, and terms.
- **Sales Return Processing**: Return voucher entry linked directly to inventory restock and ledger credit.

---

### 5. 💼 Financial Accounting & Party Ledgers
- **Double-Entry Voucher System**:
  - `Cash Receipt (CRV)` & `Cash Payment (CPV)`
  - `Bank Receipt (BRV)` & `Bank Payment (BPV)`
  - `Journal Voucher (JV)`
- **Running Ledger Statements**: Detailed debit, credit, balance history, and chronological voucher trace for every party.
- **Automated Reconciliations**: Synchronized with Sales, Sales Returns, and Purchase Vouchers to prevent balance drift.

---

### 6. 📊 Reports, Analytics & Exports
- **Purchases & Vendor Analytics**:
  - Bill-wise Purchase Summaries.
  - Supplier Purchase Volume & Historical Cost Trends.
  - Item-wise Procurement History.
- **Sales & Customer Reporting**:
  - Daily & Date-Range Sales Turnover.
  - Customer-wise Sales Volumes.
  - Item Sales Velocity & Profit Margins.
- **Inventory Valuation**:
  - Current Stock On Hand by Category / Sub-Category.
  - Valuation at Purchase Cost vs Retail Potential.
- **Export Formats**: Native high-speed export to **Microsoft Excel (.xlsx)** via `ExcelJS`, **CSV**, and **Printable PDF**.

---

## 🛠️ Technology Stack & Architecture

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime** | [Electron](https://www.electronjs.org/) v44.7.0 | Desktop container & OS-level integration |
| **Backend Environment** | Node.js (v18+ / v24.x) | Core IPC coordination, file I/O, background routines |
| **Database Engine** | SQLite via `node:sqlite` (DatabaseSync) | Native high-performance local relational storage |
| **Database Mode** | SQLite WAL (Write-Ahead Logging) | Concurrent read/write with atomic ACID transactions |
| **Frontend UI** | HTML5, CSS3, Vanilla ES6+ JavaScript | Zero-framework, lightweight, fast UI |
| **Spreadsheet Engine** | [ExcelJS](https://github.com/exceljs/exceljs) v4.4.0 | Multi-sheet styling and XLSX export |
| **Packager** | [electron-builder](https://www.electron.build/) v26.15.3 | Windows NSIS installer & portable distribution |

---

## 📂 Project Directory Structure

```plaintext
shahzaib-traders-app/
├── assets/                          # Static branding, logos, and app icons
├── backups/                         # Automated SQLite database snapshot backups
├── dist/                            # Production installer and binaries
├── scratch/                         # Validation scripts and test harnesses
├── src/
│   ├── Genral info/                 # General Info Module (Parties, Types, Provinces, Areas)
│   │   ├── general-info.js          # UI controller & DOM handler
│   │   ├── general-info-db.js       # Database CRUD & relational logic
│   │   └── general-info.css         # Dedicated stylesheets
│   ├── accounts/                    # Accounts Module (Vouchers, Ledgers, Balances)
│   │   ├── accounts.js              # UI controller & voucher handling
│   │   ├── accounts-db.js           # Double-entry SQLite queries
│   │   └── accounts.css             # Accounting stylesheets
│   ├── inventory/                   # Inventory & Purchase Module
│   │   ├── inventory.js             # Purchase Vouchers, Price Modifications, Catalog
│   │   └── inventory.css            # Inventory stylesheets
│   ├── sales/                       # Sales POS Module
│   │   ├── sales.js                 # High-speed POS, F1 modal, invoice generation
│   │   └── sales.css                # POS layouts and print stylesheets
│   ├── reports/                     # Business Intelligence & Reports Hub
│   │   ├── reports.js               # Report views & filter orchestrator
│   │   └── reports-engine.js        # Data aggregation algorithms
│   ├── export/                      # Export Engine
│   │   └── exporter.js              # ExcelJS, CSV, and PDF export logic
│   ├── database/                    # Database Infrastructure
│   │   ├── db.js                    # Core SQLite initialization, migrations & queries
│   │   └── schema.sql               # Relational table definitions
│   ├── shared/                      # Shared helper utilities & components
│   │   ├── utils.js                 # Currency formatters, dates, sanitization
│   │   └── toast.js                 # Visual toast notifications
│   ├── auth/                        # Security & PIN Authentication
│   ├── splash/                      # Application loading splash screen
│   ├── index.html                   # Single-Page Application (SPA) container
│   ├── main.js                      # Electron Main process & IPC handlers
│   ├── preload.js                   # Secure contextBridge API exposer
│   └── renderer.js                  # Frontend master coordinator
├── inventory.db                     # Development SQLite database file
├── package.json                     # Project manifest & dependency configuration
└── README.md                        # Technical documentation
```

---

## 💽 Database Architecture & Storage Locations

The application maintains an enterprise SQLite schema with foreign key references and indices on `code`, `voucherNo`, `partyId`, and `entryDate`.

### Storage Locations in Windows:
1. **Development Environment**:
   `.\inventory.db` (Root directory of the repository)
2. **Packaged / Installed Application**:
   `%APPDATA%\inventory-management-system\inventory.db`
   *(Path: `C:\Users\<User>\AppData\Roaming\inventory-management-system\inventory.db`)*
3. **Application Bundle Target**:
   `.\St\win-unpacked\resources\inventory.db`

### Auto-Backup System:
- Automated snapshots are saved to the `backups/` directory before updates and data imports.
- Recovery commands can be executed via the settings module or database restore routines.

---

## 🚀 Getting Started & Installation

### Prerequisites
- **Node.js**: `v18.0.0` or newer (Recommended: `v20.x` or `v24.x`)
- **Package Manager**: `npm` (v9 or newer)
- **Operating System**: Windows 10 / 11 (64-bit)

### 1. Installation
Clone the repository and install project dependencies:
```bash
git clone https://github.com/arhamsolution-me/Inventory-management.git
cd Inventory-management
npm install
```

### 2. Run in Development Mode
Launch the application with live Electron shell:
```bash
npm start
```

### 3. Build & Package for Production
To package the app into a standalone Windows directory:
```bash
npm run pack
```

To generate the full **NSIS Windows Installer** (`.exe`) and portable build in `dist/`:
```bash
npm run dist
```

---

## ⌨️ Keyboard Shortcuts & Operational Workflow

| Shortcut | Context | Function |
| :--- | :--- | :--- |
| **`F1`** | Sales POS / Invoicing | Opens instant searchable Product Catalog lookup |
| **`Enter`** | POS Item Code | Auto-selects product and advances to quantity field |
| **`Enter`** | Quantity Input | Adds line item to cart and resets scanner focus |
| **`Esc`** | Any Modal | Closes active modal, dropdown, or search flyout |
| **`Ctrl + P`** | Voucher / Invoice | Opens system print dialog |
| **`Click on Price`**| Purchase Voucher | Opens **Change Substance Price** modal directly |

---

## 🛡️ Security, Validation & Data Integrity

- **Strict Electron Sandbox**: Context isolation is enforced via `contextBridge` in `preload.js`; node integration is disabled in the renderer window for secure execution.
- **ACID Transactions**: Financial voucher creation and stock updates run inside SQLite transactions (`BEGIN TRANSACTION ... COMMIT`), guaranteeing zero orphaned line items or mismatched balances.
- **SQL Injection Prevention**: All queries use prepared statements with parameterized inputs (`stmt.run(?, ?)`).
- **Graceful JSON Fallback**: Includes automated JSON data fallback handling for edge-case recovery if file locks occur.

---

## 📄 License & Attribution

- **Developed for**: **Shahzaib Traders**
- **Copyright**: © 2026 Shahzaib Traders. All rights reserved.
- **License**: Proprietary / Commercial Internal Use.
