
import React, { useState, useEffect, useRef } from 'react';
import { InvoiceData } from './types';
import { InvoiceEditor } from './components/InvoiceEditor';
import { InvoicePreview } from './components/InvoicePreview';
import { Printer, Download, Loader2, History, X, Save, FileText, Database, Upload, FileDown, Image } from 'lucide-react';
import { BrandLogo } from './components/BrandLogo';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const STORAGE_KEY = 'prime_solution_invoice_data';
const HISTORY_KEY = 'prime_solution_invoice_history';
const INVENTORY_KEY = 'prime_saved_items';

// New default with requested values
const initialInvoice: InvoiceData = {
  language: 'ar',
  documentType: 'invoice',
  title: 'فاتورة',
  invoiceNumber: '001',
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
    { id: '1', description: 'تركيب نظام أمني كامل', descriptionEn: 'Security System Installation', quantity: 1, price: 5000 },
  ],
  notes: `فترة الضمان
ضمان 3 سنوات ضد عيوب الصناعة فقط.
لا يشمل: سوء الاستخدام – السرقة – العبث – الحريق – أعطال الكهرباء – الظروف القهرية.
الضمان لا يشمل محوّل الطاقة أو مصاريف الانتقالات.
يُرجى الاحتفاظ بالفاتورة.`,
  taxRate: 14,
  enableTax: false, // Tax disabled by default
  logoUrl: null
};

