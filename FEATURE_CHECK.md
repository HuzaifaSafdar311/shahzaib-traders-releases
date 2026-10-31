# FEATURE CHECK: "List Price minus Discount" Feature Audit (Step 0)

Date: 2026-10-31
Scope: Entire project (`src/**`, database schema, JSON fallback, reports, exports, print templates) for terms: `companyDiscount`, `tradeOffer`, `discountPercent`, `profitMargin`, `effectiveCost`, `netCost`, `averageCost`, `list price`, `retail discount`.

---

## 1. Which Parts of the Feature Already Exist

### A. Database Schema & Migrations (`src/database/db.js`)
- **Version 2 Migration (`src/database/db.js:112-166`):**
  ```javascript
  // Version 2: List Price minus Discount pricing features
  if (currentVersion < 2) {
    if (!tableHasColumn(db, 'products', 'purchasePricingMode')) {
      db.exec("ALTER TABLE products ADD COLUMN purchasePricingMode TEXT DEFAULT NULL;");
    }
    if (!tableHasColumn(db, 'products', 'purchaseDiscountPercent')) {
      db.exec("ALTER TABLE products ADD COLUMN purchaseDiscountPercent REAL DEFAULT NULL;");
    }
    if (!tableHasColumn(db, 'purchase_items', 'pricingMode')) {
      db.exec("ALTER TABLE purchase_items ADD COLUMN pricingMode TEXT DEFAULT 'direct';");
    }
    if (!tableHasColumn(db, 'purchase_items', 'listPrice')) {
      db.exec("ALTER TABLE purchase_items ADD COLUMN listPrice REAL DEFAULT 0;");
    }
    if (!tableHasColumn(db, 'purchase_items', 'discountType')) {
      db.exec("ALTER TABLE purchase_items ADD COLUMN discountType TEXT DEFAULT 'percent';");
    }
    if (!tableHasColumn(db, 'purchase_items', 'discountValue')) {
      db.exec("ALTER TABLE purchase_items ADD COLUMN discountValue REAL DEFAULT 0;");
    }
    if (!tableHasColumn(db, 'purchase_items', 'netCost')) {
      db.exec("ALTER TABLE purchase_items ADD COLUMN netCost REAL DEFAULT 0;");
    }
    if (!tableHasColumn(db, 'sale_items', 'costAtSale')) {
      db.exec("ALTER TABLE sale_items ADD COLUMN costAtSale REAL DEFAULT 0;");
    }
    if (!tableHasColumn(db, 'sale_items', 'listPrice')) {
      db.exec("ALTER TABLE sale_items ADD COLUMN listPrice REAL DEFAULT 0;");
    }
    if (!tableHasColumn(db, 'sale_items', 'discountType')) {
      db.exec("ALTER TABLE sale_items ADD COLUMN discountType TEXT DEFAULT 'percent';");
    }
    if (!tableHasColumn(db, 'sale_items', 'discountValue')) {
      db.exec("ALTER TABLE sale_items ADD COLUMN discountValue REAL DEFAULT 0;");
    }
    if (!tableHasColumn(db, 'sale_items', 'purchaseDiscountAtSale')) {
      db.exec("ALTER TABLE sale_items ADD COLUMN purchaseDiscountAtSale REAL DEFAULT 0;");
    }
  }
  ```
- **Version 3 Migration (`src/database/db.js:168-185`):**
  Added `sale_return_items.purchasePrice` and `purchase_items.packSize`.

### B. Purchase Inward UI & Calculations (`src/inventory/inventory.js`)
- **Mode Toggle & Dynamic Inputs (`src/inventory/inventory.js:1192-1240`):**
  `setPurLinePricingMode(mode)` switches between `'direct'` and `'list_discount'`.
  Controls inputs: `#pieListPrice`, `#pieListDiscVal`, `#pieNetCost`, and toggle button `#btnPieListDiscToggle`.
- **List & Discount Math (`src/inventory/inventory.js:1241-1297`):**
  ```javascript
  if (currentPurLineDiscType === 'percent') {
    disc = Math.min(100, disc);
    net = list - (list * (disc / 100));
  } else {
    disc = Math.min(list, disc);
    net = list - disc;
  }
  net = Math.max(0, Math.round(net * 100) / 100);
  if (netInp) netInp.value = net.toFixed(2);
  ```
- **Line Addition & Calculation (`src/inventory/inventory.js:1421-1445`):**
  Calculates line net amount, trade offer deduction, and discount percent:
  ```javascript
  const totalUnits = (pQty * (Number(prod.packSize) || 1)) + uQty;
  let rawAmount = totalUnits * tp;
  if (tradeOffer > 0) rawAmount -= tradeOffer;
  if (discPercent > 0) rawAmount -= (rawAmount * (discPercent / 100));
  const netAmount = Math.max(0, rawAmount);
  ```
- **Product Catalog Modal (`src/inventory/inventory.js:2576-2580`):**
  Fields `#piPurchasePricingMode` and `#piPurchaseDiscountPercent` exist for editing products.

