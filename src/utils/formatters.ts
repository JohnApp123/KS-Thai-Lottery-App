import { SaleRecord, Ticket } from '../types';

export const DEFAULT_EXCHANGE_RATE = 120; // 1 THB = 120 MMK default market estimate
export const DEFAULT_FIXED_TICKET_PRICE_MMK = 15000; // Fixed Cost: 15,000 MMK per 1 ticket (၁ စောင်လျှင် ၁၅,၀၀၀ ကျပ်)

export const getTicketPriceMMK = (
  ticket: Ticket,
  defaultFixedPriceMMK: number = DEFAULT_FIXED_TICKET_PRICE_MMK,
  exchangeRate: number = DEFAULT_EXCHANGE_RATE
): number => {
  if (typeof ticket.priceMMK === 'number' && ticket.priceMMK > 0) {
    return ticket.priceMMK;
  }
  if (ticket.currency === 'MMK' && ticket.price > 0) {
    return ticket.price;
  }
  const count = ticket.setCount || 1;
  if (defaultFixedPriceMMK > 0) {
    return count * defaultFixedPriceMMK;
  }
  return Math.round(ticket.price * exchangeRate);
};

export const getTicketPriceTHB = (
  ticket: Ticket,
  exchangeRate: number = DEFAULT_EXCHANGE_RATE,
  defaultFixedPriceMMK: number = DEFAULT_FIXED_TICKET_PRICE_MMK
): number => {
  if (ticket.currency === 'THB' && ticket.price > 0) {
    return ticket.price;
  }
  const mmk = getTicketPriceMMK(ticket, defaultFixedPriceMMK, exchangeRate);
  return exchangeRate > 0 ? Math.round(mmk / exchangeRate) : 110 * (ticket.setCount || 1);
};

export const fetchLatestTHBRate = async (): Promise<number | null> => {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/THB');
    if (!res.ok) throw new Error('Failed to fetch rate');
    const data = await res.json();
    if (data && data.rates && data.rates.MMK) {
      // Rates from official exchange API
      const officialRate = data.rates.MMK;
      // Note: Open exchange rate returns official rate. If rate is valid, return rounded or standard rate
      return Math.round(officialRate);
    }
  } catch (err) {
    console.warn('Unable to auto-fetch exchange rate, using default/cached rate:', err);
  }
  return null;
};

export const formatTHB = (amount: number): string => {
  return `${amount.toLocaleString('en-US')} MMK`;
};

export const formatMMK = (amountInMMK: number, _rate?: number): string => {
  return `${Math.round(amountInMMK).toLocaleString('en-US')} MMK`;
};

export const formatDualPrice = (
  amount: number,
  _rate?: number,
  _primary: 'MMK' | 'THB' = 'MMK'
): string => {
  return `${Math.round(amount).toLocaleString('en-US')} MMK`;
};

export const formatCurrency = (amount: number, _currency?: string): string => {
  return `${amount.toLocaleString('en-US')} MMK`;
};


export const formatDateBurmese = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export const BURMESE_MONTHS: { [key: string]: string } = {
  '01': 'ဇန်နဝါရီ',
  '02': 'ဖေဖော်ဝါရီ',
  '03': 'မတ်',
  '04': 'ဧပြီ',
  '05': 'မေ',
  '06': 'ဇွန်',
  '07': 'ဇူလိုင်',
  '08': 'သြဂုတ်',
  '09': 'စက်တင်ဘာ',
  '10': 'အောက်တိုဘာ',
  '11': 'နိုဝင်ဘာ',
  '12': 'ဒီဇင်ဘာ',
};

export const BURMESE_WEEKDAYS = [
  'တနင်္ဂနွေ',
  'တနင်္လာ',
  'အင်္ဂါ',
  'ဗုဒ္ဓဟူး',
  'ကြာသပတေး',
  'သောကြာ',
  'စနေ',
];

export const formatFullDateBurmese = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  const monthName = BURMESE_MONTHS[month] || month;
  
  // Try to parse weekday
  try {
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    const weekday = BURMESE_WEEKDAYS[d.getDay()];
    return `${toBurmeseDigits(year)} ခုနှစ်၊ ${monthName}လ ${toBurmeseDigits(Number(day))} ရက် (${weekday}နေ့)`;
  } catch (e) {
    return `${toBurmeseDigits(year)} ခုနှစ်၊ ${monthName}လ ${toBurmeseDigits(Number(day))} ရက်`;
  }
};

export const getRelativeDateLabel = (dateStr: string): string | null => {
  if (!dateStr) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return 'ယနေ့ (Today)';
  
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  if (dateStr === yesterday) return 'မနေ့က (Yesterday)';
  
  return null;
};

export const toBurmeseDigits = (str: string | number): string => {
  const map: { [key: string]: string } = {
    '0': '၀',
    '1': '၁',
    '2': '၂',
    '3': '၃',
    '4': '၄',
    '5': '၅',
    '6': '၆',
    '7': '၇',
    '8': '၈',
    '9': '၉',
  };
  return String(str).replace(/[0-9]/g, (w) => map[w] || w);
};

export const exportSalesToCSV = (sales: SaleRecord[]) => {
  const headers = ['အမှတ်စဉ်', 'ဝယ်ယူသူ နာမည်', 'ဖုန်းနံပါတ်', 'ထီနံပါတ်', 'အတွဲ', 'ရောင်းဈေး', 'ငွေပေးချေမှု', 'ရောင်းရသည့်ရက်', 'ထွက်မည့်ရက်', 'မှတ်ချက်'];
  
  const rows = sales.map((s, idx) => [
    idx + 1,
    `"${s.customerName}"`,
    `"${s.customerPhone}"`,
    `"${s.ticketNumber}"`,
    `"${s.seriesNumber || '-'}"`,
    s.salePrice,
    s.paymentStatus === 'paid' ? 'ငွေရှင်းပြီး' : 'အကြွေးကျန်',
    s.saleDate,
    s.drawDate,
    `"${s.notes || ''}"`,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Thai_Lottery_Sales_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const matchTicketDigits = (ticketNumber: string, query: string, matchType: 'all' | 'front3' | 'back3' | 'back2' = 'all'): boolean => {
  const q = query.trim();
  if (!q) return true;
  if (matchType === 'front3') {
    return ticketNumber.substring(0, 3).includes(q);
  }
  if (matchType === 'back3') {
    return ticketNumber.substring(3, 6).includes(q);
  }
  if (matchType === 'back2') {
    return ticketNumber.substring(4, 6).includes(q);
  }
  return ticketNumber.includes(q);
};
