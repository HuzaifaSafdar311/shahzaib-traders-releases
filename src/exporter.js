const { BrowserWindow, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

/**
 * Read the company full logo and return base64 URI
 */
function getLogoBase64() {
  try {
    const logoPath = path.join(__dirname, 'full-logo.png');
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
 * Export Inventory Report as Pixel-Perfect Styled PDF
 */
async function exportPDF({ items = [], summary = {} }, parentWindow) {
  const defaultFilename = `Shahzaib_Traders_Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`;

  const { filePath, canceled } = await dialog.showSaveDialog(parentWindow, {
    title: 'Export Inventory as PDF',
    defaultPath: defaultFilename,
    filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
  });

  if (canceled || !filePath) {
    return { success: false, cancelled: true };
  }

  const logoBase64 = getLogoBase64();
  const dateStr = summary.dateGenerated || new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = summary.timeGenerated || new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

  // Calculate totals
  let totalQty = 0;
  let totalSell = 0;
  let totalWholesaleVal = 0;
  let totalIndividualVal = 0;

  const tableRowsHtml = items.map((item, idx) => {
    const qty = Number(item.quantity) || 0;
    const sell = Number(item.totalSell) || 0;
    const wsPrice = Number(item.wholesalePrice) || 0;
    const indPrice = Number(item.individualPrice) || 0;
    const totalWs = qty * wsPrice;
    const totalInd = qty * indPrice;

    totalQty += qty;
    totalSell += sell;
    totalWholesaleVal += totalWs;
    totalIndividualVal += totalInd;

    return `
      <tr>
        <td class="text-center font-mono text-muted">${idx + 1}</td>
        <td class="font-bold text-dark">${escapeHtml(item.stockName)}</td>
        <td><span class="badge-vendor">${escapeHtml(item.vendorName || 'N/A')}</span></td>
        <td class="text-center font-mono font-bold">${qty.toLocaleString()}</td>
        <td class="text-center font-mono text-muted">${sell.toLocaleString()}</td>
        <td class="text-right font-mono">${formatPKR(wsPrice)}</td>
        <td class="text-right font-mono">${formatPKR(indPrice)}</td>
        <td class="text-right font-mono font-bold text-primary">${formatPKR(totalWs)}</td>
        <td class="text-right font-mono font-bold text-success">${formatPKR(totalInd)}</td>
        <td class="text-center font-mono text-muted">${escapeHtml(item.date || '')}</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Shahzaib Traders - Inventory Report</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 10mm 12mm 10mm 12mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #1e293b;
          background-color: #ffffff;
          font-size: 11px;
          line-height: 1.4;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .report-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 14px;
          border-bottom: 2px solid #e2e8f0;
          margin-bottom: 14px;
        }
        .header-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .brand-logo-img {
          height: 44px;
          max-width: 170px;
          object-fit: contain;
        }
        .brand-title-group h1 {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.3px;
          margin: 0;
        }
        .brand-title-group p {
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
          margin-top: 2px;
        }
        .header-meta {
          text-align: right;
        }
        .meta-pill {
          display: inline-block;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #334155;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          margin-bottom: 4px;
        }
        .meta-date {
          font-size: 11px;
          color: #475569;
          font-weight: 600;
        }

        /* KPI Summary Grid */
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .summary-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 12px;
        }
        .summary-card-label {
          font-size: 9.5px;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: #64748b;
          margin-bottom: 4px;
        }
        .summary-card-value {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
        }
        .summary-card-value.highlight-blue {
          color: #2563eb;
        }
        .summary-card-value.highlight-green {
          color: #16a34a;
        }

        /* Inventory Table */
        .table-wrap {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          overflow: hidden;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }
        thead th {
          background-color: #f1f5f9;
          color: #334155;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          font-size: 9.5px;
          padding: 8px 7px;
          border-bottom: 2px solid #cbd5e1;
          border-right: 1px solid #e2e8f0;
        }
        thead th:last-child {
          border-right: none;
        }
        tbody tr {
          border-bottom: 1px solid #e2e8f0;
        }
        tbody tr:nth-child(even) {
          background-color: #f8fafc;
        }
        tbody td {
          padding: 6px 7px;
          border-right: 1px solid #e2e8f0;
          vertical-align: middle;
        }
        tbody td:last-child {
          border-right: none;
        }
        tfoot tr {
          background-color: #e2e8f0;
          font-weight: 800;
          border-top: 2px solid #94a3b8;
        }
        tfoot td {
          padding: 8px 7px;
          font-size: 10.5px;
          color: #0f172a;
          border-right: 1px solid #cbd5e1;
        }
        tfoot td:last-child {
          border-right: none;
        }

        /* Utilities */
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .font-bold { font-weight: 700; }
        .text-dark { color: #0f172a; }
        .text-muted { color: #64748b; }
        .text-primary { color: #1e40af; }
        .text-success { color: #15803d; }
        .badge-vendor {
          display: inline-block;
          background: #e2e8f0;
          color: #1e293b;
          font-weight: 600;
          font-size: 9.5px;
          padding: 2px 6px;
          border-radius: 4px;
        }

        /* Footer Note */
        .report-footer {
          margin-top: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 9.5px;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
        }
      </style>
    </head>
    <body>
      <header class="report-header">
        <div class="header-brand">
          ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="brand-logo-img">` : ''}
          <div class="brand-title-group">
            <h1>SHAHZAIB TRADERS</h1>
            <p>Inventory Valuation & Stock Management Report</p>
          </div>
        </div>
        <div class="header-meta">
          <div class="meta-pill">OFFICIAL REPORT</div>
          <div class="meta-date">Generated: ${dateStr} • ${timeStr}</div>
        </div>
      </header>

      <!-- KPI Summary Cards -->
      <section class="summary-grid">
        <div class="summary-card">
          <div class="summary-card-label">Total Stock Items</div>
          <div class="summary-card-value">${items.length.toLocaleString()} Items</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Total Stock Units</div>
          <div class="summary-card-value">${totalQty.toLocaleString()} Pcs</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Total Wholesale Valuation</div>
          <div class="summary-card-value highlight-blue">${formatPKR(totalWholesaleVal)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Total Individual Valuation</div>
          <div class="summary-card-value highlight-green">${formatPKR(totalIndividualVal)}</div>
        </div>
      </section>

      <!-- Inventory Table -->
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width: 28px;">#</th>
              <th>Stock Name</th>
              <th>Vendor</th>
              <th style="width: 70px;">Total Stock</th>
              <th style="width: 65px;">Total Sell</th>
              <th style="width: 105px;">Wholesale (PKR)</th>
              <th style="width: 105px;">Individual (PKR)</th>
              <th style="width: 115px;">Total Wholesale</th>
              <th style="width: 115px;">Total Individual</th>
              <th style="width: 80px;">Date</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml || '<tr><td colspan="10" class="text-center" style="padding: 24px; color: #94a3b8;">No inventory items found</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" class="text-center font-bold">TOTALS</td>
              <td class="text-center font-mono font-bold">${totalQty.toLocaleString()}</td>
              <td class="text-center font-mono text-muted">${totalSell.toLocaleString()}</td>
              <td colspan="2" class="text-center text-muted">-</td>
              <td class="text-right font-mono font-bold text-primary">${formatPKR(totalWholesaleVal)}</td>
              <td class="text-right font-mono font-bold text-success">${formatPKR(totalIndividualVal)}</td>
              <td class="text-center text-muted">-</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <footer class="report-footer">
        <span>Shahzaib Traders Inventory Management System • Confidential Business Document</span>
        <span>Generated automatically on ${dateStr}</span>
      </footer>
    </body>
    </html>
  `;

  const printWin = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

  // Small delay to ensure styles and fonts render completely
  await new Promise(r => setTimeout(r, 200));

  const pdfBuffer = await printWin.webContents.printToPDF({
    pageSize: 'A4',
    landscape: true,
    printBackground: true,
    margins: {
      top: 0.35,
      bottom: 0.35,
      left: 0.35,
      right: 0.35
    }
  });

  printWin.close();
  fs.writeFileSync(filePath, pdfBuffer);
  return { success: true, filePath };
}

/**
 * Export Inventory Report as Professionally Styled Excel Workbook (.xlsx)
 */
async function exportExcel({ items = [], summary = {} }, parentWindow) {
  const defaultFilename = `Shahzaib_Traders_Inventory_Report_${new Date().toISOString().split('T')[0]}.xlsx`;

  const { filePath, canceled } = await dialog.showSaveDialog(parentWindow, {
    title: 'Export Inventory as Excel',
    defaultPath: defaultFilename,
    filters: [{ name: 'Excel Spreadsheets', extensions: ['xlsx'] }]
  });

  if (canceled || !filePath) {
    return { success: false, cancelled: true };
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Shahzaib Traders';
  wb.created = new Date();

  const ws = wb.addWorksheet('Inventory Report', {
    views: [{ showGridLines: true }],
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      paperSize: 9
    }
  });

  const dateStr = summary.dateGenerated || new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = summary.timeGenerated || new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

  // 1. Title Banner
  ws.mergeCells('A1:J1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'SHAHZAIB TRADERS - INVENTORY STOCK REPORT';
  titleCell.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 36;

  // 2. Subtitle Meta
  ws.mergeCells('A2:J2');
  const metaCell = ws.getCell('A2');
  metaCell.value = `Generated on: ${dateStr} at ${timeStr}  |  Currency: PKR  |  Confidential Business Document`;
  metaCell.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF94A3B8' } };
  metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;

  // 3. Spacing
  ws.getRow(3).height = 10;

  // 4. KPI Summary Blocks
  let totalQty = 0;
  let totalSell = 0;
  let totalWsVal = 0;
  let totalIndVal = 0;

  items.forEach(i => {
    const q = Number(i.quantity) || 0;
    const s = Number(i.totalSell) || 0;
    const wp = Number(i.wholesalePrice) || 0;
    const ip = Number(i.individualPrice) || 0;
    totalQty += q;
    totalSell += s;
    totalWsVal += q * wp;
    totalIndVal += q * ip;
  });

  ws.mergeCells('A4:B4');
  ws.getCell('A4').value = `Total Items: ${items.length}`;
  ws.mergeCells('C4:D4');
  ws.getCell('C4').value = `Total Stock Units: ${totalQty.toLocaleString()}`;
  ws.mergeCells('E4:G4');
  ws.getCell('E4').value = `Total Wholesale: PKR ${totalWsVal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
  ws.mergeCells('H4:J4');
  ws.getCell('H4').value = `Total Individual: PKR ${totalIndVal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

  ['A4', 'C4', 'E4', 'H4'].forEach(c => {
    const cell = ws.getCell(c);
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };

  for (let c = 1; c <= 10; c++) {
    ws.getRow(4).getCell(c).border = thinBorder;
  }
  ws.getRow(4).height = 24;

  // 5. Spacing
  ws.getRow(5).height = 10;

  // 6. Column Headers
  const headers = [
    '#',
    'Stock Name',
    'Vendor',
    'Total Stock',
    'Total Sell',
    'Wholesale Price (PKR)',
    'Individual Price (PKR)',
    'Total Wholesale (PKR)',
    'Total Individual (PKR)',
    'Date'
  ];

  const headerRow = ws.getRow(6);
  headerRow.height = 28;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });

  // 7. Data Rows
  let currentRowIdx = 7;
  items.forEach((item, idx) => {
    const row = ws.getRow(currentRowIdx);
    row.height = 22;

    const qty = Number(item.quantity) || 0;
    const sell = Number(item.totalSell) || 0;
    const wsPrice = Number(item.wholesalePrice) || 0;
    const indPrice = Number(item.individualPrice) || 0;
    const totalWs = qty * wsPrice;
    const totalInd = qty * indPrice;

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = item.stockName || '';
    row.getCell(3).value = item.vendorName || 'N/A';
    row.getCell(4).value = qty;
    row.getCell(5).value = sell;
    row.getCell(6).value = wsPrice;
    row.getCell(7).value = indPrice;
    row.getCell(8).value = totalWs;
    row.getCell(9).value = totalInd;
    row.getCell(10).value = item.date || '';

    // Alignments & Number Formats
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(4).numFmt = '#,##0';
    row.getCell(5).numFmt = '#,##0';
    row.getCell(6).numFmt = '"PKR " #,##0.00';
    row.getCell(7).numFmt = '"PKR " #,##0.00';
    row.getCell(8).numFmt = '"PKR " #,##0.00';
    row.getCell(9).numFmt = '"PKR " #,##0.00';

    const isEven = (idx % 2 === 1);
    const rowBg = isEven ? 'FFF8FAFC' : 'FFFFFFFF';

    for (let c = 1; c <= 10; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 9.5 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.border = thinBorder;
    }

    currentRowIdx++;
  });

  // 8. Totals Row
  const totalRow = ws.getRow(currentRowIdx);
  totalRow.height = 26;

  ws.mergeCells(`A${currentRowIdx}:C${currentRowIdx}`);
  totalRow.getCell(1).value = 'TOTALS';
  totalRow.getCell(4).value = totalQty;
  totalRow.getCell(5).value = totalSell;
  totalRow.getCell(6).value = '-';
  totalRow.getCell(7).value = '-';
  totalRow.getCell(8).value = totalWsVal;
  totalRow.getCell(9).value = totalIndVal;
  totalRow.getCell(10).value = '-';

  totalRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  totalRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
  totalRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
  totalRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
  totalRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
  totalRow.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };

  totalRow.getCell(4).numFmt = '#,##0';
  totalRow.getCell(5).numFmt = '#,##0';
  totalRow.getCell(8).numFmt = '"PKR " #,##0.00';
  totalRow.getCell(9).numFmt = '"PKR " #,##0.00';

  const doubleBorder = {
    top: { style: 'thin', color: { argb: 'FF94A3B8' } },
    left: { style: 'thin', color: { argb: 'FF94A3B8' } },
    bottom: { style: 'double', color: { argb: 'FF0F172A' } },
    right: { style: 'thin', color: { argb: 'FF94A3B8' } }
  };

  for (let c = 1; c <= 10; c++) {
    const cell = totalRow.getCell(c);
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = doubleBorder;
  }

  // 9. Auto-fit column widths with breathing padding
  const colWidths = [6, 26, 24, 14, 14, 22, 22, 24, 24, 14];
  colWidths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });

  await wb.xlsx.writeFile(filePath);
  return { success: true, filePath };
}

/**
 * Export Inventory Report as UTF-8 CSV
 */
async function exportCSV({ items = [] }, parentWindow) {
  const defaultFilename = `Shahzaib_Traders_Inventory_Report_${new Date().toISOString().split('T')[0]}.csv`;

  const { filePath, canceled } = await dialog.showSaveDialog(parentWindow, {
    title: 'Export Inventory as CSV',
    defaultPath: defaultFilename,
    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  });

  if (canceled || !filePath) {
    return { success: false, cancelled: true };
  }

  let csvContent = '\uFEFF'; // UTF-8 BOM
  csvContent += '#,Stock Name,Vendor,Total Stock,Total Sell,Wholesale Price (PKR),Individual Price (PKR),Total Wholesale (PKR),Total Individual (PKR),Date\r\n';

  let totalQty = 0;
  let totalSell = 0;
  let totalWs = 0;
  let totalInd = 0;

  items.forEach((item, idx) => {
    const qty = Number(item.quantity) || 0;
    const sell = Number(item.totalSell) || 0;
    const wp = Number(item.wholesalePrice) || 0;
    const ip = Number(item.individualPrice) || 0;
    const tw = qty * wp;
    const ti = qty * ip;

    totalQty += qty;
    totalSell += sell;
    totalWs += tw;
    totalInd += ti;

    const row = [
      idx + 1,
      `"${(item.stockName || '').replace(/"/g, '""')}"`,
      `"${(item.vendorName || '').replace(/"/g, '""')}"`,
      qty,
      sell,
      wp.toFixed(2),
      ip.toFixed(2),
      tw.toFixed(2),
      ti.toFixed(2),
      `"${item.date || ''}"`
    ];
    csvContent += row.join(',') + '\r\n';
  });

  // Totals Row
  csvContent += `TOTALS,-,-,${totalQty},${totalSell},-,-,${totalWs.toFixed(2)},${totalInd.toFixed(2)},-\r\n`;

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
