
import React, { useState, useEffect } from 'react';
import { SyncService } from '../services/SyncService';
import { InvoiceData } from '../types';
import { Search, RefreshCw, FileText, ArrowRight } from 'lucide-react';
import { InvoiceService } from '../services/InvoiceService';

interface Props {
    onLoadInvoice: (data: InvoiceData) => void;
}

export function InvoicesList({ onLoadInvoice }: Props) {
    // Load from cache immediately
    const [invoices, setInvoices] = useState<InvoiceData[]>(() => SyncService.getCachedInvoices());
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [lastSync, setLastSync] = useState<string | null>(SyncService.getLastSyncTime());

    const loadData = async (forceRefresh = false) => {
        setLoading(true);
        setError('');

        try {
            // If we have cached data and not forcing refresh, use it
            if (!forceRefresh && invoices.length > 0) {
                setLoading(false);
                return;
            }

            const data = await SyncService.fetchAllInvoices();
            // Sort by ID desc
            data.sort((a, b) => b.invoiceNumber.localeCompare(a.invoiceNumber));
            setInvoices(data);
            setLastSync(SyncService.getLastSyncTime());
        } catch (e) {
            setError('Failed to load invoices. Check connection.');
            // Fall back to cache
            const cached = SyncService.getCachedInvoices();
            if (cached.length > 0) {
                setInvoices(cached);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // If cache is empty, fetch from server
        if (invoices.length === 0) {
            loadData(true);
        }
    }, []);

    const filtered = invoices.filter(inv => {
        const s = search.toLowerCase();
        return inv.clientName.toLowerCase().includes(s) ||
            inv.invoiceNumber.toLowerCase().includes(s) ||
            inv.date.includes(s);
    });

    const formatSyncTime = (isoString: string | null) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto h-full overflow-y-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">All Invoices</h1>
                    <p className="text-gray-500 text-sm flex items-center gap-2">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            {invoices.length} invoices
                        </span>
                        {lastSync && (
                            <span className="text-gray-400">• Last sync: {formatSyncTime(lastSync)}</span>
                        )}
                    </p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-grow md:flex-grow-0">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            placeholder="Search..."
                            className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-64 focus:ring-2 ring-brand-500 outline-none"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => loadData(true)}
                        disabled={loading}
                        className="p-2 bg-white border hover:bg-gray-50 rounded-lg text-gray-600 transition flex items-center gap-1"
                        title="Refresh from server"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">
                    {error}
                </div>
            )}

            {loading && invoices.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <RefreshCw className="animate-spin mx-auto mb-2" size={30} />
                    Loading invoices...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(inv => (
                        <div key={inv.invoiceNumber} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition group">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="bg-brand-50 text-brand-600 p-2 rounded-lg">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">{inv.clientName || 'Unnamed'}</h3>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-mono">{inv.invoiceNumber}</span>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded ${inv.syncStatus === 'synced' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {inv.syncStatus === 'synced' ? 'Synced' : 'Pending'}
                                </span>
                            </div>

                            <div className="flex justify-between items-end border-t border-gray-50 pt-3 mt-1">
                                <div>
                                    <p className="text-xs text-gray-400">Total Amount</p>
                                    <p className="font-bold text-lg text-gray-800">{inv.currency} {InvoiceService.calculateTotal(inv).toLocaleString()}</p>
                                </div>
                                <button
                                    onClick={() => onLoadInvoice(inv)}
                                    className="text-brand-600 hover:text-brand-800 text-sm font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                                >
                                    View <ArrowRight size={16} />
                                </button>
                            </div>
                            <div className="mt-2 text-right">
                                <span className="text-[10px] text-gray-400">{inv.date}</span>
                                {inv.createdBy && <span className="text-[10px] text-gray-400 ml-2">• by {inv.createdBy}</span>}
                            </div>
                        </div>
                    ))}

                    {filtered.length === 0 && !loading && (
                        <div className="col-span-full text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                            No invoices found.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
