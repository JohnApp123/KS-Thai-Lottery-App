import React, { useState } from 'react';
import { SaleRecord, CustomerSummary } from '../types';
import { formatCurrency, formatDateBurmese, formatMMK } from '../utils/formatters';
import { Users, Search, Phone, AlertCircle, CheckCircle, Ticket, ChevronRight, ArrowLeft, Home, ShoppingBag } from 'lucide-react';

interface CustomerDirectoryProps {
  sales: SaleRecord[];
  onTogglePaymentStatus: (saleId: string) => void;
  exchangeRate?: number;
  fixedTicketPriceMMK?: number;
  onGoBackToHome?: () => void;
}

export const CustomerDirectory: React.FC<CustomerDirectoryProps> = ({
  sales,
  onTogglePaymentStatus,
  exchangeRate = 120,
  fixedTicketPriceMMK = 15000,
  onGoBackToHome,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);

  // Group sales by customer name & phone
  const customerMap: { [key: string]: CustomerSummary } = {};

  sales.forEach((s) => {
    const key = `${s.customerName.trim()}_${s.customerPhone.trim()}`;
    if (!customerMap[key]) {
      customerMap[key] = {
        name: s.customerName,
        phone: s.customerPhone,
        totalTickets: 0,
        totalSpent: 0,
        unpaidAmount: 0,
        tickets: [],
      };
    }

    customerMap[key].totalTickets += 1;
    customerMap[key].totalSpent += s.salePrice;
    if (s.paymentStatus === 'unpaid') {
      customerMap[key].unpaidAmount += s.salePrice;
    }
    customerMap[key].tickets.push({
      ticketNumber: s.ticketNumber,
      drawDate: s.drawDate,
      paymentStatus: s.paymentStatus,
      price: s.salePrice,
    });
  });

  const customerList = Object.values(customerMap).filter((c) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Header & Navigation Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onGoBackToHome && (
            <button
              onClick={onGoBackToHome}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 shadow-2xs active:scale-95"
              title="ပင်မ စာမျက်နှာသို့ ပြန်သွားမည်"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>ပင်မစာမျက်နှာ (Back)</span>
            </button>
          )}
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>ဝယ်ယူသူများ အချက်အလက်နှင့် မှတ်တမ်း</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Customer Directory, Order History & Credit Balances
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-xs text-slate-600 font-medium bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>စုစုပေါင်း ဝယ်ယူသူ: <strong className="text-slate-900">{customerList.length}</strong> ဦး</span>
          </span>
        </div>
      </div>

      {/* Top Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ဝယ်သူ နာမည် သို့မဟုတ် ဖုန်းနံပါတ်ဖြင့် ရှာဖွေရန်..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200/90 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
          />
        </div>
      </div>

      {/* Grid of Customer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customerList.length > 0 ? (
          customerList.map((c, i) => {
            const hasCredit = c.unpaidAmount > 0;
            const isExpanded = selectedCustomerName === c.name;
            const totalSpentMMK = Math.round(c.totalSpent * exchangeRate);
            const unpaidAmountMMK = Math.round(c.unpaidAmount * exchangeRate);

            return (
              <div
                key={i}
                className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 sm:p-5 transition-all space-y-3.5 shadow-xs hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{c.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 font-mono mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{c.phone}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-medium">ဝယ်ယူမှု</span>
                    <span className="text-sm font-black text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-lg inline-block">
                      {c.totalTickets} စောင်
                    </span>
                  </div>
                </div>

                {/* Pricing & Spent Breakdown - Accurate MMK */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px] font-semibold mb-0.5">စုစုပေါင်း သုံးစွဲငွေ</span>
                    <span className="font-black text-emerald-800 text-sm font-mono block">
                      {totalSpentMMK.toLocaleString('en-US')} MMK
                    </span>
                  </div>

                  <div className="text-right border-l border-slate-200 pl-3">
                    <span className="text-slate-500 block text-[11px] font-semibold mb-0.5">အကြွေးကျန်ငွေ</span>
                    {hasCredit ? (
                      <span className="font-black text-rose-600 text-sm font-mono block">
                        {unpaidAmountMMK.toLocaleString('en-US')} MMK
                      </span>
                    ) : (
                      <span className="font-bold text-emerald-600 text-xs py-1 inline-block">
                        ငွေအားလုံးရှင်းပြီး ✓
                      </span>
                    )}
                  </div>
                </div>

                {/* Purchased Ticket Pills */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="font-semibold text-slate-700">ဝယ်ယူထားသော ထီနံပါတ်များ:</span>
                    <button
                      onClick={() =>
                        setSelectedCustomerName(isExpanded ? null : c.name)
                      }
                      className="text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                    >
                      <span>{isExpanded ? 'ခေါက်မည်' : 'အသေးစိတ်ကြည့်ရန်'}</span>
                      <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {c.tickets.slice(0, isExpanded ? 50 : 3).map((t, idx) => {
                      const ticketMmk = Math.round(t.price * (t.price > 1000 ? 1 : exchangeRate));
                      return (
                        <div
                          key={idx}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                            t.paymentStatus === 'paid'
                              ? 'bg-slate-900 text-amber-300 border-slate-800'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          <Ticket className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.ticketNumber}</span>
                          {isExpanded && (
                            <span className="text-[10px] text-slate-300 font-normal pl-1 border-l border-slate-700">
                              {ticketMmk.toLocaleString('en-US')} MMK
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {!isExpanded && c.tickets.length > 3 && (
                      <button
                        onClick={() => setSelectedCustomerName(c.name)}
                        className="text-[11px] text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg self-center font-bold cursor-pointer"
                      >
                        +{c.tickets.length - 3} စောင်ကျန်
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-white border border-slate-200 rounded-2xl">
            ဝယ်ယူသူ မရှိသေးပါ သို့မဟုတ် ရှာဖွေမှုနှင့် မကိုက်ညီပါ
          </div>
        )}
      </div>
    </div>
  );
};
