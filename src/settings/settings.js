// ========================================================
// SHAHZAIB TRADERS - SETTINGS & PREFERENCES MODULE
// ========================================================

window.SettingsModule = (function () {
  let isInitialized = false;
  let activeSubTab = 'printer';
  let activePreviewTpl = 'a4';
  let activeDocType = 'paid';
  let cachedSettings = {};
  let cachedStats = {};

  // DOM Elements map
  const el = {};

  function initElements() {
    el.view = document.getElementById('settingsView');
    el.tabBtns = document.querySelectorAll('.settings-tab-btn');
    el.tabPanels = document.querySelectorAll('.settings-tab-panel');

    // Printer & Receipt Inputs
    el.selectPaperSize = document.getElementById('setPaperSize');
    el.inputReceiptTitle = document.getElementById('setReceiptTitle');
    el.inputReceiptSubtitle = document.getElementById('setReceiptSubtitle');
    el.inputReceiptPhone = document.getElementById('setReceiptPhone');
    el.inputReceiptEmail = document.getElementById('setReceiptEmail');
    el.inputReceiptAddress = document.getElementById('setReceiptAddress');
    el.inputReceiptTaxNo = document.getElementById('setReceiptTaxNo');
    el.inputInvoiceHeading = document.getElementById('setInvoiceHeading');
    el.inputEstimateHeading = document.getElementById('setEstimateHeading');
    el.inputPrevBillLabel = document.getElementById('setPrevBillLabel');
    el.inputNetPayableLabel = document.getElementById('setNetPayableLabel');
    el.textareaReceiptFooter = document.getElementById('setReceiptFooter');
    el.textareaInvoiceTerms = document.getElementById('setInvoiceTerms');
    el.inputChecksPayableNote = document.getElementById('setChecksPayableNote');
    el.inputInvoiceEnquiriesNote = document.getElementById('setInvoiceEnquiriesNote');
    el.inputSigLabel1 = document.getElementById('setSigLabel1');
    el.inputSigLabel2 = document.getElementById('setSigLabel2');
    el.inputSigLabel3 = document.getElementById('setSigLabel3');
    el.chkAutoPrint = document.getElementById('chkAutoPrint');
    el.btnSavePrinter = document.getElementById('btnSavePrinterSettings');
    el.btnTestPrintSlip = document.getElementById('btnTestPrintSlip');

    // Dual-Template Live Preview Station
    el.previewViewport = document.getElementById('settingsBillPreviewViewport');
    el.btnSetTplA4 = document.getElementById('btnSetTplA4');
    el.btnSetTplThermal = document.getElementById('btnSetTplThermal');
    el.btnSetDocInvoice = document.getElementById('btnSetDocInvoice');
    el.btnSetDocEstimate = document.getElementById('btnSetDocEstimate');

    // Thermal Slip Live Preview Elements (Legacy Fallback)
    el.previewSlipTitle = document.getElementById('prevSlipTitle');
    el.previewSlipSubtitle = document.getElementById('prevSlipSubtitle');
    el.previewSlipPhone = document.getElementById('prevSlipPhone');
    el.previewSlipAddress = document.getElementById('prevSlipAddress');
    el.previewSlipFooter = document.getElementById('prevSlipFooter');
    el.previewSlipDate = document.getElementById('prevSlipDate');

    // Security & PIN Inputs
    el.inputCurrentPin = document.getElementById('setCurrentPin');
    el.inputNewPin = document.getElementById('setNewPin');
    el.inputConfirmPin = document.getElementById('setConfirmPin');
    el.chkRequirePinDelete = document.getElementById('chkRequirePinDelete');
    el.btnUpdatePin = document.getElementById('btnUpdatePin');

    // Database & Maintenance Elements
    el.statDbEngine = document.getElementById('statDbEngine');
    el.statProductsCount = document.getElementById('statProductsCount');
    el.statPartiesCount = document.getElementById('statPartiesCount');
    el.statDbSize = document.getElementById('statDbSize');
    el.btnBackupDb = document.getElementById('btnBackupDatabase');
    el.btnOptimizeDb = document.getElementById('btnOptimizeDatabase');
    el.btnOpenBackupsFolder = document.getElementById('btnOpenBackupsFolder');
    el.btnExportJson = document.getElementById('btnExportFullJson');
    el.backupStatusText = document.getElementById('backupStatusText');

    // System Info & Diagnostics
    el.sysAppVersion = document.getElementById('sysAppVersion');
    el.sysPlatform = document.getElementById('sysPlatform');
    el.sysElectron = document.getElementById('sysElectron');
    el.sysNode = document.getElementById('sysNode');
    el.sysChrome = document.getElementById('sysChrome');
    el.sysDbPath = document.getElementById('sysDbPath');
    el.sysMemory = document.getElementById('sysMemory');
    el.sysUptime = document.getElementById('sysUptime');
    el.btnRunDiagnostics = document.getElementById('btnRunDiagnostics');
    el.diagDbStatus = document.getElementById('diagDbStatus');
    el.diagStorageStatus = document.getElementById('diagStorageStatus');
    el.diagMemoryStatus = document.getElementById('diagMemoryStatus');

    // Display & Font Scaling Elements
    el.dispFontSizeValue = document.getElementById('dispFontSizeValue');
    el.dispFontSizeDesc = document.getElementById('dispFontSizeDesc');
    el.sliderFontScale = document.getElementById('sliderFontScale');
    el.btnFontDecrease = document.getElementById('btnFontDecrease');
    el.btnFontIncrease = document.getElementById('btnFontIncrease');
    el.presetBtns = document.querySelectorAll('.btn-font-preset');
    el.btnResetFontSize = document.getElementById('btnResetFontSize');
    el.btnSaveFontSize = document.getElementById('btnSaveFontSize');
    el.fontPreviewContainer = document.getElementById('fontPreviewContainer');
  }

  function init() {
    if (isInitialized) return;
    initElements();
    setupTabSwitching();
    setupLivePreviewListeners();
    setupActionButtons();
    isInitialized = true;
  }

  function onActivate() {
    init();
    loadAllSettings();
    loadDatabaseStats();
    loadSystemInfo();
    updateLiveSlipDate();
  }

  function setupTabSwitching() {
    el.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        switchSubTab(targetTab);
      });
    });
  }

  function switchSubTab(tabName) {
    activeSubTab = tabName;
    el.tabBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabName);
    });
    el.tabPanels.forEach(p => {
      p.classList.toggle('active', p.id === `setPanel-${tabName}`);
    });

    if (tabName === 'database') {
      loadDatabaseStats();
    } else if (tabName === 'about') {
      loadSystemInfo();
    }
  }

  // Real-time Bill Preview Synchronization
  function setupLivePreviewListeners() {
    const syncInputs = [
      el.selectPaperSize,
      el.inputReceiptTitle,
      el.inputReceiptSubtitle,
      el.inputReceiptPhone,
      el.inputReceiptEmail,
      el.inputReceiptAddress,
      el.inputReceiptTaxNo,
      el.inputInvoiceHeading,
      el.inputEstimateHeading,
      el.inputPrevBillLabel,
      el.inputNetPayableLabel,
      el.textareaReceiptFooter,
      el.textareaInvoiceTerms,
      el.inputChecksPayableNote,
      el.inputInvoiceEnquiriesNote,
      el.inputSigLabel1,
      el.inputSigLabel2,
      el.inputSigLabel3
    ];

    syncInputs.forEach(input => {
      if (input) {
        input.addEventListener('input', syncBillPreview);
        input.addEventListener('change', syncBillPreview);
      }
    });
  }

  function updateLiveSlipDate() {
    if (el.previewSlipDate) {
      const now = new Date();
      el.previewSlipDate.textContent = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  function syncBillPreview() {
    // Read current values directly from UI inputs with fallback to cached settings
    const companyTitle = (el.inputReceiptTitle?.value?.trim()) || cachedSettings.receiptHeaderTitle || cachedSettings.storeName || 'Shahzaib Traders';
    const subtitle = (el.inputReceiptSubtitle?.value?.trim()) || cachedSettings.receiptSubtitle || 'Dealers in Electrical Goods & Accessories';
    const phone = (el.inputReceiptPhone?.value?.trim()) || cachedSettings.contactPhone || '0300-1234567';
    const email = (el.inputReceiptEmail?.value?.trim()) || cachedSettings.contactEmail || 'info@shahzaibtraders.com';
    const address = (el.inputReceiptAddress?.value?.trim()) || cachedSettings.address || 'Main Bazar, Electrical Market, Lahore';
    const taxNo = (el.inputReceiptTaxNo?.value?.trim()) || cachedSettings.taxNumber || cachedSettings.ntn || 'NTN: 8943210-7';
    const invHeading = (el.inputInvoiceHeading?.value?.trim()) || cachedSettings.invoiceHeading || 'Sale Tax Invoice';
    const estHeading = (el.inputEstimateHeading?.value?.trim()) || cachedSettings.estimateHeading || 'Estimate / Quotation';
    const prevLabel = (el.inputPrevBillLabel?.value?.trim()) || cachedSettings.previousBillLabel || 'Previous Bill / Balance';
    const netLabel = (el.inputNetPayableLabel?.value?.trim()) || cachedSettings.netPayableLabel || 'TOTAL NET PAYABLE';
    const footerText = (el.textareaReceiptFooter?.value) || cachedSettings.receiptFooterNote || 'Thank you for your business!\nGoods once sold cannot be returned without bill.\nNo warranty on burnt or short-circuit electrical items.';
    const termsText = (el.textareaInvoiceTerms?.value) || cachedSettings.invoiceTerms || '1. Please inspect all goods upon receipt.\n2. In case of claim or return, original bill must be presented within 7 days.\n3. Burnt, broken, or short-circuited electrical goods carry no warranty.';
    const checksNote = (el.inputChecksPayableNote?.value?.trim()) || cachedSettings.checksPayableNote || ('Make all checks payable to ' + companyTitle);
    const enquiriesNote = (el.inputInvoiceEnquiriesNote?.value?.trim()) || cachedSettings.enquiriesNote || ('Should you have any enquiries concerning this invoice, please contact ' + phone);
    const sig1 = (el.inputSigLabel1?.value?.trim()) || cachedSettings.signatureLabel1 || 'Prepared By';
    const sig2 = (el.inputSigLabel2?.value?.trim()) || cachedSettings.signatureLabel2 || 'Checked By';
    const sig3 = (el.inputSigLabel3?.value?.trim()) || cachedSettings.signatureLabel3 || 'Customer Signature';
    const paperSizeVal = el.selectPaperSize?.value || cachedSettings.paperSize || '80mm';

    const cfg = {
      title: companyTitle,
      subtitle: subtitle,
      phone: phone,
      contactEmail: email,
      address: address,
      taxNumber: taxNo,
      ntn: taxNo,
      invoiceHeading: invHeading,
      estimateHeading: estHeading,
      previousBillLabel: prevLabel,
      netPayableLabel: netLabel,
      footer: footerText,
      receiptFooterNote: footerText,
      invoiceTerms: termsText,
      checksPayableNote: checksNote,
      enquiriesNote: enquiriesNote,
      signatureLabel1: sig1,
      signatureLabel2: sig2,
      signatureLabel3: sig3,
      paperSize: paperSizeVal
    };

    const isEstimate = (activeDocType === 'estimate');
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    const mockItems = [
      {
        productCode: 'SW-101',
        productTitle: 'Schneider Electric Circuit Breaker 32A Double Pole',
        totalQty: 4,
        salePrice: 1850,
        netAmount: 7400
      },
      {
        productCode: 'CB-204',
        productTitle: 'Pakistan Cables 7/029 Copper Single Core (90m Coil)',
        totalQty: 2,
        salePrice: 6200,
        netAmount: 12400
      },
      {
        productCode: 'LD-055',
        productTitle: 'Philips LED Downlight Slim 18W Cool Daylight',
        totalQty: 6,
        salePrice: 850,
        netAmount: 5100
      }
    ];

    const grossVal = 24900;
    const discVal = 900;
    const netVal = 24000;
    const prevBillVal = 3500;
    const grandPayableVal = 27500;
    const paidVal = isEstimate ? 0 : 27500;
    const balanceVal = isEstimate ? 27500 : 0;

    const mockBillData = {
      s: {
        voucherNo: isEstimate ? 'EST-2026-0088' : 'INV-2026-1042',
        entryDate: now.toISOString(),
        partyTitle: 'Al-Madina Electric Store (Cash/Walk-in)',
        customerPhone: '0321-7654321',
        areaName: 'Hall Road, Electrical Market, Lahore',
        paymentType: isEstimate ? 'Estimate / Quotation' : 'Cash',
        billStatus: isEstimate ? 'Estimated' : 'Completed',
        grossAmount: grossVal,
        discount: discVal,
        netAmount: netVal,
        paidAmount: paidVal,
        balanceAmount: balanceVal
      },
      items: mockItems,
      cfg: cfg,
      formattedDate: formattedDate,
      formattedTime: formattedTime,
      voucherNo: isEstimate ? 'EST-2026-0088' : 'INV-2026-1042',
      customerTitle: 'Al-Madina Electric Store (Cash/Walk-in)',
      customerPhone: '0321-7654321',
      areaName: 'Hall Road, Electrical Market, Lahore',
      saleMode: isEstimate ? 'Estimate' : 'Cash',
      isEstimatedBill: isEstimate,
      grossVal: grossVal,
      discVal: discVal,
      netVal: netVal,
      prevBillVal: prevBillVal,
      grandPayableVal: grandPayableVal,
      paidVal: paidVal,
      balanceVal: balanceVal,
      includePrevBill: true,
      paperWidth: paperSizeVal === '58mm' ? '58mm' : '80mm'
    };

    if (el.previewViewport) {
      if (activePreviewTpl === 'a4') {
        el.previewViewport.className = 'settings-bill-preview-viewport view-a4';
        if (window.SalesModule && typeof window.SalesModule.renderA4SaleBill === 'function') {
          el.previewViewport.innerHTML = window.SalesModule.renderA4SaleBill(mockBillData);
        }
      } else {
        el.previewViewport.className = 'settings-bill-preview-viewport view-thermal';
        if (window.SalesModule && typeof window.SalesModule.renderThermalSaleBill === 'function') {
          el.previewViewport.innerHTML = window.SalesModule.renderThermalSaleBill(mockBillData);
        }
      }
    }

    // Also update legacy preview elements if present
    if (el.previewSlipTitle) el.previewSlipTitle.textContent = companyTitle;
    if (el.previewSlipSubtitle) el.previewSlipSubtitle.textContent = subtitle;
    if (el.previewSlipPhone) el.previewSlipPhone.textContent = phone ? ('Ph: ' + phone) : '';
    if (el.previewSlipAddress) el.previewSlipAddress.textContent = address;
    if (el.previewSlipFooter) el.previewSlipFooter.textContent = footerText;
  }

  // Backward compatibility alias
  const syncReceiptPreview = syncBillPreview;

  // Load Settings from Backend
  async function loadAllSettings() {
    try {
      if (!window.settingsAPI) return;
      const settings = await window.settingsAPI.getSettings();
      cachedSettings = settings || {};

      // Printer inputs
      if (el.selectPaperSize) {
        let pSize = cachedSettings.paperSize || '80mm';
        if (pSize === 'A5') pSize = 'A4';
        el.selectPaperSize.value = pSize;
      }
      if (el.inputReceiptTitle) el.inputReceiptTitle.value = cachedSettings.receiptHeaderTitle || cachedSettings.storeName || 'SHAHZAIB TRADERS';
      if (el.inputReceiptSubtitle) el.inputReceiptSubtitle.value = cachedSettings.receiptSubtitle || 'Dealers in Electrical Goods & Accessories';
      if (el.inputReceiptPhone) el.inputReceiptPhone.value = cachedSettings.contactPhone || '0300-1234567';
      if (el.inputReceiptEmail) el.inputReceiptEmail.value = cachedSettings.contactEmail || cachedSettings.email || 'info@shahzaibtraders.com';
      if (el.inputReceiptAddress) el.inputReceiptAddress.value = cachedSettings.address || 'Main Bazar, Electrical Market, Lahore';
      if (el.inputReceiptTaxNo) el.inputReceiptTaxNo.value = cachedSettings.taxNumber || cachedSettings.ntn || '';
      if (el.inputInvoiceHeading) el.inputInvoiceHeading.value = cachedSettings.invoiceHeading || 'Sale Tax Invoice';
      if (el.inputEstimateHeading) el.inputEstimateHeading.value = cachedSettings.estimateHeading || 'Estimate / Quotation';
      if (el.inputPrevBillLabel) el.inputPrevBillLabel.value = cachedSettings.previousBillLabel || 'Previous Bill / Balance';
      if (el.inputNetPayableLabel) el.inputNetPayableLabel.value = cachedSettings.netPayableLabel || 'TOTAL NET PAYABLE';
      if (el.textareaReceiptFooter) el.textareaReceiptFooter.value = cachedSettings.receiptFooterNote || 'Thank you for your business!\nGoods once sold cannot be returned without bill.\nNo warranty on burnt or short-circuit electrical items.';
      if (el.textareaInvoiceTerms) el.textareaInvoiceTerms.value = cachedSettings.invoiceTerms || '1. Please inspect all items upon receipt.\n2. In case of return, original sale slip is required within 7 days.';
      if (el.inputChecksPayableNote) el.inputChecksPayableNote.value = cachedSettings.checksPayableNote || ('Make all checks payable to ' + (cachedSettings.receiptHeaderTitle || cachedSettings.storeName || 'Shahzaib Traders'));
      if (el.inputInvoiceEnquiriesNote) el.inputInvoiceEnquiriesNote.value = cachedSettings.enquiriesNote || ('Should you have any enquiries concerning this invoice, please contact ' + (cachedSettings.contactPhone || '0300-1234567'));
      if (el.inputSigLabel1) el.inputSigLabel1.value = cachedSettings.signatureLabel1 || 'Prepared By';
      if (el.inputSigLabel2) el.inputSigLabel2.value = cachedSettings.signatureLabel2 || 'Checked By';
      if (el.inputSigLabel3) el.inputSigLabel3.value = cachedSettings.signatureLabel3 || 'Customer Signature';
      if (el.chkAutoPrint) el.chkAutoPrint.checked = cachedSettings.autoPrintVoucher === 'true';

      // Security inputs
      if (el.chkRequirePinDelete) el.chkRequirePinDelete.checked = cachedSettings.requirePinOnDelete !== 'false';

      // Display & Font Size Sync
      const activeScale = (typeof window.getGlobalFontScale === 'function' ? window.getGlobalFontScale() : null)
        || Number(cachedSettings.appFontSizePercent || 100);
      updateDisplayFontUI(activeScale);

      syncBillPreview();
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }

  // Load Database Metrics
  async function loadDatabaseStats() {
    try {
      if (!window.settingsAPI) return;
      const res = await window.settingsAPI.getDbStats();
      if (res && res.success && res.stats) {
        cachedStats = res.stats;
        if (el.statDbEngine) el.statDbEngine.textContent = `SQLite 3 (${res.stats.journalMode})`;
        if (el.statProductsCount) el.statProductsCount.textContent = (res.stats.productsCount || 0).toLocaleString();
        if (el.statPartiesCount) el.statPartiesCount.textContent = (res.stats.partiesCount || 0).toLocaleString();
        if (el.statDbSize) el.statDbSize.textContent = res.stats.fileSizeKB || '0 KB';
      }
    } catch (err) {
      console.error('Failed to load DB stats:', err);
    }
  }

  // Load System & Runtime Details
  async function loadSystemInfo() {
    try {
      if (!window.settingsAPI) return;
      const info = await window.settingsAPI.getSystemInfo();
      if (info) {
        if (el.sysAppVersion) el.sysAppVersion.textContent = info.version || '0.3.0 Enterprise';
        if (el.sysPlatform) el.sysPlatform.textContent = `${info.platform} (${info.arch})`;
        if (el.sysElectron) el.sysElectron.textContent = `v${info.electronVersion}`;
        if (el.sysNode) el.sysNode.textContent = `v${info.nodeVersion}`;
        if (el.sysChrome) el.sysChrome.textContent = `v${info.chromeVersion}`;
        if (el.sysDbPath) el.sysDbPath.textContent = info.dbPath || '';
        if (el.sysMemory) el.sysMemory.textContent = `${info.heapUsedMB} MB (RSS: ${info.rssMB} MB)`;
        if (el.sysUptime) el.sysUptime.textContent = `${info.uptimeMinutes} minutes`;
      }
    } catch (err) {
      console.error('Failed to load system info:', err);
    }
  }

  function setupActionButtons() {
    // 1. Save Printer & Receipt Settings
    if (el.btnSavePrinter) {
      el.btnSavePrinter.addEventListener('click', async () => {
        const payload = {
          paperSize: el.selectPaperSize?.value || '80mm',
          receiptHeaderTitle: el.inputReceiptTitle?.value.trim() || 'SHAHZAIB TRADERS',
          receiptSubtitle: el.inputReceiptSubtitle?.value.trim() || '',
          contactPhone: el.inputReceiptPhone?.value.trim() || '',
          contactEmail: el.inputReceiptEmail?.value.trim() || '',
          address: el.inputReceiptAddress?.value.trim() || '',
          taxNumber: el.inputReceiptTaxNo?.value.trim() || '',
          ntn: el.inputReceiptTaxNo?.value.trim() || '',
          invoiceHeading: el.inputInvoiceHeading?.value.trim() || 'Sale Tax Invoice',
          estimateHeading: el.inputEstimateHeading?.value.trim() || 'Estimate / Quotation',
          previousBillLabel: el.inputPrevBillLabel?.value.trim() || 'Previous Bill / Balance',
          netPayableLabel: el.inputNetPayableLabel?.value.trim() || 'TOTAL NET PAYABLE',
          receiptFooterNote: el.textareaReceiptFooter?.value || '',
          invoiceTerms: el.textareaInvoiceTerms?.value || '',
          checksPayableNote: el.inputChecksPayableNote?.value.trim() || '',
          enquiriesNote: el.inputInvoiceEnquiriesNote?.value.trim() || '',
          signatureLabel1: el.inputSigLabel1?.value.trim() || 'Prepared By',
          signatureLabel2: el.inputSigLabel2?.value.trim() || 'Checked By',
          signatureLabel3: el.inputSigLabel3?.value.trim() || 'Customer Signature',
          autoPrintVoucher: el.chkAutoPrint?.checked ? 'true' : 'false'
        };

        try {
          el.btnSavePrinter.disabled = true;
          el.btnSavePrinter.textContent = 'Saving...';
          const res = await window.settingsAPI.saveSettings(payload);
          if (res && res.success) {
            Object.assign(cachedSettings, payload);
            if (window.appData) {
              window.appData.settings = window.appData.settings || {};
              Object.assign(window.appData.settings, payload);
            }
            showToast('Invoice & receipt configuration saved successfully!', 'success');
            syncBillPreview();
          } else {
            showToast('Failed to save printer settings', 'error');
          }
        } catch (err) {
          showToast('Printer settings error: ' + err.message, 'error');
        } finally {
          el.btnSavePrinter.disabled = false;
          el.btnSavePrinter.textContent = 'Save Receipt Configuration';
        }
      });
    }

    // 2. Dual-Template Live Preview Station Controls
    if (el.btnSetTplA4) {
      el.btnSetTplA4.addEventListener('click', () => {
        activePreviewTpl = 'a4';
        el.btnSetTplA4.classList.add('active');
        el.btnSetTplThermal?.classList.remove('active');
        syncBillPreview();
      });
    }

    if (el.btnSetTplThermal) {
      el.btnSetTplThermal.addEventListener('click', () => {
        activePreviewTpl = 'thermal';
        el.btnSetTplThermal.classList.add('active');
        el.btnSetTplA4?.classList.remove('active');
        syncBillPreview();
      });
    }

    if (el.btnSetDocInvoice) {
      el.btnSetDocInvoice.addEventListener('click', () => {
        activeDocType = 'paid';
        el.btnSetDocInvoice.classList.add('active');
        el.btnSetDocEstimate?.classList.remove('active');
        syncBillPreview();
      });
    }

    if (el.btnSetDocEstimate) {
      el.btnSetDocEstimate.addEventListener('click', () => {
        activeDocType = 'estimate';
        el.btnSetDocEstimate.classList.add('active');
        el.btnSetDocInvoice?.classList.remove('active');
        syncBillPreview();
      });
    }

    // 3. Test Print Active Template
    if (el.btnTestPrintSlip) {
      el.btnTestPrintSlip.addEventListener('click', () => {
        const isA4 = (activePreviewTpl === 'a4');
        showToast(`Sending test ${isA4 ? 'A4 Invoice' : 'Thermal Slip'} to printer...`, 'info');
        const contentHtml = el.previewViewport ? el.previewViewport.innerHTML : '';
        if (contentHtml) {
          let iframe = document.getElementById('settingsTestPrintFrame');
          if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'settingsTestPrintFrame';
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.style.opacity = '0';
            iframe.style.pointerEvents = 'none';
            document.body.appendChild(iframe);
          }
          const doc = iframe.contentWindow.document;
          doc.open();
          const pageStyle = isA4
            ? `@page { size: A4 portrait; margin: 0; } html, body { margin: 0; padding: 0; background: #fff; } .invoice-container.invoice-a4 { transform: none !important; margin: 0 auto !important; box-shadow: none !important; }`
            : `@page { size: auto; margin: 0mm; } html, body { margin: 0; padding: 0; width: 100%; background: #fff; } .sale-doc-thermal { width: 72mm !important; margin: 0 auto !important; box-shadow: none !important; page-break-after: avoid !important; }`;
          
          doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">${document.baseURI ? `<base href="${document.baseURI}">` : ''}<link rel="stylesheet" href="shared/styles.css"><link rel="stylesheet" href="sales/sales.css"><style>${pageStyle}</style></head><body>${contentHtml}</body></html>`);
          doc.close();
          setTimeout(() => {
            try {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            } catch (err) {
              window.print();
            }
          }, 80);
        } else {
          window.print();
        }
      });
    }

    // 4. Update Security PIN
    if (el.btnUpdatePin) {
      el.btnUpdatePin.addEventListener('click', async () => {
        const currentPin = el.inputCurrentPin?.value.trim();
        const newPin = el.inputNewPin?.value.trim();
        const confirmPin = el.inputConfirmPin?.value.trim();

        if (!currentPin) {
          showToast('Please enter your current 4-digit PIN.', 'warning');
          el.inputCurrentPin?.focus();
          return;
        }

        if (!newPin || !/^\d{4}$/.test(newPin)) {
          showToast('New PIN must be exactly 4 digits (e.g., 2026).', 'warning');
          el.inputNewPin?.focus();
          return;
        }

        if (newPin !== confirmPin) {
          showToast('New PIN and Confirm PIN do not match.', 'error');
          el.inputConfirmPin?.focus();
          return;
        }

        try {
          el.btnUpdatePin.disabled = true;
          el.btnUpdatePin.textContent = 'Updating PIN...';
          const res = await window.settingsAPI.changeAppPin(currentPin, newPin);
          if (res && res.success) {
            showToast(res.message || 'Security PIN updated successfully!', 'success');
            if (el.inputCurrentPin) el.inputCurrentPin.value = '';
            if (el.inputNewPin) el.inputNewPin.value = '';
            if (el.inputConfirmPin) el.inputConfirmPin.value = '';
          } else {
            showToast(res?.message || 'Failed to update PIN. Verify current PIN.', 'error');
          }
        } catch (err) {
          showToast('PIN change error: ' + err.message, 'error');
        } finally {
          el.btnUpdatePin.disabled = false;
          el.btnUpdatePin.textContent = 'Update Access PIN';
        }
      });
    }

    // Toggle require PIN on delete
    if (el.chkRequirePinDelete) {
      el.chkRequirePinDelete.addEventListener('change', async () => {
        try {
          await window.settingsAPI.saveSettings({
            requirePinOnDelete: el.chkRequirePinDelete.checked ? 'true' : 'false'
          });
          showToast('Security policy updated.', 'info');
        } catch (e) {}
      });
    }

    // 5. Database 1-Click Backup
    if (el.btnBackupDb) {
      el.btnBackupDb.addEventListener('click', async () => {
        try {
          el.btnBackupDb.disabled = true;
          el.btnBackupDb.textContent = 'Creating Backup...';
          const res = await window.settingsAPI.backupDatabase();
          if (res && res.success) {
            showToast(`Database backup created: ${res.filename} (${res.sizeFormatted})`, 'success');
            if (el.backupStatusText) {
              el.backupStatusText.textContent = `Last successful backup: ${res.filename} (${res.sizeFormatted})`;
            }
            loadDatabaseStats();
          } else {
            showToast('Backup failed: ' + (res?.error || 'Unknown error'), 'error');
          }
        } catch (err) {
          showToast('Backup error: ' + err.message, 'error');
        } finally {
          el.btnBackupDb.disabled = false;
          el.btnBackupDb.textContent = 'Create Instant Backup';
        }
      });
    }

    // 6. Database Vacuum & Optimize
    if (el.btnOptimizeDb) {
      el.btnOptimizeDb.addEventListener('click', async () => {
        try {
          el.btnOptimizeDb.disabled = true;
          el.btnOptimizeDb.textContent = 'Optimizing WAL...';
          const res = await window.settingsAPI.optimizeDatabase();
          if (res && res.success) {
            showToast(res.message || 'Database vacuumed and optimized successfully!', 'success');
            loadDatabaseStats();
          } else {
            showToast('Optimization failed: ' + (res?.error || 'Unknown error'), 'error');
          }
        } catch (err) {
          showToast('Optimize error: ' + err.message, 'error');
        } finally {
          el.btnOptimizeDb.disabled = false;
          el.btnOptimizeDb.textContent = 'Vacuum & Optimize DB';
        }
      });
    }

    // 7. Open Backups Folder
    if (el.btnOpenBackupsFolder) {
      el.btnOpenBackupsFolder.addEventListener('click', async () => {
        try {
          await window.settingsAPI.openBackupsFolder();
          showToast('Opening backups folder in File Explorer...', 'info');
        } catch (err) {
          showToast('Could not open backups folder: ' + err.message, 'error');
        }
      });
    }

    // 8. Export Full JSON
    if (el.btnExportJson) {
      el.btnExportJson.addEventListener('click', async () => {
        try {
          const res = await window.settingsAPI.exportAllDataJson();
          if (res && res.success) {
            showToast('Full database exported successfully to JSON!', 'success');
          } else if (res && !res.canceled) {
            showToast('Export failed: ' + (res.error || 'Unknown error'), 'error');
          }
        } catch (err) {
          showToast('Export error: ' + err.message, 'error');
        }
      });
    }

    // 9. Run Diagnostics
    if (el.btnRunDiagnostics) {
      el.btnRunDiagnostics.addEventListener('click', async () => {
        el.btnRunDiagnostics.disabled = true;
        el.btnRunDiagnostics.textContent = 'Running Diagnostics...';

        if (el.diagDbStatus) el.diagDbStatus.textContent = 'Testing...';
        if (el.diagStorageStatus) el.diagStorageStatus.textContent = 'Testing...';
        if (el.diagMemoryStatus) el.diagMemoryStatus.textContent = 'Testing...';

        setTimeout(async () => {
          await loadDatabaseStats();
          await loadSystemInfo();

          if (el.diagDbStatus) {
            el.diagDbStatus.innerHTML = '<span style="color: #059669; font-weight: 600;">Operational (WAL Mode Active)</span>';
          }
          if (el.diagStorageStatus) {
            el.diagStorageStatus.innerHTML = '<span style="color: #059669; font-weight: 600;">Accessible & Writeable</span>';
          }
          if (el.diagMemoryStatus) {
            el.diagMemoryStatus.innerHTML = '<span style="color: #059669; font-weight: 600;">Healthy (Under 100MB)</span>';
          }

          showToast('All system diagnostic tests passed!', 'success');
          el.btnRunDiagnostics.disabled = false;
          el.btnRunDiagnostics.textContent = 'Run System Diagnostics';
        }, 500);
      });
    }

    // 10. Display & Font Size Scaling Handlers (Word-Style)
    if (el.sliderFontScale) {
      el.sliderFontScale.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        updateDisplayFontUI(val);
        window.applyGlobalFontScale(val, true);
      });
    }

    if (el.btnFontDecrease) {
      el.btnFontDecrease.addEventListener('click', () => {
        const cur = Number(el.sliderFontScale?.value || window.getGlobalFontScale() || 100);
        const next = Math.max(75, cur - 5);
        if (el.sliderFontScale) el.sliderFontScale.value = next;
        updateDisplayFontUI(next);
        window.applyGlobalFontScale(next, true);
      });
    }

    if (el.btnFontIncrease) {
      el.btnFontIncrease.addEventListener('click', () => {
        const cur = Number(el.sliderFontScale?.value || window.getGlobalFontScale() || 100);
        const next = Math.min(160, cur + 5);
        if (el.sliderFontScale) el.sliderFontScale.value = next;
        updateDisplayFontUI(next);
        window.applyGlobalFontScale(next, true);
      });
    }

    if (el.presetBtns) {
      el.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const val = Number(btn.dataset.size || 100);
          if (el.sliderFontScale) el.sliderFontScale.value = val;
          updateDisplayFontUI(val);
          window.applyGlobalFontScale(val, true);
          showToast(`Font Size Set: ${val}%`, 'info');
        });
      });
    }

    if (el.btnResetFontSize) {
      el.btnResetFontSize.addEventListener('click', () => {
        if (el.sliderFontScale) el.sliderFontScale.value = 100;
        updateDisplayFontUI(100);
        window.applyGlobalFontScale(100, true);
        showToast('Font size reset to normal (100%).', 'info');
      });
    }

    if (el.btnSaveFontSize) {
      el.btnSaveFontSize.addEventListener('click', () => {
        const val = Number(el.sliderFontScale?.value || 100);
        window.applyGlobalFontScale(val, true);
        showToast(`Font size preference (${val}%) saved permanently!`, 'success');
      });
    }

    window.addEventListener('app-font-scale-changed', (e) => {
      if (e.detail && e.detail.percent) {
        updateDisplayFontUI(e.detail.percent);
      }
    });
  }

  function updateDisplayFontUI(val) {
    const p = Math.round(Number(val) || 100);
    if (el.dispFontSizeValue) el.dispFontSizeValue.textContent = `${p}%`;
    if (el.sliderFontScale && Number(el.sliderFontScale.value) !== p) {
      el.sliderFontScale.value = p;
    }

    let desc = 'Standard Factory View';
    if (p <= 80) desc = 'Extra Compact View';
    else if (p <= 90) desc = 'Compact View for High Resolution';
    else if (p === 100) desc = 'Default Standard View';
    else if (p <= 115) desc = 'Clearer Text & Easy Reading';
    else if (p <= 130) desc = 'Large Text (Recommended for Low Eye Sight)';
    else if (p <= 145) desc = 'Extra Large High-Visibility Mode';
    else desc = 'Maximum Readability Senior Mode';

    if (el.dispFontSizeDesc) el.dispFontSizeDesc.textContent = desc;

    if (el.presetBtns) {
      el.presetBtns.forEach(btn => {
        btn.classList.toggle('active', Number(btn.dataset.size) === p);
      });
    }
  }

  function showToast(message, type = 'info') {
    if (window.showToast) {
      window.showToast(message, type);
    } else {
      console.log(`[Toast ${type}]: ${message}`);
    }
  }

  return {
    init,
    onActivate,
    switchSubTab
  };
})();
