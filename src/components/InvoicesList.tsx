
import React, { useState, useEffect } from 'react';
import { SyncService } from '../services/SyncService';
import { InvoiceData } from '../types';
import { Search, RefreshCw, FileText, ArrowRight, Wallet } from 'lucide-react'; // Wallet icon works as "Bill/Invoice" generic
import { InvoiceService } from '../services/InvoiceService';

interface Props {
    onLoadInvoice: (data: InvoiceData) => void;
}

export function InvoicesList({ onLoadInvoice }: Props) {
    const [invoices, setInvoices] = useState<InvoiceData[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');

    const loadData = async () => {
        setLoading(true);
        setError('');
        // Ensure we are online and have a URL (which we do via config now)
        try {
            const data = await SyncService.fetchLatest();
            if (data.length === 0) {
                // It might be empty or error, but let's assume empty for now if no error thrown
            }
            //Sort by ID desc
            data.sort((a, b) => b.invoiceNumber.localeCompare(a.invoiceNumber));
            setInvoices(data);
        } catch (e) {
            setError('Failed to load invoices. Check connection.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filtered = invoices.filter(inv => {
        const s = search.toLowerCase();
        return inv.clientName.toLowerCase().includes(s) ||
            inv.invoiceNumber.toLowerCase().includes(s) ||
            inv.date.includes(s);
    });

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">All Invoices</h1>
                    <p className="text-gray-500 text-sm">Fetched from Google Sheets</p>
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
                        onClick={loadData}
                        disabled={loading}
                        className="p-2 bg-white border hover:bg-gray-50 rounded-lg text-gray-600 transition"
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
                                        <h3 className="font-bold text-gray-800">{inv.clientName}</h3>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-mono">{inv.invoiceNumber}</span>
                                    </div>
                                </div>
                                {inv.status === 'Paid' ? (
                                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded">PAID</span>
                                ) : (
                                    <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">Unpaid</span>
                                )}
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
                                {/* We can add 'Created By' if it exists in the data later */}
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
