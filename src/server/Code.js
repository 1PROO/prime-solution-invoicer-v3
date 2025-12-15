/**
 * PRIME SOLUTION INVOICER - GOOGLE APPS SCRIPT
 * ---------------------------------------------
 * Complete backend with: Invoices, Products, Users, Settings, Activity
 * 
 * SHEETS STRUCTURE:
 * - Invoices: Invoice data
 * - Products: Product catalog
 * - Users: User management & settings
 * - Activity: Login activity log
 * - GlobalSettings: Default app configuration
 */

const INVOICES_SHEET = 'Invoices';
const PRODUCTS_SHEET = 'Products';
const USERS_SHEET = 'Users';
const ACTIVITY_SHEET = 'Activity';
const GLOBAL_SHEET = 'GlobalSettings';
const LOCK_WAIT_MS = 30000;

// ============ SETUP ============

function setup() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Invoices
    let invSheet = ss.getSheetByName(INVOICES_SHEET);
    if (!invSheet) {
        invSheet = ss.insertSheet(INVOICES_SHEET);
        invSheet.appendRow(['Date Created', 'Invoice #', 'Client Name', 'Total', 'UUID', 'Data JSON']);
        invSheet.setFrozenRows(1);
    }

    // 2. Products
    let prodSheet = ss.getSheetByName(PRODUCTS_SHEET);
    if (!prodSheet) {
        prodSheet = ss.insertSheet(PRODUCTS_SHEET);
        prodSheet.appendRow(['ID', 'Description (AR)', 'Description (EN)', 'Price']);
        prodSheet.setFrozenRows(1);
        prodSheet.appendRow(['prod_001', 'تركيب كاميرات مراقبة', 'Security Camera Installation', 5000]);
    }

    // 3. Users (Updated Columns)
    let usersSheet = ss.getSheetByName(USERS_SHEET);
    if (!usersSheet) {
        usersSheet = ss.insertSheet(USERS_SHEET);
        usersSheet.appendRow(['Username', 'Password', 'Role', 'Status', 'Date', 'Permissions (JSON)', 'Suspension Message']);
        usersSheet.setFrozenRows(1);
        usersSheet.appendRow(['Admin', 'Ahmed@admin', 'admin', 'active', new Date().toISOString(), '{}', '']);
    } else {
        // Upgrade existing sheet if needed (Simple check: header length)
        const headers = usersSheet.getRange(1, 1, 1, usersSheet.getLastColumn()).getValues()[0];
        if (headers.length < 7) {
            usersSheet.getRange(1, 6).setValue('Permissions (JSON)');
            usersSheet.getRange(1, 7).setValue('Suspension Message');
        }
    }

    // 4. Activity
    let actSheet = ss.getSheetByName(ACTIVITY_SHEET);
    if (!actSheet) {
        actSheet = ss.insertSheet(ACTIVITY_SHEET);
        actSheet.appendRow(['Username', 'Action', 'Timestamp', 'Details']);
        actSheet.setFrozenRows(1);
    }

    // 5. Global Settings
    let globalSheet = ss.getSheetByName(GLOBAL_SHEET);
    if (!globalSheet) {
        globalSheet = ss.insertSheet(GLOBAL_SHEET);
        globalSheet.appendRow(['Key', 'Value (JSON)']); // Simple Key-Value store
        globalSheet.setFrozenRows(1);
        // Default entries
        globalSheet.appendRow(['SELLER_INFO', JSON.stringify({
            name: '', address: '', phone: '', email: ''
        })]);
        globalSheet.appendRow(['DEFAULT_NOTES_AR', JSON.stringify('يرجى التحويل لحساب ...')]);
        globalSheet.appendRow(['DEFAULT_NOTES_EN', JSON.stringify('Please transfer to account...')]);
    }
}

// ============ MAIN HANDLER ============

function doPost(e) {
    const lock = LockService.getScriptLock();

    try {
        if (!lock.tryLock(LOCK_WAIT_MS)) return errorResponse("Server busy");

        const payload = JSON.parse(e.postData.contents);
        const action = payload.action;

        switch (action) {
            // --- INVOICES ---
            case 'SYNC_INVOICES': return handleSyncInvoices(payload.invoices);
            case 'GET_ALL_INVOICES': return handleGetAllInvoices();
            case 'GET_NEXT_ID': return handleGetNextId();

            // --- PRODUCTS ---
            case 'GET_PRODUCTS': return handleGetProducts();
            case 'SAVE_PRODUCT': return handleSaveProduct(payload.product);
            case 'DELETE_PRODUCT': return handleDeleteProduct(payload.productId);

            // --- USERS & AUTH ---
            case 'LOGIN': return handleLogin(payload.username, payload.password);
            case 'GET_USERS': return handleGetUsers();
            case 'CREATE_USER': return handleCreateUser(payload.user);
            case 'UPDATE_USER': return handleUpdateUser(payload.user);
            case 'DELETE_USER': return handleDeleteUser(payload.username);

            // --- GLOBAL SETTINGS ---
            case 'GET_GLOBAL_DEFAULTS': return handleGetGlobalDefaults();
            case 'SAVE_GLOBAL_DEFAULTS': return handleSaveGlobalDefaults(payload.defaults);

            // --- UTILS ---
            case 'PING': return jsonResponse({ status: 'success', message: 'Connected' });
            case 'GET_ACTIVITY': return handleGetActivity();

            default: return errorResponse("Unknown action: " + action);
        }

    } catch (err) {
        return errorResponse(err.toString());
    } finally {
        lock.releaseLock();
    }
}

