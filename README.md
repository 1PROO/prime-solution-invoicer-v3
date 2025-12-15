# Prime Solution Invoicer V3 🚀

A powerful, modern, and offline-capable invoicing system built with React, TypeScript, and Google Apps Script. Designed for speed, flexibility, and seamless data synchronization.

![App Screenshot](https://via.placeholder.com/800x400?text=Prime+Solution+Invoicer+V3)

## ✨ Key Features

### ⚡ **Smart & Efficient Editor**
*   **Sticky Actions**: "Add Product" button stays visible at the bottom, making it easy to add items to long invoices.
*   **Smart Autocomplete**: Type a product name, and the system intelligently suggests saved products and auto-fills prices.
*   **Unified Sections**: Grouped "Invoice Details", "Seller Info", and "Client Info" in collapsible sections to save screen space.
*   **Left Toggle Panel**: Quickly hide/show the editor sidebar to focus on the preview.

### 🛠️ **Advanced User Management** (New!)
*   **Role-Based Access**:
    *   **Admin**: Full access, manage users, view passwords, global settings.
    *   **Manager**: Manage invoices and view activity (customizable).
    *   **User**: Create and edit invoices only.
*   **Secure Authentication**: Server-side validation with Google Apps Script.
*   **Password Management**: Admins can view and reset user passwords securely.
*   **Account Suspension**: Suspend users with custom messages (e.g., "Subscription Expired").

### 🌍 **Global Settings & Localization** (New!)
*   **Global Defaults**: Set default "Seller Info" (Company Name, Address) and "Notes/Terms" that appear on every new invoice automatically.
*   **Dual Language Support**:
    *   **App Language**: Switch the entire interface between Arabic (RTL) and English (LTR).
    *   **Invoice Language**: Generate invoices in Arabic or English, independent of the app language.

### 📡 **Hybrid Data Sync**
*   **Offline-First**: Create and save invoices without internet. Data syncs automatically when online.
*   **Google Sheets Backend**: All data (Invoices, Products, Users, Activity) is stored safely in your Google Sheet.
*   **Connection Status**: Real-time indicator (Green/Red) showing server connection health.

---

## 🚀 Getting Started

### 1. **Prerequisites**
*   Node.js installed on your machine.
*   A Google Account (for Google Sheets backend).

### 2. **Installation**
```bash
# Clone the repository
git clone https://github.com/yourusername/prime-solution-invoicer-v3.git

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 3. **Backend Setup (Google Apps Script)**
> **IMPORTANT**: This step is required for User Management and Sync to work.

1.  Go to [script.google.com](https://script.google.com/home).
2.  Create a **New Project**.
3.  Copy the content of `src/server/Code.js` from this project.
4.  Paste it into the script editor (replace existing code).
5.  Click **Deploy** > **New Deployment**.
6.  Select **Web App**.
7.  Set **Who has access** to **Anyone**.
8.  Click **Deploy** and copy the **Web App URL**.
9.  Run the `setup()` function inside the script editor once to initialize the Sheets (`Users`, `GlobalSettings`, etc.).

### 4. **Configuration**
1.  Open the App.
2.  Log in with default credentials:
    *   **User**: `Admin`
    *   **Password**: `Ahmed@admin`
3.  Go to **Settings** > **Config**.
4.  Paste your **Web App URL**.
5.  Click **Save**.

---

## 📖 User Guide

### **Creating Invoices**
1.  Click **Create** in the navigation bar.
2.  **Add Products**:
    *   Type in the "Description" field to see suggestions from your inventory.
    *   Click "Add Item" or use the sticky button at the bottom.
3.  **Client Info**:
    *   Type a client name to search saved clients or enter a new one.
4.  **Save/Print**: Use the top toolbar to Save (Sync) or Print (PDF).

### **Admin Dashboard**
Access via the **Settings** tab (Admins only).
*   **Dashboard**: Overview of total users, activity, and settings.
*   **Users**: Add, edit, suspend, or delete users. View/Change passwords.
*   **Global Defaults**: Set your company details and default terms here.
*   **Activity**: View a log of who logged in and when.

### **Desktop App (Electron)**
*   The desktop version enables **Auto-Login** for specific users (e.g., `Shrif`).
*   Build the app using `npm run electron:build`.

---

## 🛠️ Troubleshooting

*   **Red Dot (Disconnected)**: Check your internet connection or verify the Script URL in Settings.
*   **Blank Settings Page**: Ensure you have redeployed the Google Apps Script code, as the app relies on the new backend structure.
*   **Formatting Issues**: Use Chrome or Edge for the best printing results.

---

**Version**: 3.2.0 "Advanced Edition"
**Developer**: [Your Name/Ahmed]
