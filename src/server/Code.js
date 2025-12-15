/**
 * PRIME SOLUTION INVOICER - GOOGLE APPS SCRIPT
 * ---------------------------------------------
 * Complete backend with: Invoices, Products, Users, Settings
 * 
 * SHEETS STRUCTURE:
 * - Sheet1 (Invoices): Invoice data
 * - Sheet2 (Products): Product catalog
 * - Sheet3 (Users): User management & settings
 * - Sheet4 (Activity): Login activity log
 */

const INVOICES_SHEET = 'Invoices';
const PRODUCTS_SHEET = 'Products';
const USERS_SHEET = 'Users';
const ACTIVITY_SHEET = 'Activity';
const LOCK_WAIT_MS = 30000;

// ============ SETUP ============

function setup() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Setup Invoices Sheet
    let invSheet = ss.getSheetByName(INVOICES_SHEET);
    if (!invSheet) {
        invSheet = ss.insertSheet(INVOICES_SHEET);
        invSheet.appendRow(['Date Created', 'Invoice #', 'Client Name', 'Total', 'UUID', 'Data JSON']);
        invSheet.setFrozenRows(1);
    }

    // Setup Products Sheet
    let prodSheet = ss.getSheetByName(PRODUCTS_SHEET);
    if (!prodSheet) {
        prodSheet = ss.insertSheet(PRODUCTS_SHEET);
        prodSheet.appendRow(['ID', 'Description (AR)', 'Description (EN)', 'Price']);
        prodSheet.setFrozenRows(1);
        prodSheet.appendRow(['prod_001', 'تركيب كاميرات مراقبة', 'Security Camera Installation', 5000]);
        prodSheet.appendRow(['prod_002', 'عقد صيانة سنوي', 'Annual Maintenance Contract', 1200]);
        prodSheet.appendRow(['prod_003', 'استشارة فنية', 'Technical Consultation', 500]);
    }

    // Setup Users Sheet
    let usersSheet = ss.getSheetByName(USERS_SHEET);
    if (!usersSheet) {
        usersSheet = ss.insertSheet(USERS_SHEET);
        usersSheet.appendRow(['Username', 'Password', 'Role', 'Status', 'Created At']);
        usersSheet.setFrozenRows(1);
        // Default Admin User
        usersSheet.appendRow(['Admin', 'Ahmed@admin', 'admin', 'active', new Date().toISOString()]);
    }

    // Setup Activity Sheet
    let actSheet = ss.getSheetByName(ACTIVITY_SHEET);
    if (!actSheet) {
        actSheet = ss.insertSheet(ACTIVITY_SHEET);
        actSheet.appendRow(['Username', 'Action', 'Timestamp', 'Details']);
        actSheet.setFrozenRows(1);
    }
}

// ============ MAIN HANDLER ============

function doPost(e) {
    const lock = LockService.getScriptLock();

    try {
        const success = lock.tryLock(LOCK_WAIT_MS);
        if (!success) {
            return errorResponse("Server is busy, try again.");
        }

        const payload = JSON.parse(e.postData.contents);
        const action = payload.action;

        switch (action) {
            // Invoice Operations
            case 'SYNC_INVOICES':
                return handleSyncInvoices(payload.invoices);
            case 'GET_ALL_INVOICES':
                return handleGetAllInvoices();
            case 'GET_NEXT_ID':
                return handleGetNextId();

            // Product Operations
            case 'GET_PRODUCTS':
                return handleGetProducts();
            case 'SAVE_PRODUCT':
                return handleSaveProduct(payload.product);
            case 'DELETE_PRODUCT':
                return handleDeleteProduct(payload.productId);

            // User Operations
            case 'LOGIN':
                return handleLogin(payload.username, payload.password);
            case 'GET_USERS':
                return handleGetUsers();
            case 'CREATE_USER':
                return handleCreateUser(payload.user);
            case 'UPDATE_USER':
                return handleUpdateUser(payload.user);
            case 'DELETE_USER':
                return handleDeleteUser(payload.username);

            // Connection Check
            case 'PING':
                return jsonResponse({ status: 'success', message: 'Connected' });

            // Activity
            case 'GET_ACTIVITY':
                return handleGetActivity();

            // Legacy
            case 'GET_LATEST':
                return handleGetAllInvoices();

            default:
                return errorResponse("Unknown action: " + action);
        }

    } catch (err) {
        return errorResponse(err.toString());
    } finally {
        lock.releaseLock();
    }
}

