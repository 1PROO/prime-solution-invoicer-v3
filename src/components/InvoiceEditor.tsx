
import React, { useState, useEffect, useRef } from 'react';
import { InvoiceData, InvoiceItem, SavedItem, SavedClient } from '../types';
import { Plus, Trash2, ArrowRight, BookOpen, Search, X, ChevronDown, ChevronUp, RefreshCw, LayoutTemplate, Save, Check, Package, ShoppingBag } from 'lucide-react';
import { SyncService } from '../services/SyncService';

interface InvoiceEditorProps {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
  appLanguage: 'ar' | 'en';
  setAppLanguage: (lang: 'ar' | 'en') => void;
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({ data, onChange, appLanguage, setAppLanguage }) => {
  // Load saved items from server cache
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => SyncService.getCachedProducts());
  const [savedClients, setSavedClients] = useState<SavedClient[]>(() => {
    const saved = localStorage.getItem('prime_saved_clients');
    return saved ? JSON.parse(saved) : [];
  });

  // UI States
  const [isHeaderGroupOpen, setIsHeaderGroupOpen] = useState(true);
  const [isClientGroupOpen, setIsClientGroupOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Collapsed by default
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [activeSearchRow, setActiveSearchRow] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);

  // Product Modal States
  const [newProduct, setNewProduct] = useState<Partial<SavedItem>>({ description: '', descriptionEn: '', price: 0 });
  const [productSearch, setProductSearch] = useState('');
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Load Products & Defaults on Mount
  useEffect(() => {
    const init = async () => {
      const products = await SyncService.fetchProducts();
      if (products.length) setSavedItems(products);

      // Put global defaults if new invoice (empty seller info)
      if (!data.sellerName) {
        const defaults = await SyncService.getGlobalDefaults();
        const seller = defaults['SELLER_INFO'];
        const notes = appLanguage === 'ar' ? defaults['DEFAULT_NOTES_AR'] : defaults['DEFAULT_NOTES_EN'];

        if (seller || notes) {
          console.log("Applying defaults:", seller, notes); // Debug
          onChange({
            ...data,
            sellerName: seller?.name || data.sellerName,
            sellerAddress: seller?.address || data.sellerAddress,
            sellerPhone: seller?.phone || '',
            notes: notes || data.notes
          });
        }
      }
    };
    init();
  }, []);

  // Save clients locally
  useEffect(() => {
    localStorage.setItem('prime_saved_clients', JSON.stringify(savedClients));
  }, [savedClients]);

