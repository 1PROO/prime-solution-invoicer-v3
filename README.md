# Prime Solution Invoicer v3

> **Professional Invoicing App** - React + TypeScript + Google Sheets backend

![Version](https://img.shields.io/badge/version-0.0.3-blue)
![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Desktop-orange)

---

## 📋 Overview

Prime Invoicer is a **dual-platform invoicing application** that runs both as a **Web App** (via Netlify) and a **Desktop App** (via Electron). It uses Google Sheets as a backend database through Google Apps Script, enabling **offline-first functionality** with cloud sync.

### Key Features
- 🔐 **Authentication System** (Web only - Electron auto-logins as Admin)
- 📄 **Invoice & Quote Generation** with live PDF-style preview
- 🌐 **Bilingual Support** (Arabic & English with RTL handling)
- ☁️ **Google Sheets Sync** for centralized data storage
- 🏪 **Inventory Manager** for reusable product templates
- 👥 **Client Manager** with auto-complete suggestions
- 📱 **Mobile Responsive** design
- 🔄 **Auto Updates** for Desktop app (Electron)

---

## 🗂️ Project Structure

```
src/
├── App.tsx                     # Main application component
├── main.tsx                    # React entry point
├── components/
│   ├── BrandLogo.tsx           # Animated logo component
│   ├── InvoiceEditor.tsx       # Form for editing invoice data
│   ├── InvoicePreview.tsx      # Real-time invoice preview
│   ├── InvoicesList.tsx        # All Invoices view (fetched from Sheets)
│   ├── LoginPage.tsx           # Web login page
│   └── SettingsModal.tsx       # Admin settings (API URL config)
├── constants/
│   └── config.ts               # Hardcoded defaults (API URL, Passwords)
├── context/
│   └── AuthContext.tsx         # Authentication state management
├── services/
│   ├── InvoiceService.ts       # Invoice calculations and creation
│   └── SyncService.ts          # Google Sheets API communication
├── types/
│   └── index.ts                # TypeScript interfaces
└── server/
    └── Code.js                 # Google Apps Script backend code

electron/
├── main.cjs                    # Electron main process
└── preload.cjs                 # Preload script (exposes APIs)
```

---

## 🔧 Configuration

### `src/constants/config.ts`
```typescript
export const DEFAULT_SCRIPT_URL = '...'  // Google Apps Script URL
export const ADMIN_PASS = 'Ahmed@admin'  // Admin password (full access)
export const USER_PASS = 'Admin@12345'   // User password (limited)
```

### Environment Variables (`.env`)
```
GH_TOKEN=your_github_token_here  # For auto-update releases
```

---

## 📦 Services

### `InvoiceService.ts`
| Function | Description |
|----------|-------------|
| `calculateTotal(invoice)` | Calculates subtotal + tax for an invoice |
| `createEmptyDraft()` | Returns a new blank invoice with defaults |
| `generateOfflineId()` | Generates a temporary ID like `OFF-M5KL8T` |

### `SyncService.ts`
| Function | Description |
|----------|-------------|
| `getScriptUrl()` | Returns API URL from localStorage or default |
| `setScriptUrl(url)` | Saves custom API URL to localStorage |
| `validateConnection(url)` | Tests if a URL is a valid GAS endpoint |
| `syncInvoices(invoices[])` | Sends pending invoices to server (returns ID mapping) |
| `fetchLatest()` | Fetches the most recent invoices from Google Sheets |

---

## 🔐 Authentication

### Web Mode
- **Admin Login**: `Ahmed@admin` → Full access, can edit Settings
- **User Login**: `Admin@12345` → Must enter name, limited access

### Electron/Desktop Mode
**Auto-login as Admin** - No password prompt, immediate access.

### How it Works
`AuthContext.tsx` checks `window.electronAPI?.isElectron`:
- If `true` → user is auto-set to `{ name: 'Admin', role: 'admin' }`
- If `false` → normal login flow via `LoginPage.tsx`

---

## ☁️ Google Sheets Backend

### Server Code (`src/server/Code.js`)
This file is deployed as a **Google Apps Script Web App**:

| Action | Description |
|--------|-------------|
| `SYNC_INVOICES` | Receives pending invoices, assigns sequential IDs, saves to Sheet |
| `GET_LATEST` | Returns the most recent 50 invoices as JSON |

### How to Deploy
1. Create a new Google Sheet
2. Go to **Extensions > Apps Script**
3. Paste the code from `src/server/Code.js`
4. Run `setup()` function once (creates headers)
5. Deploy as Web App (Execute as: Me, Access: Anyone)
6. Copy the Deployment URL

---

## 💾 Data Flow

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│   UI/Form   │ ───▶ │ LocalStorage│ ───▶ │ Google Sheet │
│ (React)     │      │ (Offline)   │      │ (Cloud Sync) │
└─────────────┘      └─────────────┘      └──────────────┘
                           ▲                     │
                           └─── Sync Response ───┘
```

1. Invoice is created in `App.tsx`
2. Saved to `localStorage` with `syncStatus: 'pending'`
3. `SyncService.syncInvoices()` sends to Google Apps Script
4. Server assigns official sequential ID (e.g., `001`, `002`)
5. Response updates local invoice with official ID

---

## 🖨️ Components

### `InvoiceEditor.tsx`
Large form component for editing all invoice fields:
- General info (number, date, currency)
- Seller/Client information
- Line items with quantity/price
- Tax toggle and notes
- **Modals**: Add Item, Inventory Manager

### `InvoicePreview.tsx`
Live A4-style preview of the invoice, optimized for printing.

### `InvoicesList.tsx`
Grid view of all invoices fetched from Google Sheets:
- Search by client name or number
- "View" button loads invoice into editor
- Shows status (sync indicator)

### `SettingsModal.tsx`
Admin-only component to:
- View/Edit the Google Apps Script URL
- Test connection
- Reset to default URL

---

## 🖥️ Electron (Desktop App)

### `electron/main.cjs`
- Creates the BrowserWindow
- Handles auto-updater events
- IPC handlers for update download/install

### `electron/preload.cjs`
Exposes to renderer:
```javascript
window.electronAPI = {
    onUpdateStatus: (callback) => ...,
    downloadUpdate: () => ...,
    installUpdate: () => ...,
    isElectron: true  // Used for auto-login detection
}
```

### Auto Updates
- Uses `electron-updater` with GitHub Releases
- Checks for updates on app launch
- User can download and install via UI notification

---

## 🚀 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (port 3000) |
| `npm run build` | Build production bundle to `dist/` |
| `npm run electron:dev` | Run Electron with hot-reload |
| `npm run electron:build` | Build Electron app + installer |
| `🚀 Publish Update.bat` | Interactive release script (version bump + GitHub publish) |

---

## 📝 Types (`src/types/index.ts`)

### `InvoiceData`
```typescript
interface InvoiceData {
    language: 'en' | 'ar';
    documentType: 'invoice' | 'quote';
    title: string;
    invoiceNumber: string;      // e.g., "001" or "OFF-M5K"
    date: string;
    dueDate: string;
    currency: string;           // EGP, USD, SAR, EUR
    
    // Seller
    sellerName: string;
    sellerEmail: string;
    sellerAddress: string;
    sellerPhone: string;
    
    // Client
    clientName: string;
    clientAddress: string;
    clientPhone: string;
    
    // Items
    items: InvoiceItem[];
    notes: string;
    taxRate: number;
    enableTax: boolean;
    logoUrl: string | null;
    
    // Sync Fields
    id?: string;                // Local UUID
    syncStatus?: 'synced' | 'pending' | 'error' | 'unsaved';
    tempId?: string;            // Temporary ID (e.g., "OFF-...")
    createdBy?: string;         // User who created it
    createdAt?: string;
}
```

### `InvoiceItem`
```typescript
interface InvoiceItem {
    id: string;
    description: string;
    descriptionEn?: string;
    quantity: number;
    price: number;
}
```

---

## 🐛 Troubleshooting

### Save not working (Electron)
Check if CORS or network issues are blocking the request. Open DevTools (Ctrl+Shift+I) and check Network tab for errors when syncing.

### Invoices not syncing
1. Ensure you're online
2. Check in Settings that the API URL is correct
3. Try "Sync" button manually
4. Check Google Script execution logs for errors

### Build fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist release
npm install
npm run build
```

---

## 📄 License
Private - Prime Solution © 2024