// ============ USER OPERATIONS ============

function handleLogin(username, password) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(USERS_SHEET);

    if (!sheet) {
        return errorResponse("Users not configured");
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
        return errorResponse("No users found");
    }

    const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();

    for (let i = 0; i < data.length; i++) {
        if (data[i][0] === username && data[i][1] === password) {
            const role = data[i][2];
            const status = data[i][3];

            // Check if suspended
            if (status === 'suspended') {
                return jsonResponse({
                    status: 'suspended',
                    message: 'حسابك معطل حالياً. تواصل مع الدعم الفني.'
                });
            }

            // Log activity
            logActivity(username, 'login', 'Successful login');

            return jsonResponse({
                status: 'success',
                user: {
                    name: username,
                    role: role,
                    status: status
                }
            });
        }
    }

    return jsonResponse({
        status: 'error',
        message: 'اسم المستخدم أو كلمة المرور غير صحيحة'
    });
}

function handleGetUsers() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(USERS_SHEET);

    if (!sheet) {
        return jsonResponse({ users: [] });
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
        return jsonResponse({ users: [] });
    }

    const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();

    const users = data.map(row => ({
        username: row[0],
        role: row[2],
        status: row[3],
        createdAt: row[4]
    }));

    return jsonResponse({ users: users });
}

function handleCreateUser(user) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(USERS_SHEET);

    if (!sheet) {
        setup();
        sheet = ss.getSheetByName(USERS_SHEET);
    }

    // Check if username exists
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
        const usernames = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (let i = 0; i < usernames.length; i++) {
            if (usernames[i][0] === user.username) {
                return errorResponse("اسم المستخدم موجود بالفعل");
            }
        }
    }

    // Add new user
    sheet.appendRow([
        user.username,
        user.password,
        user.role || 'user',
        'active',
        new Date().toISOString()
    ]);

    return jsonResponse({ status: 'success', message: 'تم إنشاء المستخدم بنجاح' });
}

function handleUpdateUser(user) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(USERS_SHEET);

    if (!sheet) {
        return errorResponse("Users sheet not found");
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
        return errorResponse("User not found");
    }

    const usernames = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

    for (let i = 0; i < usernames.length; i++) {
        if (usernames[i][0] === user.username) {
            const rowNum = i + 2;
            // Update role and status (columns 3 and 4)
            if (user.role) sheet.getRange(rowNum, 3).setValue(user.role);
            if (user.status) sheet.getRange(rowNum, 4).setValue(user.status);
            if (user.password) sheet.getRange(rowNum, 2).setValue(user.password);

            return jsonResponse({ status: 'success', message: 'تم تحديث المستخدم' });
        }
    }

    return errorResponse("User not found");
}

function handleDeleteUser(username) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(USERS_SHEET);

    if (!sheet) {
        return errorResponse("Users sheet not found");
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
        return errorResponse("User not found");
    }

    const usernames = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

    for (let i = 0; i < usernames.length; i++) {
        if (usernames[i][0] === username) {
            sheet.deleteRow(i + 2);
            return jsonResponse({ status: 'success', message: 'تم حذف المستخدم' });
        }
    }

    return errorResponse("User not found");
}

// ============ ACTIVITY LOGGING ============

function logActivity(username, action, details) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(ACTIVITY_SHEET);

    if (!sheet) {
        sheet = ss.insertSheet(ACTIVITY_SHEET);
        sheet.appendRow(['Username', 'Action', 'Timestamp', 'Details']);
        sheet.setFrozenRows(1);
    }

    sheet.appendRow([username, action, new Date().toISOString(), details]);
}

