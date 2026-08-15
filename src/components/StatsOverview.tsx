import React from 'react';
import { Ticket, CheckCircle2, ShoppingCart, DollarSign, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { formatCurrency, toBurmeseDigits } from '../utils/formatters';

interface StatsOverviewProps {
  totalTicketsCount: number;
  availableCount: number;
  soldCount: number;
  reservedCount?: number;
  totalRevenue: number;
  pendingCreditAmount: number;
  exchangeRate?: number;
  activeStatusFilter?: 'all' | 'available' | 'reserved' | 'sold';
  onSelectFilter?: (status: 'all' | 'available' | 'reserved' | 'sold') => void;
  onOpenPendingVerification?: () => void;
  onGoToSalesTab?: (type?: 'all' | 'unpaid') => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  totalTicketsCount,
  availableCount,
  soldCount,
  reservedCount = 0,
  totalRevenue,
  pendingCreditAmount,
  exchangeRate = 120,
  activeStatusFilter,
  onSelectFilter,
  onOpenPendingVerification,
  onGoToSalesTab,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-6">
      {/* 1. Total Tickets */}
      <div
        onClick={() => onSelectFilter?.('all')}
        className={`bg-white border rounded-xl p-3.5 sm:p-4 flex items-center justify-between shadow-xs transition-all cursor-pointer hover:border-blue-400 hover:shadow-sm active:scale-[0.98] ${
          activeStatusFilter === 'all'
            ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20'
            : 'border-slate-200/80'
        }`}
        title="အားလုံးသော ထီလက်မှတ်များ စာရင်းကို ကြည့်မည်"
      >
        <div>
          <p className="text-xs text-slate-500 font-medium mb-1">စုစုပေါင်း စောင်ရေ</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg sm:text-xl font-bold text-slate-900">
              {totalTicketsCount.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">({toBurmeseDigits(totalTicketsCount)} စောင်)</span>
          </div>
        </div>
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
          <Ticket className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      {/* 2. Available Inventory */}
      <div
        onClick={() => onSelectFilter?.('available')}
        className={`bg-white border rounded-xl p-3.5 sm:p-4 flex items-center justify-between shadow-xs transition-all cursor-pointer hover:border-emerald-400 hover:shadow-sm active:scale-[0.98] ${
          activeStatusFilter === 'available'
            ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/20'
            : 'border-slate-200/80'
        }`}
        title="လက်ကျန် ရောင်းရန်ရှိသော ထီလက်မှတ်များကို ကြည့်မည်"
      >
        <div>
          <p className="text-xs text-emerald-700 font-semibold mb-1">ရောင်းရန်ရှိ ( Available )</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg sm:text-xl font-bold text-emerald-600">
              {availableCount.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">({toBurmeseDigits(availableCount)} စောင်)</span>
          </div>
        </div>
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      {/* 3. Sold Count */}
      <div
        onClick={() => onSelectFilter?.('sold')}
        className={`bg-white border rounded-xl p-3.5 sm:p-4 flex items-center justify-between shadow-xs transition-all cursor-pointer hover:border-rose-400 hover:shadow-sm active:scale-[0.98] ${
          activeStatusFilter === 'sold'
            ? 'ring-2 ring-rose-500 border-rose-500 bg-rose-50/20'
            : 'border-slate-200/80'
        }`}
        title="ရောင်းချပြီးသော ထီလက်မှတ်များကို ကြည့်မည်"
      >
        <div>
          <p className="text-xs text-rose-700 font-semibold mb-1">ရောင်းပြီး ( Sold Out )</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg sm:text-xl font-bold text-rose-600">
              {soldCount.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">({toBurmeseDigits(soldCount)} စောင်)</span>
          </div>
        </div>
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
          <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      {/* 4. ယာယီ Sold (Confirm ရန် / Pending) - Positioned right below Available, next to Sold Out */}
      <div
        onClick={() => {
          onSelectFilter?.('reserved');
          if (reservedCount > 0 && onOpenPendingVerification) {
            onOpenPendingVerification();
          }
        }}
        className={`bg-white border rounded-xl p-3.5 sm:p-4 flex items-center justify-between shadow-xs transition-all cursor-pointer hover:border-amber-400 hover:shadow-sm active:scale-[0.98] ${
          activeStatusFilter === 'reserved'
            ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/30'
            : 'border-amber-200/80 bg-amber-50/15'
        }`}
        title="ယာယီ Sold Out ဖြစ်နေသော ထီလက်မှတ်များအား ငွေလွှဲစစ်ဆေး အတည်ပြုရန်"
      >
        <div>
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs text-amber-900 font-bold">ယာယီ Soldout</p>
            {reservedCount > 0 && (
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg sm:text-xl font-bold text-amber-600 font-mono">
              {reservedCount.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">({toBurmeseDigits(reservedCount)} စောင်)</span>
          </div>
        </div>
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-100/80 text-amber-700 border border-amber-300 flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      {/* 5. Total Revenue */}
      <div
        onClick={() => onGoToSalesTab?.('all')}
        className="bg-white border border-slate-200/80 rounded-xl p-3.5 sm:p-4 flex items-center justify-between shadow-xs col-span-2 sm:col-span-1 transition-all cursor-pointer hover:border-emerald-400 hover:shadow-sm active:scale-[0.98]"
        title="အရောင်းစာရင်းနှင့် ရောင်းရငွေ အသေးစိတ် ကြည့်မည်"
      >
        <div>
          <p className="text-xs text-slate-700 font-medium mb-1">စုစုပေါင်း ရောင်းရငွေ</p>
          <p className="text-sm sm:text-base font-bold text-emerald-700 font-mono">
            {formatCurrency(totalRevenue, 'MMK')}
          </p>
        </div>
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
          <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      {/* 6. Pending Credit / Unpaid */}
      <div
        onClick={() => onGoToSalesTab?.('unpaid')}
        className="bg-white border border-slate-200/80 rounded-xl p-3.5 sm:p-4 flex items-center justify-between shadow-xs col-span-2 sm:col-span-1 transition-all cursor-pointer hover:border-orange-400 hover:shadow-sm active:scale-[0.98]"
        title="အကြွေးကျန်ငွေ စာရင်းများကို ကြည့်မည်"
      >
        <div>
          <p className="text-xs text-orange-700 font-medium mb-1">အကြွေးကျန်ငွေ (Unpaid)</p>
          <p className="text-sm sm:text-base font-bold text-orange-600 font-mono">
            {formatCurrency(pendingCreditAmount, 'MMK')}
          </p>
        </div>
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shrink-0">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>
    </div>
  );
};


