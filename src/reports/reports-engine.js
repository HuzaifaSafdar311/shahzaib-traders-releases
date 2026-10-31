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
    if (!record) return [];
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

  // Unified cost rate: item recorded cost -> product averageCost -> product purchasePrice
  function getCostRate(it, prod) {
    if (it) {
      const itEff = toNum(it.effectiveCost);
      if (itEff > 0) return itEff;
      const itCostAtSale = toNum(it.costAtSale);
      if (itCostAtSale > 0) return itCostAtSale;
      const itPur = toNum(it.purchasePrice);
      if (itPur > 0) return itPur;
    }
    if (prod) {
      const pEff = toNum(prod.effectiveCost);
      if (pEff > 0) return pEff;
      const avg = toNum(prod.averageCost);
      if (avg > 0) return avg;
      const pur = toNum(prod.purchasePrice);
      if (pur > 0) return pur;
    }
    return 0;
  }
  const getUnifiedCost = getCostRate;

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

  // Build product fast lookup maps (O(1))
  function buildProductMaps(products) {
    const idMap = new Map();
    const codeMap = new Map();
    for (const p of (products || [])) {
      if (p.id) idMap.set(String(p.id), p);
      if (p.code) codeMap.set(String(p.code).trim().toLowerCase(), p);
    }
    function getProd(id, code) {
      if (id && idMap.has(String(id))) return idMap.get(String(id));
      if (code) {
        const c = String(code).trim().toLowerCase();
        if (codeMap.has(c)) return codeMap.get(c);
      }
      return null;
    }
    return { idMap, codeMap, getProd };
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
      if (filters.partyId && String(s.partyId) !== String(filters.partyId)) continue;
      if (filters.paymentType && filters.paymentType !== 'All' && s.paymentType !== filters.paymentType) continue;
      if (filters.areaName) {
        const aName = String(s.areaName || '').trim().toLowerCase();
        if (!aName || !aName.includes(filters.areaName.toLowerCase())) continue;
      }

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
  function generatePartyWiseSalesReport(sales, parties, filters = {}, returns = []) {
    if (Array.isArray(filters)) {
      const tmp = filters;
      filters = returns && !Array.isArray(returns) ? returns : {};
      returns = tmp;
    }

    const partyMap = {};
    const safeParties = Array.isArray(parties) ? parties : [];
    const partyLookup = new Map(safeParties.map(p => [String(p.id), p]));

    // Index returns by party
    const returnByParty = {};
    for (const r of (returns || [])) {
      const rDate = (r.entryDate || r.createdAt || '').slice(0, 10);
      if (!isDateInRange(rDate, filters.fromDate, filters.toDate)) continue;
      const pId = String(r.partyId || 'walk-in');
      const rAmt = toNum(r.totalAmount || r.netRefund);
      returnByParty[pId] = (returnByParty[pId] || 0) + rAmt;
    }

    for (const s of (sales || [])) {
      const date = (s.entryDate || s.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      if (filters.partyId && String(s.partyId) !== String(filters.partyId)) continue;
      if (filters.paymentType && filters.paymentType !== 'All' && s.paymentType !== filters.paymentType) continue;
      if (filters.areaName) {
        const aName = String(s.areaName || '').trim().toLowerCase();
        if (!aName || !aName.includes(filters.areaName.toLowerCase())) continue;
      }

      const pId = String(s.partyId || 'walk-in');
      if (!partyMap[pId]) {
        const partyObj = partyLookup.get(pId) || {};
        const liveBal = (partyObj.currentBalance !== null && partyObj.currentBalance !== undefined)
          ? toNum(partyObj.currentBalance)
          : (partyObj.openingBalance !== null && partyObj.openingBalance !== undefined ? toNum(partyObj.openingBalance) : 0);

        partyMap[pId] = {
          partyId: pId,
          partyTitle: s.partyTitle || partyObj.name || 'Walk-in Customer',
          partyType: partyObj.partyTypeName || 'Customer',
          phone: s.customerPhone || partyObj.phone || '--',
          areaName: s.areaName || partyObj.areaName || partyObj.city || '--',
          billsCount: 0,
          gross: 0,
          discount: 0,
          returnAmount: returnByParty[pId] || 0,
          net: 0,
          netAfterReturns: 0,
          paid: 0,
          unpaidInvoices: 0,
          currentBalance: (pId === 'walk-in') ? 0 : liveBal,
          balance: (pId === 'walk-in') ? 0 : liveBal
        };
      }

      partyMap[pId].billsCount += 1;
      partyMap[pId].gross += toNum(s.grossAmount);
      partyMap[pId].discount += toNum(s.discount);
      partyMap[pId].net += toNum(s.netAmount);
      partyMap[pId].paid += toNum(s.paidAmount);
      partyMap[pId].unpaidInvoices += toNum(s.balanceDue);
    }

    const rows = Object.values(partyMap).map(r => {
      const netAfterReturns = r.net - r.returnAmount;
      return { ...r, netAfterReturns };
    }).sort((a, b) => b.netAfterReturns - a.netAfterReturns);

    const totals = rows.reduce((acc, r) => {
      acc.billsCount += r.billsCount;
      acc.gross += r.gross;
      acc.discount += r.discount;
      acc.returnAmount += r.returnAmount;
      acc.net += r.net;
      acc.netAfterReturns += r.netAfterReturns;
      acc.paid += r.paid;
      acc.unpaidInvoices += r.unpaidInvoices;
      acc.balance += r.balance;
      acc.currentBalance += r.currentBalance;
      return acc;
    }, {
      records: rows.length,
      billsCount: 0,
      gross: 0,
      discount: 0,
      returnAmount: 0,
      net: 0,
      netAfterReturns: 0,
      paid: 0,
      unpaidInvoices: 0,
      balance: 0,
      currentBalance: 0
    });

    return { title: 'Party-wise Sale Report', rows, totals };
  }

  // 1.3 Product-wise / Item-wise Sale Report
  function generateItemWiseSalesReport(sales, products, filters = {}, returns = []) {
    if (Array.isArray(filters)) {
      const tmp = filters;
      filters = returns && !Array.isArray(returns) ? returns : {};
      returns = tmp;
    }

    const { getProd } = buildProductMaps(products);

    // Index returns by product
    const returnByProd = {};
    for (const r of (returns || [])) {
      const rDate = (r.entryDate || r.createdAt || '').slice(0, 10);
      if (!isDateInRange(rDate, filters.fromDate, filters.toDate)) continue;
      const rItems = getItems(r);
      for (const rit of rItems) {
        const rCode = String(rit.productCode || rit.code || '').trim();
        const rProd = getProd(rit.productId, rCode);
        const key = rCode || rit.productId || rit.productTitle || 'item-unknown';
        const rQty = toNum(rit.totalQty || rit.pieces || (toNum(rit.packQty) * toNum(rit.packSize || 1) + toNum(rit.unitQty)));
        const rAmt = toNum(rit.refundAmount || rit.totalAmount || rit.netAmount || (rQty * toNum(rit.salePrice || rit.retailPrice)));
        if (!returnByProd[key]) returnByProd[key] = { qty: 0, amount: 0 };
        returnByProd[key].qty += rQty;
        returnByProd[key].amount += rAmt;
      }
    }

    const itemMap = {};

    for (const s of (sales || [])) {
      const date = (s.entryDate || s.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      if (filters.partyId && String(s.partyId) !== String(filters.partyId)) continue;
      if (filters.areaName) {
        const aName = String(s.areaName || '').trim().toLowerCase();
        if (!aName || !aName.includes(filters.areaName.toLowerCase())) continue;
      }

      const items = getItems(s);
      const invoiceGross = toNum(s.grossAmount);
      const invoiceDisc = toNum(s.discount);

      for (const it of items) {
        const code = String(it.productCode || it.code || '').trim();
        const prod = getProd(it.productId, code);

        if (!matchesCategoryAndSubCategory(prod, filters.categoryId, filters.subCategoryId)) continue;

        const key = code || it.productId || it.productTitle || 'item-unknown';
        if (!itemMap[key]) {
          itemMap[key] = {
            productCode: code || prod?.code || '--',
            productTitle: it.productTitle || prod?.titleEng || 'Unknown Product',
            categoryName: prod?.categoryName || 'General',
            packSize: toNum(it.packSize || prod?.packSize || 1),
            packQtySold: 0,
            unitQtySold: 0,
            totalQtySold: 0,
            returnQty: (returnByProd[key] ? returnByProd[key].qty : 0),
            returnAmount: (returnByProd[key] ? returnByProd[key].amount : 0),
            purchaseCostTotal: 0,
            salesRevenueTotal: 0,
            discountTotal: 0,
            netRevenue: 0,
            netAfterReturns: 0,
            totalProfit: 0
          };
        }

        const packQty = toNum(it.packQty);
        const unitQty = toNum(it.unitQty);
        const packSize = toNum(it.packSize || itemMap[key].packSize || 1);
        const totalQty = toNum(it.totalQty || (packQty * packSize + unitQty));
        // Unified cost rule: recorded sale item cost -> product averageCost -> product purchasePrice
        const purchaseRate = getCostRate(it, prod);
        const salePrice = toNum(it.salePrice || it.retailPrice || 0);
        const itemLineDisc = toNum(it.discountAmount || 0);
        const itemLineGross = toNum(it.netAmount || (totalQty * salePrice - itemLineDisc));

        // Proportional allocation of invoice-level special discount:
        const invoiceDiscShare = (invoiceGross > 0 && invoiceDisc > 0)
          ? ((itemLineGross / invoiceGross) * invoiceDisc)
          : 0;

        const netAmt = itemLineGross - invoiceDiscShare;
        const totalDisc = itemLineDisc + invoiceDiscShare;
        const costAmt = totalQty * purchaseRate;
        const profit = netAmt - costAmt;

        itemMap[key].packQtySold += packQty;
        itemMap[key].unitQtySold += unitQty;
        itemMap[key].totalQtySold += totalQty;
        itemMap[key].purchaseCostTotal += costAmt;
        itemMap[key].salesRevenueTotal += (totalQty * salePrice);
        itemMap[key].discountTotal += totalDisc;
        itemMap[key].netRevenue += netAmt;
        itemMap[key].totalProfit += profit;
      }
    }

    const rows = Object.values(itemMap).map(r => {
      const netAfterReturns = r.netRevenue - r.returnAmount;
      const profitAfterReturns = netAfterReturns - r.purchaseCostTotal;
      return {
        ...r,
        netAfterReturns,
        avgPrice: r.totalQtySold > 0 ? (r.netRevenue / r.totalQtySold) : 0,
        marginPercent: netAfterReturns > 0 ? ((profitAfterReturns / netAfterReturns) * 100) : 0
      };
    }).sort((a, b) => b.netAfterReturns - a.netAfterReturns);

    const totals = rows.reduce((acc, r) => {
      acc.packQtySold += r.packQtySold;
      acc.unitQtySold += r.unitQtySold;
      acc.totalQtySold += r.totalQtySold;
      acc.returnQty += r.returnQty;
      acc.returnAmount += r.returnAmount;
      acc.purchaseCostTotal += r.purchaseCostTotal;
      acc.salesRevenueTotal += r.salesRevenueTotal;
      acc.discountTotal += r.discountTotal;
      acc.netRevenue += r.netRevenue;
      acc.netAfterReturns += r.netAfterReturns;
      acc.totalProfit += r.totalProfit;
      return acc;
    }, {
      records: rows.length,
      packQtySold: 0,
      unitQtySold: 0,
      totalQtySold: 0,
      returnQty: 0,
      returnAmount: 0,
      purchaseCostTotal: 0,
      salesRevenueTotal: 0,
      discountTotal: 0,
      netRevenue: 0,
      netAfterReturns: 0,
      totalProfit: 0
    });

    totals.marginPercent = totals.netAfterReturns > 0 ? (((totals.netAfterReturns - totals.purchaseCostTotal) / totals.netAfterReturns) * 100) : 0;

    return { title: 'Product-wise Sale Report', rows, totals };
  }

  // 1.4 Territory / Area-wise Sale Report
  function generateTerritoryWiseSalesReport(sales, parties, areas, filters = {}) {
    const areaMap = {};

    for (const s of (sales || [])) {
      if (s.billStatus === 'Estimated') continue;
      const date = (s.entryDate || s.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;

      if (filters.areaName) {
        const aName = String(s.areaName || '').trim().toLowerCase();
        if (!aName || !aName.includes(filters.areaName.toLowerCase())) continue;
      }

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
      acc.gross += r.gross;
      acc.discount += r.discount;
      acc.net += r.net;
      acc.paid += r.paid;
      acc.balance += r.balance;
      return acc;
    }, { records: rows.length, billsCount: 0, gross: 0, discount: 0, net: 0, paid: 0, balance: 0 });

    return { title: 'Territory / Area-wise Sale Report', rows, totals };
  }

  // 1.5 Bill-wise Profit Report
  function generateBillWiseProfitReport(sales, arg2, arg3, arg4) {
    let products = [];
    let filters = {};
    let returns = [];

    if (Array.isArray(arg2)) {
      products = arg2;
      if (Array.isArray(arg3)) {
        returns = arg3;
        filters = arg4 || {};
      } else {
        filters = arg3 || {};
        returns = Array.isArray(arg4) ? arg4 : [];
      }
    } else {
      filters = arg2 || {};
      returns = Array.isArray(arg3) ? arg3 : (Array.isArray(arg4) ? arg4 : []);
    }

    const { getProd } = buildProductMaps(products);

    // Build return map by saleVoucherRef:
    const returnByBill = {};
    for (const r of (returns || [])) {
      const ref = String(r.saleVoucherRef || '').trim();
      if (!ref) continue;
      const rAmt = toNum(r.totalAmount || r.netRefund);
      returnByBill[ref] = (returnByBill[ref] || 0) + rAmt;
    }

    const list = [];
    let grandRevenue = 0;
    let grandReturnAmount = 0;
    let grandNetAfterReturns = 0;
    let grandCost = 0;
    let grandProfit = 0;

    for (const s of (sales || [])) {
      const date = (s.entryDate || s.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      if (filters.partyId && String(s.partyId) !== String(filters.partyId)) continue;
      if (filters.areaName) {
        const aName = String(s.areaName || '').trim().toLowerCase();
        if (!aName || !aName.includes(filters.areaName.toLowerCase())) continue;
      }

      const items = getItems(s);
      let billCost = 0;

      for (const it of items) {
        const qty = toNum(it.totalQty || (toNum(it.packQty) * toNum(it.packSize || 1) + toNum(it.unitQty)));
        const code = String(it.productCode || it.code || '').trim();
        const prod = getProd(it.productId, code);
        // Unified cost rule: recorded sale item cost -> product averageCost -> product purchasePrice
        const costRate = getCostRate(it, prod);
        billCost += (qty * costRate);
      }

      const billNet = toNum(s.netAmount);
      const vRef = String(s.voucherNo || s.invoiceNo || s.id || '').trim();
      const returnAmount = returnByBill[vRef] || (s.id ? returnByBill[String(s.id).trim()] : 0) || 0;
      const netAfterReturns = billNet - returnAmount;
      const profit = netAfterReturns - billCost;
      const margin = netAfterReturns > 0 ? ((profit / netAfterReturns) * 100) : 0;

      grandRevenue += billNet;
      grandReturnAmount += returnAmount;
      grandNetAfterReturns += netAfterReturns;
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
        returnAmount,
        netAfterReturns,
        billCost,
        profit,
        margin
      });
    }

    list.sort((a, b) => b.profit - a.profit);

    const totals = {
      records: list.length,
      revenue: grandRevenue,
      returnAmount: grandReturnAmount,
      netAfterReturns: grandNetAfterReturns,
      cost: grandCost,
      profit: grandProfit,
      margin: grandNetAfterReturns > 0 ? ((grandProfit / grandNetAfterReturns) * 100) : 0
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
      if (filters.partyId && String(r.partyId) !== String(filters.partyId)) continue;

      const refund = toNum(r.totalAmount || r.netRefund || r.grandTotal);
      const items = getItems(r);
      const count = items.length || 1;

      grandTotalRefund += refund;
      grandItemsCount += count;

      list.push({
        id: r.id,
        date,
        returnNo: r.returnNo,
        origVoucherNo: r.saleVoucherRef || r.origVoucherNo || '--',
        saleVoucherRef: r.saleVoucherRef || r.origVoucherNo || '--',
        partyTitle: r.partyTitle || 'Customer',
        areaName: r.areaName || '--',
        refundMode: r.refundMode || r.paymentMode || 'Cash',
        refundAmount: refund,
        totalRefund: refund,
        itemsCount: count,
        itemCount: count,
        remarks: r.description || r.remarks || 'Returned Merchandise',
        description: r.description || r.remarks || 'Returned Merchandise'
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
      if (filters.partyId && String(p.partyId) !== String(filters.partyId)) continue;

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
    const safeParties = Array.isArray(parties) ? parties : [];
    const partyLookup = new Map(safeParties.map(x => [String(x.id), x]));

    for (const p of (purchases || [])) {
      const date = (p.entryDate || p.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      if (filters.partyId && String(p.partyId) !== String(filters.partyId)) continue;

      const pId = String(p.partyId || 'unknown-supplier');
      if (!suppMap[pId]) {
        const partyObj = partyLookup.get(pId) || {};
        suppMap[pId] = {
          partyId: pId,
          partyTitle: p.partyTitle || partyObj.name || 'Vendor',
          contactPerson: partyObj.contactPerson || '--',
          phone: partyObj.phone || '--',
          city: partyObj.city || partyObj.areaName || '--',
          vouchersCount: 0,
          totalPurchases: 0,
          currentBalance: toNum(partyObj.currentBalance !== null && partyObj.currentBalance !== undefined ? partyObj.currentBalance : partyObj.openingBalance)
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
    const { getProd } = buildProductMaps(products);

    for (const p of (purchases || [])) {
      const date = (p.entryDate || p.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      if (filters.partyId && String(p.partyId) !== String(filters.partyId)) continue;

      const items = getItems(p);
      for (const it of items) {
        const code = String(it.productCode || it.code || '').trim();
        const prod = getProd(it.productId, code);

        if (!matchesCategoryAndSubCategory(prod, filters.categoryId, filters.subCategoryId)) continue;

        const key = code || it.productId || it.productTitle || 'item-unknown';
        if (!itemMap[key]) {
          itemMap[key] = {
            productCode: code || prod?.code || '--',
            productTitle: it.productTitle || prod?.titleEng || 'Product',
            categoryName: prod?.categoryName || 'General',
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
        const packSize = toNum(it.packSize || prod?.packSize || 1);
        const totalUnits = (packQty * packSize) + unitQty + bonus;
        const netAmt = toNum(it.netAmount || (toNum(it.tradePrice) * totalUnits));

        itemMap[key].totalPacksInward += packQty;
        itemMap[key].totalUnitsInward += unitQty;
        itemMap[key].totalBonus += bonus;
        itemMap[key].totalQtyInward += totalUnits;
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
    let totalListVal = 0;
    let totalRetailVal = 0;

    const catLookup = {};
    const safeCategories = Array.isArray(categories) ? categories : [];
    for (const c of safeCategories) {
      if (c && c.id) catLookup[String(c.id)] = c.name;
    }

    const includeInactive = Boolean(filters && filters.includeInactive);
    const valuationBasis = (filters && filters.valuationBasis) || 'purchasePrice';

    for (const p of (products || [])) {
      // Filter inactive products by default unless toggled
      if (!includeInactive) {
        if (p.inActive === 1 || p.inActive === '1' || p.status === 'Inactive' || p.status === 'inactive') {
          continue;
        }
      }

      if (!matchesCategoryAndSubCategory(p, filters.categoryId, filters.subCategoryId)) continue;

      const qty = toNum(p.stockQty);
      const purPrice = toNum(p.purchasePrice);
      const effCost = toNum(p.effectiveCost > 0 ? p.effectiveCost : (p.averageCost || p.purchasePrice));
      const avgCost = toNum(p.averageCost || effCost);
      const wsPrice = toNum(p.wholesalePrice);
      const retPrice = toNum(p.retailPrice);
      const listPrice = purPrice > 0 ? purPrice : retPrice;
      const compDisc = toNum(p.companyDiscountPercent || 0);

      const unitCostRate = valuationBasis === 'averageCost' ? avgCost : effCost;
      const costVal = qty * unitCostRate;
      const listVal = qty * listPrice;
      const retVal = qty * retPrice;

      totalStockQty += qty;
      totalCostVal += costVal;
      totalListVal += listVal;
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
        listPrice: listPrice,
        companyDiscountPercent: compDisc,
        effectiveCost: effCost,
        averageCost: avgCost,
        wholesalePrice: wsPrice,
        retailPrice: retPrice,
        stockCostValue: costVal,
        stockListValue: listVal,
        stockRetailValue: retVal,
        minStock: toNum(p.minStock),
        location: p.location || '--',
        status: p.inActive === 1 ? 'Inactive' : 'Active'
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
        totalListVal,
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
    const includeInactive = Boolean(filters && filters.includeInactive);

    for (const p of (parties || [])) {
      // Exclude Suppliers / Vendors from Receivables ("not a supplier" rule)
      const type = String(p.partyTypeName || p.partyType || '').toLowerCase();
      const isSupplier = type.includes('supplier') || type.includes('vendor') || Boolean(p.isSupplier);
      if (isSupplier) continue;

      // Exclude inactive parties by default unless toggled
      const isInactive = (p.status === 'Inactive' || p.status === 'inactive' || p.inActive === 1 || p.inActive === '1');
      if (!includeInactive && isInactive) {
        continue;
      }

      if (filters.partyId && filters.partyId !== 'all' && String(p.id) !== String(filters.partyId)) continue;
      if (filters.areaName && filters.areaName !== 'all') {
        const aName = String(p.areaName || p.city || '').trim().toLowerCase();
        if (!aName || !aName.includes(filters.areaName.toLowerCase())) continue;
      }

      const bal = toNum(p.currentBalance !== null && p.currentBalance !== undefined ? p.currentBalance : p.openingBalance);
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
          receivableAmount: bal,
          status: isInactive ? 'Inactive' : 'Active'
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
    let totalAdvancePaid = 0;
    const includeInactive = Boolean(filters && filters.includeInactive);

    for (const p of (parties || [])) {
      const type = String(p.partyTypeName || p.partyType || '').toLowerCase();
      // Include suppliers/vendors
      if (!type.includes('supplier') && !type.includes('vendor') && !p.isSupplier) continue;

      // Exclude inactive parties by default
      if (!includeInactive) {
        if (p.inActive === 1 || p.inActive === '1' || p.status === 'Inactive' || p.status === 'inactive') {
          continue;
        }
      }

      if (filters.partyId && String(p.id) !== String(filters.partyId)) continue;

      const bal = toNum(p.currentBalance !== null && p.currentBalance !== undefined ? p.currentBalance : p.openingBalance);
      // Group 6: remove Math.abs, list positive payables and advance paid suppliers separately
      const isPayable = bal > 0;
      const payableAmt = isPayable ? bal : 0;
      const advanceAmt = bal < 0 ? -bal : 0;

      totalPayable += payableAmt;
      totalAdvancePaid += advanceAmt;

      list.push({
        id: p.id,
        name: p.name,
        partyTypeName: p.partyTypeName || 'Supplier',
        contactPerson: p.contactPerson || '--',
        phone: p.phone || '--',
        city: p.city || p.areaName || '--',
        balance: bal,
        payableAmount: payableAmt,
        advanceAmount: advanceAmt,
        status: p.inActive === 1 ? 'Inactive' : 'Active'
      });
    }

    list.sort((a, b) => b.payableAmount - a.payableAmount);

    return {
      title: 'Party-wise Supplier Payables Report',
      rows: list,
      totals: {
        records: list.length,
        totalPayable,
        totalAdvancePaid
      }
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
  function generateCashBookReport(vouchers, sales, purchases, filters = {}, expenses = [], returns = []) {
    const dateMap = {};

    function getDay(date) {
      if (!dateMap[date]) {
        dateMap[date] = {
          date,
          cashSales: 0,
          crvReceived: 0,
          totalIn: 0,
          cashPurchases: 0,
          cpvPaid: 0,
          cashExpenses: 0,
          cashRefunds: 0,
          totalOut: 0,
          netCash: 0
        };
      }
      return dateMap[date];
    }

    // 1. Process CRV (Cash In) & CPV (Cash Out)
    for (const v of (vouchers || [])) {
      const date = (v.entryDate || v.voucherDate || v.date || v.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      const mode = String(v.paymentMode || 'Cash').toLowerCase();
      if (mode !== 'cash') continue;

      const day = getDay(date);
      const type = (v.voucherType || v.type || '').toUpperCase();
      const amt = toNum(v.amount || v.totalAmount);
      if (type === 'CRV') day.crvReceived += amt;
      if (type === 'CPV') day.cpvPaid += amt;
    }

    // 2. Process Cash Sales
    for (const s of (sales || [])) {
      if (s.billStatus === 'Estimated') continue;
      const date = (s.entryDate || s.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      const paid = toNum(s.paidAmount);
      if (paid > 0) {
        const day = getDay(date);
        day.cashSales += paid;
      }
    }

    // 3. Process Cash Purchases
    for (const p of (purchases || [])) {
      const date = (p.entryDate || p.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      const isCash = String(p.paymentType || '').toLowerCase() === 'cash';
      const paid = toNum(p.paidAmount || (isCash ? (p.grandTotal || p.totalAmount) : 0));
      if (paid > 0) {
        const day = getDay(date);
        day.cashPurchases += paid;
      }
    }

    // 4. Process Cash Expenses
    for (const e of (expenses || [])) {
      const date = (e.entryDate || e.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      const mode = String(e.paymentMode || 'Cash').toLowerCase();
      if (mode === 'cash') {
        const day = getDay(date);
        day.cashExpenses += toNum(e.amount);
      }
    }

    // 5. Process Cash Refunds on Returns
    for (const r of (returns || [])) {
      const date = (r.entryDate || r.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      const mode = String(r.refundMode || r.paymentMode || '').toLowerCase();
      if (mode === 'cash') {
        const day = getDay(date);
        day.cashRefunds += toNum(r.totalAmount || r.netRefund);
      }
    }

    const rows = Object.values(dateMap).map(d => {
      const totalIn = d.cashSales + d.crvReceived;
      const totalOut = d.cashPurchases + d.cpvPaid + d.cashExpenses + d.cashRefunds;
      const netCash = totalIn - totalOut;
      return { ...d, totalIn, totalOut, netCash };
    }).sort((a, b) => b.date.localeCompare(a.date));

    const totals = rows.reduce((acc, r) => {
      acc.cashSales += r.cashSales;
      acc.crvReceived += r.crvReceived;
      acc.totalIn += r.totalIn;
      acc.cashPurchases += r.cashPurchases;
      acc.cpvPaid += r.cpvPaid;
      acc.cashExpenses += r.cashExpenses;
      acc.cashRefunds += r.cashRefunds;
      acc.totalOut += r.totalOut;
      acc.netCash += r.netCash;
      return acc;
    }, {
      records: rows.length,
      cashSales: 0,
      crvReceived: 0,
      totalIn: 0,
      cashPurchases: 0,
      cpvPaid: 0,
      cashExpenses: 0,
      cashRefunds: 0,
      totalOut: 0,
      netCash: 0
    });

    return { title: 'Daily Cash Flow / Cash Book Report', rows, totals };
  }

  // 4.6 Profit & Loss / Business Performance Summary
  function generateProfitAndLossReport(sales, purchases, vouchers, returns, filters = {}, expenses = [], products = []) {
    let totalSalesRevenue = 0;
    let totalCostOfGoodsSold = 0;
    let totalSalesDiscounts = 0;
    let totalRefunds = 0;
    let totalExpenses = 0;
    let totalDiscountAllowed = 0;
    let totalDiscountReceived = 0;

    const { getProd } = buildProductMaps(products);
    const expenseList = Array.isArray(expenses) ? expenses : [];
    const expensesByCategory = {};

    // 1. Process Sales (Skip Estimated bills)
    const saleItemMap = new Map();
    for (const s of (sales || [])) {
      if (s.billStatus === 'Estimated') continue;
      const date = (s.entryDate || s.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;

      totalSalesRevenue += toNum(s.grossAmount);
      totalSalesDiscounts += toNum(s.discount);

      const vRef = String(s.voucherNo || s.invoiceNo || s.id || '').trim();
      const items = getItems(s);
      for (const it of items) {
        const qty = toNum(it.totalQty || (toNum(it.packQty) * toNum(it.packSize || 1) + toNum(it.unitQty)));
        const code = String(it.productCode || it.code || '').trim();
        const prod = getProd(it.productId, code);
        const costRate = getCostRate(it, prod);
        totalCostOfGoodsSold += (qty * costRate);

        const pKey = String(it.productId || it.productCode || it.code || '').trim();
        if (vRef && pKey) {
          saleItemMap.set(vRef + '::' + pKey, it);
        }
      }
    }

    // 2. Process Returns (Revert Sales & Return COGS with fallbacks)
    for (const r of (returns || [])) {
      const date = (r.entryDate || r.createdAt || '').slice(0, 10);
      if (!isDateInRange(date, filters.fromDate, filters.toDate)) continue;
      totalRefunds += toNum(r.totalAmount || r.netRefund || r.grandTotal);

      const ref = String(r.saleVoucherRef || r.origVoucherNo || '').trim();
      const items = getItems(r);
      for (const it of items) {
        const qty = toNum(it.totalQty || it.pieces || (toNum(it.packQty) * toNum(it.packSize || 1) + toNum(it.unitQty)));
        let itemCost = toNum(it.costAtSale || it.purchasePrice);
        if (!itemCost || itemCost <= 0) {
          const pKey = String(it.productId || it.productCode || it.code || '').trim();
          // Fallback 1: original sale item cost
          const origItem = (ref && pKey) ? saleItemMap.get(ref + '::' + pKey) : null;
          if (origItem) {
            itemCost = toNum(origItem.costAtSale || origItem.purchasePrice);
          }
          // Fallback 2 & 3: product averageCost -> purchasePrice
          if (!itemCost || itemCost <= 0) {
            const code = String(it.productCode || it.code || '').trim();
            const prod = getProd(it.productId, code);
            itemCost = getCostRate(it, prod);
          }
        }
        totalCostOfGoodsSold -= (qty * itemCost);
      }
    }

    // 3. Operating Expenses from Expenses table (grouped by category/account title)
    for (const e of expenseList) {
      const eDate = (e.entryDate || e.createdAt || '').slice(0, 10);
      if (!isDateInRange(eDate, filters.fromDate, filters.toDate)) continue;
      const title = (e.accountTitle || e.category || 'General Expenses').trim();
      const amt = toNum(e.amount);
      expensesByCategory[title] = (expensesByCategory[title] || 0) + amt;
      totalExpenses += amt;
    }

    // 4. Settlement Discounts and Operating expenses from Vouchers
    for (const v of (vouchers || [])) {
      const vDate = (v.entryDate || v.voucherDate || v.date || v.createdAt || '').slice(0, 10);
      if (!isDateInRange(vDate, filters.fromDate, filters.toDate)) continue;

      const disc = toNum(v.discount);
      if (disc > 0) {
        if (v.voucherType === 'CRV') totalDiscountAllowed += disc;
        if (v.voucherType === 'CPV') totalDiscountReceived += disc;
      }

      if (v.voucherType === 'CPV' && (v.expenseCategory || (v.remarks && v.remarks.toLowerCase().includes('expense')))) {
        const isDuplicate = expenseList.some(e =>
          (e.voucherNo && (e.voucherNo === v.voucherNo || e.voucherNo === v.manualNo)) ||
          (e.entryDate === vDate && Math.abs(toNum(e.amount) - toNum(v.netAmount || v.amount)) < 0.01 && (e.paidTo === v.partyTitle || e.remarks === v.remarks))
        );
        if (!isDuplicate) {
          const title = (v.expenseCategory || 'General Expenses (CPV)').trim();
          const amt = toNum(v.netAmount || v.amount);
          expensesByCategory[title] = (expensesByCategory[title] || 0) + amt;
          totalExpenses += amt;
        }
      }
    }

    const netSales = Math.max(0, totalSalesRevenue - totalSalesDiscounts - totalRefunds);
    const grossProfit = (netSales - Math.max(0, totalCostOfGoodsSold));
    const netProfit = grossProfit + totalDiscountReceived - totalExpenses - totalDiscountAllowed;
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
        discountAllowed: totalDiscountAllowed,
        discountReceived: totalDiscountReceived,
        operatingExpenses: totalExpenses,
        expensesByCategory,
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
    const vouchers = (masterData.vouchers || []).filter(v => (v.entryDate || v.date || v.createdAt || '').slice(0, 10) === todayStr);
    const expenses = (masterData.expenses || []).filter(e => (e.entryDate || e.createdAt || '').slice(0, 10) === todayStr);

    let salesGross = 0;
    let salesNet = 0;
    let salesCashPaid = 0;
    let salesCreditBal = 0;

    sales.forEach(s => {
      if (s.billStatus === 'Estimated') return;
      salesGross += toNum(s.grossAmount);
      salesNet += toNum(s.netAmount);
      salesCashPaid += toNum(s.paidAmount);
      salesCreditBal += toNum(s.balanceDue);
    });

    let purNet = 0;
    let purPaid = 0;
    purchases.forEach(p => {
      purNet += toNum(p.grandTotal || p.netAmount);
      purPaid += toNum(p.paidAmount || (String(p.paymentType || '').toLowerCase() === 'cash' ? (p.grandTotal || p.totalAmount) : 0));
    });

    let returnTotal = 0;
    let cashRefundsPaid = 0;
    returns.forEach(r => {
      const rAmt = toNum(r.totalAmount || r.netRefund);
      returnTotal += rAmt;
      const mode = String(r.refundMode || r.paymentMode || '').toLowerCase();
      if (mode === 'cash') cashRefundsPaid += rAmt;
    });

    let crvCashIn = 0;
    let cpvCashOut = 0;
    vouchers.forEach(v => {
      const type = (v.type || v.voucherType || '').toUpperCase();
      const amt = toNum(v.amount || v.totalAmount);
      const mode = String(v.paymentMode || 'Cash').toLowerCase();
      if (mode === 'cash') {
        if (type.includes('CRV') || type.includes('RECEIPT')) crvCashIn += amt;
        if (type.includes('CPV') || type.includes('PAYMENT')) cpvCashOut += amt;
      }
    });

    let totalExpensesPaid = 0;
    expenses.forEach(e => {
      const mode = String(e.paymentMode || 'Cash').toLowerCase();
      if (mode === 'cash') totalExpensesPaid += toNum(e.amount);
    });

    const netDayCash = (salesCashPaid + crvCashIn) - (purPaid + cashRefundsPaid + cpvCashOut + totalExpensesPaid);

    const rows = [];
    sales.forEach(s => {
      if (s.billStatus === 'Estimated') return;
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
      const rAmt = toNum(r.totalAmount || r.netRefund);
      const mode = String(r.refundMode || r.paymentMode || 'Cash').toLowerCase();
      rows.push({
        id: r.id,
        time: (r.createdAt || r.entryDate || '').slice(11, 16) || '--:--',
        type: 'Sale Return',
        refNo: r.returnNo || '--',
        party: r.partyTitle || 'Customer Return',
        details: `Refund Mode: ${r.refundMode || 'Cash'}`,
        inflow: 0,
        outflow: mode === 'cash' ? rAmt : 0,
        balance: 0
      });
    });

    purchases.forEach(p => {
      const isCash = String(p.paymentType || '').toLowerCase() === 'cash';
      const paid = toNum(p.paidAmount || (isCash ? (p.grandTotal || p.totalAmount) : 0));
      rows.push({
        id: p.id,
        time: (p.createdAt || p.entryDate || '').slice(11, 16) || '--:--',
        type: 'Purchase',
        refNo: p.voucherNo || p.purchaseNo || p.billNo || '--',
        party: p.partyTitle || p.supplierName || 'Vendor',
        details: `${p.paymentType || 'Cash'}`,
        inflow: 0,
        outflow: paid,
        balance: toNum(p.balanceDue)
      });
    });

    vouchers.forEach(v => {
      const type = (v.type || v.voucherType || '').toUpperCase();
      const isReceipt = type.includes('CRV') || type.includes('RECEIPT');
      const amt = toNum(v.amount || v.totalAmount);
      const mode = String(v.paymentMode || 'Cash').toLowerCase();
      if (mode === 'cash') {
        rows.push({
          id: v.id,
          time: (v.createdAt || v.date || '').slice(11, 16) || '--:--',
          type: isReceipt ? 'Cash Receipt (CRV)' : 'Cash Payment (CPV)',
          refNo: v.voucherNo || '--',
          party: v.partyTitle || v.partyName || v.accountName || '--',
          details: v.description || v.narration || v.remarks || '--',
          inflow: isReceipt ? amt : 0,
          outflow: isReceipt ? 0 : amt,
          balance: 0
        });
      }
    });

    expenses.forEach(e => {
      const amt = toNum(e.amount);
      const mode = String(e.paymentMode || 'Cash').toLowerCase();
      if (mode === 'cash') {
        rows.push({
          id: e.id,
          time: (e.createdAt || e.entryDate || '').slice(11, 16) || '--:--',
          type: 'Expense',
          refNo: e.voucherNo || '--',
          party: e.accountTitle || e.category || 'Operating Expense',
          details: e.remarks || e.description || '--',
          inflow: 0,
          outflow: amt,
          balance: 0
        });
      }
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
        totalOutflow: purPaid + cashRefundsPaid + cpvCashOut + totalExpensesPaid,
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
    generateTodayBusinessSummaryReport,
    getItems,
    toNum,
    isDateInRange,
    getCostRate,
    getUnifiedCost
  };
});