function handleGetActivity() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(ACTIVITY_SHEET);

    if (!sheet) {
        return jsonResponse({ activity: [] });
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
        return jsonResponse({ activity: [] });
    }

    // Get last 100 activities
    const startRow = Math.max(2, lastRow - 99);
    const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, 4).getValues();

    const activity = data.map(row => ({
        username: row[0],
        action: row[1],
        timestamp: row[2],
        details: row[3]
    })).reverse();

    return jsonResponse({ activity: activity });
}

// ============ INVOICE OPERATIONS ============

function handleSyncInvoices(invoices) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(INVOICES_SHEET);
    const resultMapping = {};

    const lastRow = sheet.getLastRow();
    let currentMaxId = 0;

    if (lastRow > 1) {
        const lastIdStr = sheet.getRange(lastRow, 2).getValue().toString();
        currentMaxId = parseInt(lastIdStr, 10) || 0;
    }

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
            const key = inv.tempId || inv.invoiceNumber;
            resultMapping[key] = officialId;
        }
    });

    if (newRows.length > 0) {
        sheet.getRange(lastRow + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
    }

    return jsonResponse({
        status: 'success',
        syncedCount: newRows.length,
        idMapping: resultMapping,
        nextId: padNumber(currentMaxId + 1, 3)
    });
}

function handleGetAllInvoices() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(INVOICES_SHEET);
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
        return jsonResponse({ invoices: [], maxId: 0, nextId: '001' });
    }

    const data = sheet.getRange(2, 6, lastRow - 1, 1).getValues();

    const invoices = data.map(row => {
        try { return JSON.parse(row[0]); } catch (e) { return null; }
    }).filter(x => x);

    const lastIdStr = sheet.getRange(lastRow, 2).getValue().toString();
    const maxId = parseInt(lastIdStr, 10) || 0;

    return jsonResponse({
        invoices: invoices.reverse(),
        maxId: maxId,
        nextId: padNumber(maxId + 1, 3)
    });
}

function handleGetNextId() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(INVOICES_SHEET);
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
        return jsonResponse({ nextId: '001', maxId: 0 });
    }

    const lastIdStr = sheet.getRange(lastRow, 2).getValue().toString();
    const maxId = parseInt(lastIdStr, 10) || 0;

    return jsonResponse({
        nextId: padNumber(maxId + 1, 3),
        maxId: maxId
    });
}

// ============ PRODUCT OPERATIONS ============

function handleGetProducts() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(PRODUCTS_SHEET);

    if (!sheet) {
        return jsonResponse({ products: [] });
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
        return jsonResponse({ products: [] });
    }

    const data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();

    const products = data.map(row => ({
        id: row[0],
        description: row[1],
        descriptionEn: row[2],
        price: row[3] || 0
    })).filter(p => p.id);

    return jsonResponse({ products: products });
}

function handleSaveProduct(product) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(PRODUCTS_SHEET);

    if (!sheet) {
        setup();
        sheet = ss.getSheetByName(PRODUCTS_SHEET);
    }

    const lastRow = sheet.getLastRow();
    let foundRow = -1;

    if (lastRow > 1) {
        const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (let i = 0; i < ids.length; i++) {
            if (ids[i][0] === product.id) {
                foundRow = i + 2;
                break;
            }
        }
    }

    const rowData = [
        product.id || ('prod_' + Date.now()),
        product.description || '',
        product.descriptionEn || '',
        product.price || 0
    ];

    if (foundRow > 0) {
        sheet.getRange(foundRow, 1, 1, 4).setValues([rowData]);
    } else {
        sheet.appendRow(rowData);
    }

    return jsonResponse({ status: 'success', product: { ...product, id: rowData[0] } });
}

function handleDeleteProduct(productId) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(PRODUCTS_SHEET);

    if (!sheet) {
        return errorResponse("Products sheet not found");
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
        return errorResponse("Product not found");
    }

    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
        if (ids[i][0] === productId) {
            sheet.deleteRow(i + 2);
            return jsonResponse({ status: 'success' });
        }
    }

    return errorResponse("Product not found");
}

// ============ HELPERS ============

function padNumber(num, length) {
    let s = num.toString();
    while (s.length < length) s = "0" + s;
    return s;
}

function jsonResponse(data) {
    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(msg) {
    return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: msg
    })).setMimeType(ContentService.MimeType.JSON);
}
