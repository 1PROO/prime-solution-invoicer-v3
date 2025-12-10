
import React from 'react';
import { InvoiceData, InvoiceItem } from '../types';
import { BrandLogo } from './BrandLogo';
import { Plus, Trash2 } from 'lucide-react';

interface InvoicePreviewProps {
  data: InvoiceData;
  onUpdate?: (updatedData: InvoiceData) => void;
}

const translations = {
  en: {
    billedTo: "Billed To",
    issuedBy: "Issued By",
    dateIssued: "Date Issued",
    dateIssuedQuote: "Quotation Date",
    dueDate: "Due Date",
    dueDateQuote: "Valid Until",
    desc: "Description",
    qty: "Qty",
    price: "Price",
    total: "Total",
    subtotal: "Subtotal",
    tax: "Tax",
    notes: "Notes",
    empty: "No items added yet."
  },
  ar: {
    billedTo: "فاتورة إلى",
    issuedBy: "المصدر",
    dateIssued: "تاريخ الإصدار",
    dateIssuedQuote: "تاريخ العرض",
    dueDate: "تاريخ الاستحقاق",
    dueDateQuote: "صالح حتى",
    desc: "البيان / الوصف",
    qty: "الكمية",
    price: "السعر",
    total: "الإجمالي",
    subtotal: "المجموع الفرعي",
    tax: "الضريبة",
    notes: "ملاحظات",
    empty: "لم يتم إضافة عناصر."
  }
};

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ data, onUpdate }) => {
  const isRTL = data.language === 'ar';
  const t = translations[data.language];
  const dir = isRTL ? 'rtl' : 'ltr';
  const fontClass = isRTL ? 'font-cairo' : 'font-inter';

  // FORCE English formatting (en-US) to ensure Western Arabic numerals (0-9) everywhere
  const formattingLocale = 'en-US';

  // Strict helpers to enforce English visuals on numbers
  const numClass = '!font-inter';
  const numDir = 'ltr';
  const numLang = 'en';

  const calculateSubtotal = () => {
    return data.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  const subtotal = calculateSubtotal();
  const taxAmount = data.enableTax ? subtotal * (data.taxRate / 100) : 0;
  const total = subtotal + taxAmount;

  // Formatter for bottom totals (keeps currency symbol, but removes decimals for integer look)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(formattingLocale, {
      style: 'currency',
      currency: data.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Formatter for table values (removes currency symbol and decimals)
  const formatNumber = (amount: number) => {
    return new Intl.NumberFormat(formattingLocale, {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(formattingLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  // Helper to update fields
  const handleFieldChange = (field: keyof InvoiceData, value: any) => {
    if (onUpdate) onUpdate({ ...data, [field]: value });
  };

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
    if (!onUpdate) return;
    const newItems = data.items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    onUpdate({ ...data, items: newItems });
  };

  const deleteItem = (id: string) => {
    if (!onUpdate) return;
    onUpdate({ ...data, items: data.items.filter(i => i.id !== id) });
  };

  // Helper to format phone on blur
  const handlePhoneBlur = (field: keyof InvoiceData, value: string) => {
    // Strip non-digits (keep +)
    let clean = value.replace(/[^\d+]/g, '');

    // If it starts with 01xxxxxxxxx (11 digits, Egyptian mobile)
    if (/^01[0125]\d{8}$/.test(clean)) {
      const formatted = `+20 ${clean.substring(1, 4)} ${clean.substring(4, 7)} ${clean.substring(7)}`;
      handleFieldChange(field, formatted);
    }
    // If it starts with 1xxxxxxxxx (10 digits, missing leading zero but implied mobile)
    else if (/^1[0125]\d{8}$/.test(clean)) {
      const formatted = `+20 ${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6)}`;
      handleFieldChange(field, formatted);
    }
  };

  // Styles for editable inputs
  const editableInputClass = `bg-transparent hover:bg-brand-50/50 focus:bg-white border border-transparent focus:border-brand-300 rounded px-1 -mx-1 outline-none w-full transition-colors`;
  const editableTextAreaClass = `bg-transparent hover:bg-brand-50/50 focus:bg-white border border-transparent focus:border-brand-300 rounded px-1 -mx-1 outline-none w-full transition-colors resize-none overflow-hidden`;

  // Dynamic density based on item count to fit single page
  const isCompact = data.items.length > 7;
  const containerPadding = isCompact ? 'p-4' : 'p-6';
  const headerMargin = isCompact ? 'mb-8' : 'mb-16';
  const sectionMargin = isCompact ? 'mb-3' : 'mb-6';
  const tableCellPadding = isCompact ? 'py-1' : 'py-2';

  return (
    <div className={`w-full flex justify-center py-8 print:p-0 ${fontClass}`}>
      {/* A5 Paper Ratio / Container (148mm x 210mm) */}
      <div
        id="invoice-preview"
        dir={dir}
        className={`print-container w-full max-w-[148mm] min-h-[210mm] bg-white shadow-2xl print:shadow-none relative flex flex-col overflow-hidden text-sm transition-all duration-300`}
      >
        {/* Header Background shape - reduced height */}
        <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-brand-700 to-brand-500 skew-y-2 origin-top-left transform -translate-y-8 z-0 ${isRTL ? 'skew-y-[-2deg] origin-top-right' : ''}`}></div>
        <div className={`absolute top-0 right-0 w-48 h-48 bg-accent-400 opacity-10 rounded-full blur-3xl transform translate-x-10 -translate-y-10 z-0 ${isRTL ? 'left-0 -translate-x-10' : ''}`}></div>

        {/* Content Container - reduced padding */}
        <div className={`relative z-10 flex flex-col h-full flex-grow ${containerPadding}`}>

          {/* Header Row - dynamic margin */}
          <div className={`flex justify-between items-start ${headerMargin}`}>
            <div className="text-white relative z-20">
              {data.logoUrl ? (
                <img src={data.logoUrl} alt="Logo" className="h-12 object-contain mb-1" />
              ) : (
                <div className="transform scale-75 origin-top-left">
                  <BrandLogo className={isRTL ? "items-end" : "items-start"} />
                </div>
              )}
            </div>
            <div className={`text-white relative z-20 ${isRTL ? 'text-left' : 'text-right'}`}>
              <input
                type="text"
                value={data.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className="text-3xl font-bold tracking-tight bg-transparent border-none outline-none text-white placeholder-white/70 w-full text-end"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
              <div className="flex items-center gap-1 justify-end text-brand-100 font-mono mt-0 text-sm">
                <span>#</span>
                <input
                  type="text"
                  value={data.invoiceNumber}
                  onChange={(e) => handleFieldChange('invoiceNumber', e.target.value)}
                  className={`bg-transparent border-none outline-none w-16 text-brand-100 ${numClass} ${isRTL ? 'text-right' : 'text-left'}`}
                  dir={numDir}
                  lang={numLang}
                />
              </div>
            </div>
          </div>

          {/* Info Row - dynamic margin */}
          <div className={`flex justify-between gap-4 ${sectionMargin}`}>
            <div className="flex-1">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{t.billedTo}</h3>
              <input
                type="text"
                placeholder="Client Name"
                value={data.clientName}
                onChange={(e) => handleFieldChange('clientName', e.target.value)}
                className={`${editableInputClass} text-gray-800 font-semibold text-base placeholder-gray-300`}
              />
              <textarea
                placeholder="Client Address"
                value={data.clientAddress}
                onChange={(e) => handleFieldChange('clientAddress', e.target.value)}
                className={`${editableTextAreaClass} text-gray-500 text-xs mt-1 leading-relaxed h-10`}
              />
              <input
                type="text"
                placeholder="Client Phone"
                value={data.clientPhone}
                onChange={(e) => handleFieldChange('clientPhone', e.target.value)}
                onBlur={(e) => handlePhoneBlur('clientPhone', e.target.value)}
                className={`${editableInputClass} text-gray-500 text-xs ${numClass} ${isRTL ? 'text-right' : 'text-left'}`}
                dir={numDir}
                lang={numLang}
              />
            </div>
            <div className={`flex-1 ${isRTL ? 'text-left' : 'text-right'}`}>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{t.issuedBy}</h3>
              <input
                type="text"
                value={data.sellerName}
                onChange={(e) => handleFieldChange('sellerName', e.target.value)}
                className={`${editableInputClass} text-gray-800 font-semibold text-base ${isRTL ? 'text-left' : 'text-right'}`}
                dir="ltr"
              />
              <textarea
                value={data.sellerAddress}
                onChange={(e) => handleFieldChange('sellerAddress', e.target.value)}
                className={`${editableTextAreaClass} text-gray-500 text-xs mt-1 leading-relaxed h-10 ${isRTL ? 'text-left' : 'text-right'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
              <input
                type="text"
                value={data.sellerPhone}
                onChange={(e) => handleFieldChange('sellerPhone', e.target.value)}
                onBlur={(e) => handlePhoneBlur('sellerPhone', e.target.value)}
                className={`${editableInputClass} text-gray-500 text-xs ${isRTL ? 'text-left' : 'text-right'} ${numClass}`}
                dir={numDir}
                lang={numLang}
              />
            </div>
          </div>

          {/* Dates Row - dynamic margin */}
          <div className={`flex justify-between bg-gray-50 rounded-lg p-3 ${sectionMargin} ${isRTL ? 'border-r-4' : 'border-l-4'} border-accent-400`}>
            <div className="relative group cursor-pointer">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide pointer-events-none">
                {data.documentType === 'quote' ? t.dateIssuedQuote : t.dateIssued}
              </span>
              <div className={`text-gray-800 font-medium text-xs pointer-events-none ${numClass}`} dir={numDir}>{formatDate(data.date)}</div>

              <input
                type="date"
                value={data.date}
                onChange={(e) => handleFieldChange('date', e.target.value)}
                className={`absolute inset-0 opacity-0 w-full h-full cursor-pointer ${numClass}`}
                title="Change Date"
                lang={numLang}
              />
            </div>
            <div className={`relative group cursor-pointer ${isRTL ? 'text-left' : 'text-right'}`}>
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide pointer-events-none">
                {data.documentType === 'quote' ? t.dueDateQuote : t.dueDate}
              </span>
              <div className={`text-gray-800 font-medium text-xs pointer-events-none ${numClass}`} dir={numDir}>{formatDate(data.dueDate)}</div>
              <input
                type="date"
                value={data.dueDate}
                onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                className={`absolute inset-0 opacity-0 w-full h-full cursor-pointer ${numClass}`}
                title="Change Due Date"
                lang={numLang}
              />
            </div>
          </div>

          {/* Table */}
          <div className="mb-4">
            <table className="w-full text-left table-fixed">
              <thead>
                <tr className="border-b-2 border-brand-500">
                  <th className={`${tableCellPadding} px-2 text-[10px] font-bold text-brand-600 uppercase tracking-wider w-[40%] ${isRTL ? 'text-right' : 'text-left'}`}>{t.desc}</th>
                  <th className={`${tableCellPadding} px-2 text-[10px] font-bold text-brand-600 uppercase tracking-wider text-center w-[15%] `}>{t.qty}</th>
                  <th className={`${tableCellPadding} px-2 text-[10px] font-bold text-brand-600 uppercase tracking-wider w-[20%] ${isRTL ? 'text-left' : 'text-right'}`}>{t.price}</th>
                  <th className={`${tableCellPadding} px-2 text-[10px] font-bold text-brand-600 uppercase tracking-wider w-[20%] ${isRTL ? 'text-left' : 'text-right'}`}>{t.total}</th>
                  <th className="w-[5%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {data.items.map((item) => {
                  const descriptionToShow = (data.language === 'en' && item.descriptionEn)
                    ? item.descriptionEn
                    : item.description;

                  return (
                    <tr key={item.id} className="group">
                      <td className={`${tableCellPadding} px-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <input
                          type="text"
                          value={descriptionToShow}
                          onChange={(e) => {
                            handleItemChange(item.id, 'description', e.target.value)
                          }}
                          className={`${editableInputClass} text-gray-700 font-medium text-xs ${isRTL ? 'text-right' : 'text-left'}`}
                        />
                      </td>
                      <td className={`${tableCellPadding} px-2 text-center`}>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value))}
                          className={`${editableInputClass} text-gray-500 text-center w-full text-xs ${numClass}`}
                          dir={numDir}
                          lang={numLang}
                        />
                      </td>
                      <td className={`${tableCellPadding} px-2 ${isRTL ? 'text-left' : 'text-right'}`}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value))}
                          className={`${editableInputClass} text-gray-500 ${isRTL ? 'text-left' : 'text-right'} text-xs ${numClass}`}
                          dir={numDir}
                          lang={numLang}
                        />
                      </td>
                      <td className={`${tableCellPadding} px-2 text-gray-800 font-semibold text-xs ${numClass} ${isRTL ? 'text-left' : 'text-right'}`} dir={numDir}>
                        {formatNumber(item.price * item.quantity)}
                      </td>
                      <td className={`${tableCellPadding} px-2 text-center opacity-0 group-hover:opacity-100 transition-opacity`}>
                        <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-300 italic">{t.empty}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <button
              onClick={() => {
                if (onUpdate) {
                  const newItem: InvoiceItem = {
                    id: Math.random().toString(36).substr(2, 9),
                    description: 'New Item',
                    descriptionEn: '',
                    quantity: 1,
                    price: 0
                  };
                  onUpdate({ ...data, items: [...data.items, newItem] });
                }
              }}
              className="mt-2 w-full py-2 border-2 border-dashed border-gray-100 hover:border-brand-200 rounded-lg text-gray-300 hover:text-brand-500 transition flex items-center justify-center gap-2 opacity-0 hover:opacity-100"
            >
              <Plus size={16} /> Add Item Direct
            </button>
          </div>

          {/* Calculations */}
          <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'} ${sectionMargin}`}>
            <div className="w-1/2 md:w-1/3 space-y-2">
              <div className="flex justify-between text-gray-500 text-xs">
                <span>{t.subtotal}</span>
                <span className={numClass} dir={numDir}>{formatCurrency(subtotal)}</span>
              </div>

              {data.enableTax && (
                <div className="flex justify-between text-gray-500 text-xs">
                  <span>{t.tax} ({data.taxRate}%)</span>
                  <span className={numClass} dir={numDir}>{formatCurrency(taxAmount)}</span>
                </div>
              )}

              <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                <span className="text-brand-900 font-bold text-sm">{t.total}</span>
                <span className={`text-brand-600 font-bold text-lg ${numClass}`} dir={numDir}>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Footer / Notes */}
          <div className="mt-auto pt-4 border-t border-gray-200">
            <h4 className="font-bold text-xs text-gray-800 mb-1">{t.notes}</h4>
            <textarea
              value={data.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              className={`${editableTextAreaClass} text-gray-500 text-[10px] whitespace-pre-wrap leading-relaxed min-h-[4rem]`}
              style={{ height: 'auto', minHeight: '4rem' }}
              rows={Math.max(4, (data.notes?.split('\n').length || 1) + 1)}
            />
          </div>

          {/* Bottom Branding Strip */}
          <div className="absolute bottom-0 left-0 w-full h-2 bg-brand-500"></div>
          <div className={`absolute bottom-0 h-2 bg-accent-400 w-24 ${isRTL ? 'left-0' : 'right-0'}`}></div>
        </div>
      </div>
    </div>
  );
};
