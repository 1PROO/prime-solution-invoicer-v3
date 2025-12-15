
import React, { ChangeEvent, useState, useEffect } from 'react';
import { InvoiceData, InvoiceItem, SavedItem, SavedClient } from '../types';
import { Plus, Trash2, Upload, Languages, Search, Settings, X, BookOpen, Save, ChevronDown, ChevronUp, Cloud, RefreshCw } from 'lucide-react';
import { SyncService } from '../services/SyncService';

interface InvoiceEditorProps {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
}

const ARABIC_NOTES = `فترة الضمان
ضمان 3 سنوات ضد عيوب الصناعة فقط.
لا يشمل: سوء الاستخدام – السرقة – العبث – الحريق – أعطال الكهرباء – الظروف القهرية.
الضمان لا يشمل محوّل الطاقة أو مصاريف الانتقالات.
يُرجى الاحتفاظ بالفاتورة.`;

const ENGLISH_NOTES = `Warranty Period
3-year warranty covering manufacturing defects only.
Not covered: misuse, theft, tampering, fire, electrical faults, or force majeure.
The warranty does not cover the power adapter or transportation costs.
Please keep the invoice.`;

const ARABIC_ADDRESS = "220 ترعة الجبل، حدائق القبة، القاهرة، مصر";
const ENGLISH_ADDRESS = "220 Teraat Al Gabal, Hdaeak Al-Qubba, Cairo, Egypt";

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({ data, onChange }) => {
  // Load saved items from server cache
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => SyncService.getCachedProducts());
  const [savedClients, setSavedClients] = useState<SavedClient[]>(() => {
    const saved = localStorage.getItem('prime_saved_clients');
    return saved ? JSON.parse(saved) : [];
  });

  // UI States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isInventoryManagerOpen, setIsInventoryManagerOpen] = useState(false);
  const [isFromSectionOpen, setIsFromSectionOpen] = useState(false);
  const [isGeneralInfoOpen, setIsGeneralInfoOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInvoiceSettingsOpen, setIsInvoiceSettingsOpen] = useState(true);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncingProducts, setIsSyncingProducts] = useState(false);

  // Fetch products from server on mount
  useEffect(() => {
    const loadProducts = async () => {
      const products = await SyncService.fetchProducts();
      if (products.length > 0) {
        setSavedItems(products);
      }
    };
    loadProducts();
  }, []);

  useEffect(() => {
    localStorage.setItem('prime_saved_clients', JSON.stringify(savedClients));
  }, [savedClients]);

  // Auto-switch defaults when language changes
  useEffect(() => {
    if (data.language === 'ar') {
      const newTitle = data.title === 'Invoice' ? 'فاتورة' : data.title;
      onChange({
        ...data,
        title: newTitle,
        sellerAddress: ARABIC_ADDRESS,
        notes: ARABIC_NOTES
      });
    } else if (data.language === 'en') {
      const newTitle = data.title === 'فاتورة' ? 'Invoice' : data.title;
      onChange({
        ...data,
        title: newTitle,
        sellerAddress: ENGLISH_ADDRESS,
        notes: ENGLISH_NOTES
      });
    }
  }, [data.language]);

  const handleChange = (field: keyof InvoiceData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
    const newItems = data.items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    onChange({ ...data, items: newItems });
  };

  const addBlankItem = () => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      quantity: 1,
      price: 0
    };
    onChange({ ...data, items: [...data.items, newItem] });
    setIsAddModalOpen(false);
  };

  const addSavedItemToInvoice = (savedItem: SavedItem) => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: savedItem.description,
      descriptionEn: savedItem.descriptionEn,
      quantity: 1,
      price: savedItem.price
    };
    onChange({ ...data, items: [...data.items, newItem] });
    setIsAddModalOpen(false);
  };

  const removeItem = (id: string) => {
    onChange({ ...data, items: data.items.filter(item => item.id !== id) });
  };

  // --- Inventory Management Functions ---
  const updateSavedItem = (id: string, field: keyof SavedItem, value: any) => {
    setSavedItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const deleteSavedItem = async (id: string) => {
    setSavedItems(prev => prev.filter(item => item.id !== id));
    // Sync delete to server
    await SyncService.deleteProduct(id);
  };

  const createNewInventoryItem = () => {
    const newItem: SavedItem = {
      id: 'new_' + Date.now().toString(),
      description: data.language === 'ar' ? 'منتج جديد' : 'New Product',
      descriptionEn: '',
      price: 0
    };
    setSavedItems(prev => [newItem, ...prev]);
  };

  const syncInventoryToServer = async () => {
    setIsSyncingProducts(true);
    for (const item of savedItems) {
      await SyncService.saveProduct(item);
    }
    // Refresh from server
    const products = await SyncService.fetchProducts();
    setSavedItems(products);
    setIsSyncingProducts(false);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('logoUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveCurrentClient = () => {
    if (!data.clientName) return;
    const newClient: SavedClient = {
      id: Date.now().toString(),
      name: data.clientName,
      address: data.clientAddress,
      phone: data.clientPhone
    };
    setSavedClients(prev => [...prev, newClient]);
    alert(data.language === 'ar' ? 'تم حفظ العميل!' : 'Client Saved!');
  };

  const loadClient = (client: SavedClient) => {
    onChange({
      ...data,
      clientName: client.name,
      clientAddress: client.address,
      clientPhone: client.phone
    });
    setShowClientSuggestions(false);
  };

  const filteredSavedItems = savedItems.filter(item =>
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.descriptionEn && item.descriptionEn.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const inputClass = "w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition shadow-sm placeholder-gray-400";
  const labelClass = "block text-sm font-medium text-gray-600 mb-1";
  const collapsibleHeader = "w-full flex justify-between items-center p-3 text-xs font-bold text-gray-600 uppercase hover:bg-slate-100 transition rounded-lg";

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-4 border border-gray-200 relative">

      {/* Top Controls - Invoice Settings (Collapsible) */}
      <section className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
        <button
          onClick={() => setIsInvoiceSettingsOpen(!isInvoiceSettingsOpen)}
          className="w-full flex justify-between items-center p-4 hover:bg-gray-100 transition"
        >
          <h2 className="text-lg font-bold text-gray-800">{data.language === 'ar' ? 'إعدادات الفاتورة' : 'Invoice Settings'}</h2>
          {isInvoiceSettingsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {isInvoiceSettingsOpen && (
          <div className="p-4 pt-0 space-y-4 border-t border-gray-200 animate-in slide-in-from-top-2 duration-200">
            {/* Language Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{data.language === 'ar' ? 'اللغة' : 'Language'}</span>
              <div className="flex items-center gap-2">
                <Languages size={16} className="text-gray-500" />
                <div className="flex bg-white rounded-lg border border-gray-300 p-1">
                  <button
                    onClick={() => handleChange('language', 'en')}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition ${data.language === 'en' ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => handleChange('language', 'ar')}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition ${data.language === 'ar' ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    العربية
                  </button>
                </div>
              </div>
            </div>

            {/* Document Type Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => {
                  handleChange('documentType', 'invoice');
                  if (['عرض سعر', 'Price Quote', 'Invoice', 'فاتورة'].includes(data.title)) {
                    handleChange('title', data.language === 'ar' ? 'فاتورة' : 'Invoice');
                  }
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition ${data.documentType === 'invoice' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {data.language === 'ar' ? 'فاتورة' : 'Invoice'}
              </button>
              <button
                onClick={() => {
                  handleChange('documentType', 'quote');
                  if (['عرض سعر', 'Price Quote', 'Invoice', 'فاتورة'].includes(data.title)) {
                    handleChange('title', data.language === 'ar' ? 'عرض سعر' : 'Price Quote');
                  }
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition ${data.documentType === 'quote' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {data.language === 'ar' ? 'عرض سعر' : 'Price Quote'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* General Info - Collapsible */}
      <section className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
        <button
          onClick={() => setIsGeneralInfoOpen(!isGeneralInfoOpen)}
          className={collapsibleHeader}
        >
          <span>{data.language === 'ar' ? 'معلومات عامة' : 'General Info'}</span>
          {isGeneralInfoOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {isGeneralInfoOpen && (
          <div className="p-4 pt-0 space-y-3 border-t border-slate-200 animate-in slide-in-from-top-2 duration-200">
            <div>
              <label className={labelClass}>{data.language === 'ar' ? 'عنوان الوثيقة' : 'Document Title'}</label>
              <input
                type="text"
                value={data.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder={data.language === 'ar' ? 'مثال: فاتورة' : 'e.g., Invoice'}
                className={`${inputClass} font-bold text-brand-700`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>{data.language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</label>
                <input
                  type="text"
                  value={data.invoiceNumber}
                  onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                  className={`${inputClass} !font-inter`}
                  dir="ltr"
                  disabled={data.syncStatus === 'synced'}
                />
              </div>
              <div>
                <label className={labelClass}>{data.language === 'ar' ? 'العملة' : 'Currency'}</label>
                <select
                  value={data.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  className={inputClass}
                >
                  <option value="EGP">EGP (£)</option>
                  <option value="USD">USD ($)</option>
                  <option value="SAR">SAR (﷼)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>{data.language === 'ar' ? 'تاريخ الإصدار' : 'Date Issued'}</label>
                <input
                  type="date"
                  value={data.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className={`${inputClass} !font-inter`}
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelClass}>{data.language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</label>
                <input
                  type="date"
                  value={data.dueDate}
                  onChange={(e) => handleChange('dueDate', e.target.value)}
                  className={`${inputClass} !font-inter`}
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Participants */}
      <section>
        <div className="grid grid-cols-1 gap-3">
          {/* From Section - Collapsible */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setIsFromSectionOpen(!isFromSectionOpen)}
              className={collapsibleHeader}
            >
              <span>{data.language === 'ar' ? 'من (أنت)' : 'From (You)'}</span>
              {isFromSectionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isFromSectionOpen && (
              <div className="p-4 pt-0 space-y-2 border-t border-slate-200 animate-in slide-in-from-top-2 duration-200">
                <input
                  type="text"
                  placeholder={data.language === 'ar' ? 'اسم الشركة' : 'Company Name'}
                  value={data.sellerName}
                  onChange={(e) => handleChange('sellerName', e.target.value)}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder={data.language === 'ar' ? 'العنوان' : 'Address'}
                  value={data.sellerAddress}
                  onChange={(e) => handleChange('sellerAddress', e.target.value)}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder={data.language === 'ar' ? 'الهاتف / البريد' : 'Phone / Email'}
                  value={data.sellerPhone}
                  onChange={(e) => handleChange('sellerPhone', e.target.value)}
                  className={`${inputClass} !font-inter`}
                  dir="ltr"
                />
                <div className="pt-2 border-t border-slate-200 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{data.language === 'ar' ? 'الشعار' : 'Logo'}:</span>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 flex items-center gap-1 text-gray-600">
                        <Upload size={12} /> {data.language === 'ar' ? 'رفع' : 'Upload'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                      {data.logoUrl && (
                        <button onClick={() => handleChange('logoUrl', null)} className="text-red-500 text-xs hover:underline">
                          {data.language === 'ar' ? 'مسح' : 'Clear'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* To (Client) Section - Always Open */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 relative z-40">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-xs font-bold text-gray-500 uppercase">{data.language === 'ar' ? 'إلى (العميل)' : 'To (Client)'}</label>
              {(data.clientName && !savedClients.find(c => c.name === data.clientName)) && (
                <button
                  onClick={saveCurrentClient}
                  className="text-xs bg-white border border-brand-200 text-brand-600 hover:bg-brand-50 px-2 py-1 rounded flex items-center gap-1 transition"
                  title={data.language === 'ar' ? 'حفظ العميل' : 'Save this client'}
                >
                  <Save size={12} /> {data.language === 'ar' ? 'حفظ' : 'Save'}
                </button>
              )}
            </div>
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder={data.language === 'ar' ? 'اسم العميل' : 'Client Name'}
                  value={data.clientName}
                  onChange={(e) => handleChange('clientName', e.target.value)}
                  onFocus={() => setShowClientSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                  className={inputClass}
                />
                {showClientSuggestions && savedClients.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 mt-1 max-h-48 overflow-y-auto">
                    {savedClients
                      .filter(c => c.name.toLowerCase().includes((data.clientName || '').toLowerCase()))
                      .map(client => (
                        <button
                          key={client.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 border-b border-gray-100 last:border-0 transition"
                          onClick={() => loadClient(client)}
                        >
                          <div className="font-bold text-gray-800">{client.name}</div>
                          {client.phone && <div className="text-xs text-gray-500">{client.phone}</div>}
                        </button>
                      ))}
                    {savedClients.filter(c => c.name.toLowerCase().includes((data.clientName || '').toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-xs text-gray-400">{data.language === 'ar' ? 'لا يوجد عملاء مطابقين' : 'No matching clients'}</div>
                    )}
                  </div>
                )}
              </div>
              <input
                type="text"
                placeholder={data.language === 'ar' ? 'عنوان العميل' : 'Client Address'}
                value={data.clientAddress}
                onChange={(e) => handleChange('clientAddress', e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                placeholder={data.language === 'ar' ? 'رقم العميل' : 'Client Phone'}
                value={data.clientPhone}
                onChange={(e) => handleChange('clientPhone', e.target.value)}
                className={`${inputClass} !font-inter`}
                dir="ltr"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Items List */}
      <section>
        <div className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-3 flex justify-between items-center">
          <span>{data.language === 'ar' ? 'المنتجات' : 'Items'}</span>
        </div>

        <div className="space-y-3 mb-4">
          {data.items.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 group relative">
              <div className="flex gap-2 w-full">
                <input
                  type="text"
                  placeholder={data.language === 'ar' ? 'الوصف' : 'Description'}
                  value={item.description}
                  onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                  className={`${inputClass} flex-grow min-w-0`}
                />
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="w-20 md:w-24">
                  <input
                    type="number"
                    placeholder={data.language === 'ar' ? 'الكمية' : 'Qty'}
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value))}
                    className={`${inputClass} !font-inter`}
                    dir="ltr"
                  />
                </div>
                <div className="w-24 md:w-32">
                  <input
                    type="number"
                    placeholder={data.language === 'ar' ? 'السعر' : 'Price'}
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value))}
                    className={`${inputClass} !font-inter`}
                    dir="ltr"
                  />
                </div>
                <div className="flex-grow flex justify-end gap-1">
                  <button
                    onClick={() => removeItem(item.id)}
                    title={data.language === 'ar' ? 'حذف' : 'Remove'}
                    className="p-2 text-gray-400 hover:text-red-500 rounded hover:bg-white"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            setSearchQuery('');
            setIsAddModalOpen(true);
          }}
          className="w-full flex items-center justify-center gap-1 text-sm bg-brand-50 border border-dashed border-brand-300 text-brand-700 px-3 py-3 rounded-lg hover:bg-brand-100 transition font-medium"
        >
          <Plus size={16} /> {data.language === 'ar' ? 'إضافة منتج' : 'Add Item'}
        </button>
      </section>

      {/* Settings & Notes - Collapsible */}
      <section className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className={collapsibleHeader}
        >
          <span>{data.language === 'ar' ? 'الإعدادات والملاحظات' : 'Settings & Notes'}</span>
          {isSettingsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {isSettingsOpen && (
          <div className="p-4 pt-0 space-y-4 border-t border-slate-200 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${data.enableTax ? 'bg-brand-500' : 'bg-gray-300'}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${data.enableTax ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={data.enableTax}
                  onChange={(e) => handleChange('enableTax', e.target.checked)}
                />
                <span className="text-sm font-medium text-gray-700">{data.language === 'ar' ? 'تفعيل الضريبة' : 'Enable Tax'}</span>
              </label>

              {data.enableTax && (
                <div className="w-24">
                  <input
                    type="number"
                    value={data.taxRate}
                    onChange={(e) => handleChange('taxRate', parseFloat(e.target.value))}
                    className={`${inputClass} !font-inter`}
                    placeholder="%"
                    dir="ltr"
                  />
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>{data.language === 'ar' ? 'الملاحظات / شروط الدفع' : 'Notes / Payment Terms'}</label>
              <textarea
                value={data.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className={`${inputClass} h-32 text-xs whitespace-pre-wrap`}
                placeholder={data.language === 'ar' ? 'الشروط والأحكام...' : 'Terms and conditions...'}
              />
            </div>
          </div>
        )}
      </section>

      {/* --- ADD ITEM MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">{data.language === 'ar' ? 'إضافة منتج للفاتورة' : 'Add Item to Invoice'}</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder={data.language === 'ar' ? 'بحث في المنتجات...' : 'Search saved products...'}
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 bg-white"
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                {filteredSavedItems.length === 0 ? (
                  <p className="text-center text-gray-400 py-4 text-sm">{data.language === 'ar' ? 'لا توجد منتجات مطابقة.' : 'No matching saved items.'}</p>
                ) : (
                  filteredSavedItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => addSavedItemToInvoice(item)}
                      className="w-full flex justify-between items-center p-3 hover:bg-brand-50 rounded-lg border border-transparent hover:border-brand-200 transition group text-left"
                    >
                      <div>
                        <span className="block text-gray-700 font-medium group-hover:text-brand-700">{item.description}</span>
                        {item.descriptionEn && <span className="block text-xs text-gray-400">{item.descriptionEn}</span>}
                      </div>
                      <span className="text-gray-500 text-sm !font-inter" dir="ltr">{item.price}</span>
                    </button>
                  ))
                )}
              </div>

              <div className="flex gap-2 border-t pt-4">
                <button
                  onClick={addBlankItem}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium transition"
                >
                  {data.language === 'ar' ? 'إضافة فارغ' : 'Add Empty Item'}
                </button>
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsInventoryManagerOpen(true);
                  }}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  <Settings size={16} /> {data.language === 'ar' ? 'إدارة المنتجات' : 'Manage Inventory'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- INVENTORY MANAGER MODAL --- */}
      {isInventoryManagerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsInventoryManagerOpen(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <BookOpen size={20} className="text-brand-600" /> {data.language === 'ar' ? 'إدارة المنتجات' : 'Inventory Manager'}
                </h3>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Cloud size={12} /> {data.language === 'ar' ? 'متزامن مع Google Sheets' : 'Synced with Google Sheets'}
                </p>
              </div>
              <button onClick={() => setIsInventoryManagerOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={24} />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-gray-50">
              {savedItems.map((item) => (
                <div key={item.id} className="flex gap-3 items-center bg-white p-3 border rounded-lg shadow-sm">
                  <div className="flex-grow space-y-2">
                    <div>
                      <label className="text-xs text-gray-400 uppercase font-bold px-1 mb-1 block">{data.language === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateSavedItem(item.id, 'description', e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded text-sm focus:border-brand-500 outline-none font-medium bg-white text-gray-900"
                        placeholder={data.language === 'ar' ? 'اسم المنتج' : 'Item Name (Ar)'}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase font-bold px-1 mb-1 block">{data.language === 'ar' ? 'الوصف (إنجليزي)' : 'English Description'}</label>
                      <input
                        type="text"
                        value={item.descriptionEn || ''}
                        onChange={(e) => updateSavedItem(item.id, 'descriptionEn', e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded text-sm focus:border-brand-500 outline-none font-medium bg-white text-gray-900"
                        placeholder={data.language === 'ar' ? 'اسم المنتج بالإنجليزي' : 'Item Name (En)'}
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div className="w-32 self-start">
                    <label className="text-xs text-gray-400 uppercase font-bold px-1 mb-1 block">{data.language === 'ar' ? 'السعر' : 'Price'}</label>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => updateSavedItem(item.id, 'price', parseFloat(e.target.value))}
                      className="w-full p-2 border border-gray-200 rounded text-sm focus:border-brand-500 outline-none !font-inter bg-white text-gray-900"
                      placeholder="0.00"
                      dir="ltr"
                    />
                  </div>
                  <div className="flex flex-col justify-end pb-0.5 self-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSavedItem(item.id);
                      }}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                      title={data.language === 'ar' ? 'حذف' : 'Delete from Inventory'}
                    >
                      <Trash2 size={18} className="pointer-events-none" />
                    </button>
                  </div>
                </div>
              ))}

              {savedItems.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  {data.language === 'ar' ? 'المخزن فارغ. أضف منتجات لإعادة استخدامها.' : 'Your inventory is empty. Add items to reuse them later.'}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 shrink-0 flex justify-between items-center">
              <button
                onClick={createNewInventoryItem}
                className="flex items-center gap-2 text-brand-600 hover:bg-brand-50 px-4 py-2 rounded-lg font-bold transition"
              >
                <Plus size={18} /> {data.language === 'ar' ? 'إضافة منتج جديد' : 'Add New Product'}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={syncInventoryToServer}
                  disabled={isSyncingProducts}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition"
                >
                  <RefreshCw size={16} className={isSyncingProducts ? 'animate-spin' : ''} />
                  {data.language === 'ar' ? 'مزامنة' : 'Sync'}
                </button>
                <button
                  onClick={() => setIsInventoryManagerOpen(false)}
                  className="bg-gray-800 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-900 transition"
                >
                  {data.language === 'ar' ? 'تم' : 'Done'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
