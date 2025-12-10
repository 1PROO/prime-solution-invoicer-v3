
export type Language = 'en' | 'ar';

export interface InvoiceItem {
  id: string;
  description: string;
  descriptionEn?: string; // Optional English description
  quantity: number;
  price: number;
}

export interface SavedItem {
  id: string;
  description: string;
  descriptionEn?: string; // Optional English description
  price: number;
}

export interface SavedClient {
  id: string;
  name: string;
  address: string;
  phone: string;
}

export interface InvoiceData {
  language: Language;
  title: string;
  invoiceNumber: string;
  date: string;
  documentType: 'invoice' | 'quote';
  dueDate: string;
  currency: string;

  // Seller Info
  sellerName: string;
  sellerEmail: string;
  sellerAddress: string;
  sellerPhone: string;

  // Client Info
  clientName: string;
  clientAddress: string;
  clientPhone: string; // Changed from clientEmail

  // Content
  items: InvoiceItem[];
  notes: string;

  // Settings
  taxRate: number;
  enableTax: boolean;

  // Visuals
  logoUrl: string | null;
}