  // Handle Invoice Language Logic
  const handleLanguageChange = (lang: 'ar' | 'en') => {
    onChange({ ...data, language: lang });
  };

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
  };

  const removeItem = (id: string) => {
    const newItems = data.items.filter(item => item.id !== id);
    onChange({ ...data, items: newItems });
  };

  // Smart Autocomplete Logic
  const handleProductSelect = (itemId: string, product: SavedItem) => {
    const newItems = data.items.map(item =>
      item.id === itemId ? {
        ...item,
        description: appLanguage === 'ar' ? product.description : (product.descriptionEn || product.description),
        price: product.price
      } : item
    );
    onChange({ ...data, items: newItems });
    setActiveSearchRow(null);
  };

  // Add product from modal to invoice
  const addProductToInvoice = (product: SavedItem) => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: appLanguage === 'ar' ? product.description : (product.descriptionEn || product.description),
      quantity: 1,
      price: product.price
    };
    onChange({ ...data, items: [...data.items, newItem] });
    setShowProductModal(false);
  };

  const handleSaveNewProduct = async () => {
    if (!newProduct.description || !newProduct.price) return;
    setIsSavingProduct(true);
    const res = await SyncService.saveProduct(newProduct as SavedItem);
    if (res.status === 'success') {
      setSavedItems(prev => [...prev, res.product!]);
      setNewProduct({ description: '', descriptionEn: '', price: 0 });
      alert(appLanguage === 'ar' ? 'تم حفظ المنتج' : 'Product Saved');
    }
    setIsSavingProduct(false);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm(appLanguage === 'ar' ? 'مسح هذا المنتج؟' : 'Delete this product?')) return;
    const success = await SyncService.deleteProduct(id);
    if (success) {
      setSavedItems(prev => prev.filter(p => p.id !== id));
    }
  };

  // Client Selection
  const handleClientSelect = (client: SavedClient) => {
    onChange({
      ...data,
      clientName: client.name,
      clientAddress: client.address,
      clientPhone: client.phone
    });
    setShowClientSuggestions(false);
  };

  const saveCurrentClient = () => {
    if (!data.clientName) return;
    const newClient = {
      id: Date.now().toString(),
      name: data.clientName,
      address: data.clientAddress,
      phone: data.clientPhone
    };
    setSavedClients(prev => [...prev, newClient]);
    alert(appLanguage === 'ar' ? 'تم حفظ العميل!' : 'Client Saved!');
  };

  // Styles
  const inputClass = "w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition shadow-sm placeholder-gray-400";
  const labelClass = "block text-sm font-medium text-gray-600 mb-1";
  const collapsibleHeader = "w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition rounded-t-xl border-b border-gray-200 select-none cursor-pointer";

  return (
    <div className="space-y-6 pb-20 relative animate-in fade-in duration-500">

      {/* --- GROUP 1: HEADER & SETTINGS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div onClick={() => setIsHeaderGroupOpen(!isHeaderGroupOpen)} className={collapsibleHeader}>
          <div className="flex items-center gap-2">
            <LayoutTemplate size={20} className="text-brand-600" />
            <span className="font-bold text-gray-800">{appLanguage === 'ar' ? 'بيانات الفاتورة الأساسية' : 'Invoice Details'}</span>
          </div>
          {isHeaderGroupOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>

        {isHeaderGroupOpen && (
          <div className="p-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
            {/* Invoice Language */}
            <div className="flex justify-end">
              <div className="inline-flex bg-gray-100 p-1 rounded-lg">
                <button onClick={() => handleLanguageChange('ar')} className={`px-3 py-1 text-xs font-bold rounded-md transition ${data.language === 'ar' ? 'bg-white shadow text-brand-600' : 'text-gray-500'}`}>عربي</button>
                <button onClick={() => handleLanguageChange('en')} className={`px-3 py-1 text-xs font-bold rounded-md transition ${data.language === 'en' ? 'bg-white shadow text-brand-600' : 'text-gray-500'}`}>English</button>
              </div>
            </div>

            {/* Document Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{appLanguage === 'ar' ? 'نوع الوثيقة' : 'Document Type'}</label>
                <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                  <button
                    onClick={() => {
                      handleChange('documentType', 'invoice');
                      handleChange('title', data.language === 'ar' ? 'فاتورة' : 'Invoice');
                    }}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition ${data.documentType === 'invoice' ? 'bg-white shadow text-brand-600' : 'text-gray-500'}`}
                  >
                    {data.language === 'ar' ? 'فاتورة' : 'Invoice'}
                  </button>
                  <button
                    onClick={() => {
                      handleChange('documentType', 'quote');
                      handleChange('title', data.language === 'ar' ? 'عرض سعر' : 'Quote');
                    }}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition ${data.documentType === 'quote' ? 'bg-white shadow text-brand-600' : 'text-gray-500'}`}
                  >
                    {data.language === 'ar' ? 'عرض سعر' : 'Quote'}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClass}>{appLanguage === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</label>
                <input
                  type="text"
                  value={data.invoiceNumber}
                  onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                  className={`${inputClass} font-mono`}
                  dir="ltr"
                  disabled={data.syncStatus === 'synced'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{appLanguage === 'ar' ? 'تاريخ الإصدار' : 'Date Issued'}</label>
                <input
                  type="date"
                  value={data.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{appLanguage === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</label>
                <input
                  type="date"
                  value={data.dueDate}
                  onChange={(e) => handleChange('dueDate', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Seller Info (From) */}
            <div className="border-t border-gray-100 pt-4 bg-gray-50/50 p-4 rounded-lg">
              <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">{appLanguage === 'ar' ? 'بيانات البائع (أنت)' : 'Seller Info (You)'}</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={data.sellerName}
                  onChange={(e) => handleChange('sellerName', e.target.value)}
                  className={inputClass}
                  placeholder={appLanguage === 'ar' ? 'اسم الشركة / البائع' : 'Company / Seller Name'}
                />
                <input
                  type="text"
                  value={data.sellerAddress}
                  onChange={(e) => handleChange('sellerAddress', e.target.value)}
                  className={inputClass}
                  placeholder={appLanguage === 'ar' ? 'العنوان' : 'Address'}
                />
              </div>
            </div>

          </div>
        )}
      </div>

      {/* --- GROUP 2: CLIENT INFO --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div onClick={() => setIsClientGroupOpen(!isClientGroupOpen)} className={collapsibleHeader}>
          <div className="flex items-center gap-2">
            <Search size={20} className="text-brand-600" />
            <span className="font-bold text-gray-800">{appLanguage === 'ar' ? 'بيانات العميل' : 'Client Details'}</span>
          </div>
          {isClientGroupOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>

        {isClientGroupOpen && (
          <div className="p-6 animate-in slide-in-from-top-2 duration-200">
            <div className="relative mb-3">
              <input
                type="text"
                value={data.clientName}
                onChange={(e) => {
                  handleChange('clientName', e.target.value);
                  setShowClientSuggestions(true);
                }}
                className={`${inputClass} pr-10`}
                placeholder={appLanguage === 'ar' ? 'اسم العميل...' : 'Client Name...'}
              />
              <Search className="absolute top-2.5 right-3 text-gray-400 pointer-events-none" size={20} />

              {/* Suggestions Dropdown */}
              {showClientSuggestions && data.clientName && (
                <div className="absolute z-10 w-full bg-white mt-1 rounded-lg shadow-xl border border-gray-100 max-h-48 overflow-y-auto">
                  {savedClients
                    .filter(c => c.name.toLowerCase().includes(data.clientName.toLowerCase()))
                    .map(client => (
                      <div
                        key={client.id}
                        onClick={() => handleClientSelect(client)}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                      >
                        <p className="font-bold text-gray-800 text-sm">{client.name}</p>
                        <p className="text-xs text-gray-500">{client.phone}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={data.clientPhone}
                onChange={(e) => handleChange('clientPhone', e.target.value)}
                className={inputClass}
                placeholder={appLanguage === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
              />
              <input
                type="text"
                value={data.clientAddress}
                onChange={(e) => handleChange('clientAddress', e.target.value)}
                className={inputClass}
                placeholder={appLanguage === 'ar' ? 'العنوان' : 'Address'}
              />
            </div>

            <div className="mt-3 flex justify-end">
              <button
                onClick={saveCurrentClient}
                className="text-xs text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition"
              >
                <Save size={14} /> {appLanguage === 'ar' ? 'حفظ العميل' : 'Save Client'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ITEMS LIST */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="font-bold text-gray-700 uppercase text-sm tracking-wider">{appLanguage === 'ar' ? 'المنتجات / الخدمات' : 'Items & Services'}</h3>
        </div>

        {data.items.map((item, index) => (
          // Z-INDEX FIX: Raise z-index if this row is active
          <div key={item.id} className={`bg-white p-4 rounded-xl shadow-sm border border-gray-200 group transition hover:shadow-md relative ${activeSearchRow === item.id ? 'z-[100]' : 'z-0'}`}>
            <div className="flex justify-between items-start mb-3">
              <span className="bg-gray-100 text-gray-500 text-xs font-mono px-2 py-0.5 rounded">#{index + 1}</span>
              <button onClick={() => removeItem(item.id)} className="text-red-300 hover:text-red-500 transition"><Trash2 size={18} /></button>
            </div>

            <div className="grid grid-cols-12 gap-3">
              {/* SMART DESCRIPTION INPUT */}
              <div className="col-span-12 md:col-span-6 relative">
                <input
                  type="text"
                  value={item.description}
                  onFocus={() => setActiveSearchRow(item.id)}
                  onChange={(e) => {
                    handleItemChange(item.id, 'description', e.target.value);
                    setActiveSearchRow(item.id);
                  }}
                  placeholder={appLanguage === 'ar' ? 'اسم المنتج أو الخدمة' : 'Description'}
                  className={inputClass}
                />

                {activeSearchRow === item.id && (
                  <div className="absolute z-50 w-full bg-white mt-1 rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto animate-in slide-in-from-top-2">
                    <div className="sticky top-0 bg-gray-50 text-[10px] text-gray-400 p-2 uppercase font-bold border-b border-gray-100">
                      {appLanguage === 'ar' ? 'اقتراحات...' : 'Suggestions...'}
                    </div>
                    {savedItems
                      .filter(p =>
                        p.description.toLowerCase().includes(item.description.toLowerCase()) ||
                        p.descriptionEn?.toLowerCase().includes(item.description.toLowerCase())
                      )
                      .slice(0, 5) // Limit to 5
                      .map(p => (
                        <div
                          key={p.id}
                          onClick={() => handleProductSelect(item.id, p)}
                          className="p-3 hover:bg-brand-50 cursor-pointer flex justify-between items-center group/item"
                        >
                          <div>
                            <div className="font-bold text-gray-800 text-sm">{p.description}</div>
                            <div className="text-xs text-gray-400">{p.descriptionEn}</div>
                          </div>
                          <div className="bg-gray-100 group-hover/item:bg-white px-2 py-1 rounded text-xs font-bold text-gray-600">
                            {p.price.toLocaleString()}
                          </div>
                        </div>
                      ))}

                    <div
                      className="p-2 text-center text-xs text-gray-400 hover:bg-gray-50 cursor-pointer border-t"
                      onClick={() => setActiveSearchRow(null)}
                    >
                      {appLanguage === 'ar' ? 'إغلاق القائمة' : 'Close List'}
                    </div>
                  </div>
                )}
              </div>

              <div className="col-span-4 md:col-span-2">
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                  className={`${inputClass} text-center`}
                  min="1"
                />
                <label className="text-[10px] text-gray-400 text-center block mt-1">{appLanguage === 'ar' ? 'الكمية' : 'Qty'}</label>
              </div>
              <div className="col-span-4 md:col-span-2">
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                  className={inputClass}
                  step="0.01"
                />
                <label className="text-[10px] text-gray-400 text-center block mt-1">{appLanguage === 'ar' ? 'السعر' : 'Price'}</label>
              </div>
              <div className="col-span-4 md:col-span-2 flex items-center justify-end font-bold text-gray-700 pt-2 text-lg">
                {(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* STICKY ACTIONS */}
      <div className="sticky bottom-0 z-10 bg-gradient-to-t from-slate-100 via-slate-100 to-transparent pb-4 pt-4 -mx-2 px-2">
        <div className="flex gap-2">
          <button
            onClick={() => setShowProductModal(true)}
            className="flex-1 bg-white hover:bg-gray-50 border border-brand-200 text-brand-700 font-bold py-3.5 rounded-xl shadow-lg shadow-gray-200 transition flex items-center justify-center gap-2 transform active:scale-95"
          >
            <Package size={20} />
            {appLanguage === 'ar' ? 'إدارة المنتجات' : 'Products'}
          </button>
          <button
            onClick={addBlankItem}
            className="flex-[2] bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-200 transition flex items-center justify-center gap-2 transform active:scale-95"
          >
            <Plus size={22} strokeWidth={3} />
            {appLanguage === 'ar' ? 'إضافة منتج جديد' : 'Add Item'}
          </button>
        </div>
      </div>

      {/* SETTINGS & NOTES (Collapsible by Default) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={collapsibleHeader}>
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-brand-600" />
            <span className="font-bold text-gray-800">{appLanguage === 'ar' ? 'الملاحظات والضريبة' : 'Notes & Tax'}</span>
            {!isSettingsOpen && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{appLanguage === 'ar' ? 'مخفي' : 'Hidden'}</span>}
          </div>
          {isSettingsOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>

        {isSettingsOpen && (
          <div className="p-6 space-y-4 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <input
                type="checkbox"
                id="taxToggle"
                checked={data.enableTax}
                onChange={(e) => handleChange('enableTax', e.target.checked)}
                className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500 cursor-pointer"
              />
              <label htmlFor="taxToggle" className="text-gray-700 font-bold select-none cursor-pointer flex-1">
                {appLanguage === 'ar' ? 'تفعيل ضريبة القيمة المضافة' : 'Enable VAT'}
              </label>

              {data.enableTax && (
                <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">
                  <input
                    type="number"
                    value={data.taxRate}
                    onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) || 0)}
                    className="w-12 bg-transparent border-none outline-none font-bold text-center text-brand-600"
                  />
                  <span className="text-gray-400 font-bold">%</span>
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>{appLanguage === 'ar' ? 'الملاحظات والشروط' : 'Notes & Terms'}</label>
              <textarea
                value={data.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={5}
                className={inputClass}
                placeholder={appLanguage === 'ar' ? 'أضف شروط الدفع، الضمان،...الخ' : 'Payment terms, warranty...'}
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                {appLanguage === 'ar' ? 'إخفاء هذا القسم' : 'Hide Section'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- PRODUCT MANAGER MODAL --- */}
      {showProductModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ShoppingBag className="text-brand-600" />
                {appLanguage === 'ar' ? 'إدارة المنتجات' : 'Products Manager'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-gray-400 hover:text-red-500">
                <X size={24} />
              </button>
            </div>

            {/* New Product Form */}
            <div className="p-4 bg-brand-50 border-b border-brand-100 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className='md:col-span-2'>
                <label className="text-xs font-bold text-brand-800 mb-1 block">{appLanguage === 'ar' ? 'اسم المنتج' : 'Description'}</label>
                <input
                  value={newProduct.description}
                  onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                  className={inputClass}
                  placeholder="Product Name"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-brand-800 mb-1 block">{appLanguage === 'ar' ? 'السعر' : 'Price'}</label>
                <input
                  type="number"
                  value={newProduct.price}
                  onChange={e => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                  className={inputClass}
                />
              </div>
              <button
                onClick={handleSaveNewProduct}
                disabled={isSavingProduct}
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
              >
                {isSavingProduct ? <RefreshCw className="animate-spin" size={18} /> : <Plus size={18} />}
                {appLanguage === 'ar' ? 'حفظ' : 'Add'}
              </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-gray-100 bg-white">
              <div className="relative">
                <Search className="absolute top-2.5 right-3 text-gray-400" size={18} />
                <input
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className={`${inputClass} pr-10 bg-gray-50 border-gray-200`}
                  placeholder={appLanguage === 'ar' ? 'بحث عن منتج...' : 'Search items...'}
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {savedItems.filter(p => p.description.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                <div key={p.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl border border-gray-100 group">
                  <div onClick={() => addProductToInvoice(p)} className="cursor-pointer flex-1">
                    <div className="font-bold text-gray-800">{p.description}</div>
                    <div className="text-xs text-gray-400 flex gap-2">
                      <span>{p.descriptionEn}</span>
                      <span className="font-mono bg-green-50 text-green-700 px-1 rounded">{p.price.toLocaleString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteProduct(p.id)}
                    className="text-gray-300 hover:text-red-500 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {savedItems.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  {appLanguage === 'ar' ? 'لا توجد منتجات محفوظة' : 'No saved products'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
