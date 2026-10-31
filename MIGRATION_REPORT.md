# MIGRATION REPORT: Version 4 Additive Database Migration

Date: 2026-10-31
Scope: Schema Migration v4 for "List Price minus Discount" pricing features.

---

## 1. Safety and Invariants
- **PRAGMA user_version check**: Guarded migration ensures execution occurs strictly once (`PRAGMA user_version < 4`).
- **Pre-migration backup**: Executes `backupDatabase(dbPath)` creating a timestamped `.bak` in `backups/` prior to any schema modification.
- **Additive alterations only**: Uses `ALTER TABLE ... ADD COLUMN` guarded by `tableHasColumn` checks.
- **Nullable / Defaulted columns**: No existing tables or columns dropped, altered, or deleted.

---

## 2. Added Columns

| Table | Column Name | Type | Constraint | Description |
|---|---|---|---|---|
| `purchase_items` | `companyDiscountPercent` | `REAL` | `DEFAULT NULL` | Discount % offered by manufacturer / supplier on list price |
| `purchase_items` | `effectiveCost` | `REAL` | `DEFAULT NULL` | Net unit cost after applying company discount |
| `products` | `companyDiscountPercent` | `REAL` | `DEFAULT NULL` | Supplier trade discount % associated with product |
| `products` | `effectiveCost` | `REAL` | `DEFAULT NULL` | Current effective unit cost for valuation & margin |
| `sale_items` | `effectiveCost` | `REAL` | `DEFAULT NULL` | Unit cost captured at point of sale for COGS & live profit |

---

## 3. Row Backfill & Population Summary

### Products Table (`products`)
- **Total Existing Rows**: 702
- **Populated from `purchasePrice`**: 702 (100%)
- **Populated from `averageCost`**: 0
- **Unassigned / Zero Cost**: 0
- **Rule Applied**:
  ```sql
  UPDATE products
  SET effectiveCost = CASE WHEN purchasePrice > 0 THEN purchasePrice ELSE averageCost END
  WHERE effectiveCost IS NULL;
  ```
- **Company Discount Sync**:
  ```sql
  UPDATE products
  SET companyDiscountPercent = purchaseDiscountPercent
  WHERE companyDiscountPercent IS NULL AND purchasePricingMode = 'list_discount' AND purchaseDiscountPercent IS NOT NULL;
  ```

### Purchase Items Table (`purchase_items`)
- **Total Existing Rows**: 0 (Clean production dataset prior to purchase vouchers entry)
- **Rule Ready for Historic Rows**:
  ```sql
  UPDATE purchase_items
  SET effectiveCost = CASE WHEN netCost > 0 THEN netCost WHEN tradePrice > 0 THEN tradePrice ELSE 0 END
  WHERE effectiveCost IS NULL;

  UPDATE purchase_items
  SET companyDiscountPercent = discountValue
  WHERE companyDiscountPercent IS NULL AND pricingMode = 'list_discount' AND discountValue > 0;
  ```

### Sale Items Table (`sale_items`)
- **Total Existing Rows**: 0 (Clean production dataset prior to sales invoices entry)
- **Rule Ready for Historic Rows**:
  ```sql
  UPDATE sale_items
  SET effectiveCost = CASE WHEN costAtSale > 0 THEN costAtSale WHEN purchasePrice > 0 THEN purchasePrice ELSE 0 END
  WHERE effectiveCost IS NULL;
  ```

### JSON Fallback Sync
- Verified and mirrored in `initJsonFallback` across `jsonData.products`, `jsonData.purchase_items`, and `jsonData.sale_items`.