// ============ USER OPERATIONS ============

function handleLogin(username, password) {
    const sheet = getSheet(USERS_SHEET);
    if (!sheet) return errorResponse("System error: Users sheet missing");

    const data = sheet.getDataRange().getValues(); // Get all data
    // Skip header, find user
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === username && data[i][1] === password) {
            const role = data[i][2];
            const status = data[i][3];
            const perms = data[i][5] ? JSON.parse(data[i][5]) : {};
            const suspensionMsg = data[i][6] || '';

            if (status === 'suspended') {
                return jsonResponse({
                    status: 'suspended',
                    message: suspensionMsg || 'Account suspended. Contact Admin.'
                });
            }

            logActivity(username, 'login', 'Success');
            return jsonResponse({
                status: 'success',
                user: {
                    name: username,
                    role: role,
                    permissions: perms
                }
            });
        }
    }
    return jsonResponse({ status: 'error', message: 'Invalid credentials' });
}

function handleGetUsers() {
    const sheet = getSheet(USERS_SHEET);
    if (!sheet) return jsonResponse({ users: [] });

    const data = sheet.getDataRange().getValues();
    const users = [];

    // Skip header
    for (let i = 1; i < data.length; i++) {
        users.push({
            username: data[i][0],
            password: data[i][1], // Only admin calls this, so exposing pass is "ok" for this requirement
            role: data[i][2],
            status: data[i][3],
            createdAt: data[i][4],
            permissions: data[i][5] ? JSON.parse(data[i][5]) : {},
            suspensionMessage: data[i][6]
        });
    }
    return jsonResponse({ users: users });
}

function handleCreateUser(user) {
    const sheet = getSheet(USERS_SHEET);
    if (!sheet) { setup(); return handleCreateUser(user); }

    // Check existing
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === user.username) return errorResponse("Username exists");
    }

    sheet.appendRow([
        user.username,
        user.password,
        user.role || 'user',
        'active',
        new Date().toISOString(),
        JSON.stringify(user.permissions || {}),
        ''
    ]);
    return jsonResponse({ status: 'success' });
}

function handleUpdateUser(user) {
    const sheet = getSheet(USERS_SHEET);
    if (!sheet) return errorResponse("Sheet missing");

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === user.username) {
            const row = i + 1;

            // Protect Admin
            if (user.username === 'Admin' && user.role && user.role !== 'admin') {
                return errorResponse("Cannot change Admin role");
            }

            if (user.password) sheet.getRange(row, 2).setValue(user.password);
            if (user.role) sheet.getRange(row, 3).setValue(user.role);
            if (user.status) sheet.getRange(row, 4).setValue(user.status);
            if (user.permissions) sheet.getRange(row, 6).setValue(JSON.stringify(user.permissions));
            if (user.suspensionMessage !== undefined) sheet.getRange(row, 7).setValue(user.suspensionMessage);

            return jsonResponse({ status: 'success' });
        }
    }
    return errorResponse("User not found");
}

function handleDeleteUser(username) {
    if (username === 'Admin') return errorResponse("Cannot delete Main Admin");

    const sheet = getSheet(USERS_SHEET);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === username) {
            sheet.deleteRow(i + 1);
            return jsonResponse({ status: 'success' });
        }
    }
    return errorResponse("User not found");
}

// ============ GLOBAL SETTINGS ============

function handleGetGlobalDefaults() {
    const sheet = getSheet(GLOBAL_SHEET);
    if (!sheet) { setup(); return handleGetGlobalDefaults(); }

    const data = sheet.getDataRange().getValues();
    const defaults = {};

    for (let i = 1; i < data.length; i++) {
        const key = data[i][0];
        try {
            defaults[key] = JSON.parse(data[i][1]);
        } catch (e) {
            defaults[key] = data[i][1];
        }
    }
    return jsonResponse({ defaults: defaults });
}

function handleSaveGlobalDefaults(newDefaults) {
    const sheet = getSheet(GLOBAL_SHEET);
    if (!sheet) { setup(); return handleSaveGlobalDefaults(newDefaults); }

    const data = sheet.getDataRange().getValues();

    // Update or Insert
    for (const [key, value] of Object.entries(newDefaults)) {
        let found = false;
        const jsonVal = JSON.stringify(value);

        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === key) {
                sheet.getRange(i + 1, 2).setValue(jsonVal);
                found = true;
                break;
            }
        }

        if (!found) {
            sheet.appendRow([key, jsonVal]);
        }
    }

    return jsonResponse({ status: 'success' });
}


