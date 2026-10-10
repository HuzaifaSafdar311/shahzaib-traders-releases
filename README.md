# Shahzaib Traders - Inventory Management System

Desktop Inventory Management application for **Shahzaib Traders**, built with Electron and SQLite.

## Features
- **White Theme & Sans-serif Typography**: Minimalist, high-contrast, clean enterprise design.
- **Sidebar Navigation**: Instant switching between **Inventory** and **Vendors**.
- **SQLite Database Storage**:
  - Full relational persistence powered by native SQLite (`vendors` and `inventory` tables).
  - High performance WAL mode with ACID transactions.
- **Search By Functionality**:
  - **Inventory Search By**: Search across All fields, Stock Name only, or Vendor only.
  - **Vendors Search By**: Search across All fields, Vendor Name only, or Phone Number only.
- **Inventory Management**:
  - Row-wise tabular view (Stock Name, Vendor, Quantity, Date, Actions).
  - Responsive column layout (high space for product names, compact for quantities and dates).
  - Filters by Vendor, Stock Level, and Date/Quantity sorting.
  - Add & Edit Stock with stock name, vendor selection, quantity, and date.
  - Direct quick-add vendor pop-up from within the stock entry modal.
- **Vendor Management**:
  - Streamlined vendor schema: **Vendor Name** and **Phone Number**.
  - Add, edit, and delete vendors with automatic relation handling.
- **Export**:
  - CSV export functionality.

## Getting Started

### Prerequisites
- Node.js (v18 or newer)
- npm

### Installation
```bash
npm install
```

### Run Application
```bash
npm start
```
