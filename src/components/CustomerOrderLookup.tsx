import React, { useState } from 'react';
import { SaleRecord, DrawResult } from '../types';
import { formatDateBurmese, formatDualPrice, formatMMK, getSalePriceMMK } from '../utils/formatters';
import { Search, Phone, Ticket as TicketIcon, CheckCircle, AlertCircle, Receipt, Trophy, Sparkles, ShoppingBag, ArrowLeft } from 'lucide-react';
import { checkTicketWinning } from '../services/thaiLotteryService';

interface CustomerOrderLookupProps {
  sales: SaleRecord[];
  results: DrawResult[];
  exchangeRate: number;
  onViewReceipt: (sale: SaleRecord) => void;
  onGoToBuyTickets?: () => void;
  onGoBackToHome?: () => void;
}

export const CustomerOrderLookup: React.FC<CustomerOrderLookupProps> = ({
  sales,
  results,
  exchangeRate,
  onViewReceipt,
  onGoToBuyTickets,
  onGoBackToHome,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Search logic: match by phone number or ticket 6-digit number
  const trimmed = searchTerm.trim().toLowerCase();

  const matchedSales = trimmed
    ? sales.filter(
        (s) =>
          s.customerPhone.includes(trimmed) ||
          s.customerName.toLowerCase().includes(trimmed) ||
          s.ticketNumber.includes(trimmed) ||
          (s.serialCode && s.serialCode.toLowerCase().includes(trimmed))
      )
    : [];

  // Helper to check if a specific sale won a prize using full official engine
  const checkWinning = (sale: SaleRecord) => {
    const drawRes = results.find((r) => r.drawDate === sale.drawDate);
    if (!drawRes || !drawRes.announced) return null;

    const winData = checkTicketWinning(sale.ticketNumber, drawRes, exchangeRate);
    if (winData.isWinner) {
      return {
        prizes: winData.prizes.map((p) => p.nameBurmese),
        totalPrize: winData.totalPrizeTHB,
        totalPrizeMMK: winData.totalPrizeMMK,
      };
    }
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {onGoBackToHome && (
                <button
                  onClick={onGoBackToHome}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                  <span>ပင်မစာမျက်နှာ (Back)</span>
                </button>
              )}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Phone className="w-3.5 h-3.5" />
                <span>ဝယ်ယူထားသော မှတ်တမ်း ပြန်လည်ရှာဖွေရန်</span>
              </span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              ဝယ်ယူထားသော ထီလက်မှတ်နှင့် ပြေစာများ စစ်ဆေးကြည့်ရှုပါ
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              သင်၏ ဖုန်းနံပါတ် သို့မဟုတ် ထီဂဏန်း ၆ လုံး ရိုက်ထည့်၍ စစ်ဆေးနိုင်ပါသည်။
            </p>
          </div>

          {onGoToBuyTickets && (
            <button
              onClick={onGoToBuyTickets}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>ထီအသစ် ထပ်ဝယ်မည်</span>
            </button>
          )}
        </div>

        {/* Phone / Ticket Input Search Bar */}
        <div className="relative max-w-xl">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ဖုန်းနံပါတ် သို့မဟုတ် ထီနံပါတ် ရိုက်ထည့်ပါ (ဥပမာ: 0912345678 သို့မဟုတ် 582914)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-11 pr-4 py-3 text-sm font-semibold text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 shadow-inner"
          />
        </div>
      </div>

      {/* Search Results Display */}
      {trimmed ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TicketIcon className="w-4 h-4 text-emerald-600" />
              <span>တွေ့ရှိသော ထီလက်မှတ်များ ({matchedSales.length} စောင်)</span>
            </h3>
          </div>

          {matchedSales.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchedSales.map((sale) => {
                const isPaid = sale.paymentStatus === 'paid';
                const winning = checkWinning(sale);

                return (
                  <div
                    key={sale.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                  >
                    {/* Header: Customer & Date */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          ဝယ်သူ: {sale.customerName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          ဖုန်း: {sale.customerPhone}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">ဝယ်ယူသည့်ရက်</span>
                        <span className="text-xs font-semibold text-slate-700 font-mono">
                          {formatDateBurmese(sale.saleDate)}
                        </span>
                      </div>
                    </div>

                    {/* Ticket Number Highlight */}
                    <div className="bg-slate-900 rounded-xl p-3 text-center border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] text-amber-300 uppercase tracking-widest font-bold">
                          ထီနံပါတ် (Lottery Number)
                        </span>
                        {sale.serialCode && (
                          <span className="text-[10px] font-mono font-bold bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700">
                            အမှတ်စဉ်: {sale.serialCode}
                          </span>
                        )}
                      </div>
                      <div className="text-2xl font-black font-mono text-amber-300 tracking-widest">
                        {sale.ticketNumber}
                      </div>
                      <div className="text-xs text-slate-400 font-medium text-center">
                        <span>ထွက်မည့်ရက်: {formatDateBurmese(sale.drawDate)}</span>
                      </div>
                    </div>

                    {/* Winning Status Banner if Won */}
                    {winning && (
                      <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-xs">
                          <Trophy className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-amber-900 block">
                            ဂုဏ်ယူပါသည်! ထီပေါက်ပါသည်
                          </span>
                          <span className="text-[11px] font-medium text-amber-800">
                            {winning.prizes.join(', ')}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Footer: Price, Status, Receipt Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">ကျသင့်ငွေ</span>
                        <span className="text-sm font-black text-emerald-700 font-mono">
                          {formatMMK(getSalePriceMMK(sale, exchangeRate))}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>ငွေရှင်းပြီး</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>အကြွေးကျန်</span>
                            </>
                          )}
                        </span>

                        <button
                          onClick={() => onViewReceipt(sale)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        >
                          <Receipt className="w-3.5 h-3.5 text-amber-300" />
                          <span>ပြေစာ ကြည့်မည်</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 space-y-2">
              <p className="text-sm font-bold text-slate-700">
                "{searchTerm}" ဖြင့် ဝယ်ယူထားသော မှတ်တမ်း မတွေ့ရှိပါ
              </p>
              <p className="text-xs text-slate-400">
                ဖုန်းနံပါတ် သို့မဟုတ် ထီဂဏန်း မှန်ကန်စွာ ရိုက်ထည့်ထားခြင်း ရှိမရှိ စစ်ဆေးပေးပါ
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            မိမိဝယ်ယူထားသော ထီလက်မှတ်များ ရှာဖွေပါ
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            အထက်ပါ ရှာဖွေရေး အကွက်တွင် ဝယ်ယူစဉ်က ပေးခဲ့သော ဖုန်းနံပါတ် သို့မဟုတ် ဝယ်ယူထားသော ထီဂဏန်း ၆ လုံး ရိုက်ထည့်၍ ရှာဖွေနိုင်ပါသည်
          </p>
        </div>
      )}
    </div>
  );
};
