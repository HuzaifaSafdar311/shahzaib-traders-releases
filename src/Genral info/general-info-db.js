// Shahzaib Traders - General Info Database Module
// Handles Company Info, Province Info, Area Info, and Party Type

let db = null;
let isJson = false;
let jsonStore = null;
let saveJsonFn = null;
let checkpointFn = null;

function initGeneralInfo(dbInstance, isFallback, jsonData, saveJsonCallback, checkpointCallback) {
  db = dbInstance;
  isJson = isFallback;
  jsonStore = jsonData;
  saveJsonFn = saveJsonCallback;
  checkpointFn = checkpointCallback;

  if (isJson) {
    if (!jsonStore.companyInfo) {
      jsonStore.companyInfo = getDefaultCompanyInfo();
    }
    if (!Array.isArray(jsonStore.provinces)) {
      jsonStore.provinces = getDefaultProvinces();
    }
    if (!Array.isArray(jsonStore.areas)) {
      jsonStore.areas = getDefaultAreas();
    }
    if (!Array.isArray(jsonStore.partyTypes)) {
      jsonStore.partyTypes = getDefaultPartyTypes();
    }
    if (saveJsonFn) saveJsonFn();
    return;
  }

  if (!db) return;

  // Create SQLite tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_info (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tagline TEXT DEFAULT '',
      contactPerson TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      altPhone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      ntn TEXT DEFAULT '',
      strn TEXT DEFAULT '',
      currency TEXT DEFAULT 'PKR',
      website TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS provinces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT DEFAULT '',
      status TEXT DEFAULT 'Active',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS areas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provinceId TEXT DEFAULT '',
      provinceName TEXT DEFAULT '',
      city TEXT DEFAULT '',
      code TEXT DEFAULT '',
      status TEXT DEFAULT 'Active',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS party_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT DEFAULT '',
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'Active',
      createdAt TEXT NOT NULL
    );
  `);

  // Seed default company info if not present
  const checkCompany = db.prepare('SELECT COUNT(*) as count FROM company_info').get();
  if (!checkCompany || checkCompany.count === 0) {
    const defComp = getDefaultCompanyInfo();
    const insertComp = db.prepare(`
      INSERT INTO company_info (id, name, tagline, contactPerson, phone, altPhone, email, address, ntn, strn, currency, website, notes, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertComp.run(
      defComp.id, defComp.name, defComp.tagline, defComp.contactPerson,
      defComp.phone, defComp.altPhone, defComp.email, defComp.address,
      defComp.ntn, defComp.strn, defComp.currency, defComp.website,
      defComp.notes, defComp.updatedAt
    );
  }

  // Seed default provinces if not present
  const checkProv = db.prepare('SELECT COUNT(*) as count FROM provinces').get();
  if (!checkProv || checkProv.count === 0) {
    const defProvs = getDefaultProvinces();
    const insertProv = db.prepare('INSERT INTO provinces (id, name, code, status, createdAt) VALUES (?, ?, ?, ?, ?)');
    for (const p of defProvs) {
      insertProv.run(p.id, p.name, p.code, p.status, p.createdAt);
    }
  }

  // Seed default areas if not present
  const checkArea = db.prepare('SELECT COUNT(*) as count FROM areas').get();
  if (!checkArea || checkArea.count === 0) {
    const defAreas = getDefaultAreas();
    const insertArea = db.prepare('INSERT INTO areas (id, name, provinceId, provinceName, city, code, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (const a of defAreas) {
      insertArea.run(a.id, a.name, a.provinceId, a.provinceName, a.city, a.code, a.status, a.createdAt);
    }
  }

  // Seed default party types if not present
  const checkPt = db.prepare('SELECT COUNT(*) as count FROM party_types').get();
  if (!checkPt || checkPt.count === 0) {
    const defPts = getDefaultPartyTypes();
    const insertPt = db.prepare('INSERT INTO party_types (id, name, code, description, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)');
    for (const pt of defPts) {
      insertPt.run(pt.id, pt.name, pt.code, pt.description, pt.status, pt.createdAt);
    }
  }

  if (checkpointFn) checkpointFn();
}

function getDefaultCompanyInfo() {
  return {
    id: 'company-main',
    name: 'Shahzaib Traders',
    tagline: 'Wholesale & Retail Trading Solutions',
    contactPerson: 'Shahzaib Ali',
    phone: '0300-1234567',
    altPhone: '042-37654321',
    email: 'info@shahzaibtraders.com',
    address: 'Shop #14, Main Wholesale Commercial Market, Lahore, Pakistan',
    ntn: '4567890-1',
    strn: 'STRN-789654-2',
    currency: 'PKR',
    website: 'www.shahzaibtraders.com',
    notes: 'Providing top quality trade and distribution services across Pakistan.',
    updatedAt: new Date().toISOString()
  };
}

