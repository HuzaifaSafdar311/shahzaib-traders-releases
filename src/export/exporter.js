const { BrowserWindow, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

/**
 * Read the company full logo and return base64 URI
 */
function getLogoBase64() {
  try {
    const logoPath = fs.existsSync(path.join(__dirname, '..', 'assets', 'full-logo.png'))
      ? path.join(__dirname, '..', 'assets', 'full-logo.png')
      : path.join(__dirname, '..', 'full-logo.png');
    if (fs.existsSync(logoPath)) {
      const bitmap = fs.readFileSync(logoPath);
      return `data:image/png;base64,${bitmap.toString('base64')}`;
    }
  } catch (e) {
    console.error('Error reading full-logo.png for export:', e);
  }
  return '';
}

/**
 * Format number as PKR currency string
 */
function formatPKR(val) {
  const num = Number(val) || 0;
  return 'PKR ' + num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Export Product Catalog & Inventory Report as Clean & Simple PDF
 */
async function exportPDF({ items = [], summary = {} }, parentWindow) {
  const defaultFilename = `Shahzaib_Traders_Inventory_${new Date().toISOString().split('T')[0]}.pdf`;

  const { filePath, canceled } = await dialog.showSaveDialog(parentWindow, {
    title: 'Export Inventory as PDF',
    defaultPath: defaultFilename,
    filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
  });

  if (canceled || !filePath) {
    return { success: false, cancelled: true };
  }

  const logoBase64 = getLogoBase64();
  const dateStr = summary.dateGenerated || new Date().toISOString().split('T')[0];

  let totalQty = 0;
  let totalVal = 0;

  const tableRowsHtml = items.map(item => {
    const code = item.code || '';
    const title = item.titleEng || item.stockName || '';
    const unit = item.unitName || item.packingType || 'Piece';
    const qty = Number(item.stockQty ?? item.quantity) || 0;
    const purPrice = Number(item.purchasePrice) || 0;
    const wsPrice = Number(item.wholesalePrice) || 0;
    const retPrice = Number(item.retailPrice ?? item.individualPrice) || 0;
    const val = qty * purPrice;

    totalQty += qty;
    totalVal += val;

    return `
      <tr>
        <td class="col-code text-center font-num">${escapeHtml(code)}</td>
        <td class="col-title">${escapeHtml(title)}</td>
        <td class="col-unit text-center">${escapeHtml(unit)}</td>
        <td class="col-qty text-center font-bold">${qty.toLocaleString()}</td>
        <td class="col-price text-right">${formatPKR(purPrice)}</td>
        <td class="col-price text-right">${formatPKR(wsPrice)}</td>
        <td class="col-price text-right">${formatPKR(retPrice)}</td>
        <td class="col-price text-right font-bold">${formatPKR(val)}</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Inventory Report</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 12mm 12mm 12mm;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #1e293b;
          background-color: #ffffff;
          font-size: 10px;
          line-height: 1.4;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 14px;
        }
        .logo-wrap img { height: 38px; width: auto; object-fit: contain; }
        .company-title { font-size: 15px; font-weight: 700; color: #0f172a; }
        .company-sub { font-size: 9.5px; color: #64748b; margin-top: 1px; }
        .report-meta { text-align: right; }
        .report-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .report-date { font-size: 9.5px; color: #64748b; margin-top: 2px; }
        .table-container {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }
        table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
        thead th {
          background-color: #f8fafc;
          color: #475569;
          font-weight: 600;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          padding: 7px 8px;
          border-bottom: 1px solid #e2e8f0;
          border-right: 1px solid #f1f5f9;
        }
        thead th:last-child { border-right: none; }
        tbody tr { border-bottom: 1px solid #f1f5f9; }
        tbody tr:nth-child(even) { background-color: #fafbfd; }
        tbody td {
          padding: 6px 8px;
          border-right: 1px solid #f1f5f9;
          vertical-align: middle;
          color: #1e293b;
        }
        tbody td:last-child { border-right: none; }
        .col-code { font-weight: 700; color: #3b82f6; width: 60px; }
        .col-title { font-weight: 600; color: #0f172a; }
        .col-unit { width: 70px; color: #64748b; }
        .col-qty { width: 65px; }
        .col-price { width: 90px; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-num { font-feature-settings: "tnum"; font-variant-numeric: tabular-nums; }
        .font-bold { font-weight: 700; }
        tfoot tr {
          background-color: #f8fafc;
          border-top: 1.5px solid #cbd5e1;
          font-weight: 700;
        }
        tfoot td {
          padding: 8px 8px;
          color: #0f172a;
          border-right: 1px solid #f1f5f9;
        }
        tfoot td:last-child { border-right: none; }
        .page-footer {
          margin-top: 14px;
          display: flex;
          justify-content: space-between;
          font-size: 8.5px;
          color: #94a3b8;
          padding-top: 8px;
          border-top: 1px solid #f1f5f9;
        }
      </style>
    </head>
    <body>
      <header class="page-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          ${logoBase64 ? `<div class="logo-wrap"><img src="${logoBase64}" alt="Logo"></div>` : ''}
          <div>
            <div class="company-title">Shahzaib Traders</div>
            <div class="company-sub">Wholesale & Retail Trading Solutions</div>
          </div>
        </div>
        <div class="report-meta">
          <div class="report-badge">Inventory Stock Report</div>
          <div class="report-date">Date: ${escapeHtml(dateStr)}</div>
        </div>
      </header>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 55px;">Code</th>
              <th>Product Title</th>
              <th class="text-center" style="width: 65px;">Unit</th>
              <th class="text-center" style="width: 60px;">Stock</th>
              <th class="text-right" style="width: 80px;">Cost (PKR)</th>
              <th class="text-right" style="width: 80px;">Wholesale</th>
              <th class="text-right" style="width: 80px;">Retail</th>
              <th class="text-right" style="width: 90px;">Stock Value</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" class="font-bold">Total (${items.length} Products)</td>
              <td class="text-center font-bold">${totalQty.toLocaleString()}</td>
              <td colspan="3"></td>
              <td class="text-right font-bold">${formatPKR(totalVal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <footer class="page-footer">
        <div>Shahzaib Traders - Enterprise Inventory System</div>
        <div>Generated on ${new Date().toLocaleString()}</div>
      </footer>
    </body>
    </html>
  `;

  const printWin = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: false }
  });

  try {
    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    const pdfBuffer = await printWin.webContents.printToPDF({
      pageSize: 'A4',
      landscape: false,
      printBackground: true,
      margins: { top: 0.3, bottom: 0.3, left: 0.3, right: 0.3 }
    });

    fs.writeFileSync(filePath, pdfBuffer);
    return { success: true, filePath };
  } finally {
    if (printWin && !printWin.isDestroyed()) {
      printWin.close();
    }
  }
}

/**
 * Helpers for Report Column Formatting
 */
function isCurrencyHeader(h) {
  const lower = String(h || '').toLowerCase();
  return lower.includes('price') || lower.includes('cost') || lower.includes('amount') ||
         lower.includes('gross') || lower.includes('net') || lower.includes('discount') ||
         lower.includes('paid') || lower.includes('balance') || lower.includes('total') ||
         lower.includes('revenue') || lower.includes('profit') || lower.includes('refund') ||
         lower.includes('val') || lower.includes('pkr') || lower.includes('rs') ||
         lower.includes('receivable') || lower.includes('payable') || lower.includes('inflow') ||
         lower.includes('outflow') || lower.includes('cogs') || lower.includes('recovery');
}

function isQtyHeader(h) {
  const lower = String(h || '').toLowerCase();
  return lower.includes('qty') || lower.includes('pieces') || lower.includes('pcs') ||
         lower.includes('count') || lower.includes('items') || lower.includes('bills') ||
         lower.includes('stock');
}

function isCenterHeader(h) {
  const lower = String(h || '').toLowerCase();
  return lower.includes('date') || lower.includes('code') || lower.includes('#') ||
         lower.includes('voucher') || lower.includes('bill') || lower.includes('mode') ||
         lower.includes('type') || lower.includes('unit') || lower.includes('status') ||
         lower.includes('condition') || lower.includes('sr');
}

/**
 * Universal Excel Spreadsheet (.xlsx) Exporter with ExcelJS
 * Supports both dedicated Reports payloads (headers, rows, totals)
 * and legacy Inventory Product Catalog payloads.
 */
async function exportExcel(payload = {}, parentWindow) {
  // If payload contains explicit headers and rows, export as Universal Business Report
  if (Array.isArray(payload.headers) && Array.isArray(payload.rows)) {
    return exportGenericReportExcel(payload, parentWindow);
  }

  // Otherwise fallback to legacy Inventory Product Catalog export
  const { items = [], summary = {} } = payload;
  const defaultFilename = `Shahzaib_Traders_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`;

  const { filePath, canceled } = await dialog.showSaveDialog(parentWindow, {
    title: 'Export Inventory as Excel',
    defaultPath: defaultFilename,
    filters: [{ name: 'Excel Spreadsheets (*.xlsx)', extensions: ['xlsx'] }]
  });

  if (canceled || !filePath) {
    return { success: false, cancelled: true };
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Shahzaib Traders';
  wb.created = new Date();

  const ws = wb.addWorksheet('Inventory', { views: [{ showGridLines: true }] });
  const dateStr = summary.dateGenerated || new Date().toISOString().split('T')[0];

  ws.getCell('A1').value = 'Shahzaib Traders - Inventory Stock Report';
  ws.getCell('A1').font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF0F172A' } };

  ws.getCell('A2').value = `Date: ${dateStr}`;
  ws.getCell('A2').font = { name: 'Arial', size: 9.5, color: { argb: 'FF64748B' } };

  ws.getRow(1).height = 22;
  ws.getRow(2).height = 16;
  ws.getRow(3).height = 10;

  const headers = [
    'Code',
    'Product Title',
    'Unit',
    'Stock Qty',
    'Purchase Cost (PKR)',
    'Wholesale (PKR)',
    'Retail (PKR)',
    'Stock Value (PKR)'
  ];

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  };

  const headerRow = ws.getRow(4);
  headerRow.height = 24;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    cell.alignment = { horizontal: (idx === 1) ? 'left' : (idx >= 4) ? 'right' : 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });

  let currentRow = 5;
  let totalQty = 0;
  let totalVal = 0;

  items.forEach((item, idx) => {
    const row = ws.getRow(currentRow);
    row.height = 20;

    const code = item.code || '';
    const title = item.titleEng || item.stockName || '';
    const unit = item.unitName || item.packingType || 'Piece';
    const qty = Number(item.stockQty ?? item.quantity) || 0;
    const purPrice = Number(item.purchasePrice) || 0;
    const wsPrice = Number(item.wholesalePrice) || 0;
    const retPrice = Number(item.retailPrice ?? item.individualPrice) || 0;
    const val = qty * purPrice;

    totalQty += qty;
    totalVal += val;

    row.getCell(1).value = code;
    row.getCell(2).value = title;
    row.getCell(3).value = unit;
    row.getCell(4).value = qty;
    row.getCell(5).value = purPrice;
    row.getCell(6).value = wsPrice;
    row.getCell(7).value = retPrice;
    row.getCell(8).value = val;

    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };

    row.getCell(4).numFmt = '#,##0';
    row.getCell(5).numFmt = '"PKR " #,##0.00';
    row.getCell(6).numFmt = '"PKR " #,##0.00';
    row.getCell(7).numFmt = '"PKR " #,##0.00';
    row.getCell(8).numFmt = '"PKR " #,##0.00';

    const bg = (idx % 2 === 1) ? 'FFFAFAFA' : 'FFFFFFFF';
    for (let c = 1; c <= 8; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 9.5 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = thinBorder;
    }

    currentRow++;
  });

  const totalRow = ws.getRow(currentRow);
  totalRow.height = 22;
  totalRow.getCell(1).value = 'Total';
  totalRow.getCell(2).value = `${items.length} Products`;
  totalRow.getCell(3).value = '';
  totalRow.getCell(4).value = totalQty;
  totalRow.getCell(5).value = '';
  totalRow.getCell(6).value = '';
  totalRow.getCell(7).value = '';
  totalRow.getCell(8).value = totalVal;

  totalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  totalRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
  totalRow.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell(4).numFmt = '#,##0';
  totalRow.getCell(8).numFmt = '"PKR " #,##0.00';

  for (let c = 1; c <= 8; c++) {
    const cell = totalRow.getCell(c);
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    cell.border = thinBorder;
  }

  const widths = [12, 34, 14, 14, 18, 18, 18, 20];
  widths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });

  await wb.xlsx.writeFile(filePath);
  return { success: true, filePath };
}

