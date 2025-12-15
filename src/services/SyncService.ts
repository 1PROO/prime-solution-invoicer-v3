/**
 * SyncService - Handles all communication with Google Apps Script
 * Features: Invoice sync, Products sync, User management, Connection status
 */

import { InvoiceData, SavedItem } from '../types';
import { DEFAULT_SCRIPT_URL } from '../constants/config';

interface SyncResult {
    status: 'success' | 'error';
    message?: string;
    idMapping?: { [key: string]: string };
    nextId?: string;
}

interface UserData {
    username: string;
    password?: string;
    role: 'admin' | 'user';
    status: 'active' | 'suspended';
    createdAt?: string;
}

interface LoginResult {
    status: 'success' | 'error' | 'suspended';
    message?: string;
    user?: {
        name: string;
        role: string;
        status: string;
    };
}

interface ActivityLog {
    username: string;
    action: string;
    timestamp: string;
    details: string;
}

// Storage keys
const STORAGE_KEY_URL = 'prime_google_script_url';
const STORAGE_KEY_INVOICES_CACHE = 'prime_invoices_cache';
const STORAGE_KEY_PRODUCTS_CACHE = 'prime_products_cache';
const STORAGE_KEY_LAST_SYNC = 'prime_last_sync_time';
const STORAGE_KEY_CONNECTION = 'prime_connection_status';

class SyncServiceClass {
    // ============ URL MANAGEMENT ============

    getScriptUrl(): string | null {
        return localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_SCRIPT_URL || null;
    }

    setScriptUrl(url: string): void {
        localStorage.setItem(STORAGE_KEY_URL, url);
    }

    // ============ CONNECTION STATUS ============

    getConnectionStatus(): 'connected' | 'disconnected' | 'unknown' {
        return (localStorage.getItem(STORAGE_KEY_CONNECTION) as any) || 'unknown';
    }

    setConnectionStatus(status: 'connected' | 'disconnected'): void {
        localStorage.setItem(STORAGE_KEY_CONNECTION, status);
    }

