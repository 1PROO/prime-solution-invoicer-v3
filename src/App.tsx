
import React, { useState, useEffect, useRef } from 'react';
import { InvoiceData } from './types';
import { InvoiceEditor } from './components/InvoiceEditor';
import { InvoicePreview } from './components/InvoicePreview';
import { InvoicesList } from './components/InvoicesList';
import { Printer, History, X, Save, Database, Upload, FileDown, Plus, Search, Cloud, RefreshCw, Settings, LogOut, FileText, User } from 'lucide-react';
import { BrandLogo } from './components/BrandLogo';
import { SettingsModal } from './components/SettingsModal';
import { SyncService } from './services/SyncService';
import { InvoiceService } from './services/InvoiceService';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';

const STORAGE_KEY = 'prime_solution_invoice_data';
const HISTORY_KEY = 'prime_solution_invoice_history';
const INVENTORY_KEY = 'prime_saved_items';

const initialInvoice = InvoiceService.createEmptyDraft();

export default function App() {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState<'create' | 'list'>('create');

  const [invoice, setInvoice] = useState<InvoiceData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialInvoice;
  });

  const [invoiceHistory, setInvoiceHistory] = useState<InvoiceData[]>(() => {
    const savedHistory = localStorage.getItem(HISTORY_KEY);
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [updateStatus, setUpdateStatus] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- Effects --
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoice));
  }, [invoice]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(invoiceHistory));
  }, [invoiceHistory]);

  // Handle "Created By" tracking when User logs in
  useEffect(() => {
    if (user && !invoice.createdBy) {
      setInvoice(prev => ({ ...prev, createdBy: user.name }));
    }
  }, [user]);

  if (!user) {
    return <LoginPage />;
  }

  const handlePrint = () => window.print();

  // --- NEW INVOICE LOGIC ---

  const handleNewInvoice = () => {
    if (confirm(invoice.language === 'ar' ? 'إنشاء فاتورة جديدة؟ سيتم فقدان التغييرات غير المحفوظة.' : 'Create new invoice? Unsaved changes will be lost.')) {
      const newDraft = InvoiceService.createEmptyDraft();
      if (user) newDraft.createdBy = user.name;
      setInvoice(newDraft);
      setActiveView('create');
    }
  };

  const saveToHistory = async () => {
    const isOffline = !navigator.onLine;
    let newInv = { ...invoice };

    // 1. Assign ID if needed (First Save)
    if (newInv.syncStatus === 'unsaved') {
      newInv.syncStatus = 'pending';
      if (isOffline) {
        newInv.invoiceNumber = InvoiceService.generateOfflineId();
        newInv.tempId = newInv.invoiceNumber;
      } else {
        // We are Online: TENTATIVELY assign temp ID, but we will try to Synced immediately
        newInv.invoiceNumber = InvoiceService.generateOfflineId();
        newInv.tempId = newInv.invoiceNumber;
      }
    }

    // Ensure createdBy is set
    if (!newInv.createdBy && user) {
      newInv.createdBy = user.name;
    }

    // 2. Save locally first (Optimistic UI)
    const existingIndex = invoiceHistory.findIndex(i => i.id === newInv.id);
    let updatedHistory = [...invoiceHistory];

    if (existingIndex >= 0) {
      updatedHistory[existingIndex] = newInv;
    } else {
      updatedHistory = [newInv, ...updatedHistory];
    }
    setInvoiceHistory(updatedHistory);
    setInvoice(newInv); // Update current view with the (potentially) new ID

    // 3. Try to Sync immediately if Online
    if (!isOffline && SyncService.getScriptUrl()) {
      await performSync(updatedHistory);
    } else {
      alert(invoice.language === 'ar' ? 'تم الحفظ محلياً (غير متزامن)' : 'Saved locally (Unsynced)');
    }
  };

  const performSync = async (currentHistory: InvoiceData[] = invoiceHistory) => {
    if (!SyncService.getScriptUrl()) {
      setShowSettings(true);
      return;
    }

    setIsSyncing(true);
    const pending = currentHistory.filter(i => i.syncStatus === 'pending');

    // 1. SYNC UP (Send Pending)
    if (pending.length > 0) {
      const result = await SyncService.syncInvoices(pending);

      if (result.status === 'success' && result.idMapping) {
        // Update Local IDs with Official IDs
        const newHistory = currentHistory.map(inv => {
          const key = inv.tempId || inv.invoiceNumber;
          if (result.idMapping && result.idMapping[key]) {
            return {
              ...inv,
              invoiceNumber: result.idMapping[key],
              syncStatus: 'synced' as const,
              tempId: undefined // Clear temp ID
            };
          }
          return inv;
        });
        currentHistory = newHistory; // Update ref
        setInvoiceHistory(newHistory);
        alert('Sync Complete! Official IDs assigned.');
      } else if (result.status === 'error') {
        alert('Sync Error: ' + result.message);
      }
    }

    // 2. SYNC DOWN (Fetch Latest) - Optional for this button, but good practice
    // For now we keep it simple or we can fetch latest to update local cache

    setIsSyncing(false);
  };

  const filteredHistory = invoiceHistory.filter(inv => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.clientName.toLowerCase().includes(q) ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.date.includes(q)
    );
  });

  const loadFromHistory = (savedInvoice: InvoiceData) => {
    if (confirm('Load this invoice?')) {
      setInvoice(savedInvoice);
      setShowHistory(false);
      setActiveView('create');
    }
  };

  const deleteFromHistory = (id: string) => {
    if (confirm('Delete this invoice permanently?')) {
      const newHistory = invoiceHistory.filter(inv => inv.id !== id);
      setInvoiceHistory(newHistory);
    }
  };

  const handleDownloadPDF = () => {
    document.body.classList.add('is-printing');
    window.print();
    document.body.classList.remove('is-printing');
  };

  const handleBackup = () => {
    const backupData = {
      version: 1,
      date: new Date().toISOString(),
      currentDraft: invoice,
      history: invoiceHistory,
      inventory: JSON.parse(localStorage.getItem(INVENTORY_KEY) || '[]')
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `prime_solution_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.currentDraft) setInvoice(json.currentDraft);
        if (json.history) {
          setInvoiceHistory(json.history);
        }
        if (json.inventory) {
          localStorage.setItem(INVENTORY_KEY, JSON.stringify(json.inventory));
          alert('Data restored successfully!');
          window.location.reload();
        } else {
          alert('Data restored successfully!');
        }
        setShowDataModal(false);
      } catch (err) {
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
  };

  // --- RENDER ---
  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col ${invoice.language === 'ar' ? 'font-cairo' : 'font-inter'}`}>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} isAdmin={user.role === 'admin'} />

      {/* Navbar */}
      <nav className="no-print bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-brand-500 rounded p-1">
              <BrandLogo variant="light" className="scale-60 origin-center" />
            </div>
            <span className="font-bold text-xl text-gray-800 hidden md:block">Prime Invoicer</span>

            {/* Navigation Tabs */}
            <div className="ml-6 flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveView('create')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${activeView === 'create' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Create
              </button>
              <button
                onClick={() => setActiveView('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${activeView === 'list' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                All Invoices
              </button>
            </div>
          </div>

          <div className="flex gap-2 items-center">

            <div className='hidden md:flex flex-col items-end mr-2'>
              <span className='text-xs text-gray-400 font-medium uppercase'>Logged in as</span>
              <span className='text-sm font-bold text-gray-700 flex items-center gap-1'>
                <User size={14} className='text-brand-500' /> {user.name}
              </span>
            </div>

            {/* Sync Button */}
            <button
              onClick={() => performSync()}
              disabled={isSyncing}
              className={`p-2 rounded-lg text-sm font-medium transition
                 ${isSyncing ? 'bg-yellow-50 text-yellow-600' : 'hover:bg-gray-100 text-gray-600'}
               `}
              title="Sync Pending Invoices"
            >
              <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
            </button>

            {/* Local History (Legacy) */}
            <button
              onClick={() => setShowHistory(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              title="Local Drafts"
            >
              <History size={20} />
            </button>

            {/* Settings (Admin Only) */}
            {user.role === 'admin' && (
              <button
                onClick={() => setShowSettings(true)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg"
                title="Settings"
              >
                <Settings size={20} />
              </button>
            )}

            <div className="h-6 w-px bg-gray-300 mx-1"></div>

            {/* Save Button (Only in Create Mode) */}
            {activeView === 'create' && (
              <>
                <button
                  onClick={saveToHistory}
                  className="hidden sm:flex items-center gap-2 text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-lg font-medium transition text-sm shadow-sm"
                >
                  <Save size={18} />
                  <span>Save</span>
                </button>

                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-300 hover:bg-gray-100 text-gray-700 p-2 rounded-lg font-medium transition shadow-sm text-sm"
                  title="Print / Download PDF"
                >
                  <Printer size={18} />
                </button>
              </>
            )}

            <button
              onClick={logout}
              className='ml-2 text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition'
              title="Logout"
            >
              <LogOut size={20} />
            </button>

          </div>
        </div>
      </nav>

      {/* Main Content Switch */}
      <main className="flex-grow w-full relative">
        {activeView === 'list' ? (
          <InvoicesList onLoadInvoice={loadFromHistory} />
        ) : (
          <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-4 no-print order-2 lg:order-1">
                <InvoiceEditor data={invoice} onChange={setInvoice} />
              </div>
              <div className="lg:col-span-8 sticky top-24 order-1 lg:order-2 mb-8 lg:mb-0">
                <div className={`flex flex-col items-center p-4 rounded-xl transition-all bg-gray-50 border-2 border-dashed border-gray-200 shadow-sm print:shadow-none print:border-none print:bg-white print:p-0 print:m-0 overflow-x-auto`}>
                  <InvoicePreview data={invoice} onUpdate={setInvoice} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* History Sidebar with Search */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end no-print">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowHistory(false)}></div>
          <div className="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg flex items-center gap-2 text-gray-800">
                  <History size={20} /> Local Drafts
                </h2>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-gray-200 rounded-full">
                  <X size={20} />
                </button>
              </div>
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search client, number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-3">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>No invoices found in local storage.</p>
                </div>
              ) : (
                filteredHistory.map((inv) => (
                  <div key={inv.id || Math.random()} className="border rounded-lg p-3 hover:border-brand-500 transition-colors bg-white shadow-sm group relative overflow-hidden">
                    {/* Status Strip */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${inv.syncStatus === 'synced' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>

                    <div className="flex justify-between items-start mb-2 pl-3">
                      <div>
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          {inv.clientName || 'Unnamed'}
                        </h3>
                        <p className="text-xs text-gray-500 flex items-center gap-2">
                          <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${inv.syncStatus === 'synced' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {inv.invoiceNumber}
                          </span>
                          • {inv.date}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-gray-700">{inv.currency} {InvoiceService.calculateTotal(inv).toLocaleString()}</span>
                    </div>

                    <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100 pl-3">
                      <button onClick={() => loadFromHistory(inv)} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded">Load</button>
                      <button onClick={() => deleteFromHistory(inv.id!)} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded">Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Data Sync Modal */}
      {showDataModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 no-print">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDataModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-5">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Database size={24} className="text-brand-600" /> Data Backup & Restore
                </h3>
                <button onClick={() => setShowDataModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                  <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2"><FileDown size={18} /> Backup</h4>
                  <p className="text-xs text-blue-700 mb-3">Download a backup file containing your current invoice, history, and inventory. Save this file to transfer data to another device.</p>
                  <button onClick={handleBackup} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition">
                    Download Backup File
                  </button>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg">
                  <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2"><Upload size={18} /> Restore</h4>
                  <p className="text-xs text-purple-700 mb-3">Upload a backup file to restore your data on this device. Warning: This will overwrite current data.</p>
                  <button onClick={handleRestoreClick} className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-purple-700 transition">
                    Upload Backup File
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleRestoreFile}
                    accept=".json"
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile-only view notice */}
      <div className="lg:hidden p-4 text-center text-xs text-gray-400 no-print">
        Tip: For best printing results, use a desktop computer.
      </div>
    </div>
  );
}
