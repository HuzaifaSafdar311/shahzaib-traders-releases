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
 * Export Inventory Report as Clean & Simple PDF (Matching Frontend Table)
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

  // Calculate totals for simple bottom row
  let totalStock = 0;
  let totalSell = 0;

  const tableRowsHtml = items.map(item => {
    const qty = Number(item.quantity) || 0;
    const sell = Number(item.totalSell) || 0;
    const wsPrice = Number(item.wholesalePrice) || 0;
    const indPrice = Number(item.individualPrice) || 0;

    totalStock += qty;
    totalSell += sell;

    return `
      <tr>
        <td class="col-stock">${escapeHtml(item.stockName)}</td>
        <td class="col-vendor">${escapeHtml(item.vendorName || 'N/A')}</td>
        <td class="col-qty text-center">${qty.toLocaleString()}</td>
        <td class="col-sell text-center">${sell.toLocaleString()}</td>
        <td class="col-price text-right">${formatPKR(wsPrice)}</td>
        <td class="col-price text-right">${formatPKR(indPrice)}</td>
        <td class="col-date text-center">${escapeHtml(item.date || '')}</td>
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
          margin: 14mm 14mm 14mm 14mm;
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

        /* Clean Top Header */
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 14px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 16px;
        }
        .header-logo {
          height: 38px;
          object-fit: contain;
          display: block;
        }
        .header-info {
          text-align: right;
        }
        .report-title {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 2px;
        }
        .report-date {
          font-size: 11px;
          color: #64748b;
        }

        /* Simple Clean Data Table Matching Frontend */
        .table-container {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10.5px;
        }
        thead th {
          background-color: #f8fafc;
          color: #475569;
          font-weight: 600;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          padding: 9px 10px;
          border-bottom: 1px solid #e2e8f0;
          border-right: 1px solid #f1f5f9;
        }
        thead th:last-child {
          border-right: none;
        }
        tbody tr {
          border-bottom: 1px solid #f1f5f9;
        }
        tbody tr:nth-child(even) {
          background-color: #fafbfd;
        }
        tbody td {
          padding: 8px 10px;
          border-right: 1px solid #f1f5f9;
          vertical-align: middle;
          color: #1e293b;
        }
        tbody td:last-child {
          border-right: none;
        }
        .col-stock {
          font-weight: 600;
          color: #0f172a;
        }
        .col-vendor {
          color: #475569;
        }

        /* Simple Bottom Total Row */
        tfoot tr {
          background-color: #f8fafc;
          border-top: 1.5px solid #cbd5e1;
          font-weight: 700;
        }
        tfoot td {
          padding: 9px 10px;
          color: #0f172a;
          border-right: 1px solid #f1f5f9;
        }
        tfoot td:last-child {
          border-right: none;
        }

        .text-center { text-align: center; }
        .text-right { text-align: right; }
      </style>
    </head>
    <body>
      <header class="page-header">
        ${logoBase64 ? `<img src="${logoBase64}" alt="Shahzaib Traders" class="header-logo">` : '<h2 style="font-size: 16px; font-weight: 700;">Shahzaib Traders</h2>'}
        <div class="header-info">
          <div class="report-title">Inventory Report</div>
          <div class="report-date">Date: ${escapeHtml(dateStr)}</div>
        </div>
      </header>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="text-align: left;">Stock Name</th>
              <th style="text-align: left;">Vendor</th>
              <th style="width: 80px;" class="text-center">Total Stock</th>
              <th style="width: 75px;" class="text-center">Total Sell</th>
              <th style="width: 125px;" class="text-right">Wholesale</th>
              <th style="width: 125px;" class="text-right">Individual</th>
              <th style="width: 85px;" class="text-center">Date</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml || '<tr><td colspan="7" class="text-center" style="padding: 24px; color: #94a3b8;">No records found</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="text-align: left; font-weight: 700;">Total</td>
              <td class="text-center">${totalStock.toLocaleString()}</td>
              <td class="text-center">${totalSell.toLocaleString()}</td>
              <td colspan="3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
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
  await new Promise(r => setTimeout(r, 180));

  const pdfBuffer = await printWin.webContents.printToPDF({
    pageSize: 'A4',
    landscape: false,
    printBackground: true,
    margins: {
      top: 0.4,
      bottom: 0.4,
      left: 0.4,
      right: 0.4
    }
  });

  printWin.close();
  fs.writeFileSync(filePath, pdfBuffer);
  return { success: true, filePath };
}

/**
 * Export Inventory Report as Simple Clean Excel Spreadsheet (.xlsx)
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

  const ws = wb.addWorksheet('Inventory', {
    views: [{ showGridLines: true }]
  });

  const dateStr = summary.dateGenerated || new Date().toISOString().split('T')[0];

  // Simple Header
  ws.getCell('A1').value = 'Shahzaib Traders - Inventory Report';
  ws.getCell('A1').font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF0F172A' } };

  ws.getCell('A2').value = `Date: ${dateStr}`;
  ws.getCell('A2').font = { name: 'Arial', size: 9.5, color: { argb: 'FF64748B' } };

  ws.getRow(1).height = 22;
  ws.getRow(2).height = 16;
  ws.getRow(3).height = 10;

  // Table Column Headers (Row 4) matching frontend
  const headers = [
    'Stock Name',
    'Vendor',
    'Total Stock',
    'Total Sell',
    'Wholesale (PKR)',
    'Individual (PKR)',
    'Date'
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
    cell.alignment = { horizontal: (idx === 0 || idx === 1) ? 'left' : (idx === 4 || idx === 5) ? 'right' : 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });

  // Data Rows
  let currentRow = 5;
  let totalStock = 0;
  let totalSell = 0;

  items.forEach((item, idx) => {
    const row = ws.getRow(currentRow);
    row.height = 20;

    const qty = Number(item.quantity) || 0;
    const sell = Number(item.totalSell) || 0;
    const wsPrice = Number(item.wholesalePrice) || 0;
    const indPrice = Number(item.individualPrice) || 0;

    totalStock += qty;
    totalSell += sell;

    row.getCell(1).value = item.stockName || '';
    row.getCell(2).value = item.vendorName || 'N/A';
    row.getCell(3).value = qty;
    row.getCell(4).value = sell;
    row.getCell(5).value = wsPrice;
    row.getCell(6).value = indPrice;
    row.getCell(7).value = item.date || '';

    row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(3).numFmt = '#,##0';
    row.getCell(4).numFmt = '#,##0';
    row.getCell(5).numFmt = '"PKR " #,##0.00';
    row.getCell(6).numFmt = '"PKR " #,##0.00';

    const bg = (idx % 2 === 1) ? 'FFFAFAFA' : 'FFFFFFFF';
    for (let c = 1; c <= 7; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 9.5 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = thinBorder;
    }

    currentRow++;
  });

  // Total Bottom Row
  const totalRow = ws.getRow(currentRow);
  totalRow.height = 22;

  totalRow.getCell(1).value = 'Total';
  totalRow.getCell(2).value = '';
  totalRow.getCell(3).value = totalStock;
  totalRow.getCell(4).value = totalSell;
  totalRow.getCell(5).value = '';
  totalRow.getCell(6).value = '';
  totalRow.getCell(7).value = '';

  totalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  totalRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
  totalRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

  totalRow.getCell(3).numFmt = '#,##0';
  totalRow.getCell(4).numFmt = '#,##0';

  for (let c = 1; c <= 7; c++) {
    const cell = totalRow.getCell(c);
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    cell.border = thinBorder;
  }

  // Column Widths
  const widths = [28, 24, 14, 14, 20, 20, 14];
  widths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });

  await wb.xlsx.writeFile(filePath);
  return { success: true, filePath };
}

/**
 * Export Inventory Report as Clean CSV
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
  csvContent += 'Stock Name,Vendor,Total Stock,Total Sell,Wholesale (PKR),Individual (PKR),Date\r\n';

  let totalStock = 0;
  let totalSell = 0;

  items.forEach(item => {
    const qty = Number(item.quantity) || 0;
    const sell = Number(item.totalSell) || 0;
    const wp = Number(item.wholesalePrice) || 0;
    const ip = Number(item.individualPrice) || 0;

    totalStock += qty;
    totalSell += sell;

    const row = [
      `"${(item.stockName || '').replace(/"/g, '""')}"`,
      `"${(item.vendorName || '').replace(/"/g, '""')}"`,
      qty,
      sell,
      wp.toFixed(2),
      ip.toFixed(2),
      `"${item.date || ''}"`
    ];
    csvContent += row.join(',') + '\r\n';
  });

  csvContent += `Total,,${totalStock},${totalSell},,,\r\n`;

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