/**
 * Export Any Business Management Report as Styled Excel (.xlsx)
 */
async function exportGenericReportExcel(payload, parentWindow) {
  const title = payload.title || 'Business Report';
  const dateRange = payload.dateRange || `Period: ${new Date().toISOString().split('T')[0]}`;
  const filterSummary = payload.filterSummary || '';
  const headers = payload.headers || [];
  const rows = payload.rows || [];
  const totals = payload.totals || null;
  const summaryCards = payload.summaryCards || [];

  const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_');
  const defaultFilename = payload.filename || `Shahzaib_Traders_${safeTitle}_${new Date().toISOString().split('T')[0]}.xlsx`;

  const { filePath, canceled } = await dialog.showSaveDialog(parentWindow, {
    title: `Export ${title} as Excel Spreadsheet`,
    defaultPath: defaultFilename,
    filters: [
      { name: 'Excel Spreadsheets (*.xlsx)', extensions: ['xlsx'] }
    ]
  });

  if (canceled || !filePath) {
    return { success: false, cancelled: true };
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Shahzaib Traders';
  wb.lastModifiedBy = 'Shahzaib Traders Management System';
  wb.created = new Date();
  wb.modified = new Date();

  const cleanSheetName = (payload.sheetName || title || 'Report').slice(0, 30).replace(/[:\\\/\?\*\[\]]/g, '');
  const ws = wb.addWorksheet(cleanSheetName, {
    views: [{ showGridLines: true, state: 'frozen', ySplit: summaryCards.length ? 7 : 5 }]
  });

  // Color Palette Constants
  const brandDark = 'FF0F172A'; // Deep Navy
  const brandHeader = 'FF1E293B'; // Header Fill
  const brandBlue = 'FF0284C7'; // Accent Blue
  const textMuted = 'FF64748B'; // Muted Gray
  const borderLight = 'FFE2E8F0'; // Thin Border

  const thinBorder = {
    top: { style: 'thin', color: { argb: borderLight } },
    left: { style: 'thin', color: { argb: borderLight } },
    bottom: { style: 'thin', color: { argb: borderLight } },
    right: { style: 'thin', color: { argb: borderLight } }
  };

  const totalBorder = {
    top: { style: 'medium', color: { argb: 'FF94A3B8' } },
    bottom: { style: 'double', color: { argb: brandDark } },
    left: { style: 'thin', color: { argb: borderLight } },
    right: { style: 'thin', color: { argb: borderLight } }
  };

  // Row 1: Company Header
  ws.getCell('A1').value = 'SHAHZAIB TRADERS - WHOLESALE & RETAIL SOLUTIONS';
  ws.getCell('A1').font = { name: 'Arial', size: 14, bold: true, color: { argb: brandDark } };
  ws.getRow(1).height = 24;

  // Row 2: Report Title & Period
  ws.getCell('A2').value = `${title} | ${dateRange}`;
  ws.getCell('A2').font = { name: 'Arial', size: 11, bold: true, color: { argb: brandBlue } };
  ws.getRow(2).height = 18;

  // Row 3: Generation Timestamp & Filters
  const metaStr = `Generated on: ${new Date().toLocaleString('en-US')}${filterSummary ? ` | Filters: ${filterSummary}` : ''}`;
  ws.getCell('A3').value = metaStr;
  ws.getCell('A3').font = { name: 'Arial', size: 9, italic: true, color: { argb: textMuted } };
  ws.getRow(3).height = 15;

  let currentRowIdx = 5;

  // Optional: Summary KPI Cards Row
  if (Array.isArray(summaryCards) && summaryCards.length > 0) {
    const kpiRow = ws.getRow(currentRowIdx);
    kpiRow.height = 22;
    let kpiCol = 1;
    summaryCards.forEach(c => {
      if (kpiCol <= headers.length) {
        const cell = kpiRow.getCell(kpiCol);
        cell.value = `${c.label || ''}: ${c.value || ''}`;
        cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: brandDark } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
        cell.border = thinBorder;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        kpiCol++;
      }
    });
    currentRowIdx += 2; // Add spacing after KPI cards
  }

  // Table Column Headers
  const headerRow = ws.getRow(currentRowIdx);
  headerRow.height = 26;

  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandHeader } };
    cell.border = thinBorder;

    if (isCurrencyHeader(h)) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    } else if (isQtyHeader(h) || isCenterHeader(h)) {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    }
  });

  currentRowIdx++;

  // Data Rows
  rows.forEach((rVals, rIdx) => {
    const row = ws.getRow(currentRowIdx);
    row.height = 20;
    const isEven = rIdx % 2 === 1;
    const rowBg = isEven ? 'FFF9FAFB' : 'FFFFFFFF';

    const vals = Array.isArray(rVals) ? rVals : Object.values(rVals);

    vals.forEach((val, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      const h = headers[cIdx] || '';
      const isNum = typeof val === 'number';

      cell.value = val;
      cell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.border = thinBorder;

      if (isCurrencyHeader(h)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if (isNum) cell.numFmt = '"Rs. " #,##0.00';
      } else if (isQtyHeader(h)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (isNum) cell.numFmt = '#,##0';
      } else if (isCenterHeader(h)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (isNum) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0.00';
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });

    currentRowIdx++;
  });

  // Footer Summary / Totals Row
  if (Array.isArray(totals) && totals.length > 0) {
    const totalRow = ws.getRow(currentRowIdx);
    totalRow.height = 24;

    totals.forEach((val, cIdx) => {
      const cell = totalRow.getCell(cIdx + 1);
      const h = headers[cIdx] || '';
      const isNum = typeof val === 'number';

      cell.value = val;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: brandDark } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = totalBorder;

      if (isCurrencyHeader(h)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if (isNum) cell.numFmt = '"Rs. " #,##0.00';
      } else if (isQtyHeader(h)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (isNum) cell.numFmt = '#,##0';
      } else {
        cell.alignment = { horizontal: (cIdx === 0 ? 'left' : 'center'), vertical: 'middle' };
      }
    });

    currentRowIdx++;
  }

  // Auto Column Widths
  headers.forEach((h, cIdx) => {
    let maxLen = String(h).length;
    rows.slice(0, 150).forEach(r => {
      const vals = Array.isArray(r) ? r : Object.values(r);
      const cellVal = String(vals[cIdx] ?? '');
      if (cellVal.length > maxLen) maxLen = cellVal.length;
    });
    ws.getColumn(cIdx + 1).width = Math.min(Math.max(maxLen + 4, 12), 42);
  });

  await wb.xlsx.writeFile(filePath);
  return { success: true, filePath };
}

