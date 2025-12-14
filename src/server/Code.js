/**
 * HAWK EYES SERVER - GOOGLE APPS SCRIPT
 * -------------------------------------
 * This script acts as the Single Source of Truth for the Invoicer App.
 * It strictly enforces comprehensive sequential numbering using LockService.
 * 
 * INSTRUCTIONS:
 * 1. Create a new Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this code entirely.
 * 4. Run `setup()` function once to initialize headers.
 * 5. Deploy as Web App (Execute as: Me, Access: Anyone).
 * 6. Copy the Deployment URL to the App.
 */

const SHEET_NAME = 'Invoices';
const LOCK_WAIT_MS = 30000; // Wait up to 30s for lock

function setup() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME);
        // Headers
        sheet.appendRow([
            'Date Created',
            'Invoice #',
            'Client Name',
            'Total',
            'UUID',
            'Data JSON'
        ]);
        sheet.setFrozenRows(1);
    }
}

function doPost(e) {
    const lock = LockService.getScriptLock();

    try {
        // 1. Acquire Lock (Critical for Atomic Numbering)
        const success = lock.tryLock(LOCK_WAIT_MS);
        if (!success) {
            return errorResponse("Server is busy, try again.");
        }

        // 2. Parse Request
        const payload = JSON.parse(e.postData.contents);
        const action = payload.action;

        if (action === 'SYNC_INVOICES') {
            return handleSyncInvoices(payload.invoices);
        } else if (action === 'GET_LATEST') {
            return handleGetLatest();
        } else {
            return errorResponse("Unknown action");
        }

    } catch (err) {
        return errorResponse(err.toString());
    } finally {
        // 3. Release Lock
        lock.releaseLock();
    }
}

function handleSyncInvoices(invoices) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const resultMapping = {}; // { tempId: "005" }

    // 1. Determine Next ID
    // We read the last row's Column B (Invoice #). 
    // If empty, start at 1.
    const lastRow = sheet.getLastRow();
    let currentMaxId = 0;

    if (lastRow > 1) {
        const lastIdStr = sheet.getRange(lastRow, 2).getValue().toString();
        // Remove non-numeric if strictly numeric is desired, or parse "005" -> 5
        currentMaxId = parseInt(lastIdStr, 10) || 0;
    }

    // 2. Process Invoices
    const newRows = [];

    invoices.forEach(inv => {
        // Increment ID
        currentMaxId++;

        // Format ID (e.g., 001, 002...)
        const officialId = padNumber(currentMaxId, 3);

        // Create Saved Record
        const cleanInv = { ...inv, invoiceNumber: officialId, syncStatus: 'synced' };

        // Prepare Row
        newRows.push([
            new Date(),
            officialId,
            inv.clientName,
            inv.total || 0,
            inv.id || Utilities.getUuid(),
            JSON.stringify(cleanInv)
        ]);

        // Map response if it had a temp ID
        if (inv.tempId || inv.invoiceNumber.startsWith('OFF-')) {
            const key = inv.tempId || inv.invoiceNumber; // simple fallback
            resultMapping[key] = officialId;
        }
    });

    // 3. Save to Sheet (Batch operation)
    if (newRows.length > 0) {
        sheet.getRange(lastRow + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
    }

    return jsonResponse({
        status: 'success',
        syncedCount: newRows.length,
        idMapping: resultMapping,
        nextId: currentMaxId + 1 // Tell client what the next likely ID is
    });
}

function handleGetLatest() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
        return jsonResponse({ invoices: [], maxId: 0 });
    }

    // Return last 50 invoices for app history
    // Optimization: Read JSON column (Col 6)
    const startRow = Math.max(2, lastRow - 49);
    const data = sheet.getRange(startRow, 6, lastRow - startRow + 1, 1).getValues();

    const invoices = data.map(row => {
        try { return JSON.parse(row[0]); } catch (e) { return null; }
    }).filter(x => x);

    const lastIdStr = sheet.getRange(lastRow, 2).getValue().toString();
    const maxId = parseInt(lastIdStr, 10) || 0;

    return jsonResponse({
        invoices: invoices.reverse(), // Newest first
        maxId: maxId
    });
}

// Helpers
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