    async checkConnection(): Promise<boolean> {
        const url = this.getScriptUrl();
        if (!url) {
            this.setConnectionStatus('disconnected');
            return false;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'PING' })
            });
            const data = await response.json();

            if (data.status === 'success') {
                this.setConnectionStatus('connected');
                return true;
            }

            this.setConnectionStatus('disconnected');
            return false;
        } catch (e) {
            console.error("Connection check failed", e);
            this.setConnectionStatus('disconnected');
            return false;
        }
    }

    // ============ USER AUTHENTICATION ============

    async login(username: string, password: string): Promise<LoginResult> {
        const url = this.getScriptUrl();
        if (!url) {
            return { status: 'error', message: 'Script URL not configured' };
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'LOGIN', username, password })
            });
            const data = await response.json();
            this.setConnectionStatus('connected');
            return data;
        } catch (e) {
            console.error("Login failed", e);
            this.setConnectionStatus('disconnected');
            return { status: 'error', message: 'فشل الاتصال بالسيرفر' };
        }
    }

    // ============ USER MANAGEMENT ============

    async getUsers(): Promise<UserData[]> {
        const url = this.getScriptUrl();
        if (!url) return [];

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'GET_USERS' })
            });
            const data = await response.json();
            this.setConnectionStatus('connected');
            return data.users || [];
        } catch (e) {
            console.error("Get users failed", e);
            this.setConnectionStatus('disconnected');
            return [];
        }
    }

    async createUser(user: { username: string; password: string; role: string }): Promise<{ status: string; message?: string }> {
        const url = this.getScriptUrl();
        if (!url) return { status: 'error', message: 'Script URL not configured' };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'CREATE_USER', user })
            });
            const data = await response.json();
            this.setConnectionStatus('connected');
            return data;
        } catch (e) {
            console.error("Create user failed", e);
            this.setConnectionStatus('disconnected');
            return { status: 'error', message: 'فشل إنشاء المستخدم' };
        }
    }

    async updateUser(user: { username: string; role?: string; status?: string; password?: string }): Promise<{ status: string; message?: string }> {
        const url = this.getScriptUrl();
        if (!url) return { status: 'error', message: 'Script URL not configured' };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'UPDATE_USER', user })
            });
            const data = await response.json();
            this.setConnectionStatus('connected');
            return data;
        } catch (e) {
            console.error("Update user failed", e);
            this.setConnectionStatus('disconnected');
            return { status: 'error', message: 'فشل تحديث المستخدم' };
        }
    }

    async deleteUser(username: string): Promise<boolean> {
        const url = this.getScriptUrl();
        if (!url) return false;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'DELETE_USER', username })
            });
            const data = await response.json();
            this.setConnectionStatus('connected');
            return data.status === 'success';
        } catch (e) {
            console.error("Delete user failed", e);
            this.setConnectionStatus('disconnected');
            return false;
        }
    }

    // ============ ACTIVITY LOGS ============

    async getActivity(): Promise<ActivityLog[]> {
        const url = this.getScriptUrl();
        if (!url) return [];

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'GET_ACTIVITY' })
            });
            const data = await response.json();
            this.setConnectionStatus('connected');
            return data.activity || [];
        } catch (e) {
            console.error("Get activity failed", e);
            this.setConnectionStatus('disconnected');
            return [];
        }
    }

    // ============ CACHE MANAGEMENT ============

    getCachedInvoices(): InvoiceData[] {
        try {
            const cached = localStorage.getItem(STORAGE_KEY_INVOICES_CACHE);
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    }

    setCachedInvoices(invoices: InvoiceData[]): void {
        localStorage.setItem(STORAGE_KEY_INVOICES_CACHE, JSON.stringify(invoices));
        localStorage.setItem(STORAGE_KEY_LAST_SYNC, new Date().toISOString());
    }

    getCachedProducts(): SavedItem[] {
        try {
            const cached = localStorage.getItem(STORAGE_KEY_PRODUCTS_CACHE);
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    }

    setCachedProducts(products: SavedItem[]): void {
        localStorage.setItem(STORAGE_KEY_PRODUCTS_CACHE, JSON.stringify(products));
    }

    getLastSyncTime(): string | null {
        return localStorage.getItem(STORAGE_KEY_LAST_SYNC);
    }

    // ============ INVOICE OPERATIONS ============

    async fetchAllInvoices(): Promise<InvoiceData[]> {
        const url = this.getScriptUrl();
        if (!url) return this.getCachedInvoices();
        if (!navigator.onLine) return this.getCachedInvoices();

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'GET_ALL_INVOICES' })
            });
            const data = await response.json();
            const invoices = data.invoices || [];

            this.setCachedInvoices(invoices);
            this.setConnectionStatus('connected');

            return invoices;
        } catch (e) {
            console.error("Fetch All Invoices Failed", e);
            this.setConnectionStatus('disconnected');
            return this.getCachedInvoices();
        }
    }

    async syncInvoices(pendingInvoices: InvoiceData[]): Promise<SyncResult> {
        const url = this.getScriptUrl();
        if (!url) {
            return { status: 'error', message: 'Script URL not configured' };
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'SYNC_INVOICES',
                    invoices: pendingInvoices
                })
            });

            const data = await response.json();
            this.setConnectionStatus('connected');

            if (data.status === 'success') {
                await this.fetchAllInvoices();
                return {
                    status: 'success',
                    idMapping: data.idMapping,
                    nextId: data.nextId
                };
            }

            return { status: 'error', message: data.message || 'Sync failed' };
        } catch (e) {
            console.error("Sync Invoices Failed", e);
            this.setConnectionStatus('disconnected');
            return { status: 'error', message: 'Network error' };
        }
    }

    async getNextInvoiceNumber(): Promise<string> {
        const url = this.getScriptUrl();

        if (!url || !navigator.onLine) {
            const cached = this.getCachedInvoices();
            if (cached.length === 0) return '001';

            const maxNum = Math.max(...cached.map(inv => {
                const num = parseInt(inv.invoiceNumber, 10);
                return isNaN(num) ? 0 : num;
            }));
            return String(maxNum + 1).padStart(3, '0');
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'GET_NEXT_ID' })
            });
            const data = await response.json();
            this.setConnectionStatus('connected');
            return data.nextId || '001';
        } catch (e) {
            console.error("Get Next ID Failed", e);
            this.setConnectionStatus('disconnected');
            const cached = this.getCachedInvoices();
            if (cached.length === 0) return '001';
            const maxNum = Math.max(...cached.map(inv => {
                const num = parseInt(inv.invoiceNumber, 10);
                return isNaN(num) ? 0 : num;
            }));
            return String(maxNum + 1).padStart(3, '0');
        }
    }

    // ============ PRODUCT OPERATIONS ============

    async fetchProducts(): Promise<SavedItem[]> {
        const url = this.getScriptUrl();
        if (!url) return this.getCachedProducts();
        if (!navigator.onLine) return this.getCachedProducts();

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'GET_PRODUCTS' })
            });
            const data = await response.json();
            const products = data.products || [];

            this.setCachedProducts(products);
            this.setConnectionStatus('connected');

            return products;
        } catch (e) {
            console.error("Fetch Products Failed", e);
            this.setConnectionStatus('disconnected');
            return this.getCachedProducts();
        }
    }

    async saveProduct(product: SavedItem): Promise<{ status: string; product?: SavedItem }> {
        const url = this.getScriptUrl();
        if (!url) return { status: 'error' };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'SAVE_PRODUCT', product })
            });
            const data = await response.json();
            this.setConnectionStatus('connected');

            if (data.status === 'success') {
                await this.fetchProducts();
            }
            return data;
        } catch (e) {
            console.error("Save Product Failed", e);
            this.setConnectionStatus('disconnected');
            return { status: 'error' };
        }
    }

    async deleteProduct(productId: string): Promise<boolean> {
        const url = this.getScriptUrl();
        if (!url) return false;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'DELETE_PRODUCT', productId })
            });
            const data = await response.json();
            this.setConnectionStatus('connected');

            if (data.status === 'success') {
                await this.fetchProducts();
                return true;
            }
            return false;
        } catch (e) {
            console.error("Delete Product Failed", e);
            this.setConnectionStatus('disconnected');
            return false;
        }
    }
}

export const SyncService = new SyncServiceClass();
