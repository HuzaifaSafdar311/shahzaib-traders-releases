# Inventory Management System

Desktop Inventory Management application built with Electron.

## Features
- **White Theme & Sans-serif Typography**: Minimalist, high-contrast, clean enterprise design.
- **Sidebar Navigation**: Instant switching between **Inventory** and **Vendors**.
- **Inventory Management**:
  - Row-wise tabular view (Stock Name, Vendor, Quantity, Date, Actions).
  - Search by stock name or vendor.
  - Filters by Vendor, Stock Level, and Date sorting.
  - Add & Edit Stock with stock name, vendor selection, quantity, and date.
  - Direct quick-add vendor pop-up from within the stock entry modal.
- **Vendor Management**:
  - Dedicated section to add and manage vendors (Name, Contact Person, Phone, Email).
  - Automatically linked with the inventory stock records.
- **Data Persistence**:
  - Local JSON storage via Electron IPC.
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
