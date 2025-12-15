
import React, { useState, useEffect, useRef } from 'react';
import { InvoiceData } from './types';
import { InvoiceEditor } from './components/InvoiceEditor';
import { InvoicePreview } from './components/InvoicePreview';
import { InvoicesList } from './components/InvoicesList';
import { SettingsPage } from './components/SettingsPage';
import { Printer, X, Save, Database, Upload, FileDown, RefreshCw, Settings, LogOut, User, Plus, Wifi, WifiOff, PanelLeftClose, PanelLeft } from 'lucide-react';
import { BrandLogo } from './components/BrandLogo';
import { SyncService } from './services/SyncService';
import { InvoiceService } from './services/InvoiceService';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';

const STORAGE_KEY = 'prime_solution_invoice_data';
const INVENTORY_KEY = 'prime_saved_items';

const initialInvoice = InvoiceService.createEmptyDraft();

export default function App() {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState<'create' | 'list' | 'settings'>('create');

  const [invoice, setInvoice] = useState<InvoiceData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialInvoice;
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [showEditor, setShowEditor] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- Effects --
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoice));
  }, [invoice]);

  // Handle "Created By" tracking when User logs in
  useEffect(() => {
    if (user && !invoice.createdBy) {
      setInvoice(prev => ({ ...prev, createdBy: user.name }));
    }
  }, [user]);

  // Initial sync and connection check on app load
  useEffect(() => {
    if (user && SyncService.getScriptUrl()) {
      // Check connection
      SyncService.checkConnection().then(connected => {
        setIsConnected(connected);
      });
      // Prefetch invoices and products to cache
      SyncService.fetchAllInvoices();
      SyncService.fetchProducts();
    }
  }, [user]);

  // Periodic connection check (every 30 seconds)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      SyncService.checkConnection().then(connected => {
        setIsConnected(connected);
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  if (!user) {
    return <LoginPage />;
  }

  const handleNewInvoice = async () => {
    const newDraft = InvoiceService.createEmptyDraft();
    if (user) newDraft.createdBy = user.name;
    setInvoice(newDraft);
    setActiveView('create');
  };

  const saveInvoice = async () => {
    const isOffline = !navigator.onLine;
    let newInv = { ...invoice };

    if (newInv.syncStatus === 'unsaved') {
      newInv.syncStatus = 'pending';
      newInv.invoiceNumber = InvoiceService.generateOfflineId();
      newInv.tempId = newInv.invoiceNumber;
    }

    if (!newInv.createdBy && user) {
      newInv.createdBy = user.name;
    }

    setInvoice(newInv);

    if (!isOffline && SyncService.getScriptUrl()) {
      await performSync(newInv);
    }
  };

  const performSync = async (invoiceToSync?: InvoiceData) => {
    if (!SyncService.getScriptUrl()) return;

    setIsSyncing(true);

    const pending = invoiceToSync ? [invoiceToSync] : [];

    if (pending.length > 0) {
      const result = await SyncService.syncInvoices(pending);

      if (result.status === 'success' && result.idMapping) {
        const key = invoice.tempId || invoice.invoiceNumber;
        if (result.idMapping[key]) {
          setInvoice(prev => ({
            ...prev,
            invoiceNumber: result.idMapping![key],
            syncStatus: 'synced' as const,
            tempId: undefined
          }));
        }
        setIsConnected(true);
      } else if (result.status === 'error') {
        setIsConnected(false);
      }
    } else {
      await SyncService.fetchAllInvoices();
    }

    setIsSyncing(false);
  };

  const loadFromList = (savedInvoice: InvoiceData) => {
    setInvoice({ ...savedInvoice });
    setActiveView('create');
  };

  const handleDownloadPDF = () => {
    document.body.classList.add('is-printing');
    window.print();
    document.body.classList.remove('is-printing');
  };

  const handleBackup = () => {
    const backupData = {
      version: 2,
      date: new Date().toISOString(),
      currentDraft: invoice,
      invoicesCache: SyncService.getCachedInvoices(),
      productsCache: SyncService.getCachedProducts(),
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
        if (json.inventory) {
          localStorage.setItem(INVENTORY_KEY, JSON.stringify(json.inventory));
        }
        if (json.invoicesCache) {
          SyncService.setCachedInvoices(json.invoicesCache);
        }
        if (json.productsCache) {
          SyncService.setCachedProducts(json.productsCache);
        }
        setShowDataModal(false);
        window.location.reload();
      } catch (err) {
        console.error("Restore failed", err);
      }
    };
    reader.readAsText(file);
  };

  // --- RENDER ---
  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col ${invoice.language === 'ar' ? 'font-cairo' : 'font-inter'}`}>

      {/* Navbar */}
      <nav className="no-print bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-brand-500 rounded p-1">
              <BrandLogo variant="light" className="scale-60 origin-center" />
            </div>
            <span className="font-bold text-xl text-gray-800 hidden md:block">Prime Invoicer</span>

            {/* Connection Indicator */}
            <div className="flex items-center gap-1 ml-2" title={isConnected ? 'متصل بالسيرفر' : 'غير متصل'}>
              {isConnected === null ? (
                <div className="w-2.5 h-2.5 rounded-full bg-gray-400 animate-pulse"></div>
              ) : isConnected ? (
                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
              ) : (
                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
              )}
              <span className="text-xs text-gray-500 hidden sm:inline">
                {isConnected === null ? '' : (isConnected ? (invoice.language === 'ar' ? 'متصل' : 'Online') : (invoice.language === 'ar' ? 'غير متصل' : 'Offline'))}
              </span>
            </div>

            {/* Navigation Tabs */}
            <div className="ml-4 flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveView('create')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${activeView === 'create' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {invoice.language === 'ar' ? 'إنشاء' : 'Create'}
              </button>
              <button
                onClick={() => setActiveView('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${activeView === 'list' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {invoice.language === 'ar' ? 'الفواتير' : 'Invoices'}
              </button>
              {/* Settings Tab (Admin Only) */}
              {user.role === 'admin' && (
                <button
                  onClick={() => setActiveView('settings')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-1 ${activeView === 'settings' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Settings size={14} />
                  {invoice.language === 'ar' ? 'الإعدادات' : 'Settings'}
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 items-center">

            <div className='hidden md:flex flex-col items-end mr-2'>
              <span className='text-xs text-gray-400 font-medium uppercase'>{invoice.language === 'ar' ? 'مسجل كـ' : 'Logged in as'}</span>
              <span className='text-sm font-bold text-gray-700 flex items-center gap-1'>
                <User size={14} className='text-brand-500' /> {user.name}
              </span>
            </div>

            {/* Sync/Refresh Button */}
            <button
              onClick={() => performSync()}
              disabled={isSyncing}
              className={`p-2 rounded-lg text-sm font-medium transition
                 ${isSyncing ? 'bg-yellow-50 text-yellow-600' : 'hover:bg-gray-100 text-gray-600'}
               `}
              title={invoice.language === 'ar' ? 'مزامنة' : 'Sync'}
            >
              <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
            </button>

            {/* Toggle Editor Button (Create View Only) */}
            {activeView === 'create' && (
              <button
                onClick={() => setShowEditor(!showEditor)}
                className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition hidden lg:flex"
                title={showEditor ? (invoice.language === 'ar' ? 'إخفاء المحرر' : 'Hide Editor') : (invoice.language === 'ar' ? 'إظهار المحرر' : 'Show Editor')}
              >
                {showEditor ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
              </button>
            )}

            <div className="h-6 w-px bg-gray-300 mx-1"></div>

            {/* Buttons for Create Mode */}
            {activeView === 'create' && (
              <>
                <button
                  onClick={handleNewInvoice}
                  className="hidden sm:flex items-center gap-1 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-lg font-medium transition text-sm"
                  title={invoice.language === 'ar' ? 'فاتورة جديدة' : 'New Invoice'}
                >
                  <Plus size={18} />
                </button>

                <button
                  onClick={saveInvoice}
                  className="hidden sm:flex items-center gap-2 text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-lg font-medium transition text-sm shadow-sm"
                >
                  <Save size={18} />
                  <span>{invoice.language === 'ar' ? 'حفظ' : 'Save'}</span>
                </button>

                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-300 hover:bg-gray-100 text-gray-700 p-2 rounded-lg font-medium transition shadow-sm text-sm"
                  title={invoice.language === 'ar' ? 'طباعة' : 'Print / Download PDF'}
                >
                  <Printer size={18} />
                </button>
              </>
            )}

            {/* Logout Button */}
            <button
              onClick={logout}
              className='ml-2 text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition'
              title={invoice.language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
            >
              <LogOut size={20} />
            </button>

          </div>
        </div>
      </nav>

      {/* Main Content Switch */}
      <main className="flex-grow w-full relative overflow-hidden">
        {activeView === 'settings' ? (
          <SettingsPage />
        ) : activeView === 'list' ? (
          <InvoicesList onLoadInvoice={loadFromList} />
        ) : (
          <div className="h-[calc(100vh-4rem)] p-4 md:p-6 max-w-[1600px] mx-auto w-full">
            <div className={`grid gap-6 h-full ${showEditor ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
              {/* Editor Panel - Togglable */}
              {showEditor && (
                <div className="lg:col-span-4 no-print order-2 lg:order-1 h-full overflow-y-auto">
                  <InvoiceEditor data={invoice} onChange={setInvoice} />
                </div>
              )}

              {/* Preview Panel */}
              <div className={`${showEditor ? 'lg:col-span-8' : 'col-span-1'} order-1 lg:order-2 h-full overflow-y-auto`}>
                <div className={`flex flex-col items-center p-4 rounded-xl transition-all bg-gray-50 border-2 border-dashed border-gray-200 shadow-sm print:shadow-none print:border-none print:bg-white print:p-0 print:m-0`}>
                  <InvoicePreview data={invoice} onUpdate={setInvoice} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Data Backup Modal */}
      {showDataModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 no-print">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDataModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-5">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Database size={24} className="text-brand-600" /> {invoice.language === 'ar' ? 'النسخ الاحتياطي' : 'Data Backup & Restore'}
                </h3>
                <button onClick={() => setShowDataModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                  <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2"><FileDown size={18} /> {invoice.language === 'ar' ? 'نسخ احتياطي' : 'Backup'}</h4>
                  <p className="text-xs text-blue-700 mb-3">{invoice.language === 'ar' ? 'تحميل ملف يحتوي على بياناتك.' : 'Download a backup file containing your data.'}</p>
                  <button onClick={handleBackup} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition">
                    {invoice.language === 'ar' ? 'تحميل النسخة' : 'Download Backup File'}
                  </button>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg">
                  <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2"><Upload size={18} /> {invoice.language === 'ar' ? 'استعادة' : 'Restore'}</h4>
                  <p className="text-xs text-purple-700 mb-3">{invoice.language === 'ar' ? 'رفع ملف لاستعادة بياناتك.' : 'Upload a backup file to restore your data.'}</p>
                  <button onClick={handleRestoreClick} className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-purple-700 transition">
                    {invoice.language === 'ar' ? 'رفع ملف' : 'Upload Backup File'}
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
        {invoice.language === 'ar' ? 'نصيحة: للحصول على أفضل نتائج الطباعة، استخدم جهاز كمبيوتر.' : 'Tip: For best printing results, use a desktop computer.'}
      </div>
    </div>
  );
}