/**
 * Export Product Catalog as Clean CSV
 */
async function exportCSV({ items = [] }, parentWindow) {
  const defaultFilename = `Shahzaib_Traders_Inventory_${new Date().toISOString().split('T')[0]}.csv`;

  const { filePath, canceled } = await dialog.showSaveDialog(parentWindow, {
    title: 'Export Inventory as CSV',
    defaultPath: defaultFilename,
    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  });

  if (canceled || !filePath) {
    return { success: false, cancelled: true };
  }

  let csvContent = '\uFEFF'; // UTF-8 BOM
  csvContent += 'Code,Product Title,Unit,Stock Qty,Purchase Cost (PKR),Wholesale (PKR),Retail (PKR),Stock Value (PKR)\r\n';

  let totalQty = 0;
  let totalVal = 0;

  items.forEach(item => {
    const code = item.code || '';
    const title = item.titleEng || item.stockName || '';
    const unit = item.unitName || item.packingType || 'Piece';
    const qty = Number(item.stockQty ?? item.quantity) || 0;
    const purPrice = Number(item.purchasePrice) || 0;
    const wsPrice = Number(item.wholesalePrice) || 0;
    const retPrice = Number(item.retailPrice ?? item.individualPrice) || 0;
    const val = qty * purPrice;

    totalQty += qty;
    totalVal += val;

    const row = [
      `"${code.replace(/"/g, '""')}"`,
      `"${title.replace(/"/g, '""')}"`,
      `"${unit.replace(/"/g, '""')}"`,
      qty,
      purPrice.toFixed(2),
      wsPrice.toFixed(2),
      retPrice.toFixed(2),
      val.toFixed(2)
    ];
    csvContent += row.join(',') + '\r\n';
  });

  csvContent += `Total,,,"${totalQty}",,,,"${totalVal.toFixed(2)}"\r\n`;

  fs.writeFileSync(filePath, csvContent, 'utf-8');
  return { success: true, filePath };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  exportPDF,
  exportExcel,
  exportCSV
};
