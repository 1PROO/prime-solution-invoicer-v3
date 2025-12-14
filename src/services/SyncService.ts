
import { InvoiceData } from '../types';

import { DEFAULT_SCRIPT_URL } from '../constants/config';

const SCRIPT_URL_KEY = 'prime_sync_script_url';

export interface SyncResult {
    status: 'success' | 'error' | 'offline';
    message?: string;
    updatedInvoices?: InvoiceData[]; // valid invoices returned from server
    idMapping?: Record<string, string>; // { "OFF-1": "005" }
}

export const SyncService = {
    getScriptUrl: () => localStorage.getItem(SCRIPT_URL_KEY) || DEFAULT_SCRIPT_URL,

    setScriptUrl: (url: string) => localStorage.setItem(SCRIPT_URL_KEY, url),

    async validateConnection(url: string): Promise<boolean> {
        try {
            // Small ping by trying to get latest (limit 1)
            const res = await fetch(url, {
                method: 'POST',
                body: JSON.stringify({ action: 'GET_LATEST' })
            });
            const json = await res.json();
            return !!json.maxId || json.maxId === 0;
        } catch (e) {
            console.error("Connection Check Failed", e);
            return false;
        }
    },

    async syncInvoices(pendingInvoices: InvoiceData[]): Promise<SyncResult> {
        const url = this.getScriptUrl();
        if (!url) return { status: 'error', message: "No Sync URL Configured" };
        if (!navigator.onLine) return { status: 'offline', message: "No Internet Connection" };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' }, // Avoid Options preflight issues with GAS
                body: JSON.stringify({
                    action: 'SYNC_INVOICES',
                    invoices: pendingInvoices
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                return {
                    status: 'success',
                    idMapping: data.idMapping
                };
            } else {
                return { status: 'error', message: data.message };
            }

        } catch (e) {
            return { status: 'error', message: "Network Request Failed" };
        }
    },

    async fetchLatest(): Promise<InvoiceData[]> {
        const url = this.getScriptUrl();
        if (!url || !navigator.onLine) return [];

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'GET_LATEST' })
            });
            const data = await response.json();
            return data.invoices || [];
        } catch (e) {
            console.error("Fetch Latest Failed", e);
            return [];
        }
    }
};