function getDefaultProvinces() {
  const now = new Date().toISOString();
  return [
    { id: 'prov-punjab', name: 'Punjab', code: 'PB', status: 'Active', createdAt: now },
    { id: 'prov-sindh', name: 'Sindh', code: 'SD', status: 'Active', createdAt: now },
    { id: 'prov-kpk', name: 'Khyber Pakhtunkhwa', code: 'KP', status: 'Active', createdAt: now },
    { id: 'prov-balochistan', name: 'Balochistan', code: 'BA', status: 'Active', createdAt: now },
    { id: 'prov-islamabad', name: 'Islamabad Capital Territory', code: 'ICT', status: 'Active', createdAt: now },
    { id: 'prov-ajk', name: 'Azad Jammu & Kashmir', code: 'AJK', status: 'Active', createdAt: now },
    { id: 'prov-gb', name: 'Gilgit-Baltistan', code: 'GB', status: 'Active', createdAt: now }
  ];
}

function getDefaultAreas() {
  const now = new Date().toISOString();
  return [
    { id: 'area-1', name: 'Badami Bagh', provinceId: 'prov-punjab', provinceName: 'Punjab', city: 'Lahore', code: '54000', status: 'Active', createdAt: now },
    { id: 'area-2', name: 'Shah Alam Market', provinceId: 'prov-punjab', provinceName: 'Punjab', city: 'Lahore', code: '54000', status: 'Active', createdAt: now },
    { id: 'area-3', name: 'Hall Road', provinceId: 'prov-punjab', provinceName: 'Punjab', city: 'Lahore', code: '54000', status: 'Active', createdAt: now },
    { id: 'area-4', name: 'Saddar', provinceId: 'prov-sindh', provinceName: 'Sindh', city: 'Karachi', code: '74400', status: 'Active', createdAt: now },
    { id: 'area-5', name: 'Jodia Bazaar', provinceId: 'prov-sindh', provinceName: 'Sindh', city: 'Karachi', code: '74000', status: 'Active', createdAt: now },
    { id: 'area-6', name: 'Raja Bazar', provinceId: 'prov-punjab', provinceName: 'Punjab', city: 'Rawalpindi', code: '46000', status: 'Active', createdAt: now },
    { id: 'area-7', name: 'Qissa Khwani', provinceId: 'prov-kpk', provinceName: 'Khyber Pakhtunkhwa', city: 'Peshawar', code: '25000', status: 'Active', createdAt: now }
  ];
}

function getDefaultPartyTypes() {
  const now = new Date().toISOString();
  return [
    { id: 'pt-1', name: 'Customer', code: 'CUST', description: 'Standard purchasing client or buyer', status: 'Active', createdAt: now },
    { id: 'pt-2', name: 'Vendor / Supplier', code: 'VEND', description: 'Goods supplier and manufacturer', status: 'Active', createdAt: now },
    { id: 'pt-3', name: 'Wholesaler', code: 'WHL', description: 'Bulk quantity trade partner', status: 'Active', createdAt: now },
    { id: 'pt-4', name: 'Retailer', code: 'RET', description: 'Small to mid volume store merchant', status: 'Active', createdAt: now },
    { id: 'pt-5', name: 'Distributor', code: 'DIST', description: 'Regional authorized distributor', status: 'Active', createdAt: now }
  ];
}

// ----------------------------------------------------
// Company Info Methods
// ----------------------------------------------------
function getCompanyInfo() {
  if (isJson) {
    return jsonStore.companyInfo || getDefaultCompanyInfo();
  }
  if (!db) throw new Error('Database not initialized');
  const row = db.prepare('SELECT * FROM company_info LIMIT 1').get();
  return row || getDefaultCompanyInfo();
}

function saveCompanyInfo(info) {
  const now = new Date().toISOString();
  const data = {
    id: info.id || 'company-main',
    name: (info.name || '').trim() || 'Shahzaib Traders',
    tagline: (info.tagline || '').trim(),
    contactPerson: (info.contactPerson || '').trim(),
    phone: (info.phone || '').trim(),
    altPhone: (info.altPhone || '').trim(),
    email: (info.email || '').trim(),
    address: (info.address || '').trim(),
    ntn: (info.ntn || '').trim(),
    strn: (info.strn || '').trim(),
    currency: (info.currency || 'PKR').trim(),
    website: (info.website || '').trim(),
    notes: (info.notes || '').trim(),
    updatedAt: now
  };

  if (isJson) {
    jsonStore.companyInfo = data;
    if (saveJsonFn) saveJsonFn();
    return { success: true, data };
  }

  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(`
    INSERT INTO company_info (id, name, tagline, contactPerson, phone, altPhone, email, address, ntn, strn, currency, website, notes, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      tagline = excluded.tagline,
      contactPerson = excluded.contactPerson,
      phone = excluded.phone,
      altPhone = excluded.altPhone,
      email = excluded.email,
      address = excluded.address,
      ntn = excluded.ntn,
      strn = excluded.strn,
      currency = excluded.currency,
      website = excluded.website,
      notes = excluded.notes,
      updatedAt = excluded.updatedAt
  `);
  stmt.run(
    data.id, data.name, data.tagline, data.contactPerson,
    data.phone, data.altPhone, data.email, data.address,
    data.ntn, data.strn, data.currency, data.website,
    data.notes, data.updatedAt
  );
  if (checkpointFn) checkpointFn();
  return { success: true, data };
}