// ============ HELPERS & OTHERS ============

function getSheet(name) {
    return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function logActivity(username, action, details) {
    let sheet = getSheet(ACTIVITY_SHEET);
    if (!sheet) { setup(); sheet = getSheet(ACTIVITY_SHEET); }
    sheet.appendRow([username, action, new Date().toISOString(), details]);
}

function handleGetActivity() {
    const sheet = getSheet(ACTIVITY_SHEET);
    if (!sheet) return jsonResponse({ activity: [] });

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return jsonResponse({ activity: [] });

    // Last 100 rows
    const startRow = Math.max(2, lastRow - 99);
    const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, 4).getValues();

    return jsonResponse({
        activity: data.map(r => ({
            username: r[0], action: r[1], timestamp: r[2], details: r[3]
        })).reverse()
    });
}

function handleSyncInvoices(invoices) {
    const sheet = getSheet(INVOICES_SHEET);
    const lastRow = sheet.getLastRow();
    let currentMaxId = 0;

    if (lastRow > 1) {
        const val = sheet.getRange(lastRow, 2).getValue().toString();
        currentMaxId = parseInt(val, 10) || 0;
    }

    const mapping = {};
    const newRows = [];

    invoices.forEach(inv => {
        currentMaxId++;
        const officialId = padNumber(currentMaxId, 3);
        const cleanInv = { ...inv, invoiceNumber: officialId, syncStatus: 'synced' };

        newRows.push([
            new Date(),
            officialId,
            inv.clientName,
            inv.total || 0,
            inv.id || Utilities.getUuid(),
            JSON.stringify(cleanInv)
        ]);

        if (inv.tempId || (inv.invoiceNumber && inv.invoiceNumber.startsWith('OFF-'))) {
            mapping[inv.tempId || inv.invoiceNumber] = officialId;
        }
    });

    if (newRows.length > 0) {
        sheet.getRange(lastRow + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
    }

    return jsonResponse({
        status: 'success',
        idMapping: mapping,
        nextId: padNumber(currentMaxId + 1, 3)
    });
}

function handleGetAllInvoices() {
    const sheet = getSheet(INVOICES_SHEET);
    if (!sheet || sheet.getLastRow() <= 1) return jsonResponse({ invoices: [], maxId: 0, nextId: '001' });

    const data = sheet.getRange(2, 6, sheet.getLastRow() - 1, 1).getValues();
    const invoices = data.map(r => {
        try { return JSON.parse(r[0]); } catch { return null; }
    }).filter(x => x);

    const lastId = sheet.getRange(sheet.getLastRow(), 2).getValue();
    const maxId = parseInt(lastId, 10) || 0;

    return jsonResponse({
        invoices: invoices.reverse(),
        maxId: maxId,
        nextId: padNumber(maxId + 1, 3)
    });
}

function handleGetNextId() {
    const sheet = getSheet(INVOICES_SHEET);
    if (!sheet || sheet.getLastRow() <= 1) return jsonResponse({ nextId: '001' });

    const lastId = sheet.getRange(sheet.getLastRow(), 2).getValue();
    const maxId = parseInt(lastId, 10) || 0;
    return jsonResponse({ nextId: padNumber(maxId + 1, 3) });
}

function handleGetProducts() {
    const sheet = getSheet(PRODUCTS_SHEET);
    if (!sheet || sheet.getLastRow() <= 1) return jsonResponse({ products: [] });

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
    return jsonResponse({
        products: data.map(r => ({
            id: r[0], description: r[1], descriptionEn: r[2], price: r[3] || 0
        })).filter(p => p.id)
    });
}

function handleSaveProduct(p) {
    const sheet = getSheet(PRODUCTS_SHEET);
    if (!sheet) { setup(); return handleSaveProduct(p); }

    const data = sheet.getDataRange().getValues();
    let row = -1;

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === p.id) { row = i + 1; break; }
    }

    const rowData = [
        p.id || ('prod_' + Date.now()),
        p.description || '', p.descriptionEn || '', p.price || 0
    ];

    if (row > 0) sheet.getRange(row, 1, 1, 4).setValues([rowData]);
    else sheet.appendRow(rowData);

    return jsonResponse({ status: 'success', product: { ...p, id: rowData[0] } });
}

function handleDeleteProduct(id) {
    const sheet = getSheet(PRODUCTS_SHEET);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
            sheet.deleteRow(i + 1);
            return jsonResponse({ status: 'success' });
        }
    }
    return errorResponse("Product not found");
}

function padNumber(n, l) {
    let s = n.toString();
    while (s.length < l) s = "0" + s;
    return s;
}

function jsonResponse(d) {
    return ContentService.createTextOutput(JSON.stringify(d)).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(m) {
    return jsonResponse({ status: 'error', message: m });
}
