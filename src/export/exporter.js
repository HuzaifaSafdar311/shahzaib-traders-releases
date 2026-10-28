const { app, BrowserWindow, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ExcelJS = require('exceljs');

const tempDir = (app && typeof app.getPath === 'function') ? app.getPath('temp') : os.tmpdir();

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
 * Shared Formatting & Normalization Helpers (Shahzaib Traders Standard)
 */
function cleanText(val, fallback = '-') {
  if (val === null || val === undefined) return fallback;
  const s = String(val).trim();
  if (s === '' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return fallback;
  return s;
}

function formatMoney(val, includeCurrency = true) {
  if (val === null || val === undefined || val === '') return includeCurrency ? 'Rs. 0.00' : '0.00';
  const num = Number(val);
  if (isNaN(num)) return includeCurrency ? 'Rs. 0.00' : '0.00';
  const formatted = num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return includeCurrency ? `Rs. ${formatted}` : formatted;
}

function formatNumber(val, decimals = 0) {
  if (val === null || val === undefined || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-PK', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatDate(dStr, fallback = '-') {
  if (!dStr) return fallback;
  try {
    const raw = String(dStr).slice(0, 10);
    const parts = raw.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const yr = parts[0];
      const monIdx = parseInt(parts[1], 10) - 1;
      const day = parts[2].padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (monIdx >= 0 && monIdx < 12) {
        return `${day}-${months[monIdx]}-${yr}`;
      }
    }
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return String(dStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const mon = months[d.getMonth()];
    const yr = d.getFullYear();
    return `${day}-${mon}-${yr}`;
  } catch (_) {
    return String(dStr);
  }
}

const formatPKR = formatMoney;

/**
 * Robust Column Category Classifier for Business Reports
 * Distinguishes currency, quantities, percentages, centered codes/dates, and text
 */
function getColumnCategory(header) {
  const h = String(header || '').trim().toLowerCase();

  // 1. Percentage
  if (h.includes('%') || h.includes('percent') || h.includes('ratio')) {
    return 'percent';
  }

  // 2. Specific Quantity / Count headers (higher precedence when units/qty/packs mentioned)
  if (
    h.includes('units') || h.includes('qty') || h.includes('packs') ||
    h.includes('invoices') || h.includes('vouchers') || h.includes('bills') ||
    h.includes('items') || h.includes('shortage') || h.includes('bonus') ||
    h.includes('reorder') || h.includes('pack size') || h.includes('stock') ||
    h.includes('level')
  ) {
    // Exception: unless it's cost/rate/valuation per unit or stock value e.g. "Avg Unit Cost", "Stock Cost Val", "Stock Retail Val"
    if (h.includes('cost') || h.includes('rate') || h.includes('price') || h.includes('val') || h.includes('spend')) {
      return 'currency';
    }
    return 'qty';
  }

  // 3. Currency / Financial Amount headers
  if (
    h.includes('discount') || h.includes('price') || h.includes('cost') || h.includes('amount') ||
    h.includes('gross') || h.includes('net') || h.includes('paid') || h.includes('balance') ||
    h.includes('revenue') || h.includes('profit') || h.includes('refund') || h.includes('spend') ||
    h.includes('freight') || h.includes('debit') || h.includes('credit') || h.includes('rate') ||
    h.includes('wholesale') || h.includes('cogs') || h.includes('inflow') || h.includes('outflow') ||
    h.includes('val') || h.includes('recoveries') || h.includes('recovery') ||
    h.includes('(pkr)') || h.includes('cash sales') || h.includes('purchases') || h.includes('grand total')
  ) {
    return 'currency';
  }

  // 4. Center-aligned identifiers & metadata
  if (
    h.includes('date') || h.includes('time') || h.includes('code') || h === '#' ||
    h.includes('bill #') || h.includes('voucher #') || h.includes('inv #') ||
    h.includes('return #') || h.includes('mode') || h.includes('status') ||
    h === 'sr #' || h === 'sr' || h === 'unit' || h.includes('phone') || h.includes('party type')
  ) {
    return 'center';
  }

  // 5. Pure Text (Left-aligned)
  return 'text';
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Universal PDF Exporter
 * Routes to exportGenericReportPDF when payload has headers & rows,
 * or falls back to legacy exportCatalogPDF when given { items }.
 */
async function exportPDF(payload = {}, parentWindow) {
  if (Array.isArray(payload.headers) && Array.isArray(payload.rows)) {
    return exportGenericReportPDF(payload, parentWindow);
  }
  return exportCatalogPDF(payload, parentWindow);
}

/**
 * Universal Business Report PDF Generator
 * Professional A4 Layout with auto-orientation, repeat thead, zero overlapping, and perfect text alignments
 */
async function exportGenericReportPDF(payload, parentWindow) {
  const title = payload.title || 'Business Report';
  const subtitle = payload.subtitle || 'Shahzaib Traders Management System';
  const dateRange = payload.dateRange || `Period: ${new Date().toISOString().split('T')[0]}`;
  const filterSummary = payload.filterSummary || '';
  const headers = payload.headers || [];
  const rows = payload.rows || [];
  const totals = payload.totals || null;
  const summaryCards = payload.summaryCards || [];

  const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_');
  const defaultFilename = payload.filename || `Shahzaib_Traders_${safeTitle}_${new Date().toISOString().split('T')[0]}.pdf`;

  const { filePath, canceled } = await dialog.showSaveDialog(parentWindow, {
    title: `Export ${title} as PDF Document`,
    defaultPath: defaultFilename,
    filters: [{ name: 'PDF Documents (*.pdf)', extensions: ['pdf'] }]
  });

  if (canceled || !filePath) {
    return { success: false, cancelled: true };
  }

  const logoBase64 = getLogoBase64();
  // Automatically choose landscape for wide tables (8+ columns) unless explicitly overridden
  const isLandscape = payload.landscape !== undefined ? Boolean(payload.landscape) : (headers.length >= 8);

  // Dynamic sizing based on column density to prevent clipping and wrapping
  let tableFontSize = '9px';
  let cellPadding = '5px 6px';
  let pageMargin = '8mm 8mm 10mm 8mm';

  if (headers.length >= 12) {
    tableFontSize = '7.5px';
    cellPadding = '4px 4px';
    pageMargin = '6mm 6mm 8mm 6mm';
  } else if (headers.length >= 9) {
    tableFontSize = '8px';
    cellPadding = '4px 5px';
    pageMargin = '7mm 7mm 9mm 7mm';
  }

  const kpiCardsHtml = (Array.isArray(summaryCards) && summaryCards.length > 0)
    ? `<div class="kpi-strip">
        ${summaryCards.map(c => `
          <div class="kpi-card">
            <div class="kpi-label">${escapeHtml(c.label)}</div>
            <div class="kpi-val">${escapeHtml(c.value)}</div>
          </div>
        `).join('')}
       </div>`
    : '';

  // Render headers with exact matching alignments
  const tableHeadersHtml = headers.map(h => {
    const cat = getColumnCategory(h);
    let alignClass = 'text-left';
    if (cat === 'currency' || cat === 'qty' || cat === 'percent') alignClass = 'text-right font-num';
    else if (cat === 'center') alignClass = 'text-center font-num';
    return `<th class="${alignClass}">${escapeHtml(h)}</th>`;
  }).join('');

  // Render data rows
  const tableRowsHtml = rows.map((r) => {
    const vals = Array.isArray(r) ? r : Object.values(r);
    const cellsHtml = headers.map((h, cIdx) => {
      const val = vals[cIdx];
      const cat = getColumnCategory(h);
      let alignClass = 'text-left';
      let formattedVal = cleanText(val, '-');

      if (typeof val === 'number') {
        if (cat === 'currency') {
          alignClass = 'text-right font-num';
          formattedVal = formatMoney(val);
        } else if (cat === 'qty') {
          alignClass = 'text-right font-num';
          formattedVal = formatNumber(val, 0);
        } else if (cat === 'percent') {
          alignClass = 'text-right font-num';
          formattedVal = `${val.toFixed(1)}%`;
        } else {
          alignClass = 'text-right font-num';
          formattedVal = formatNumber(val, 2);
        }
      } else if (cat === 'center') {
        alignClass = 'text-center font-num';
      }

      return `<td class="${alignClass}">${escapeHtml(formattedVal)}</td>`;
    }).join('');

    return `<tr>${cellsHtml}</tr>`;
  }).join('');

  // Render totals row
  let totalsHtml = '';
  if (Array.isArray(totals) && totals.length > 0) {
    const totalCells = headers.map((h, cIdx) => {
      const val = totals[cIdx];
      const cat = getColumnCategory(h);
      let alignClass = 'text-center font-num';
      let formattedVal = cleanText(val, '');

      if (typeof val === 'number') {
        if (cat === 'currency') {
          alignClass = 'text-right font-num font-bold';
          formattedVal = formatMoney(val);
        } else if (cat === 'qty') {
          alignClass = 'text-right font-num font-bold';
          formattedVal = formatNumber(val, 0);
        } else if (cat === 'percent') {
          alignClass = 'text-right font-num font-bold';
          formattedVal = `${val.toFixed(1)}%`;
        } else {
          alignClass = 'text-right font-num font-bold';
          formattedVal = formatNumber(val, 2);
        }
      } else if (cIdx === 0 || String(val).toUpperCase().includes('TOTAL')) {
        alignClass = 'text-left font-bold';
        formattedVal = String(val || 'TOTALS');
      }

      return `<td class="${alignClass}">${escapeHtml(formattedVal)}</td>`;
    }).join('');

    totalsHtml = `<tfoot><tr class="totals-row">${totalCells}</tr></tfoot>`;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(title)}</title>
      <style>
        @page {
          size: A4 ${isLandscape ? 'landscape' : 'portrait'};
          margin: ${pageMargin};
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #0f172a;
          background-color: #ffffff;
          font-size: ${tableFontSize};
          line-height: 1.35;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .report-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 8px;
          border-bottom: 2px solid #0f172a;
          margin-bottom: 10px;
        }
        .header-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .logo-wrap img {
          height: 36px;
          width: auto;
          object-fit: contain;
        }
        .company-name {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.2px;
          text-transform: uppercase;
        }
        .company-tagline {
          font-size: 8.5px;
          color: #475569;
          margin-top: 1px;
        }
        .company-meta {
          font-size: 7.5px;
          color: #64748b;
          margin-top: 1px;
        }
        .header-meta {
          text-align: right;
        }
        .report-title {
          font-size: 13px;
          font-weight: 800;
          color: #0284c7;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .report-period {
          font-size: 8.5px;
          font-weight: 600;
          color: #334155;
          margin-top: 2px;
        }
        .report-timestamp {
          font-size: 7.5px;
          color: #64748b;
          margin-top: 2px;
        }

        .kpi-strip {
          display: flex;
          gap: 6px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }
        .kpi-card {
          flex: 1;
          min-width: 105px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-left: 3px solid #0284c7;
          padding: 5px 8px;
          border-radius: 3px;
        }
        .kpi-label {
          font-size: 7px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
        }
        .kpi-val {
          font-size: 10.5px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 1px;
          font-variant-numeric: tabular-nums;
        }

        .table-wrap {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 3px;
          overflow: hidden;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: ${tableFontSize};
        }
        thead {
          display: table-header-group !important;
        }
        tfoot {
          display: table-footer-group !important;
        }
        tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        thead th {
          background-color: #0f172a !important;
          color: #ffffff !important;
          font-weight: 700;
          padding: ${cellPadding};
          text-transform: uppercase;
          letter-spacing: 0.2px;
          border: 1px solid #1e293b;
          white-space: nowrap;
        }
        tbody tr {
          border-bottom: 1px solid #e2e8f0;
        }
        tbody tr:nth-child(even) {
          background-color: #f8fafc;
        }
        tbody tr:nth-child(odd) {
          background-color: #ffffff;
        }
        tbody td {
          padding: ${cellPadding};
          border-right: 1px solid #e2e8f0;
          vertical-align: middle;
          color: #0f172a;
        }
        tbody td:last-child {
          border-right: none;
        }

        .totals-row td {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
          font-weight: 800;
          padding: 6px 5px;
          border-top: 2px solid #0f172a !important;
          border-bottom: 3px double #0f172a !important;
          border-right: 1px solid #cbd5e1;
        }
        .totals-row td:last-child {
          border-right: none;
        }

        .text-left {
          text-align: left !important;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        .text-center {
          text-align: center !important;
          white-space: nowrap !important;
        }
        .text-right {
          text-align: right !important;
          white-space: nowrap !important;
        }
        .font-num {
          font-feature-settings: "tnum";
          font-variant-numeric: tabular-nums;
          font-family: Consolas, "Liberation Mono", "Courier New", monospace;
          white-space: nowrap !important;
        }
        .font-bold {
          font-weight: 700;
        }

        .report-footer {
          margin-top: 10px;
          display: flex;
          justify-content: space-between;
          font-size: 7.5px;
          color: #64748b;
          padding-top: 5px;
          border-top: 1px solid #cbd5e1;
        }
      </style>
    </head>
    <body>
      <div class="report-header">
        <div class="header-brand">
          ${logoBase64 ? `<div class="logo-wrap"><img src="${logoBase64}" alt="Logo"></div>` : ''}
          <div>
            <div class="company-name">Shahzaib Traders</div>
            <div class="company-tagline">Wholesale & Retail Trading Solutions</div>
            <div class="company-meta">NTN: Registered Commercial Enterprise | Ph: 0300-XXXXXXX</div>
          </div>
        </div>
        <div class="header-meta">
          <div class="report-title">${escapeHtml(title)}</div>
          <div class="report-period">${escapeHtml(dateRange)}</div>
          <div class="report-timestamp">Generated on: ${new Date().toLocaleString('en-PK')}</div>
          ${filterSummary ? `<div style="font-size: 7.5px; color: #475569; margin-top: 1px;">Filters: ${escapeHtml(filterSummary)}</div>` : ''}
        </div>
      </div>

      ${kpiCardsHtml}

      <div class="table-wrap">
        <table>
          <thead>
            <tr>${tableHeadersHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml || '<tr><td colspan="' + headers.length + '" class="text-center" style="padding: 24px; color: #94a3b8;">No records found matching your criteria.</td></tr>'}
          </tbody>
          ${totalsHtml}
        </table>
      </div>

      <div class="report-footer">
        <div>Shahzaib Traders - Enterprise Business Management System</div>
        <div>CONFIDENTIAL REPORT &bull; STRICTLY FOR INTERNAL MANAGEMENT USE</div>
        <div>Print Date: ${new Date().toLocaleDateString('en-PK')}</div>
      </div>
    </body>
    </html>
  `;

  const printWin = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  });

  const tempHtmlPath = path.join(tempDir, `shahzaib_pdf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.html`);

  try {
    fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');
    await printWin.loadFile(tempHtmlPath);

    // Wait for the document to completely paint styles, tables, and images
    await printWin.webContents.executeJavaScript(`
      new Promise(resolve => {
        if (document.readyState === 'complete') {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        } else {
          window.addEventListener('load', () => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }
      });
    `);

    const pdfBuffer = await printWin.webContents.printToPDF({
      pageSize: 'A4',
      landscape: isLandscape,
      printBackground: true,
      preferCSSPageSize: true
    });

    fs.writeFileSync(filePath, pdfBuffer);

    // Directly open the exported PDF for the user
    if (shell && typeof shell.openPath === 'function') {
      try { shell.openPath(filePath); } catch (e) {}
    }

    return { success: true, filePath };
  } finally {
    if (fs.existsSync(tempHtmlPath)) {
      try { fs.unlinkSync(tempHtmlPath); } catch (e) {}
    }
    if (printWin && !printWin.isDestroyed()) {
      printWin.close();
    }
  }
}

/**
 * Legacy Inventory Catalog PDF Exporter
 */
async function exportCatalogPDF({ items = [], summary = {} }, parentWindow) {
  const defaultFilename = `Shahzaib_Traders_Inventory_${new Date().toISOString().split('T')[0]}.pdf`;

  const { filePath, canceled } = await dialog.showSaveDialog(parentWindow, {
    title: 'Export Inventory as PDF',
    defaultPath: defaultFilename,
    filters: [{ name: 'PDF Documents (*.pdf)', extensions: ['pdf'] }]
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
        <td class="col-qty text-right font-bold font-num">${qty.toLocaleString()}</td>
        <td class="col-price text-right font-num">${formatPKR(purPrice)}</td>
        <td class="col-price text-right font-num">${formatPKR(wsPrice)}</td>
        <td class="col-price text-right font-num">${formatPKR(retPrice)}</td>
        <td class="col-price text-right font-bold font-num">${formatPKR(val)}</td>
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
          margin: 10mm;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          color: #1e293b;
          font-size: 9.5px;
          line-height: 1.4;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 10px;
          border-bottom: 2px solid #0f172a;
          margin-bottom: 12px;
        }
        .logo-wrap img { height: 36px; width: auto; object-fit: contain; }
        .company-title { font-size: 15px; font-weight: 700; color: #0f172a; }
        .company-sub { font-size: 9px; color: #64748b; margin-top: 1px; }
        .report-meta { text-align: right; }
        .report-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          color: #0f172a;
          text-transform: uppercase;
        }
        .report-date { font-size: 9px; color: #64748b; margin-top: 2px; }
        .table-container {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 3px;
          overflow: hidden;
        }
        table { width: 100%; border-collapse: collapse; font-size: 9px; }
        thead th {
          background-color: #0f172a;
          color: #ffffff;
          font-weight: 700;
          padding: 6px 8px;
          border-right: 1px solid #1e293b;
          white-space: nowrap;
        }
        tbody tr { border-bottom: 1px solid #f1f5f9; }
        tbody tr:nth-child(even) { background-color: #fafbfd; }
        tbody td { padding: 5px 8px; border-right: 1px solid #f1f5f9; vertical-align: middle; }
        tfoot tr { background-color: #f8fafc; border-top: 2px solid #0f172a; font-weight: 700; }
        tfoot td { padding: 6px 8px; color: #0f172a; }
        .text-center { text-align: center !important; }
        .text-right { text-align: right !important; }
        .font-num { font-feature-settings: "tnum"; font-variant-numeric: tabular-nums; white-space: nowrap !important; }
        .font-bold { font-weight: 700; }
        .page-footer {
          margin-top: 12px;
          display: flex;
          justify-content: space-between;
          font-size: 8px;
          color: #94a3b8;
          padding-top: 6px;
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
              <th class="text-right" style="width: 65px;">Stock</th>
              <th class="text-right" style="width: 80px;">Cost (PKR)</th>
              <th class="text-right" style="width: 80px;">Wholesale</th>
              <th class="text-right" style="width: 80px;">Retail</th>
              <th class="text-right" style="width: 95px;">Stock Value</th>
            </tr>
          </thead>
          <tbody>${tableRowsHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" class="font-bold">Total (${items.length} Products)</td>
              <td class="text-right font-bold font-num">${totalQty.toLocaleString()}</td>
              <td colspan="3"></td>
              <td class="text-right font-bold font-num">${formatPKR(totalVal)}</td>
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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  });

  const tempHtmlPath = path.join(tempDir, `shahzaib_cat_pdf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.html`);

  try {
    fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');
    await printWin.loadFile(tempHtmlPath);

    await printWin.webContents.executeJavaScript(`
      new Promise(resolve => {
        if (document.readyState === 'complete') {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        } else {
          window.addEventListener('load', () => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }
      });
    `);

    const pdfBuffer = await printWin.webContents.printToPDF({
      pageSize: 'A4',
      landscape: false,
      printBackground: true,
      preferCSSPageSize: true
    });
    fs.writeFileSync(filePath, pdfBuffer);

    if (shell && typeof shell.openPath === 'function') {
      try { shell.openPath(filePath); } catch (e) {}
    }

    return { success: true, filePath };
  } finally {
    if (fs.existsSync(tempHtmlPath)) {
      try { fs.unlinkSync(tempHtmlPath); } catch (e) {}
    }
    if (printWin && !printWin.isDestroyed()) {
      printWin.close();
    }
  }
}

/**
 * Universal Excel Spreadsheet (.xlsx) Exporter with ExcelJS
 */
async function exportExcel(payload = {}, parentWindow) {
  if (Array.isArray(payload.headers) && Array.isArray(payload.rows)) {
    return exportGenericReportExcel(payload, parentWindow);
  }

  // Fallback to legacy Product Catalog export
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
    cell.alignment = { horizontal: (idx === 1) ? 'left' : (idx >= 3) ? 'right' : 'center', vertical: 'middle' };
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
    row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
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
  totalRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
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
 * Universal Styled Business Report Excel (.xlsx) Exporter
 * Eliminates column width overflow (###), fixes text and number alignments
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

  // Sanitize worksheet name: remove special chars * ? : \ / [ ] and max 30 chars
  const cleanSheetName = (payload.sheetName || title || 'Report').replace(/[:\\\/\?\*\[\]]/g, ' ').trim().slice(0, 30) || 'Report';
  const ws = wb.addWorksheet(cleanSheetName, {
    views: [{ showGridLines: true, state: 'frozen', ySplit: summaryCards.length ? 7 : 5 }]
  });

  // Color Palette Constants
  const brandDark = 'FF0F172A'; // Deep Navy
  const brandHeader = 'FF0F172A'; // Header Fill
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
    currentRowIdx += 2;
  }

  // Table Column Headers
  const headerRow = ws.getRow(currentRowIdx);
  headerRow.height = 26;

  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    const cat = getColumnCategory(h);

    cell.value = h;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandHeader } };
    cell.border = thinBorder;

    if (cat === 'currency' || cat === 'qty' || cat === 'percent') {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    } else if (cat === 'center') {
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

    headers.forEach((h, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      const cat = getColumnCategory(h);
      let rawVal = vals[cIdx];
      let val = rawVal;
      let isNum = typeof val === 'number';

      if (!isNum && val !== null && val !== undefined && val !== '' && !isNaN(Number(val)) && (cat === 'currency' || cat === 'qty' || cat === 'percent')) {
        val = Number(val);
        isNum = true;
      }

      if (val === null || val === undefined || val === '') {
        val = '-';
      }

      cell.value = val;
      cell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.border = thinBorder;

      if (cat === 'currency') {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if (isNum) cell.numFmt = '"Rs. " #,##0.00';
      } else if (cat === 'qty') {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if (isNum) cell.numFmt = '#,##0';
      } else if (cat === 'percent') {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if (isNum) cell.numFmt = '0.0"%"';
      } else if (cat === 'center') {
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

    headers.forEach((h, cIdx) => {
      const cell = totalRow.getCell(cIdx + 1);
      const cat = getColumnCategory(h);
      let val = totals[cIdx];
      let isNum = typeof val === 'number';

      if (!isNum && val !== null && val !== undefined && val !== '' && !isNaN(Number(val)) && (cat === 'currency' || cat === 'qty' || cat === 'percent')) {
        val = Number(val);
        isNum = true;
      }

      cell.value = val !== undefined && val !== null ? val : '';
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: brandDark } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = totalBorder;

      if (cat === 'currency') {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if (isNum) cell.numFmt = '"Rs. " #,##0.00';
      } else if (cat === 'qty') {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if (isNum) cell.numFmt = '#,##0';
      } else if (cat === 'percent') {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if (isNum) cell.numFmt = '0.0"%"';
      } else if (cat === 'center') {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: (cIdx === 0 || String(val).toUpperCase().includes('TOTAL') ? 'left' : 'center'), vertical: 'middle' };
      }
    });

    currentRowIdx++;
  }

  // Precise Auto Column Widths Calculation (using formatted display lengths to prevent ###)
  headers.forEach((h, cIdx) => {
    const cat = getColumnCategory(h);
    let maxLen = String(h).length;

    rows.forEach(r => {
      const vals = Array.isArray(r) ? r : Object.values(r);
      const val = vals[cIdx];
      let strLen = 0;
      if (val !== null && val !== undefined) {
        if (typeof val === 'number') {
          if (cat === 'currency') strLen = formatMoney(val).length;
          else if (cat === 'qty') strLen = formatNumber(val, 0).length;
          else if (cat === 'percent') strLen = `${val.toFixed(1)}%`.length;
          else strLen = String(val).length;
        } else {
          strLen = String(val).length;
        }
      }
      if (strLen > maxLen) maxLen = strLen;
    });

    if (totals && totals[cIdx] !== undefined && totals[cIdx] !== null) {
      const tVal = totals[cIdx];
      let tLen = 0;
      if (typeof tVal === 'number') {
        if (cat === 'currency') tLen = formatMoney(tVal).length;
        else if (cat === 'qty') tLen = formatNumber(tVal, 0).length;
        else tLen = String(tVal).length;
      } else {
        tLen = String(tVal).length;
      }
      if (tLen > maxLen) maxLen = tLen;
    }

    let colWidth = maxLen + 4;
    if (cat === 'currency') colWidth = Math.max(colWidth, 16);
    else if (cat === 'qty') colWidth = Math.max(colWidth, 12);
    else if (cat === 'center') colWidth = Math.max(colWidth, 11);
    else colWidth = Math.max(colWidth, 14);

    ws.getColumn(cIdx + 1).width = Math.min(colWidth, 48);
  });

  await wb.xlsx.writeFile(filePath);
  return { success: true, filePath };
}

/**
 * Universal CSV Exporter
 */
async function exportCSV(payload = {}, parentWindow) {
  if (Array.isArray(payload.headers) && Array.isArray(payload.rows)) {
    return exportGenericReportCSV(payload, parentWindow);
  }

  // Legacy fallback
  const { items = [] } = payload;
  const defaultFilename = `Shahzaib_Traders_Inventory_${new Date().toISOString().split('T')[0]}.csv`;

  const { filePath, canceled } = await dialog.showSaveDialog(parentWindow, {
    title: 'Export Inventory as CSV',
    defaultPath: defaultFilename,
    filters: [{ name: 'CSV Files (*.csv)', extensions: ['csv'] }]
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

/**
 * Universal Business Report CSV Exporter
 * Writes clean UTF-8 with BOM and raw numeric amounts without commas or currency prefixes
 */
async function exportGenericReportCSV(payload, parentWindow) {
  const title = payload.title || 'Business Report';
  const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_');
  const defaultFilename = payload.filename || `Shahzaib_Traders_${safeTitle}_${new Date().toISOString().split('T')[0]}.csv`;

  const { filePath, canceled } = await dialog.showSaveDialog(parentWindow, {
    title: `Export ${title} as CSV File`,
    defaultPath: defaultFilename,
    filters: [{ name: 'CSV Files (*.csv)', extensions: ['csv'] }]
  });

  if (canceled || !filePath) {
    return { success: false, cancelled: true };
  }

  const headers = payload.headers || [];
  const rows = payload.rows || [];
  const totals = payload.totals || null;

  let csvContent = '\uFEFF'; // UTF-8 BOM

  // Header Row
  csvContent += headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',') + '\r\n';

  // Data Rows
  rows.forEach(r => {
    const vals = Array.isArray(r) ? r : Object.values(r);
    const rowCsv = headers.map((_h, cIdx) => {
      const val = vals[cIdx];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'number') return isNaN(val) ? '0' : String(val);
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvContent += rowCsv.join(',') + '\r\n';
  });

  // Totals Row
  if (Array.isArray(totals) && totals.length > 0) {
    const totalsCsv = headers.map((_h, cIdx) => {
      const val = totals[cIdx];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'number') return isNaN(val) ? '0' : String(val);
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvContent += totalsCsv.join(',') + '\r\n';
  }

  fs.writeFileSync(filePath, csvContent, 'utf-8');
  return { success: true, filePath };
}

module.exports = {
  exportPDF,
  exportExcel,
  exportCSV,
  exportGenericReportPDF,
  exportGenericReportExcel,
  exportGenericReportCSV,
  getColumnCategory,
  cleanText,
  formatMoney,
  formatNumber,
  formatDate,
  formatPKR
};