### C. Backend Purchase Saving & WAC (`src/database/db.js:973-1022`, `1173-1207`)
- Line insertion saves `pricingMode`, `listPrice`, `discountType`, `discountValue`, `netCost`.
- Weighted average cost is calculated using `effectiveUnitCost`:
  ```javascript
  const effectiveUnitCost = itemNetCost > 0 ? itemNetCost : tp;
  const prevStock = Math.max(0, (Number(pRec.stockQty) || 0) - incomingQty);
  const prevCost = Number(pRec.averageCost || pRec.purchasePrice) || effectiveUnitCost;
  const wac = prevStock > 0 ? (((prevStock * prevCost) + (incomingQty * effectiveUnitCost)) / (prevStock + incomingQty)) : effectiveUnitCost;
  ```

### D. Sales POS Calculations (`src/sales/sales.js`)
- **Discount & Rate Sync (`src/sales/sales.js:180-194`, `230-252`):**
  Adjusts `salePrice` when discount percent is edited against `listPrice` (`retailPrice`):
  `salePrice = listP - (listP * (pct / 100))`.
- **Sale Items Inward (`src/sales/sales.js:578-605`):**
  Stores `costAtSale = wacCost`, `listPrice`, `discountPercent`, `discountAmount`, `purchaseDiscountAtSale`.
- **Total Profit Margin Badge (`src/sales/sales.js:2063-2070`):**
  Calculates total margin % on sale before checkout.

---

## 2. How `purchase_items.discountPercent`, `tradeOffer`, and `profitMargin` are Used Today, and How `netAmount` and `grandTotal` are Calculated

1. **`purchase_items.tradeOffer` (T.O.):**
   - Represents a flat amount subtracted directly from line total before discount:
     `rawAmount = (totalUnits * tradePrice) - tradeOffer;`
   - It is displayed in column 11 of the purchase items table.
2. **`purchase_items.discountPercent` (Disc %):**
   - Line-level percentage deduction applied on the net of `(totalUnits * tradePrice - tradeOffer)`:
     `rawAmount -= (rawAmount * (discountPercent / 100));`
     `netAmount = Math.max(0, rawAmount);`
3. **`purchase_items.profitMargin`:**
   - Evaluated as the markup percentage between purchase rate and retail price:
     `profitMargin = tradePrice > 0 ? (((retailPrice - tradePrice) / tradePrice) * 100).toFixed(1) : '0';`
4. **Voucher `grandTotal` Calculation (`src/inventory/inventory.js:2039-2062`):**
   - Sums all item line `netAmount`s:
     `const lineSum = currentPurchaseItems.reduce((acc, it) => acc + (Number(it.netAmount) || 0), 0);`
   - Applies voucher-level discount (`purDiscount`), freight discount/expense, extra charges, and sales tax:
     `grandTotal = lineSum - purDiscount - freightDisc + freightExpn + salesTax + extraCharges;`
   - In `db.js`, `purchases.grandTotal` is posted to supplier payables / ledger / `updatePartyBalance`.

---

## 3. Which Parts are Missing According to the New Feature Specification

1. **Explicit Columns in Database Schema:**
   - `purchase_items.companyDiscountPercent REAL DEFAULT NULL`
   - `purchase_items.effectiveCost REAL DEFAULT NULL`
   - `products.companyDiscountPercent REAL DEFAULT NULL`
   - `products.effectiveCost REAL DEFAULT NULL`
   - `sale_items.effectiveCost REAL DEFAULT NULL`
   - Corresponding fields in JSON database fallback.

2. **Catalog Price Invariant Rule:**
   - Currently, `savePurchase` sets `prod.purchasePrice = itemNetCost` when mode is `list_discount`.
   - **NEW RULE:** `products.purchasePrice` **MUST STAY AS LIST PRICE**. `products.effectiveCost` and `products.averageCost` use effective cost (`listPrice * (1 - companyDiscountPercent / 100)`).

3. **Purchase Voucher UI & Line Math:**
   - Dedicated "Company Discount %" column/input (`companyDiscountPercent`).
   - Line effective cost display adjacent to list price.
   - Line net amount formula: `line netAmount = effectiveCost * totalQty`.

4. **Sales POS Profit Visibility & Business Formula:**
   - Line item profit percent formula:
     $$\text{Profit \% on list price} = \text{companyDiscount} - \text{saleDiscount}$$
   - Line item profit amount:
     $$\text{Profit amount} = (\text{salePrice} - \text{effectiveCost}) \times \text{totalQty}$$
   - Visible display on screen before saving:
     - Label: **"Profit % on list price"**
     - Warning: Red alert when `saleDiscount > companyDiscount` (selling at a loss).
   - Entire bill profit display before saving (total profit amount and total profit % on list price).

5. **Invoice/Receipt Printing Restriction:**
   - Cost price, effective cost, company discount, and profit margin must **NEVER** appear on printed thermal receipts, A4 invoices, or customer-facing exports.

6. **Unified Cost Rule Across All Reports & Screens (Step 5):**
   - Single canonical cost resolution function:
     $$\text{cost} = \text{item.effectiveCost} \parallel \text{product.effectiveCost} \parallel \text{product.averageCost} \parallel \text{product.purchasePrice} \parallel 0$$
   - Must be consistently applied in:
     - Reports Engine: P&L COGS, Bill-wise Profit, Item-wise Sales profit, Party-wise Sales, Today's Full Day Register, Hub cards, Day End Closing.
     - Inventory screens & reports: Stock Position (showing both List Value and Real Cost Value), Category Stock, Low Stock, Item Purchases (list price, discount %, effective cost).
     - Exports: Excel and PDF exports must match screen calculations.

