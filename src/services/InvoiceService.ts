
import { InvoiceData } from '../types';

export const InvoiceService = {
    calculateTotal(invoice: InvoiceData): number {
        const subtotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const tax = invoice.enableTax ? (subtotal * (invoice.taxRate / 100)) : 0;
        return subtotal + tax;
    },

    createEmptyDraft(defaultData: Partial<InvoiceData> = {}): InvoiceData {
        return {
            language: 'ar',
            documentType: 'invoice',
            title: 'فاتورة',
            invoiceNumber: 'DRAFT', // Placeholder
            date: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            currency: 'EGP',
            sellerName: 'Prime Solution',
            sellerEmail: 'info@primesolution.com',
            sellerPhone: '+20 100 341 8966',
            sellerAddress: '220 ترعة الجبل، حدائق القبة، القاهرة، مصر',
            clientName: '',
            clientAddress: '',
            clientPhone: '',
            items: [
                { id: '1', description: 'منتج / خدمة', quantity: 1, price: 0 },
            ],
            notes: '',
            taxRate: 14,
            enableTax: false,
            logoUrl: null,

            // New Fields
            id: crypto.randomUUID(), // Local UUID
            syncStatus: 'unsaved',
            createdAt: new Date().toISOString()
        };
    },

    // Generates a Temporary Offline ID
    generateOfflineId(): string {
        // Format: OFF-{TimestampBase36} (Short and unique enough for local)
        return `OFF-${Date.now().toString(36).toUpperCase()}`;
    }
};
