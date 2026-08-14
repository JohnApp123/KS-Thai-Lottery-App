export type UserRole = 'admin' | 'customer';

export interface AdminUser {
  id: string;
  name: string;
  pin: string;
  roleName: string; // e.g. 'Owner' | 'Manager' | 'Admin'
  avatarColor: string;
}

export type AppTab = 'inventory' | 'sales' | 'customers' | 'results' | 'self-select' | 'my-orders' | 'reports' | 'settings';

export interface ExchangeRateSettings {
  thbToMmk: number; // e.g. 120 (1 THB = 120 MMK)
  lastUpdated: string;
  autoUpdate: boolean;
}

export type TicketStatus = 'available' | 'sold' | 'reserved';

export type PaymentStatus = 'paid' | 'unpaid' | 'pending';

export type PaymentAccountProvider = 'KBZPay' | 'WaveMoney';

export interface PaymentAccount {
  id: string;
  provider: PaymentAccountProvider;
  accountName: string;
  accountNumber: string;
  qrCodeUrl?: string; // QR code image URL or data URI
  notes?: string;
  isActive: boolean;
}

export interface Ticket {
  id: string;
  number: string; // 6-digit lottery number e.g. "582914"
  serialCode?: string; // ကိုယ်ပိုင် အမှတ်စဉ် / စာရင်းစဉ်နံပါတ် (Custom Serial / Tracking / Ref No. e.g. "SN-001", "#01", "A-12")
  seriesNumber?: string; // ထီအတွဲ / ชุดที่ e.g. "01", "ชุดที่ 1"
  drawDate: string; // YYYY-MM-DD or DD/MM/YYYY e.g. "2026-08-16"
  price: number; // in THB or MMK
  currency: 'THB' | 'MMK';
  priceMMK?: number; // Fixed cost / selling price in MMK (e.g. 15,000 MMK per ticket)
  status: TicketStatus;
  setCount?: number; // ထီစောင်ရေ / အတွဲ (e.g. 1 စောင်, 2 စောင်)
  notes?: string;
  imageUrl?: string; // Photo of physical lottery ticket
  reservedCustomerName?: string;
  reservedCustomerPhone?: string;
  reservedAt?: string;
  createdAt: string;
}

export interface SaleRecord {
  id: string;
  ticketId: string;
  ticketNumber: string;
  serialCode?: string; // ကိုယ်ပိုင် အမှတ်စဉ်နံပါတ်
  seriesNumber?: string;
  customerName: string;
  customerPhone: string;
  saleDate: string; // YYYY-MM-DD
  salePrice: number;
  currency: 'THB' | 'MMK';
  paymentStatus: PaymentStatus;
  paymentMethod?: string; // e.g. 'KBZPay' | 'WaveMoney' | 'Cash'
  paymentSlipUrl?: string; // Screenshot image URL or Base64 data URI of bank transfer receipt
  transactionId?: string; // Last digits or reference number from slip
  confirmedBy?: string; // Admin user name who approved
  confirmedAt?: string; // ISO date timestamp
  notes?: string;
  drawDate: string;
  createdAt: string;
}

export interface CustomerSummary {
  name: string;
  phone: string;
  totalTickets: number;
  totalSpent: number;
  unpaidAmount: number;
  tickets: {
    ticketNumber: string;
    drawDate: string;
    paymentStatus: PaymentStatus;
    price: number;
  }[];
}

export interface DrawResult {
  drawDate: string;
  firstPrize: string; // 6 digits
  firstPrizeAmount: number;
  adjacentFirstPrizes?: string[]; // 2 combinations of 6 digits (100,000 THB each)
  frontThreeDigits: string[]; // 2 combinations of 3 digits (4,000 THB each)
  backThreeDigits: string[]; // 2 combinations of 3 digits (4,000 THB each)
  backTwoDigits: string; // 2 digits (2,000 THB each)
  secondPrizes?: string[]; // 5 combinations (200,000 THB each)
  thirdPrizes?: string[]; // 10 combinations (80,000 THB each)
  fourthPrizes?: string[]; // 50 combinations (40,000 THB each)
  fifthPrizes?: string[]; // 100 combinations (20,000 THB each)
  announced: boolean;
  isLive?: boolean;
  lastSyncedAt?: string;
  sourceName?: string;
}