export default function App() {
  // Load initial state from local storage or fallback to default
  const [invoice, setInvoice] = useState<InvoiceData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialInvoice;
  });

  const [invoiceHistory, setInvoiceHistory] = useState<InvoiceData[]>(() => {
    const savedHistory = localStorage.getItem(HISTORY_KEY);
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save to local storage whenever invoice changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoice));
  }, [invoice]);

  const handlePrint = () => {
    window.print();
  };

  const saveToHistory = () => {
    const newHistory = [invoice, ...invoiceHistory];
    setInvoiceHistory(newHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    alert(invoice.language === 'ar' ? 'تم حفظ الفاتورة في السجل بنجاح' : 'Invoice saved to history successfully');
  };

  const loadFromHistory = (savedInvoice: InvoiceData) => {
    if (confirm(invoice.language === 'ar' ? 'هل أنت متأكد؟ سيتم استبدال البيانات الحالية.' : 'Are you sure? Current data will be replaced.')) {
      setInvoice(savedInvoice);
      setShowHistory(false);
    }
  };

  const deleteFromHistory = (index: number) => {
    const newHistory = [...invoiceHistory];
    newHistory.splice(index, 1);
    setInvoiceHistory(newHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  };

  // --- DATA SYNC / BACKUP FUNCTIONS ---

  const handleBackup = () => {
    // Collect all data from local storage
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
          localStorage.setItem(HISTORY_KEY, JSON.stringify(json.history));
        }
        if (json.inventory) {
          localStorage.setItem(INVENTORY_KEY, JSON.stringify(json.inventory));
          alert('Data restored successfully! The page will reload.');
          window.location.reload();
        } else {
          alert('Data restored successfully!');
        }
        setShowDataModal(false);
      } catch (err) {
        alert('Invalid backup file.');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  // Update State
  const [updateStatus, setUpdateStatus] = useState<any>(null);

  // Load update listener
  useEffect(() => {
    // @ts-ignore
    if (window.electronAPI) {
      // @ts-ignore
      window.electronAPI.onUpdateStatus((status: any) => {
        console.log('Update Status:', status);
        setUpdateStatus(status);
        if (status.status === 'downloaded') {
          // Optional: Auto notify or just show button
          // alert('Update downloaded. Restarting...');
        }
      });
    }
  }, []);

  // --- Functions ---

  const handleDownloadUpdate = () => {
    // @ts-ignore
    window.electronAPI?.downloadUpdate();
  };

  const handleInstallUpdate = () => {
    // @ts-ignore
    window.electronAPI?.installUpdate();
  };

  // Native print approach - preserves Arabic text perfectly
  const handleDownloadPDF = async () => {
    // Determine if we are in Electron to adjust behavior if needed (optional, but good for debugging)
    const isElectron = navigator.userAgent.toLowerCase().includes(' electron/');

    // 1. Add a specific class to body to indicate printing state (helps with CSS targeting)
    document.body.classList.add('is-printing');

    // 2. Wait for a moment to ensure styles update
    await new Promise(resolve => setTimeout(resolve, 100));

    // 3. Trigger Print
    window.print();

    // 4. Cleanup after print dialog closes
    // Note: In some browsers, window.print blocks JS execution, so this runs after.
    // In others, we might need a listener. For simplicity, we remove immediately after, 
    // but the print preview usually has captured the state by then.
    // A better approach for React is often using a 'printing' state variable if this glitches.
    document.body.classList.remove('is-printing');
  };

  // Alternative: Direct print current page (Same function now)
  const handleQuickPrint = handleDownloadPDF;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col ${invoice.language === 'ar' ? 'font-cairo' : 'font-inter'}`}>

      {/* Update Notification Banner */}
      {updateStatus && updateStatus.status === 'available' && (
        <div className="bg-brand-600 text-white text-xs py-2 px-4 text-center font-bold flex justify-center items-center gap-4 no-print">
          <span>✨ New update available! Version {updateStatus.info.version}</span>
          <button
            onClick={handleDownloadUpdate}
            className="bg-white text-brand-600 px-3 py-1 rounded-full hover:bg-brand-50 transition"
          >
            Download Now
          </button>
        </div>
      )}

      {updateStatus && updateStatus.status === 'downloading' && (
        <div className="bg-brand-600 text-white text-xs py-2 px-4 text-center font-bold no-print">
          Downloading update... {Math.round(updateStatus.progress?.percent || 0)}%
        </div>
      )}

      {updateStatus && updateStatus.status === 'downloaded' && (
        <div className="bg-green-600 text-white text-xs py-2 px-4 text-center font-bold flex justify-center items-center gap-4 no-print">
          <span>✅ Update ready to install!</span>
          <button
            onClick={handleInstallUpdate}
            className="bg-white text-green-600 px-3 py-1 rounded-full hover:bg-green-50 transition"
          >
            Restart & Install
          </button>
        </div>
      )}

      {/* Navbar */}
      <nav className="no-print bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-brand-500 rounded p-1">
              <BrandLogo variant="light" className="scale-50 origin-center" />
            </div>
            <span className="font-bold text-xl text-gray-800 hidden sm:block">Prime Invoicer</span>
          </div>

          <div className="flex gap-2 md:gap-3 items-center">

            {/* Data/Sync Button */}
            <button
              onClick={() => setShowDataModal(true)}
              className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-lg transition text-sm mr-2"
              title="Backup / Restore Data"
            >
              <Database size={18} />
              <span className="hidden md:inline">Data / Sync</span>
            </button>

            {/* History Button */}
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 text-gray-600 hover:text-brand-600 px-3 py-2 rounded-lg font-medium transition text-sm mr-2"
            >
              <History size={20} />
              <span className="hidden sm:inline">History</span>
            </button>

            {/* Save Button */}
            <button
              onClick={saveToHistory}
              className="flex items-center gap-2 text-brand-600 bg-brand-50 border border-brand-200 hover:bg-brand-100 px-3 py-2 rounded-lg font-medium transition text-sm"
              title="Save to History"
            >
              <Save size={18} />
              <span className="hidden sm:inline">Save</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 md:px-4 py-2 rounded-lg font-medium transition shadow-sm hover:shadow-md text-sm"
              title="حفظ كـ PDF - يفتح نافذة طباعة"
            >
              <Download size={18} />
              <span className="hidden sm:inline">حفظ PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-3 md:px-4 py-2 rounded-lg font-medium transition shadow-sm hover:shadow-md text-sm"
            >
              <Printer size={18} />
              <span className="hidden sm:inline">طباعة</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-8 max-w-[1600px] mx-auto w-full relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column: Editor (Scrolls naturally) */}
          <div className="lg:col-span-4 no-print">
            <InvoiceEditor
              data={invoice}
              onChange={setInvoice}
            />
          </div>

          {/* Right Column: Preview (Sticky) */}
          <div className="lg:col-span-8 sticky top-24">
            {/* Preview Container - styles removed when printing */}
            <div className={`
              flex flex-col items-center p-4 rounded-xl transition-all
              bg-gray-50 border-2 border-dashed border-gray-200
              ${updateStatus ? '' : 'shadow-sm'}
              print:shadow-none print:border-none print:bg-white print:p-0 print:m-0
            `}>
              <div className="mb-4 text-gray-400 text-xs font-bold uppercase tracking-wider no-print flex items-center gap-2 select-none">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                Live Preview
              </div>

              <InvoicePreview data={invoice} onUpdate={setInvoice} />
            </div>
          </div>

        </div>
      </main>

      {/* History Sidebar */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end no-print">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowHistory(false)}></div>
          <div className="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-lg flex items-center gap-2 text-gray-800">
                <History size={20} /> Invoice History
              </h2>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-gray-200 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-3">
              {invoiceHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>No saved invoices found.</p>
                  <p className="text-sm mt-2">Click "Save" or "Download PDF" to add invoices here.</p>
                </div>
              ) : (
                invoiceHistory.map((inv, idx) => (
                  <div key={idx} className="border rounded-lg p-3 hover:border-brand-500 transition-colors bg-white shadow-sm group">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <FileText size={16} className="text-brand-500" />
                          {inv.clientName || 'Unnamed Client'}
                        </h3>
                        <p className="text-xs text-gray-500">#{inv.invoiceNumber} • {inv.date}</p>
                      </div>
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                        {inv.currency}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => loadFromHistory(inv)}
                        className="text-xs font-medium text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded transition"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deleteFromHistory(idx)}
                        className="text-xs font-medium text-red-500 hover:bg-red-50 px-3 py-1.5 rounded transition opacity-0 group-hover:opacity-100"
                      >
                        Delete
                      </button>
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
