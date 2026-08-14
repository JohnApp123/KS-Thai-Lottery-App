import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Ticket, SaleRecord, AppTab } from '../types';
import { getTicketPriceMMK, getTicketPriceTHB, formatMMK, formatTHB } from '../utils/formatters';
import {
  Search,
  X,
  Ticket as TicketIcon,
  ShoppingBag,
  Phone,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileText,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

interface GlobalSearchBarProps {
  tickets: Ticket[];
  sales: SaleRecord[];
  exchangeRate: number;
  fixedTicketPriceMMK: number;
  onNavigateTab: (tab: AppTab) => void;
  onSellSingle?: (ticket: Ticket) => void;
  onViewReceipt?: (sale: SaleRecord) => void;
  onViewBuyer?: (ticket: Ticket) => void;
  onVerifyReservation?: (ticket: Ticket) => void;
  onSelectDrawDate?: (date: string) => void;
}

type SearchFilterCategory = 'all' | 'tickets' | 'sales';

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  tickets,
  sales,
  exchangeRate,
  fixedTicketPriceMMK,
  onNavigateTab,
  onSellSingle,
  onViewReceipt,
  onViewBuyer,
  onVerifyReservation,
  onSelectDrawDate,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<SearchFilterCategory>('all');
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: '/' or 'Ctrl+K' / 'Cmd+K' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) && document.activeElement !== inputRef.current) {
        // Only trigger if not already typing in an input/textarea
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault();
          inputRef.current?.focus();
          setIsOpen(true);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Normalize search text (remove extra spaces, ignore case)
  const trimmedQuery = query.trim().toLowerCase();
  const digitsOnly = query.replace(/\D/g, '');

  // Filter matching tickets
  const matchingTickets = useMemo(() => {
    if (!trimmedQuery) return [];
    return tickets.filter((t) => {
      // Search by ticket 6 digits or partial digits
      const matchNumber = t.number.toLowerCase().includes(trimmedQuery) || (digitsOnly && t.number.includes(digitsOnly));
      // Search by custom serial code / tracking no
      const matchSerial = t.serialCode && t.serialCode.toLowerCase().includes(trimmedQuery);
      // Search by series number
      const matchSeries = t.seriesNumber && t.seriesNumber.toLowerCase().includes(trimmedQuery);
      // Search by draw date
      const matchDraw = t.drawDate && t.drawDate.includes(trimmedQuery);
      // Search by reserved customer info
      const matchReservedName = t.reservedCustomerName && t.reservedCustomerName.toLowerCase().includes(trimmedQuery);
      const matchReservedPhone = t.reservedCustomerPhone && t.reservedCustomerPhone.includes(trimmedQuery);
      // Search by notes
      const matchNotes = t.notes && t.notes.toLowerCase().includes(trimmedQuery);

      return matchNumber || matchSerial || matchSeries || matchDraw || matchReservedName || matchReservedPhone || matchNotes;
    });
  }, [tickets, trimmedQuery, digitsOnly]);

  // Filter matching sales records
  const matchingSales = useMemo(() => {
    if (!trimmedQuery) return [];
    return sales.filter((s) => {
      // Search by customer phone
      const matchPhone = s.customerPhone && (s.customerPhone.includes(trimmedQuery) || (digitsOnly && s.customerPhone.replace(/\D/g, '').includes(digitsOnly)));
      // Search by customer name
      const matchName = s.customerName && s.customerName.toLowerCase().includes(trimmedQuery);
      // Search by ticket number
      const matchTicket = s.ticketNumber && (s.ticketNumber.toLowerCase().includes(trimmedQuery) || (digitsOnly && s.ticketNumber.includes(digitsOnly)));
      // Search by transaction ID / Reference
      const matchTxn = s.transactionId && s.transactionId.toLowerCase().includes(trimmedQuery);
      // Search by payment method / notes
      const matchNotes = s.notes && s.notes.toLowerCase().includes(trimmedQuery);
      const matchMethod = s.paymentMethod && s.paymentMethod.toLowerCase().includes(trimmedQuery);
      // Search by sale date or draw date
      const matchDate = (s.saleDate && s.saleDate.includes(trimmedQuery)) || (s.drawDate && s.drawDate.includes(trimmedQuery));

      return matchPhone || matchName || matchTicket || matchTxn || matchNotes || matchMethod || matchDate;
    });
  }, [sales, trimmedQuery, digitsOnly]);

  const totalMatchesCount = matchingTickets.length + matchingSales.length;

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={searchContainerRef} className="relative w-full max-w-md">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4 text-emerald-400" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="ထီနံပါတ် သို့မဟုတ် ဝယ်သူဖုန်း ရှာပါ..."
          className="w-full pl-9 pr-16 py-1.5 bg-slate-800/95 hover:bg-slate-800 focus:bg-slate-800 text-white placeholder-slate-400 text-xs sm:text-sm rounded-xl border border-slate-700/90 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all outline-none shadow-inner"
        />

        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
          {query ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors cursor-pointer"
              title="ရှာဖွေမှု ဖျက်မည်"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-700/60 border border-slate-600/60 rounded">
              /
            </kbd>
          )}
        </div>
      </div>

      {/* Instant Search Results Dropdown Popup */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 max-h-[80vh] flex flex-col min-w-[320px] sm:min-w-[460px] md:min-w-[540px]">
          {/* Header Summary & Category Filters */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
              <span>ရှာဖွေတွေ့ရှိမှု:</span>
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md text-[11px]">
                {totalMatchesCount} ခု
              </span>
              <span className="text-[11px] text-slate-500">
                (ထီ {matchingTickets.length} စောင် • အရောင်း {matchingSales.length} ခု)
              </span>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer text-[11px] ${
                  activeCategory === 'all'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                အားလုံး ({totalMatchesCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('tickets')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer text-[11px] flex items-center gap-1 ${
                  activeCategory === 'tickets'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TicketIcon className="w-3 h-3 text-emerald-600" />
                <span>ထီ ({matchingTickets.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('sales')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer text-[11px] flex items-center gap-1 ${
                  activeCategory === 'sales'
                    ? 'bg-white text-indigo-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingBag className="w-3 h-3 text-indigo-600" />
                <span>အရောင်း ({matchingSales.length})</span>
              </button>
            </div>
          </div>

          {/* Results List Area */}
          <div className="overflow-y-auto max-h-[60vh] divide-y divide-slate-100 p-2 space-y-2">
            {totalMatchesCount === 0 ? (
              <div className="p-8 text-center space-y-2 text-slate-500">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-bold text-sm text-slate-700">ရှာဖွေမှု မတွေ့ရှိပါ</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  ထီနံပါတ် ၆ လုံး သို့မဟုတ် နောက်ဆုံး ၂-၃ လုံး (သို့) ဝယ်သူ၏ ဖုန်းနံပါတ်ဖြင့် ပြန်လည်ရှာဖွေကြည့်ပါ။
                </p>
              </div>
            ) : (
              <>
                {/* 1. MATCHING TICKETS SECTION */}
                {(activeCategory === 'all' || activeCategory === 'tickets') && matchingTickets.length > 0 && (
                  <div className="space-y-1.5 pb-2">
                    <div className="flex items-center justify-between px-2 pt-1 pb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <TicketIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>ထီလက်မှတ်များ ({matchingTickets.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateTab('inventory');
                          setIsOpen(false);
                        }}
                        className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <span>ထီစာရင်း အပြည့်အစုံ</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {matchingTickets.slice(0, 8).map((ticket) => {
                        const priceMMK = getTicketPriceMMK(ticket, fixedTicketPriceMMK, exchangeRate);
                        const priceTHB = getTicketPriceTHB(ticket, exchangeRate, fixedTicketPriceMMK);

                        return (
                          <div
                            key={ticket.id}
                            className="bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/90 hover:border-emerald-300 rounded-xl p-2.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                          >
                            {/* Left: Digits & Details */}
                            <div className="flex items-center gap-3">
                              {/* 6 Digit Gold Badge */}
                              <div className="bg-slate-950 text-amber-300 font-mono font-black text-lg px-2.5 py-1 rounded-lg shadow-inner tracking-wider shrink-0 border border-slate-800">
                                {ticket.number}
                              </div>

                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {ticket.serialCode && (
                                    <span className="text-[10px] bg-slate-900 text-amber-300 font-mono font-bold px-1.5 py-0.5 rounded border border-slate-700">
                                      🔖 {ticket.serialCode}
                                    </span>
                                  )}
                                  {/* Status Badge */}
                                  {ticket.status === 'available' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                      <span>အသင့်ရှိ (Available)</span>
                                    </span>
                                  )}
                                  {ticket.status === 'reserved' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                                      <Clock className="w-2.5 h-2.5 text-amber-700" />
                                      <span>ယာယီ Sold (စစ်ဆဲ)</span>
                                    </span>
                                  )}
                                  {ticket.status === 'sold' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full border border-slate-300">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-slate-600" />
                                      <span>ရောင်းပြီး (Sold)</span>
                                    </span>
                                  )}

                                  <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">
                                    {ticket.setCount || 1} စောင်တွဲ
                                  </span>

                                  {ticket.seriesNumber && (
                                    <span className="text-[10px] text-slate-500 font-medium">
                                      အတွဲ: {ticket.seriesNumber}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                  <span>ထွက်ရက်: <strong className="text-slate-700">{ticket.drawDate || '16-08-2026'}</strong></span>
                                  <span>•</span>
                                  <span className="text-emerald-700 font-bold font-mono">
                                    {priceMMK.toLocaleString('en-US')} Ks (~฿{priceTHB})
                                  </span>
                                  {ticket.reservedCustomerName && (
                                    <>
                                      <span>•</span>
                                      <span className="text-amber-800 font-medium">
                                        လျာထားသူ: {ticket.reservedCustomerName} ({ticket.reservedCustomerPhone})
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Quick Action Button */}
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                              {ticket.status === 'available' && onSellSingle && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSellSingle(ticket);
                                    setIsOpen(false);
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <ShoppingBag className="w-3 h-3" />
                                  <span>ရောင်းမည်</span>
                                </button>
                              )}

                              {ticket.status === 'reserved' && (
                                <>
                                  {onVerifyReservation && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onVerifyReservation(ticket);
                                        setIsOpen(false);
                                      }}
                                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-xs transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                    >
                                      <Clock className="w-3 h-3" />
                                      <span>ငွေလွှဲစစ်မည်</span>
                                    </button>
                                  )}
                                  {onViewBuyer && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onViewBuyer(ticket);
                                        setIsOpen(false);
                                      }}
                                      className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                    >
                                      ဝယ်သူကြည့်
                                    </button>
                                  )}
                                </>
                              )}

                              {ticket.status === 'sold' && onViewBuyer && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onViewBuyer(ticket);
                                    setIsOpen(false);
                                  }}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>ပြေစာ/ဝယ်သူကြည့်</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  if (onSelectDrawDate && ticket.drawDate) {
                                    onSelectDrawDate(ticket.drawDate);
                                  }
                                  onNavigateTab('inventory');
                                  setIsOpen(false);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                title="ထီစာရင်းထဲသို့ သွားမည်"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. MATCHING SALES RECORDS SECTION */}
                {(activeCategory === 'all' || activeCategory === 'sales') && matchingSales.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between px-2 pt-1 pb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
                        <span>အရောင်းမှတ်တမ်းနှင့် ဝယ်သူများ ({matchingSales.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateTab('sales');
                          setIsOpen(false);
                        }}
                        className="text-[11px] text-indigo-700 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <span>အရောင်းစာရင်း အပြည့်အစုံ</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {matchingSales.slice(0, 8).map((sale) => {
                        const isPaid = sale.paymentStatus === 'paid';
                        const isPending = sale.paymentStatus === 'pending';

                        return (
                          <div
                            key={sale.id}
                            className="bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/90 hover:border-indigo-300 rounded-xl p-2.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                          >
                            {/* Left: Customer Info & Ticket Number */}
                            <div className="flex items-start gap-3">
                              {/* Ticket Digits Pill */}
                              <div className="bg-slate-900 text-amber-300 font-mono font-black text-base px-2 py-0.5 rounded-lg shadow-inner tracking-wider shrink-0 border border-slate-800 mt-0.5">
                                {sale.ticketNumber}
                              </div>

                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {sale.serialCode && (
                                    <span className="text-[10px] bg-slate-900 text-amber-300 font-mono font-bold px-1.5 py-0.5 rounded border border-slate-700">
                                      🔖 {sale.serialCode}
                                    </span>
                                  )}
                                  {/* Customer Name */}
                                  <span className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1">
                                    <User className="w-3.5 h-3.5 text-slate-500" />
                                    <span>{sale.customerName}</span>
                                  </span>

                                  {/* Customer Phone (Highlighted) */}
                                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    <span>{sale.customerPhone}</span>
                                  </span>

                                  {/* Payment Status Badge */}
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                      isPaid
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                        : isPending
                                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                                        : 'bg-rose-100 text-rose-800 border-rose-200'
                                    }`}
                                  >
                                    {isPaid ? 'ငွေရှင်းပြီး (Paid)' : isPending ? 'စစ်ဆေးဆဲ' : 'အကြွေးကျန် (Unpaid)'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                  <span>ကျသင့်ငွေ: <strong className="text-slate-800 font-mono font-bold">{formatMMK(sale.salePrice, exchangeRate)}</strong></span>
                                  <span>•</span>
                                  <span>ရောင်းရက်: {sale.saleDate}</span>
                                  {sale.paymentMethod && (
                                    <>
                                      <span>•</span>
                                      <span className="text-slate-600 font-medium">လွှဲနည်း: {sale.paymentMethod}</span>
                                    </>
                                  )}
                                  {sale.transactionId && (
                                    <>
                                      <span>•</span>
                                      <span className="font-mono text-slate-500">Txn: {sale.transactionId}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Quick Action Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                              {onViewReceipt && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onViewReceipt(sale);
                                    setIsOpen(false);
                                  }}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>ပြေစာ ကြည့်မည်</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  onNavigateTab('sales');
                                  setIsOpen(false);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                title="အရောင်းမှတ်တမ်းဇယား သို့ သွားမည်"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Bar with Keyboard / Help Tip */}
          <div className="p-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span>💡 အကြံပြုချက်: ထီ ၆ လုံး သို့မဟုတ် ဖုန်းနံပါတ် <strong>09...</strong> ဖြင့် အလွယ်တကူ ရှာဖွေနိုင်ပါသည်</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              [Esc] ပိတ်မည်
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
