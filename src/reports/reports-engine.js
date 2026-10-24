// ========================================================
// Shahzaib Traders - Reports Engine
// Calculates and aggregates all business reports:
// Sales, Purchases, Stock/Inventory, Accounts, and P&L
// ========================================================

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ReportsEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Helper: Date in range check (YYYY-MM-DD)
  function isDateInRange(dateStr, fromDate, toDate) {
    if (!dateStr) return false;
    const d = String(dateStr).slice(0, 10);
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  }

  // Helper: Safe JSON parse for line items
  function getItems(record) {
    if (Array.isArray(record.items)) return record.items;
    if (typeof record.itemsJson === 'string') {
      try {
        return JSON.parse(record.itemsJson) || [];
      } catch (_e) {
        return [];
      }
    }
    return [];
  }

  // Helper: Number formatter
  function toNum(v) {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  // Helper: Match product with category & subcategory filters
  function matchesCategoryAndSubCategory(prod, categoryId, subCategoryId) {
    if (!prod) return false;
    if (categoryId && categoryId !== 'all' && categoryId !== '') {
      const pCatId = String(prod.categoryId || prod.category_id || '').trim();
      const pCatName = String(prod.categoryName || prod.category_name || '').trim().toLowerCase();
      const filterCat = String(categoryId).trim();
      const filterCatLower = filterCat.toLowerCase();
      if (pCatId !== filterCat && pCatName !== filterCatLower) {
        return false;
      }
    }
    if (subCategoryId && subCategoryId !== 'all' && subCategoryId !== '') {
      const pSubCatId = String(prod.subCategoryId || prod.sub_category_id || '').trim();
      const pSubCatName = String(prod.subCategoryName || prod.sub_category_name || '').trim().toLowerCase();
      const filterSub = String(subCategoryId).trim();
      const filterSubLower = filterSub.toLowerCase();
      if (pSubCatId !== filterSub && pSubCatName !== filterSubLower) {
        return false;
      }
    }
    return true;
  }

  // ========================================================
  // 1. SALES REPORTS
  // ========================================================

  // 1.1 Bill-wise Sale Report
  function generateBillWiseSalesReport(sales, filters = {}) {
    const list = [];
    let totalGross = 0;
    let totalDiscount = 0;
    let totalNet = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let totalItemsCount = 0;

    for (const s of (sales || [])) {
      const date = (s.entryDate || s.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      if (filters.partyId && s.partyId !== filters.partyId) continue;
      if (filters.paymentType && filters.paymentType !== 'All' && s.paymentType !== filters.paymentType) continue;
      if (filters.areaName && s.areaName && !s.areaName.toLowerCase().includes(filters.areaName.toLowerCase())) continue;

      const items = getItems(s);
      let itemCount = items.reduce((sum, it) => sum + toNum(it.totalQty || it.packQty || 1), 0);

      const gross = toNum(s.grossAmount);
      const disc = toNum(s.discount);
      const net = toNum(s.netAmount);
      const paid = toNum(s.paidAmount);
      const bal = toNum(s.balanceDue);

      totalGross += gross;
      totalDiscount += disc;
      totalNet += net;
      totalPaid += paid;
      totalBalance += bal;
      totalItemsCount += itemCount;

      list.push({
        id: s.id,
        date,
        voucherNo: s.voucherNo,
        manualNo: s.manualNo || '--',
        partyTitle: s.partyTitle || 'Walk-in Customer',
        phone: s.customerPhone || '--',
        areaName: s.areaName || '--',
        paymentType: s.paymentType || 'Cash',
        itemCount,
        gross,
        discount: disc,
        net,
        paid,
        balance: bal
      });
    }

    return {
      title: 'Bill-wise Sale Report',
      rows: list,
      totals: {
        records: list.length,
        itemsCount: totalItemsCount,
        gross: totalGross,
        discount: totalDiscount,
        net: totalNet,
        paid: totalPaid,
        balance: totalBalance
      }
    };
  }

  // 1.2 Party-wise / Customer-wise Sale Report
  function generatePartyWiseSalesReport(sales, parties, filters = {}) {
    const partyMap = {};

    for (const s of (sales || [])) {
      const date = (s.entryDate || s.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      if (filters.partyId && s.partyId !== filters.partyId) continue;
      if (filters.paymentType && filters.paymentType !== 'All' && s.paymentType !== filters.paymentType) continue;

      const pId = s.partyId || 'walk-in';
      if (!partyMap[pId]) {
        const partyObj = (parties || []).find(p => p.id === pId) || {};
        partyMap[pId] = {
          partyId: pId,
          partyTitle: s.partyTitle || partyObj.name || 'Walk-in Customer',
          partyType: partyObj.partyTypeName || 'Customer',
          phone: s.customerPhone || partyObj.phone || '--',
          areaName: s.areaName || partyObj.areaName || partyObj.city || '--',
          billsCount: 0,
          gross: 0,
          discount: 0,
          net: 0,
          paid: 0,
          balance: 0
        };
      }

      partyMap[pId].billsCount += 1;
      partyMap[pId].gross += toNum(s.grossAmount);
      partyMap[pId].discount += toNum(s.discount);
      partyMap[pId].net += toNum(s.netAmount);
      partyMap[pId].paid += toNum(s.paidAmount);
      partyMap[pId].balance += toNum(s.balanceDue);
    }

    const rows = Object.values(partyMap).sort((a, b) => b.net - a.net);
    const totals = rows.reduce((acc, r) => {
      acc.billsCount += r.billsCount;
      acc.gross += r.gross;
      acc.discount += r.discount;
      acc.net += r.net;
      acc.paid += r.paid;
      acc.balance += r.balance;
      return acc;
    }, { records: rows.length, billsCount: 0, gross: 0, discount: 0, net: 0, paid: 0, balance: 0 });

    return { title: 'Party-wise Sale Report', rows, totals };
  }

  // 1.3 Product-wise / Item-wise Sale Report
  function generateItemWiseSalesReport(sales, products, filters = {}) {
    const itemMap = {};

    for (const s of (sales || [])) {
      const date = (s.entryDate || s.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      if (filters.partyId && s.partyId !== filters.partyId) continue;

      const items = getItems(s);
      for (const it of items) {
        const code = String(it.productCode || it.code || '').trim();
        const prod = (products || []).find(p => (code && String(p.code) === code) || (it.productId && String(p.id) === String(it.productId))) || {};

        if (!matchesCategoryAndSubCategory(prod, filters.categoryId, filters.subCategoryId)) continue;

        const key = code || it.productId || it.productTitle || 'item-unknown';
        if (!itemMap[key]) {
          itemMap[key] = {
            productCode: code || prod.code || '--',
            productTitle: it.productTitle || prod.titleEng || 'Unknown Product',
            categoryName: prod.categoryName || 'General',
            packSize: toNum(it.packSize || prod.packSize || 1),
            packQtySold: 0,
            unitQtySold: 0,
            totalQtySold: 0,
            purchaseCostTotal: 0,
            salesRevenueTotal: 0,
            discountTotal: 0,
            netRevenue: 0,
            totalProfit: 0
          };
        }

        const packQty = toNum(it.packQty);
        const unitQty = toNum(it.unitQty);
        const packSize = toNum(it.packSize || itemMap[key].packSize || 1);
        const totalQty = toNum(it.totalQty || (packQty * packSize + unitQty));
        const purchaseRate = toNum(it.purchasePrice || prod.purchasePrice || 0);
        const salePrice = toNum(it.salePrice || it.retailPrice || 0);
        const discAmount = toNum(it.discountAmount || 0);
        const netAmt = toNum(it.netAmount || (totalQty * salePrice - discAmount));
        const costAmt = totalQty * purchaseRate;
        const profit = netAmt - costAmt;

        itemMap[key].packQtySold += packQty;
        itemMap[key].unitQtySold += unitQty;
        itemMap[key].totalQtySold += totalQty;
        itemMap[key].purchaseCostTotal += costAmt;
        itemMap[key].salesRevenueTotal += (totalQty * salePrice);
        itemMap[key].discountTotal += discAmount;
        itemMap[key].netRevenue += netAmt;
        itemMap[key].totalProfit += profit;
      }
    }

    const rows = Object.values(itemMap).map(r => ({
      ...r,
      avgPrice: r.totalQtySold > 0 ? (r.netRevenue / r.totalQtySold) : 0,
      marginPercent: r.netRevenue > 0 ? ((r.totalProfit / r.netRevenue) * 100) : 0
    })).sort((a, b) => b.netRevenue - a.netRevenue);

    const totals = rows.reduce((acc, r) => {
      acc.totalQtySold += r.totalQtySold;
      acc.purchaseCostTotal += r.purchaseCostTotal;
      acc.netRevenue += r.netRevenue;
      acc.totalProfit += r.totalProfit;
      return acc;
    }, { records: rows.length, totalQtySold: 0, purchaseCostTotal: 0, netRevenue: 0, totalProfit: 0 });

    totals.overallMargin = totals.netRevenue > 0 ? ((totals.totalProfit / totals.netRevenue) * 100) : 0;

    return { title: 'Product-wise Sale Report', rows, totals };
  }

  // 1.4 Territory / Area-wise Sale Report
  function generateTerritoryWiseSalesReport(sales, parties, areas, filters = {}) {
    const areaMap = {};

    for (const s of (sales || [])) {
      const date = (s.entryDate || s.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;

      const areaKey = String(s.areaName || 'Unspecified Territory').trim();
      if (!areaMap[areaKey]) {
        areaMap[areaKey] = {
          areaName: areaKey,
          billsCount: 0,
          gross: 0,
          discount: 0,
          net: 0,
          paid: 0,
          balance: 0
        };
      }

      areaMap[areaKey].billsCount += 1;
      areaMap[areaKey].gross += toNum(s.grossAmount);
      areaMap[areaKey].discount += toNum(s.discount);
      areaMap[areaKey].net += toNum(s.netAmount);
      areaMap[areaKey].paid += toNum(s.paidAmount);
      areaMap[areaKey].balance += toNum(s.balanceDue);
    }

    const rows = Object.values(areaMap).sort((a, b) => b.net - a.net);
    const totals = rows.reduce((acc, r) => {
      acc.billsCount += r.billsCount;
      acc.net += r.net;
      acc.paid += r.paid;
      acc.balance += r.balance;
      return acc;
    }, { records: rows.length, billsCount: 0, net: 0, paid: 0, balance: 0 });

    return { title: 'Territory / Area-wise Sale Report', rows, totals };
  }

  // 1.5 Bill-wise Profit Report
  function generateBillWiseProfitReport(sales, filters = {}) {
    const list = [];
    let grandRevenue = 0;
    let grandCost = 0;
    let grandProfit = 0;

    for (const s of (sales || [])) {
      const date = (s.entryDate || s.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      if (filters.partyId && s.partyId !== filters.partyId) continue;

      const items = getItems(s);
      let billCost = 0;

      for (const it of items) {
        const qty = toNum(it.totalQty || (toNum(it.packQty) * toNum(it.packSize || 1) + toNum(it.unitQty)));
        const costRate = toNum(it.purchasePrice);
        billCost += (qty * costRate);
      }

      const billNet = toNum(s.netAmount);
      const profit = billNet - billCost;
      const margin = billNet > 0 ? ((profit / billNet) * 100) : 0;

      grandRevenue += billNet;
      grandCost += billCost;
      grandProfit += profit;

      list.push({
        id: s.id,
        date,
        voucherNo: s.voucherNo,
        partyTitle: s.partyTitle || 'Walk-in Customer',
        areaName: s.areaName || '--',
        itemCount: items.length,
        billNet,
        billCost,
        profit,
        margin
      });
    }

    list.sort((a, b) => b.profit - a.profit);

    const totals = {
      records: list.length,
      revenue: grandRevenue,
      cost: grandCost,
      profit: grandProfit,
      margin: grandRevenue > 0 ? ((grandProfit / grandRevenue) * 100) : 0
    };

    return { title: 'Bill-wise Profit Report', rows: list, totals };
  }

  // 1.6 Sales Return Report
  function generateSalesReturnReport(returns, filters = {}) {
    const list = [];
    let grandTotalRefund = 0;
    let grandItemsCount = 0;

    for (const r of (returns || [])) {
      const date = (r.entryDate || r.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      if (filters.partyId && r.partyId !== filters.partyId) continue;

      const refund = toNum(r.totalAmount || r.netRefund || r.grandTotal);
      const items = getItems(r);
      const count = items.length || 1;

      grandTotalRefund += refund;
      grandItemsCount += count;

      list.push({
        id: r.id,
        date,
        returnNo: r.returnNo,
        origVoucherNo: r.origVoucherNo || '--',
        partyTitle: r.partyTitle || 'Customer',
        refundAmount: refund,
        itemsCount: count,
        remarks: r.remarks || 'Returned Merchandise'
      });
    }

    return {
      title: 'Sales Return & Refund Report',
      rows: list,
      totals: {
        records: list.length,
        totalRefund: grandTotalRefund,
        itemsCount: grandItemsCount
      }
    };
  }

  // ========================================================
  // 2. PURCHASES & SUPPLIER REPORTS
  // ========================================================

  // 2.1 Bill-wise Purchase Report
  function generateBillWisePurchaseReport(purchases, filters = {}) {
    const list = [];
    let totalGrand = 0;
    let totalDiscount = 0;
    let totalFreight = 0;

    for (const p of (purchases || [])) {
      const date = (p.entryDate || p.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      if (filters.partyId && p.partyId !== filters.partyId) continue;

      const grand = toNum(p.grandTotal || p.totalAmount);
      const disc = toNum(p.discount || p.freightDisc);
      const freight = toNum(p.freightExpn);

      totalGrand += grand;
      totalDiscount += disc;
      totalFreight += freight;

      list.push({
        id: p.id,
        date,
        voucherNo: p.voucherNo,
        manualNo: p.manualNo || '--',
        partyTitle: p.partyTitle || 'Supplier / Vendor',
        storeTitle: p.storeTitle || 'Main Store',
        freight,
        discount: disc,
        grandTotal: grand
      });
    }

    return {
      title: 'Bill-wise Purchase Report',
      rows: list,
      totals: {
        records: list.length,
        discount: totalDiscount,
        freight: totalFreight,
        grandTotal: totalGrand
      }
    };
  }

  // 2.2 Supplier-wise Purchase Report
  function generateSupplierWisePurchaseReport(purchases, parties, filters = {}) {
    const suppMap = {};

    for (const p of (purchases || [])) {
      const date = (p.entryDate || p.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      if (filters.partyId && p.partyId !== filters.partyId) continue;

      const pId = p.partyId || 'unknown-supplier';
      if (!suppMap[pId]) {
        const partyObj = (parties || []).find(x => x.id === pId) || {};
        suppMap[pId] = {
          partyId: pId,
          partyTitle: p.partyTitle || partyObj.name || 'Vendor',
          contactPerson: partyObj.contactPerson || '--',
          phone: partyObj.phone || '--',
          city: partyObj.city || partyObj.areaName || '--',
          vouchersCount: 0,
          totalPurchases: 0,
          currentBalance: toNum(partyObj.openingBalance)
        };
      }

      suppMap[pId].vouchersCount += 1;
      suppMap[pId].totalPurchases += toNum(p.grandTotal || p.totalAmount);
    }

    const rows = Object.values(suppMap).sort((a, b) => b.totalPurchases - a.totalPurchases);
    const totals = rows.reduce((acc, r) => {
      acc.vouchersCount += r.vouchersCount;
      acc.totalPurchases += r.totalPurchases;
      return acc;
    }, { records: rows.length, vouchersCount: 0, totalPurchases: 0 });

    return { title: 'Supplier-wise Purchase Report', rows, totals };
  }

  // 2.3 Item-wise Purchase Report
  function generateItemWisePurchaseReport(purchases, products, filters = {}) {
    const itemMap = {};

    for (const p of (purchases || [])) {
      const date = (p.entryDate || p.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      if (filters.partyId && p.partyId !== filters.partyId) continue;

      const items = getItems(p);
      for (const it of items) {
        const code = String(it.productCode || it.code || '').trim();
        const prod = (products || []).find(x => (code && String(x.code) === code) || (it.productId && String(x.id) === String(it.productId))) || {};

        if (!matchesCategoryAndSubCategory(prod, filters.categoryId, filters.subCategoryId)) continue;

        const key = code || it.productId || it.productTitle || 'item-unknown';
        if (!itemMap[key]) {
          itemMap[key] = {
            productCode: code || prod.code || '--',
            productTitle: it.productTitle || prod.titleEng || 'Product',
            categoryName: prod.categoryName || 'General',
            totalPacksInward: 0,
            totalUnitsInward: 0,
            totalBonus: 0,
            totalQtyInward: 0,
            totalSpend: 0
          };
        }

        const packQty = toNum(it.packQty || it.pQty);
        const unitQty = toNum(it.unitQty || it.uQty);
        const bonus = toNum(it.bonus);
        const netAmt = toNum(it.netAmount || (toNum(it.tradePrice) * (packQty + unitQty)));

        itemMap[key].totalPacksInward += packQty;
        itemMap[key].totalUnitsInward += unitQty;
        itemMap[key].totalBonus += bonus;
        itemMap[key].totalQtyInward += (packQty + unitQty + bonus);
        itemMap[key].totalSpend += netAmt;
      }
    }

    const rows = Object.values(itemMap).map(r => ({
      ...r,
      avgCost: r.totalQtyInward > 0 ? (r.totalSpend / r.totalQtyInward) : 0
    })).sort((a, b) => b.totalSpend - a.totalSpend);

    const totals = rows.reduce((acc, r) => {
      acc.totalQtyInward += r.totalQtyInward;
      acc.totalSpend += r.totalSpend;
      return acc;
    }, { records: rows.length, totalQtyInward: 0, totalSpend: 0 });

    return { title: 'Item-wise Purchase Report', rows, totals };
  }

  // ========================================================
  // 3. INVENTORY & STOCK REPORTS
  // ========================================================

  // 3.1 Complete Stock Position Report
  function generateStockPositionReport(products, categories, filters = {}) {
    const list = [];
    let totalStockQty = 0;
    let totalCostVal = 0;
    let totalRetailVal = 0;

    const catLookup = {};
    const safeCategories = Array.isArray(categories) ? categories : [];
    for (const c of safeCategories) {
      if (c && c.id) catLookup[String(c.id)] = c.name;
    }

    for (const p of (products || [])) {
      if (!matchesCategoryAndSubCategory(p, filters.categoryId, filters.subCategoryId)) continue;

      const qty = toNum(p.stockQty);
      const purPrice = toNum(p.purchasePrice);
      const wsPrice = toNum(p.wholesalePrice);
      const retPrice = toNum(p.retailPrice);
      const costVal = qty * purPrice;
      const retVal = qty * retPrice;

      totalStockQty += qty;
      totalCostVal += costVal;
      totalRetailVal += retVal;

      const pCatId = String(p.categoryId || p.category_id || '');
      const catName = p.categoryName || catLookup[pCatId] || '--';

      list.push({
        id: p.id,
        code: p.code || '--',
        titleEng: p.titleEng || '--',
        categoryName: catName,
        subCategoryName: p.subCategoryName || p.sub_category_name || '--',
        unitName: p.unitName || p.packingType || 'Piece',
        packSize: toNum(p.packSize || 1),
        stockQty: qty,
        purchasePrice: purPrice,
        wholesalePrice: wsPrice,
        retailPrice: retPrice,
        stockCostValue: costVal,
        stockRetailValue: retVal,
        minStock: toNum(p.minStock),
        location: p.location || '--'
      });
    }

    list.sort((a, b) => b.stockCostValue - a.stockCostValue);

    return {
      title: 'Current Stock Position Report',
      rows: list,
      totals: {
        records: list.length,
        totalStockQty,
        totalCostVal,
        totalRetailVal,
        potentialProfit: (totalRetailVal - totalCostVal)
      }
    };
  }

  // 3.2 Low Stock / Reorder Alert Report
  function generateLowStockReport(products, categories, filters = {}) {
    const list = [];
    let totalShortage = 0;

    const catLookup = {};
    const safeCategories = Array.isArray(categories) ? categories : [];
    for (const c of safeCategories) {
      if (c && c.id) catLookup[String(c.id)] = c.name;
    }

    for (const p of (products || [])) {
      if (!matchesCategoryAndSubCategory(p, filters.categoryId, filters.subCategoryId)) continue;

      const qty = toNum(p.stockQty);
      const min = toNum(p.minStock || p.reorderLevel || 10);

      if (qty <= min) {
        const shortage = Math.max(0, min - qty);
        totalShortage += shortage;
        const pCatId = String(p.categoryId || p.category_id || '');
        const catName = p.categoryName || catLookup[pCatId] || '--';

        list.push({
          id: p.id,
          code: p.code || '--',
          titleEng: p.titleEng || '--',
          categoryName: catName,
          stockQty: qty,
          minStock: min,
          shortageQty: shortage,
          purchasePrice: toNum(p.purchasePrice),
          estimatedOrderCost: shortage * toNum(p.purchasePrice)
        });
      }
    }

    list.sort((a, b) => b.shortageQty - a.shortageQty);

    const totals = {
      records: list.length,
      totalShortage,
      totalOrderEst: list.reduce((s, r) => s + r.estimatedOrderCost, 0)
    };

    return { title: 'Low Stock & Reorder Alert Report', rows: list, totals };
  }

  // 3.3 Out of Stock / Zero Stock Report
  function generateOutOfStockReport(products, categories, filters = {}) {
    const catLookup = {};
    const safeCategories = Array.isArray(categories) ? categories : [];
    for (const c of safeCategories) {
      if (c && c.id) catLookup[String(c.id)] = c.name;
    }

    const list = (products || [])
      .filter(p => {
        if (!matchesCategoryAndSubCategory(p, filters.categoryId, filters.subCategoryId)) return false;
        return toNum(p.stockQty) <= 0;
      })
      .map(p => {
        const pCatId = String(p.categoryId || p.category_id || '');
        return {
          id: p.id,
          code: p.code || '--',
          titleEng: p.titleEng || '--',
          categoryName: p.categoryName || catLookup[pCatId] || '--',
          subCategoryName: p.subCategoryName || p.sub_category_name || '--',
          unitName: p.unitName || 'Piece',
          purchasePrice: toNum(p.purchasePrice),
          retailPrice: toNum(p.retailPrice),
          reorderLevel: toNum(p.reorderLevel || p.minStock || 10)
        };
      });

    return {
      title: 'Zero Stock / Out of Stock Report',
      rows: list,
      totals: { records: list.length }
    };
  }

  // 3.4 Category-wise Stock Summary
  function generateCategoryStockReport(products, categories, filters = {}) {
    const catMap = {};
    const safeCategories = Array.isArray(categories) ? categories : [];

    // Seed existing categories
    for (const c of safeCategories) {
      if (filters && filters.categoryId && filters.categoryId !== 'all') {
        const filterStr = String(filters.categoryId).trim().toLowerCase();
        if (String(c.id) !== String(filters.categoryId) && String(c.name).toLowerCase() !== filterStr) {
          continue;
        }
      }
      catMap[c.name] = {
        categoryName: c.name,
        itemsCount: 0,
        totalQty: 0,
        costValue: 0,
        retailValue: 0
      };
    }

    for (const p of (products || [])) {
      if (!matchesCategoryAndSubCategory(p, filters.categoryId, filters.subCategoryId)) continue;

      const catLookupName = safeCategories.find(c => String(c.id) === String(p.categoryId || p.category_id))?.name;
      const catKey = p.categoryName || catLookupName || 'General';

      if (!catMap[catKey]) {
        catMap[catKey] = {
          categoryName: catKey,
          itemsCount: 0,
          totalQty: 0,
          costValue: 0,
          retailValue: 0
        };
      }

      const qty = toNum(p.stockQty);
      const pur = toNum(p.purchasePrice);
      const ret = toNum(p.retailPrice);

      catMap[catKey].itemsCount += 1;
      catMap[catKey].totalQty += qty;
      catMap[catKey].costValue += (qty * pur);
      catMap[catKey].retailValue += (qty * ret);
    }

    const rows = Object.values(catMap).map(r => {
      const margin = r.retailValue - r.costValue;
      const marginPct = r.costValue > 0 ? ((margin / r.costValue) * 100) : 0;
      return { ...r, margin, marginPct };
    }).sort((a, b) => b.costValue - a.costValue);

    const totals = rows.reduce((acc, r) => {
      acc.itemsCount += r.itemsCount;
      acc.totalQty += r.totalQty;
      acc.costValue += r.costValue;
      acc.retailValue += r.retailValue;
      acc.margin += r.margin;
      return acc;
    }, { records: rows.length, itemsCount: 0, totalQty: 0, costValue: 0, retailValue: 0, margin: 0 });

    totals.marginPct = totals.costValue > 0 ? ((totals.margin / totals.costValue) * 100) : 0;

    return { title: 'Category-wise Stock Summary', rows, totals };
  }

  // ========================================================
  // 4. ACCOUNTS & FINANCIAL REPORTS
  // ========================================================

  // 4.1 Customer Receivables Report (Party-wise Receivables)
  function generateCustomerReceivablesReport(parties, filters = {}) {
    const list = [];
    let totalReceivable = 0;

    for (const p of (parties || [])) {
      // Exclude Suppliers / Vendors from Receivables
      const type = (p.partyTypeName || '').toLowerCase();
      if (type.includes('supplier') || type.includes('vendor')) continue;
      if (filters.partyId && p.id !== filters.partyId) continue;
      if (filters.areaName && p.areaName && !p.areaName.toLowerCase().includes(filters.areaName.toLowerCase())) continue;

      const bal = toNum(p.openingBalance);
      if (bal > 0) {
        totalReceivable += bal;
        list.push({
          id: p.id,
          name: p.name,
          partyTypeName: p.partyTypeName || 'Customer',
          contactPerson: p.contactPerson || '--',
          phone: p.phone || '--',
          areaName: p.areaName || '--',
          city: p.city || '--',
          receivableAmount: bal
        });
      }
    }

    list.sort((a, b) => b.receivableAmount - a.receivableAmount);

    return {
      title: 'Party-wise Customer Receivables Report',
      rows: list,
      totals: { records: list.length, totalReceivable }
    };
  }

  // 4.2 Supplier Payables Report
  function generateSupplierPayablesReport(parties, filters = {}) {
    const list = [];
    let totalPayable = 0;

    for (const p of (parties || [])) {
      const type = (p.partyTypeName || '').toLowerCase();
      // Include suppliers/vendors
      if (!type.includes('supplier') && !type.includes('vendor')) continue;
      if (filters.partyId && p.id !== filters.partyId) continue;

      const bal = toNum(p.openingBalance);
      const payableAmt = Math.abs(bal);
      totalPayable += payableAmt;

      list.push({
        id: p.id,
        name: p.name,
        partyTypeName: p.partyTypeName || 'Supplier',
        contactPerson: p.contactPerson || '--',
        phone: p.phone || '--',
        city: p.city || p.areaName || '--',
        payableAmount: payableAmt
      });
    }

    list.sort((a, b) => b.payableAmount - a.payableAmount);

    return {
      title: 'Party-wise Supplier Payables Report',
      rows: list,
      totals: { records: list.length, totalPayable }
    };
  }

  // 4.3 Cash Receipt Voucher (CRV) Report
  function generateCRVReport(vouchers, filters = {}) {
    const list = (vouchers || [])
      .filter(v => {
        const type = (v.voucherType || v.type || '').toUpperCase();
        if (type !== 'CRV') return false;
        const date = (v.entryDate || v.voucherDate || v.date || v.createdAt || '').slice(0, 10);
        if (!isDateInRange(date, filters.fromDate, filters.toDate)) return false;
        if (filters.partyId && String(v.partyId) !== String(filters.partyId)) return false;
        return true;
      })
      .map(v => ({
        id: v.id,
        date: (v.entryDate || v.voucherDate || v.date || v.createdAt || '').slice(0, 10),
        voucherNo: v.voucherNo || v.voucher_no || '--',
        partyTitle: v.partyTitle || v.partyName || v.party_name || '--',
        areaName: v.areaName || v.area_name || '--',
        paymentMode: v.paymentMode || v.payment_mode || 'Cash',
        amount: toNum(v.amount),
        discount: toNum(v.discount),
        netAmount: toNum(v.netAmount || (toNum(v.amount) + toNum(v.discount))),
        remarks: v.remarks || v.narration || '--'
      }));

    const totals = list.reduce((acc, r) => {
      acc.amount += r.amount;
      acc.discount += r.discount;
      acc.netAmount += r.netAmount;
      return acc;
    }, { records: list.length, amount: 0, discount: 0, netAmount: 0 });

    return { title: 'Cash Receipt Voucher (CRV) Register', rows: list, totals };
  }

  // 4.4 Cash Payment Voucher (CPV) Report
  function generateCPVReport(vouchers, filters = {}) {
    const list = (vouchers || [])
      .filter(v => {
        const type = (v.voucherType || v.type || '').toUpperCase();
        if (type !== 'CPV') return false;
        const date = (v.entryDate || v.voucherDate || v.date || v.createdAt || '').slice(0, 10);
        if (!isDateInRange(date, filters.fromDate, filters.toDate)) return false;
        if (filters.partyId && String(v.partyId) !== String(filters.partyId)) return false;
        return true;
      })
      .map(v => ({
        id: v.id,
        date: (v.entryDate || v.voucherDate || v.date || v.createdAt || '').slice(0, 10),
        voucherNo: v.voucherNo || v.voucher_no || '--',
        partyTitle: v.partyTitle || v.partyName || v.party_name || '--',
        areaName: v.areaName || v.area_name || '--',
        paymentMode: v.paymentMode || v.payment_mode || 'Cash',
        amount: toNum(v.amount),
        discount: toNum(v.discount),
        netAmount: toNum(v.netAmount || (toNum(v.amount) + toNum(v.discount))),
        remarks: v.remarks || v.narration || '--'
      }));

    const totals = list.reduce((acc, r) => {
      acc.amount += r.amount;
      acc.discount += r.discount;
      acc.netAmount += r.netAmount;
      return acc;
    }, { records: list.length, amount: 0, discount: 0, netAmount: 0 });

    return { title: 'Cash Payment Voucher (CPV) Register', rows: list, totals };
  }

  // 4.5 Daily Cash Book / Cash Flow Report
  function generateCashBookReport(vouchers, sales, purchases, filters = {}) {
    const dateMap = {};

    // 1. Process CRV (Cash In)
    for (const v of (vouchers || [])) {
      const date = (v.entryDate || v.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      if (!dateMap[date]) dateMap[date] = { date, cashSales: 0, crvReceived: 0, cpvPaid: 0, cashPurchases: 0 };
      if (v.voucherType === 'CRV') dateMap[date].crvReceived += toNum(v.amount);
      if (v.voucherType === 'CPV') dateMap[date].cpvPaid += toNum(v.amount);
    }

    // 2. Process Cash Sales
    for (const s of (sales || [])) {
      const date = (s.entryDate || s.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      if (!dateMap[date]) dateMap[date] = { date, cashSales: 0, crvReceived: 0, cpvPaid: 0, cashPurchases: 0 };
      dateMap[date].cashSales += toNum(s.paidAmount);
    }

    const rows = Object.values(dateMap).map(d => {
      const totalIn = d.cashSales + d.crvReceived;
      const totalOut = d.cpvPaid + d.cashPurchases;
      const netCash = totalIn - totalOut;
      return { ...d, totalIn, totalOut, netCash };
    }).sort((a, b) => b.date.localeCompare(a.date));

    const totals = rows.reduce((acc, r) => {
      acc.cashSales += r.cashSales;
      acc.crvReceived += r.crvReceived;
      acc.totalIn += r.totalIn;
      acc.totalOut += r.totalOut;
      acc.netCash += r.netCash;
      return acc;
    }, { records: rows.length, cashSales: 0, crvReceived: 0, totalIn: 0, totalOut: 0, netCash: 0 });

    return { title: 'Daily Cash Flow / Cash Book Report', rows, totals };
  }

  // 4.6 Profit & Loss / Business Performance Summary
  function generateProfitAndLossReport(sales, purchases, vouchers, returns, filters = {}) {
    let totalSalesRevenue = 0;
    let totalCostOfGoodsSold = 0;
    let totalSalesDiscounts = 0;
    let totalRefunds = 0;
    let totalExpenses = 0;

    for (const s of (sales || [])) {
      const date = (s.entryDate || s.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;

      totalSalesRevenue += toNum(s.grossAmount);
      totalSalesDiscounts += toNum(s.discount);

      const items = getItems(s);
      for (const it of items) {
        const qty = toNum(it.totalQty || (toNum(it.packQty) * toNum(it.packSize || 1) + toNum(it.unitQty)));
        totalCostOfGoodsSold += (qty * toNum(it.purchasePrice));
      }
    }

    for (const r of (returns || [])) {
      const date = (r.entryDate || r.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      totalRefunds += toNum(r.totalAmount || r.netRefund || r.grandTotal);

      // Revert COGS for returned goods
      const items = getItems(r);
      for (const it of items) {
        const qty = toNum(it.totalQty || (toNum(it.packQty) * toNum(it.packSize || 1) + toNum(it.unitQty)));
        totalCostOfGoodsSold -= (qty * toNum(it.purchasePrice || 0));
      }
    }

    // Operating expenses from CPV vouchers
    for (const v of (vouchers || [])) {
      const vDate = (v.entryDate || v.date || v.createdAt || '').slice(0, 10);
      if (!isDateInRange(vDate, filters.fromDate, filters.toDate)) continue;
      if (v.voucherType === 'CPV' && (v.expenseCategory || (v.remarks && v.remarks.toLowerCase().includes('expense')))) {
        totalExpenses += toNum(v.netAmount || v.amount);
      }
    }

    const netSales = Math.max(0, totalSalesRevenue - totalSalesDiscounts - totalRefunds);
    const grossProfit = (netSales - Math.max(0, totalCostOfGoodsSold));
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = netSales > 0 ? ((grossProfit / netSales) * 100) : 0;
    const netMargin = netSales > 0 ? ((netProfit / netSales) * 100) : 0;

    return {
      title: 'Profit & Loss Performance Statement',
      metrics: {
        grossSales: totalSalesRevenue,
        discountsGiven: totalSalesDiscounts,
        returnsRefunded: totalRefunds,
        netSales,
        cogs: Math.max(0, totalCostOfGoodsSold),
        grossProfit,
        profitMargin,
        operatingExpenses: totalExpenses,
        netProfit,
        netMargin
      }
    };
  }

  // ========================================================
  // 6. TODAY'S BUSINESS & REGISTER REPORTS
  // ========================================================

  // 6.1 Today's Live Sales Register
  function generateTodaySalesRegisterReport(sales, filters = {}) {
    const todayStr = (filters.toDate || filters.fromDate || new Date().toISOString()).slice(0, 10);
    const todayFilters = { ...filters, fromDate: todayStr, toDate: todayStr };
    const rep = generateBillWiseSalesReport(sales, todayFilters);
    rep.title = "Today's Sales Register & Cashier Log";
    rep.subtitle = `Transactions for ${todayStr}`;
    return rep;
  }

  // 6.2 Today's Full Multi-Module Business Summary
  function generateTodayBusinessSummaryReport(masterData = {}, filters = {}) {
    const todayStr = (filters.toDate || filters.fromDate || new Date().toISOString()).slice(0, 10);
    const sales = (masterData.sales || []).filter(s => (s.entryDate || s.createdAt || '').slice(0, 10) === todayStr);
    const purchases = (masterData.purchases || []).filter(p => (p.entryDate || p.createdAt || '').slice(0, 10) === todayStr);
    const returns = (masterData.returns || []).filter(r => (r.entryDate || r.createdAt || '').slice(0, 10) === todayStr);
    const vouchers = (masterData.vouchers || []).filter(v => (v.date || v.createdAt || '').slice(0, 10) === todayStr);

    let salesGross = 0;
    let salesNet = 0;
    let salesCashPaid = 0;
    let salesCreditBal = 0;

    sales.forEach(s => {
      salesGross += toNum(s.grossAmount);
      salesNet += toNum(s.netAmount);
      salesCashPaid += toNum(s.paidAmount);
      salesCreditBal += toNum(s.balanceDue);
    });

    let purNet = 0;
    let purPaid = 0;
    purchases.forEach(p => {
      purNet += toNum(p.grandTotal || p.netAmount);
      purPaid += toNum(p.paidAmount);
    });

    let returnTotal = 0;
    returns.forEach(r => {
      returnTotal += toNum(r.totalAmount || r.netRefund);
    });

    let crvCashIn = 0;
    let cpvCashOut = 0;
    vouchers.forEach(v => {
      const type = (v.type || v.voucherType || '').toUpperCase();
      const amt = toNum(v.amount || v.totalAmount);
      if (type.includes('CRV') || type.includes('RECEIPT')) crvCashIn += amt;
      if (type.includes('CPV') || type.includes('PAYMENT')) cpvCashOut += amt;
    });

    const netDayCash = (salesCashPaid + crvCashIn) - (purPaid + returnTotal + cpvCashOut);

    const rows = [];
    sales.forEach(s => {
      rows.push({
        id: s.id,
        time: (s.createdAt || s.entryDate || '').slice(11, 16) || '--:--',
        type: 'Sale Bill',
        refNo: s.voucherNo || '--',
        party: s.partyTitle || 'Walk-in Customer',
        details: `${s.paymentType || 'Cash'} | Items: ${getItems(s).length}`,
        inflow: toNum(s.paidAmount),
        outflow: 0,
        balance: toNum(s.balanceDue)
      });
    });

    returns.forEach(r => {
      rows.push({
        id: r.id,
        time: (r.createdAt || r.entryDate || '').slice(11, 16) || '--:--',
        type: 'Sale Return',
        refNo: r.returnNo || '--',
        party: r.partyTitle || 'Customer Return',
        details: `Refund Mode: ${r.refundMode || 'Credit'}`,
        inflow: 0,
        outflow: toNum(r.totalAmount || r.netRefund),
        balance: 0
      });
    });

    purchases.forEach(p => {
      rows.push({
        id: p.id,
        time: (p.createdAt || p.entryDate || '').slice(11, 16) || '--:--',
        type: 'Purchase',
        refNo: p.purchaseNo || p.billNo || '--',
        party: p.supplierName || 'Vendor',
        details: `${p.paymentType || 'Cash'}`,
        inflow: 0,
        outflow: toNum(p.paidAmount),
        balance: toNum(p.balanceDue)
      });
    });

    vouchers.forEach(v => {
      const type = (v.type || v.voucherType || '').toUpperCase();
      const isReceipt = type.includes('CRV') || type.includes('RECEIPT');
      const amt = toNum(v.amount || v.totalAmount);
      rows.push({
        id: v.id,
        time: (v.createdAt || v.date || '').slice(11, 16) || '--:--',
        type: isReceipt ? 'Cash Receipt (CRV)' : 'Cash Payment (CPV)',
        refNo: v.voucherNo || '--',
        party: v.partyName || v.accountName || '--',
        details: v.narration || v.description || '--',
        inflow: isReceipt ? amt : 0,
        outflow: isReceipt ? 0 : amt,
        balance: 0
      });
    });

    return {
      title: "Today's Complete Business Register",
      dateStr: todayStr,
      metrics: {
        todaySalesCount: sales.length,
        todaySalesNet: salesNet,
        todaySalesCash: salesCashPaid,
        todayCreditSales: salesCreditBal,
        todayPurchasesCount: purchases.length,
        todayPurchasesNet: purNet,
        todayPurchasesPaid: purPaid,
        todayReturnsCount: returns.length,
        todayReturnsAmount: returnTotal,
        todayCrvInflow: crvCashIn,
        todayCpvOutflow: cpvCashOut,
        netDayCash
      },
      rows,
      totals: {
        records: rows.length,
        totalInflow: salesCashPaid + crvCashIn,
        totalOutflow: purPaid + returnTotal + cpvCashOut,
        netDayCash
      }
    };
  }

  return {
    generateBillWiseSalesReport,
    generatePartyWiseSalesReport,
    generateItemWiseSalesReport,
    generateTerritoryWiseSalesReport,
    generateBillWiseProfitReport,
    generateSalesReturnReport,
    generateBillWisePurchaseReport,
    generateSupplierWisePurchaseReport,
    generateItemWisePurchaseReport,
    generateStockPositionReport,
    generateLowStockReport,
    generateOutOfStockReport,
    generateCategoryStockReport,
    generateCustomerReceivablesReport,
    generateSupplierPayablesReport,
    generateCRVReport,
    generateCPVReport,
    generateCashBookReport,
    generateProfitAndLossReport,
    generateTodaySalesRegisterReport,
    generateTodayBusinessSummaryReport
  };
});