// ----------------------------------------------------
// Province Methods
// ----------------------------------------------------
function getProvinces() {
  if (isJson) {
    return [...(jsonStore.provinces || [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
  if (!db) throw new Error('Database not initialized');
  return db.prepare('SELECT * FROM provinces ORDER BY name ASC').all();
}

function addProvince(province) {
  const record = {
    id: province.id || 'prov-' + Date.now(),
    name: (province.name || '').trim(),
    code: (province.code || '').trim().toUpperCase(),
    status: province.status || 'Active',
    createdAt: province.createdAt || new Date().toISOString()
  };

  if (isJson) {
    jsonStore.provinces.push(record);
    if (saveJsonFn) saveJsonFn();
    return { success: true, data: record };
  }

  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare('INSERT INTO provinces (id, name, code, status, createdAt) VALUES (?, ?, ?, ?, ?)');
  stmt.run(record.id, record.name, record.code, record.status, record.createdAt);
  if (checkpointFn) checkpointFn();
  return { success: true, data: record };
}

function updateProvince(province) {
  const updated = {
    id: province.id,
    name: (province.name || '').trim(),
    code: (province.code || '').trim().toUpperCase(),
    status: province.status || 'Active'
  };

  if (isJson) {
    const idx = jsonStore.provinces.findIndex(p => p.id === updated.id);
    if (idx !== -1) {
      jsonStore.provinces[idx] = { ...jsonStore.provinces[idx], ...updated };
      // Also update provinceName in areas
      (jsonStore.areas || []).forEach(a => {
        if (a.provinceId === updated.id) a.provinceName = updated.name;
      });
      if (saveJsonFn) saveJsonFn();
    }
    return { success: true, data: updated };
  }

  if (!db) throw new Error('Database not initialized');
  db.exec('BEGIN TRANSACTION;');
  try {
    const stmt = db.prepare('UPDATE provinces SET name = ?, code = ?, status = ? WHERE id = ?');
    stmt.run(updated.name, updated.code, updated.status, updated.id);

    // Sync provinceName in areas
    const syncArea = db.prepare('UPDATE areas SET provinceName = ? WHERE provinceId = ?');
    syncArea.run(updated.name, updated.id);

    db.exec('COMMIT;');
    if (checkpointFn) checkpointFn();
    return { success: true, data: updated };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

function deleteProvince(id) {
  if (isJson) {
    jsonStore.provinces = (jsonStore.provinces || []).filter(p => p.id !== id);
    // Unlink or clean province in areas
    (jsonStore.areas || []).forEach(a => {
      if (a.provinceId === id) {
        a.provinceId = '';
        a.provinceName = '';
      }
    });
    if (saveJsonFn) saveJsonFn();
    return { success: true };
  }

  if (!db) throw new Error('Database not initialized');
  db.exec('BEGIN TRANSACTION;');
  try {
    const stmt = db.prepare('DELETE FROM provinces WHERE id = ?');
    stmt.run(id);

    // Clear province reference in linked areas
    const unassign = db.prepare("UPDATE areas SET provinceId = '', provinceName = '' WHERE provinceId = ?");
    unassign.run(id);

    db.exec('COMMIT;');
    if (checkpointFn) checkpointFn();
    return { success: true };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

// ----------------------------------------------------
// Area Methods
// ----------------------------------------------------
function getAreas() {
  if (isJson) {
    return [...(jsonStore.areas || [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
  if (!db) throw new Error('Database not initialized');
  return db.prepare('SELECT * FROM areas ORDER BY name ASC').all();
}

function addArea(area) {
  const record = {
    id: area.id || 'area-' + Date.now(),
    name: (area.name || '').trim(),
    provinceId: area.provinceId || '',
    provinceName: (area.provinceName || '').trim(),
    city: (area.city || '').trim(),
    code: (area.code || '').trim(),
    status: area.status || 'Active',
    createdAt: area.createdAt || new Date().toISOString()
  };

  if (isJson) {
    jsonStore.areas.push(record);
    if (saveJsonFn) saveJsonFn();
    return { success: true, data: record };
  }

  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(`
    INSERT INTO areas (id, name, provinceId, provinceName, city, code, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    record.id, record.name, record.provinceId, record.provinceName,
    record.city, record.code, record.status, record.createdAt
  );
  if (checkpointFn) checkpointFn();
  return { success: true, data: record };
}

function updateArea(area) {
  const updated = {
    id: area.id,
    name: (area.name || '').trim(),
    provinceId: area.provinceId || '',
    provinceName: (area.provinceName || '').trim(),
    city: (area.city || '').trim(),
    code: (area.code || '').trim(),
    status: area.status || 'Active'
  };

  if (isJson) {
    const idx = jsonStore.areas.findIndex(a => a.id === updated.id);
    if (idx !== -1) {
      jsonStore.areas[idx] = { ...jsonStore.areas[idx], ...updated };
      if (saveJsonFn) saveJsonFn();
    }
    return { success: true, data: updated };
  }

  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(`
    UPDATE areas
    SET name = ?, provinceId = ?, provinceName = ?, city = ?, code = ?, status = ?
    WHERE id = ?
  `);
  stmt.run(
    updated.name, updated.provinceId, updated.provinceName,
    updated.city, updated.code, updated.status, updated.id
  );
  if (checkpointFn) checkpointFn();
  return { success: true, data: updated };
}

function deleteArea(id) {
  if (isJson) {
    jsonStore.areas = (jsonStore.areas || []).filter(a => a.id !== id);
    if (saveJsonFn) saveJsonFn();
    return { success: true };
  }

  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare('DELETE FROM areas WHERE id = ?');
  stmt.run(id);
  if (checkpointFn) checkpointFn();
  return { success: true };
}

// ----------------------------------------------------
// Party Type Methods
// ----------------------------------------------------
function getPartyTypes() {
  if (isJson) {
    return [...(jsonStore.partyTypes || [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
  if (!db) throw new Error('Database not initialized');
  return db.prepare('SELECT * FROM party_types ORDER BY name ASC').all();
}

function addPartyType(partyType) {
  const record = {
    id: partyType.id || 'pt-' + Date.now(),
    name: (partyType.name || '').trim(),
    code: (partyType.code || '').trim().toUpperCase(),
    description: (partyType.description || '').trim(),
    status: partyType.status || 'Active',
    createdAt: partyType.createdAt || new Date().toISOString()
  };

  if (isJson) {
    jsonStore.partyTypes.push(record);
    if (saveJsonFn) saveJsonFn();
    return { success: true, data: record };
  }

  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(`
    INSERT INTO party_types (id, name, code, description, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(record.id, record.name, record.code, record.description, record.status, record.createdAt);
  if (checkpointFn) checkpointFn();
  return { success: true, data: record };
}

function updatePartyType(partyType) {
  const updated = {
    id: partyType.id,
    name: (partyType.name || '').trim(),
    code: (partyType.code || '').trim().toUpperCase(),
    description: (partyType.description || '').trim(),
    status: partyType.status || 'Active'
  };

  if (isJson) {
    const idx = jsonStore.partyTypes.findIndex(pt => pt.id === updated.id);
    if (idx !== -1) {
      jsonStore.partyTypes[idx] = { ...jsonStore.partyTypes[idx], ...updated };
      if (saveJsonFn) saveJsonFn();
    }
    return { success: true, data: updated };
  }

  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(`
    UPDATE party_types
    SET name = ?, code = ?, description = ?, status = ?
    WHERE id = ?
  `);
  stmt.run(updated.name, updated.code, updated.description, updated.status, updated.id);
  if (checkpointFn) checkpointFn();
  return { success: true, data: updated };
}

function deletePartyType(id) {
  if (isJson) {
    jsonStore.partyTypes = (jsonStore.partyTypes || []).filter(pt => pt.id !== id);
    if (saveJsonFn) saveJsonFn();
    return { success: true };
  }

  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare('DELETE FROM party_types WHERE id = ?');
  stmt.run(id);
  if (checkpointFn) checkpointFn();
  return { success: true };
}

function getAllGeneralInfo() {
  return {
    companyInfo: getCompanyInfo(),
    provinces: getProvinces(),
    areas: getAreas(),
    partyTypes: getPartyTypes()
  };
}

module.exports = {
  initGeneralInfo,
  getCompanyInfo,
  saveCompanyInfo,
  getProvinces,
  addProvince,
  updateProvince,
  deleteProvince,
  getAreas,
  addArea,
  updateArea,
  deleteArea,
  getPartyTypes,
  addPartyType,
  updatePartyType,
  deletePartyType,
  getAllGeneralInfo
};
