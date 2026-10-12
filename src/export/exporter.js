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

  await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

  const pdfBuffer = await printWin.webContents.printToPDF({
    pageSize: 'A4',
    landscape: false,
    printBackground: true,
    margins: { top: 0.3, bottom: 0.3, left: 0.3, right: 0.3 }
  });

  printWin.close();
  fs.writeFileSync(filePath, pdfBuffer);
  return { success: true, filePath };
}

/**
 * Export Product Catalog as Excel Spreadsheet (.xlsx)
 */
async function exportExcel({ items = [], summary = {} }, parentWindow) {
  const defaultFilename = `Shahzaib_Traders_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`;

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
