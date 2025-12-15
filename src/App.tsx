
import React, { useState, useEffect, useRef } from 'react';
import { InvoiceData } from './types';
import { InvoiceEditor } from './components/InvoiceEditor';
import { InvoicePreview } from './components/InvoicePreview';
import { InvoicesList } from './components/InvoicesList';
import { SettingsPage } from './components/SettingsPage';
import { Printer, X, Save, Database, Upload, FileDown, RefreshCw, Settings, LogOut, User, Plus, Wifi, WifiOff, PanelLeftClose, PanelLeft, ChevronRight, ChevronLeft } from 'lucide-react';
import { BrandLogo } from './components/BrandLogo';
import { SyncService } from './services/SyncService';
import { InvoiceService } from './services/InvoiceService';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';

const STORAGE_KEY = 'prime_solution_invoice_data';
const INVENTORY_KEY = 'prime_saved_items';

const initialInvoice = InvoiceService.createEmptyDraft();

export default function App() {
  const { user, login, logout } = useAuth();
  const [activeView, setActiveView] = useState<'create' | 'list' | 'settings'>('create');
  const [appLanguage, setAppLanguage] = useState<'ar' | 'en'>('ar');

  const [invoice, setInvoice] = useState<InvoiceData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialInvoice;
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [showEditor, setShowEditor] = useState(true);

  // Electron Auto-Login logic for "Shrif"
  useEffect(() => {
    // Only if not already logged in
    if (!user) {
      // @ts-ignore - Check if running in Electron
      const isElectron = window.versions && window.versions.electron;
      if (isElectron) {
        login('Shrif', 'Admin@12345').catch(console.error);
      }
    }
  }, []);

  // -- Effects --
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoice));
  }, [invoice]);

  // Handle "Created By" tracking when User logs in
  useEffect(() => {
    if (user && !invoice.createdBy) {
      setInvoice(prev => ({ ...prev, createdBy: user.name }));
    }

    // Default to 'list' view for admins/managers on login if preferred, 
    // but user asked for Settings not to be default. Default is 'create'.
  }, [user]);

  // Initial sync and connection check on app load
  useEffect(() => {
    if (user && SyncService.getScriptUrl()) {
      SyncService.checkConnection().then(setIsConnected);
      SyncService.fetchAllInvoices();
      SyncService.fetchProducts();
    }
  }, [user]);

  // Periodic connection check (every 30 seconds)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      SyncService.checkConnection().then(setIsConnected);
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) {
    return <LoginPage />;
  }

  const handleNewInvoice = async () => {
    const newDraft = InvoiceService.createEmptyDraft();
    if (user) newDraft.createdBy = user.name;
    // Keep current invoice language preference
    newDraft.language = invoice.language;

    // Load defaults (this logic is also inside InvoiceEditor on mount, 
    // but good to have here for clean state reset)
    const defaults = await SyncService.getGlobalDefaults();
    if (defaults['SELLER_INFO']) {
      const s = defaults['SELLER_INFO'];
      newDraft.sellerName = s.name;
      newDraft.sellerAddress = s.address;
      // Phone handling etc if needed
    }
    const notesKey = newDraft.language === 'ar' ? 'DEFAULT_NOTES_AR' : 'DEFAULT_NOTES_EN';
    if (defaults[notesKey]) {
      newDraft.notes = defaults[notesKey];
    }

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

  // --- RENDER ---
  return (
    <div className={`min-h-screen bg-slate-100 flex flex-col ${appLanguage === 'ar' ? 'font-cairo' : 'font-inter'}`} dir={appLanguage === 'ar' ? 'rtl' : 'ltr'}>

      {/* Navbar */}
      <nav className="no-print bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-brand-500 rounded p-1">
              <BrandLogo variant="light" className="scale-60 origin-center" />
            </div>
            <span className="font-bold text-xl text-gray-800 hidden md:block">Prime Invoicer</span>

            {/* Connection Indicator */}
            <div className="flex items-center gap-1 mx-2 bg-gray-50 px-2 py-1 rounded-full border border-gray-100" title={isConnected ? 'Connected' : 'Disconnected'}>
              {isConnected === null ? (
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
              ) : isConnected ? (
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
              ) : (
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></div>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveView('create')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${activeView === 'create' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {appLanguage === 'ar' ? 'إنشاء' : 'Create'}
              </button>
              <button
                onClick={() => setActiveView('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${activeView === 'list' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {appLanguage === 'ar' ? 'الفواتير' : 'Invoices'}
              </button>
              {(user.role === 'admin' || user.role === 'manager') && (
                <button
                  onClick={() => setActiveView('settings')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-1 ${activeView === 'settings' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Settings size={14} />
                  <span className='hidden sm:inline'>{appLanguage === 'ar' ? 'الإعدادات' : 'Settings'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <span className='hidden lg:flex text-sm font-bold text-gray-700 items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100'>
              <User size={14} className='text-brand-500' /> {user.name}
            </span>

            <button
              onClick={() => performSync()}
              disabled={isSyncing}
              className={`p-2 rounded-lg text-sm font-medium transition hover:bg-gray-100 text-gray-600`}
              title={appLanguage === 'ar' ? 'مزامنة' : 'Sync'}
            >
              <RefreshCw size={20} className={isSyncing ? "animate-spin text-brand-600" : ""} />
            </button>

            <div className="h-6 w-px bg-gray-200 mx-1"></div>

            {/* Buttons for Create Mode */}
            {activeView === 'create' && (
              <>
                <button
                  onClick={handleNewInvoice}
                  className="hidden sm:flex items-center gap-1 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-lg font-medium transition text-sm"
                  title={appLanguage === 'ar' ? 'فاتورة جديدة' : 'New Invoice'}
                >
                  <Plus size={18} />
                </button>

                <button
                  onClick={saveInvoice}
                  className="hidden sm:flex items-center gap-2 text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-lg font-medium transition text-sm shadow-sm active:scale-95"
                >
                  <Save size={18} />
                  <span>{appLanguage === 'ar' ? 'حفظ' : 'Save'}</span>
                </button>

                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-300 hover:bg-gray-100 text-gray-700 p-2 rounded-lg font-medium transition shadow-sm text-sm active:scale-95"
                  title={appLanguage === 'ar' ? 'طباعة' : 'Print / Download PDF'}
                >
                  <Printer size={18} />
                </button>
              </>
            )}

            <button
              onClick={logout}
              className='ml-1 text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition'
              title={appLanguage === 'ar' ? 'تسجيل الخروج' : 'Logout'}
            >
              <LogOut size={20} />
            </button>

          </div>
        </div>
      </nav>

      {/* Main Content Switch */}
      <main className="flex-grow w-full relative overflow-hidden flex">

        {/* SIDE TOGGLE BUTTON - Independent of language direction logic in this container, fixed position */}
        {activeView === 'create' && (
          <button
            onClick={() => setShowEditor(!showEditor)}
            className={`no-print absolute z-30 top-1/2 -translate-y-1/2 
                  ${appLanguage === 'ar' ? 'right-0 rounded-l-xl pr-1' : 'left-0 rounded-r-xl pl-1'} 
                  p-1 bg-white border border-gray-200 shadow-md hover:bg-brand-50 hover:text-brand-600 text-gray-400 transition-all w-8 h-20 flex items-center justify-center`}
            title={showEditor ? (appLanguage === 'ar' ? 'كامل الشاشة' : 'Full Screen') : (appLanguage === 'ar' ? 'إظهار المحرر' : 'Show Editor')}
          >
            {appLanguage === 'ar' ? (
              showEditor ? <ChevronRight /> : <ChevronLeft />
            ) : (
              showEditor ? <ChevronLeft /> : <ChevronRight />
            )}
          </button>
        )}

        {/* CONTENT AREA */}
        <div className="flex-grow w-full h-full overflow-hidden">
          {activeView === 'settings' ? (
            <SettingsPage appLanguage={appLanguage} setAppLanguage={setAppLanguage} />
          ) : activeView === 'list' ? (
            <InvoicesList onLoadInvoice={loadFromList} />
          ) : (
            <div className="h-[calc(100vh-4rem)] p-4 md:p-6 max-w-[1920px] mx-auto w-full">
              <div className={`grid gap-6 h-full transition-all duration-300 ${showEditor ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1 select-none'}`}>

                {/* Editor Panel - Togglable */}
                <div className={`
                    ${showEditor ? 'lg:col-span-4 opacity-100' : 'hidden opacity-0'} 
                    no-print order-2 lg:order-1 h-full overflow-y-auto pr-2
                    transition-all duration-300 scrollbar-hide
                 `}>
                  <InvoiceEditor
                    data={invoice}
                    onChange={setInvoice}
                    appLanguage={appLanguage}
                    setAppLanguage={setAppLanguage}
                  />
                </div>

                {/* Preview Panel */}
                <div className={`
                    ${showEditor ? 'lg:col-span-8' : 'col-span-1 mx-auto max-w-5xl'} 
                    order-1 lg:order-2 h-full overflow-y-auto w-full transition-all duration-300
                 `}>
                  <div className={`h-full flex flex-col items-center p-4 rounded-xl transition-all bg-gray-50/50 border-2 border-dashed border-gray-200 shadow-sm print:shadow-none print:border-none print:bg-white print:p-0 print:m-0`}>
                    <InvoicePreview data={invoice} onUpdate={setInvoice} />
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile-only view notice */}
      <div className="lg:hidden p-4 text-center text-xs text-gray-400 no-print">
        {appLanguage === 'ar' ? 'نصيحة: للحصول على أفضل نتائج الطباعة، استخدم جهاز كمبيوتر.' : 'Tip: For best printing results, use a desktop computer.'}
      </div>
    </div>
  );
}
