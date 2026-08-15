import React, { useState, useMemo } from 'react';
import { SaleRecord, PaymentStatus } from '../types';
import {
  formatCurrency,
  formatDateBurmese,
  formatFullDateBurmese,
  getRelativeDateLabel,
  exportSalesToCSV,
} from '../utils/formatters';
import {
  Search,
  Download,
  Printer,
  CheckCircle,
  AlertCircle,
  Eye,
  Undo2,
  Filter,
  Phone,
  Calendar,
  ArrowLeft,
  ShoppingBag,
  Clock,
  Layers,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Tag,
  Ticket as TicketIcon,
  X,
  RefreshCw,
  Pencil,
} from 'lucide-react';

interface SalesTableProps {
  sales: SaleRecord[];
  onTogglePaymentStatus: (saleId: string) => void;
  onCancelSale: (saleId: string) => void;
  onViewReceipt: (sale: SaleRecord) => void;
  onEditSale?: (sale: SaleRecord) => void;
  onResetAllSalesAndDebts?: () => void;
  selectedDrawDate: string;
  setSelectedDrawDate?: (date: string) => void;
  drawDates?: string[];
  archivedDrawDates?: string[];
  exchangeRate?: number;
  fixedTicketPriceMMK?: number;
  onGoBackToHome?: () => void;
}

export const SalesTable: React.FC<SalesTableProps> = ({
  sales,
  onTogglePaymentStatus,
  onCancelSale,
  onViewReceipt,
  onEditSale,
  onResetAllSalesAndDebts,
  selectedDrawDate,
  setSelectedDrawDate,
  drawDates = ['2026-08-16', '2026-08-01'],
  archivedDrawDates = [],
  exchangeRate = 120,
  fixedTicketPriceMMK = 15000,
  onGoBackToHome,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid' | 'pending'>('all');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  
  // Date Filters
  const [filterDrawDate, setFilterDrawDate] = useState<string>(selectedDrawDate || 'all');
  const [saleDatePreset, setSaleDatePreset] = useState<'all' | 'today' | 'yesterday' | 'week' | 'custom'>('all');
  const [customSaleDate, setCustomSaleDate] = useState<string>('');

  // View Mode: 'table' vs 'date-grouped' (Timeline view)
  const [viewMode, setViewMode] = useState<'table' | 'date-grouped'>('table');
  const [collapsedDates, setCollapsedDates] = useState<{ [key: string]: boolean }>({});

  // Today and Yesterday helper
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const weekAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }, []);

  // Collect all unique draw dates from sales and available draw dates
  const allDrawDatesList = useMemo(() => {
    const dates = new Set<string>([...drawDates, ...sales.map((s) => s.drawDate)]);
    return Array.from(dates).filter(Boolean).sort().reverse();
  }, [drawDates, sales]);

  // Collect all unique sale dates for quick stats
  const allSaleDatesList = useMemo(() => {
    const dates = new Set<string>(sales.map((s) => s.saleDate));
    return Array.from(dates).filter(Boolean).sort().reverse();
  }, [sales]);

  // Main Filter Logic
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      // 1. Draw Date Filter
      if (filterDrawDate !== 'all' && s.drawDate !== filterDrawDate) {
        return false;
      }

      // 2. Payment Status Filter
      if (paymentFilter !== 'all' && s.paymentStatus !== paymentFilter) {
        return false;
      }

      // 3. Sale Date Filter
      if (saleDatePreset === 'today' && s.saleDate !== todayStr) {
        return false;
      }
      if (saleDatePreset === 'yesterday' && s.saleDate !== yesterdayStr) {
        return false;
      }
      if (saleDatePreset === 'week' && s.saleDate < weekAgoStr) {
        return false;
      }
      if (saleDatePreset === 'custom' && customSaleDate && s.saleDate !== customSaleDate) {
        return false;
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.customerName.toLowerCase().includes(q);
        const matchPhone = s.customerPhone.toLowerCase().includes(q);
        const matchTicket = s.ticketNumber.toLowerCase().includes(q);
        const matchSerial = (s.serialCode || '').toLowerCase().includes(q);
        const matchSeries = (s.seriesNumber || '').toLowerCase().includes(q);
        const matchDate = (s.saleDate || '').includes(q) || (s.drawDate || '').includes(q);
        return matchName || matchPhone || matchTicket || matchSerial || matchSeries || matchDate;
      }

      return true;
    }).sort((a, b) => {
      // Default Sort by Sale Date descending (newest first)
      if (b.saleDate !== a.saleDate) {
        return b.saleDate.localeCompare(a.saleDate);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [sales, filterDrawDate, paymentFilter, saleDatePreset, customSaleDate, searchQuery, todayStr, yesterdayStr, weekAgoStr]);

  // Group filtered sales by sale date for Timeline / Grouped view
  const salesGroupedByDate: Record<string, SaleRecord[]> = useMemo(() => {
    const groups: Record<string, SaleRecord[]> = {};
    for (const sale of filteredSales) {
      const d = sale.saleDate || 'ရက်စွဲမရှိ';
      if (!groups[d]) {
        groups[d] = [];
      }
      groups[d].push(sale);
    }
    return groups;
  }, [filteredSales]);

  // Calculated Aggregate Stats for the current filtered sales
  const stats = useMemo(() => {
    const totalCount = filteredSales.length;
    const totalMMK = filteredSales.reduce(
      (sum, s) => sum + (s.currency === 'MMK' ? s.salePrice : Math.round(s.salePrice * exchangeRate)),
      0
    );

    const paidSales = filteredSales.filter((s) => s.paymentStatus === 'paid');
    const paidCount = paidSales.length;
    const paidMMK = paidSales.reduce(
      (sum, s) => sum + (s.currency === 'MMK' ? s.salePrice : Math.round(s.salePrice * exchangeRate)),
      0
    );

    const unpaidSales = filteredSales.filter((s) => s.paymentStatus === 'unpaid');
    const unpaidCount = unpaidSales.length;
    const unpaidMMK = unpaidSales.reduce(
      (sum, s) => sum + (s.currency === 'MMK' ? s.salePrice : Math.round(s.salePrice * exchangeRate)),
      0
    );

    return {
      totalCount,
      totalMMK,
      paidCount,
      paidMMK,
      unpaidCount,
      unpaidMMK,
    };
  }, [filteredSales, exchangeRate]);

  const toggleDateCollapse = (dateKey: string) => {
    setCollapsedDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setPaymentFilter('all');
    setFilterDrawDate('all');
    setSaleDatePreset('all');
    setCustomSaleDate('');
  };

  const isFiltered =
    filterDrawDate !== 'all' ||
    paymentFilter !== 'all' ||
    saleDatePreset !== 'all' ||
    Boolean(customSaleDate) ||
    Boolean(searchQuery.trim());

  return (
    <div className="space-y-4">
      {/* Top Header & Back Navigation */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onGoBackToHome && (
            <button
              onClick={onGoBackToHome}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 shadow-2xs active:scale-95 shrink-0"
              title="ပင်မ စာမျက်နှာသို့ ပြန်သွားမည်"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>ပင်မစာမျက်နှာ (Back)</span>
            </button>
          )}
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>ရောင်းပြီး ထီလက်မှတ်များ မှတ်တမ်း (Sales History)</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              ထီဖွင့်ရက်နှင့် ရောင်းချခဲ့သည့် နေ့ရက်အလိုက် စနစ်တကျ ပြန်လည်စစ်ဆေး စာရင်းချုပ်ခြင်း
            </p>
          </div>
        </div>

        {/* View Mode Switcher (Table vs Grouped by Date) */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ဇယားဖြင့် ကြည့်မည်</span>
            </button>
            <button
              onClick={() => setViewMode('date-grouped')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'date-grouped'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>နေ့ရက်အလိုက် စာရင်းခွဲ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats Cards Bar for Filtered Sales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Sold Count */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500">ရောင်းပြီး စောင်ရေ</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <TicketIcon className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {stats.totalCount} <span className="text-xs font-sans font-bold text-slate-500">စောင်</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">
            {filterDrawDate === 'all' ? 'ထီဖွင့်ရက် အားလုံး' : `${formatDateBurmese(filterDrawDate)} ထွက်ရက်`}
          </span>
        </div>

        {/* Total Revenue */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500">စုစုပေါင်း ရောင်းရငွေ</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-800 font-mono truncate">
            {stats.totalMMK.toLocaleString('en-US')} <span className="text-xs font-sans font-bold text-amber-700">MMK</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium block">
            {sales.length} စောင် စုစုပေါင်း
          </span>
        </div>

        {/* Paid Amount */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500">ငွေရှင်းပြီး ရရှိငွေ</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-700 font-mono truncate">
            {stats.paidMMK.toLocaleString('en-US')} <span className="text-xs font-sans font-bold text-emerald-600">Ks</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-bold block">
            {stats.paidCount} စောင် (ငွေလွှဲပြီး)
          </span>
        </div>

        {/* Unpaid Amount */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500">အကြွေးကျန်ငွေ</span>
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-600 font-mono truncate">
            {stats.unpaidMMK.toLocaleString('en-US')} <span className="text-xs font-sans font-bold text-rose-600">Ks</span>
          </div>
          <span className="text-[11px] text-rose-600 font-bold block">
            {stats.unpaidCount > 0 ? `${stats.unpaidCount} စောင် (ငွေမရှင်းသေး)` : 'အကြွေးမရှိပါ ✓'}
          </span>
        </div>
      </div>

      {/* Date Filters & Control Section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Row 1: Draw Date Selector Pills */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>၁။ ထီဖွင့်ရက် (Draw Date) အလိုက် စစ်ထုတ်ရန်:</span>
            </label>
            {filterDrawDate !== 'all' && (
              <button
                onClick={() => setFilterDrawDate('all')}
                className="text-[11px] text-emerald-700 hover:underline font-bold cursor-pointer"
              >
                ထီဖွင့်ရက် အားလုံး ပြမည်
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterDrawDate('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                filterDrawDate === 'all'
                  ? 'bg-slate-900 text-amber-300 border-slate-900 shadow-xs ring-2 ring-amber-400/30'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              ထီဖွင့်ရက် အားလုံး ({sales.length} စောင်)
            </button>
            {allDrawDatesList.map((d) => {
              const countForDate = sales.filter((s) => s.drawDate === d).length;
              const isArchived = archivedDrawDates.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => setFilterDrawDate(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    filterDrawDate === d
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400/40'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 opacity-80" />
                  <span>{formatDateBurmese(d)} ထွက်ရက်</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      filterDrawDate === d ? 'bg-emerald-900 text-emerald-200' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {countForDate}
                  </span>
                  {isArchived && <span className="text-[9px] opacity-75 font-normal">(ဟောင်း)</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Sale Date (ရောင်းချသည့်ရက်) Filter Presets & Custom Date Picker */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>၂။ ရောင်းချခဲ့သည့် ရက်စွဲ (Sale Date) အလိုက် စစ်ထုတ်ရန်:</span>
            </label>
            {saleDatePreset !== 'all' && (
              <span className="text-xs text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                ရွေးချယ်ထားမှု: {saleDatePreset === 'today' ? 'ယနေ့ရောင်းရငွေ' : saleDatePreset === 'yesterday' ? 'မနေ့က' : saleDatePreset === 'week' ? 'ဤအပတ်' : customSaleDate ? formatDateBurmese(customSaleDate) : 'သတ်မှတ်ရက်'}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setSaleDatePreset('all');
                setCustomSaleDate('');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                saleDatePreset === 'all' && !customSaleDate
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              ရက်စွဲ အားလုံး
            </button>

            <button
              onClick={() => {
                setSaleDatePreset('today');
                setCustomSaleDate('');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                saleDatePreset === 'today'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>ယနေ့ (Today)</span>
              <span className="text-[10px] opacity-80">
                ({sales.filter((s) => s.saleDate === todayStr).length})
              </span>
            </button>

            <button
              onClick={() => {
                setSaleDatePreset('yesterday');
                setCustomSaleDate('');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                saleDatePreset === 'yesterday'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>မနေ့က (Yesterday)</span>
              <span className="text-[10px] opacity-80">
                ({sales.filter((s) => s.saleDate === yesterdayStr).length})
              </span>
            </button>

            <button
              onClick={() => {
                setSaleDatePreset('week');
                setCustomSaleDate('');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                saleDatePreset === 'week'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              လွန်ခဲ့သော ၇ ရက် (Last 7 Days)
            </button>

            {/* Custom Date Picker */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
              <span className="text-[11px] font-bold text-slate-600">ရက်စွဲရွေးမည်:</span>
              <input
                type="date"
                value={customSaleDate}
                onChange={(e) => {
                  setCustomSaleDate(e.target.value);
                  if (e.target.value) {
                    setSaleDatePreset('custom');
                  } else {
                    setSaleDatePreset('all');
                  }
                }}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 font-mono focus:outline-none focus:border-emerald-500"
              />
              {customSaleDate && (
                <button
                  onClick={() => {
                    setCustomSaleDate('');
                    setSaleDatePreset('all');
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="ရက်စွဲဖျက်မည်"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Search, Payment Status Filters, and Export Buttons */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Field */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ဝယ်သူ နာမည်၊ ဖုန်းနံပါတ် သို့မဟုတ် ထီနံပါတ်ဖြင့် ရှာရန်..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
            />
          </div>

          {/* Payment Status Filter Buttons */}
          <div className="flex flex-wrap items-center bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs gap-1">
            <button
              onClick={() => setPaymentFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                paymentFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              အားလုံး ({sales.length})
            </button>
            <button
              onClick={() => setPaymentFilter('pending')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                paymentFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-800 hover:text-amber-900 bg-amber-50/70 border border-amber-200/80'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>စစ်ဆေးဆဲ / ယာယီ ({sales.filter((s) => s.paymentStatus === 'pending').length})</span>
            </button>
            <button
              onClick={() => setPaymentFilter('paid')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                paymentFilter === 'paid'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:text-emerald-800'
              }`}
            >
              ငွေရှင်းပြီး ({sales.filter((s) => s.paymentStatus === 'paid').length})
            </button>
            <button
              onClick={() => setPaymentFilter('unpaid')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                paymentFilter === 'unpaid'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:text-rose-800'
              }`}
            >
              အကြွေးကျန် ({sales.filter((s) => s.paymentStatus === 'unpaid').length})
            </button>
          </div>

          {/* Action Buttons: Export & Reset */}
          <div className="flex items-center gap-2">
            {isFiltered && (
              <button
                onClick={resetAllFilters}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
                title="စစ်ထုတ်မှု အားလုံးကို ဖျက်ပြီး မူလအတိုင်း ကြည့်မည်"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Filter Reset</span>
              </button>
            )}

            {onResetAllSalesAndDebts && (
              <button
                onClick={() => setConfirmResetOpen(true)}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-rose-200 shadow-2xs transition-colors cursor-pointer"
                title="ရောင်းရငွေ၊ အကြွေးနှင့် ဝယ်သူစာရင်းများ အားလုံး Reset ချမည်"
              >
                <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
                <span>စာရင်းများ Reset ချမည်</span>
              </button>
            )}

            <button
              onClick={() => exportSalesToCSV(filteredSales)}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              title="Excel/CSV ဒေါင်းလုဒ်ဆွဲရန်"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              <span>Excel/CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              title="စာရင်း ပရင့်ထုတ်ရန်"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Group by Date Timeline vs Standard Table */}
      {viewMode === 'date-grouped' ? (
        /* View Mode 1: Group by Sale Date (Timeline / Grouped Cards) */
        <div className="space-y-4">
          {Object.keys(salesGroupedByDate).length > 0 ? (
            (Object.entries(salesGroupedByDate) as [string, SaleRecord[]][]).map(([dateKey, daySales]) => {
              const isCollapsed = collapsedDates[dateKey];
              const relativeLabel = getRelativeDateLabel(dateKey);
              const dayTotalTHB = daySales.reduce((sum, s) => sum + s.salePrice, 0);
              const dayTotalMMK = Math.round(dayTotalTHB * exchangeRate);
              const dayPaidCount = daySales.filter((s) => s.paymentStatus === 'paid').length;
              const dayUnpaidCount = daySales.filter((s) => s.paymentStatus === 'unpaid').length;

              return (
                <div
                  key={dateKey}
                  className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs"
                >
                  {/* Date Group Header Banner */}
                  <div
                    onClick={() => toggleDateCollapse(dateKey)}
                    className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-800 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        className="p-1 text-slate-400 hover:text-white rounded"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-5 h-5 text-amber-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-amber-400" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-amber-400" />
                          <h3 className="font-bold text-sm sm:text-base text-white">
                            {formatFullDateBurmese(dateKey)}
                          </h3>
                          {relativeLabel && (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-[10px] font-bold">
                              {relativeLabel}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          ရောင်းချသည့်ရက်စွဲ: {dateKey} (စောင်ရေ: {daySales.length} စောင်)
                        </span>
                      </div>
                    </div>

                    {/* Day Aggregates */}
                    <div className="flex items-center gap-3 text-right self-end sm:self-center">
                      <div className="bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl">
                        <span className="text-[10px] text-slate-300 block">ဤနေ့ ရောင်းရငွေ</span>
                        <span className="font-black text-amber-300 font-mono text-sm">
                          {dayTotalMMK.toLocaleString('en-US')} MMK
                        </span>
                      </div>

                      <div className="text-left hidden sm:block">
                        <span className="text-[11px] text-emerald-400 font-bold block">
                          ✓ ငွေရှင်းပြီး: {dayPaidCount} စောင်
                        </span>
                        {dayUnpaidCount > 0 && (
                          <span className="text-[11px] text-rose-400 font-bold block">
                            ⚠ အကြွေးကျန်: {dayUnpaidCount} စောင်
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Day Sales Items (Collapsible) */}
                  {!isCollapsed && (
                    <div className="divide-y divide-slate-100">
                      {daySales.map((sale, idx) => {
                        const isPaid = sale.paymentStatus === 'paid';
                        return (
                          <div
                            key={sale.id}
                            className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-start gap-3">
                              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {sale.serialCode && (
                                    <span className="text-[10px] font-mono font-bold bg-slate-900 text-amber-300 px-1.5 py-0.5 rounded border border-slate-700">
                                      🔖 {sale.serialCode}
                                    </span>
                                  )}
                                  <span className="font-mono font-black text-amber-300 text-sm tracking-wider bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                    {sale.ticketNumber}
                                  </span>
                                  {sale.seriesNumber && (
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium border border-slate-200">
                                      {sale.seriesNumber}
                                    </span>
                                  )}
                                  <span className="text-xs font-bold text-slate-900 ml-1">
                                    {sale.customerName}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                                  <span className="flex items-center gap-1 font-mono">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>{sale.customerPhone}</span>
                                  </span>
                                  <span className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200/80 text-[11px] font-bold">
                                    <Calendar className="w-3 h-3 text-emerald-600" />
                                    <span>{formatDateBurmese(sale.drawDate)} ထွက်ရက်</span>
                                  </span>
                                  {sale.notes && (
                                    <span className="text-[11px] text-slate-400 italic">
                                      "{sale.notes}"
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right Pricing & Actions */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 pl-9 sm:pl-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                              <div className="text-right">
                                <span className="text-emerald-700 font-black font-mono text-sm block">
                                  {(sale.currency === 'MMK' ? sale.salePrice : Math.round(sale.salePrice * exchangeRate)).toLocaleString('en-US')} MMK
                                </span>
                              </div>

                              <button
                                onClick={() => onTogglePaymentStatus(sale.id)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-transform active:scale-95 ${
                                  sale.paymentStatus === 'paid'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                    : sale.paymentStatus === 'pending'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                }`}
                                title="နှိပ်ပါက ငွေပေးချေမှု အခြေအနေ ပြောင်းလဲပါမည်"
                              >
                                {sale.paymentStatus === 'paid' ? (
                                  <>
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>ငွေရှင်းပြီး</span>
                                  </>
                                ) : sale.paymentStatus === 'pending' ? (
                                  <>
                                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin-slow" />
                                    <span>စစ်ဆေးဆဲ (ယာယီ)</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>အကြွေးကျန်</span>
                                  </>
                                )}
                              </button>

                              <div className="flex items-center gap-1">
                                {onEditSale && (
                                  <button
                                    onClick={() => onEditSale(sale)}
                                    className="p-1.5 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer border border-blue-200"
                                    title="ဝယ်သူနှင့် အရောင်းအချက်အလက် ပြင်ဆင်ရန်"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => onViewReceipt(sale)}
                                  className="p-1.5 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-200"
                                  title="ပြေစာ ကြည့်ရန် / ထုတ်ရန်"
                                >
                                  <Eye className="w-3.5 h-3.5 text-amber-600" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`ထီနံပါတ် ${sale.ticketNumber} ကို ရောင်းရရှိမှုမှ ဖျက်သိမ်းပြီး ပြန်လည်ရောင်းရန် ထီစာရင်းသို့ ပြန်ထည့်မှာ သေချာပါသလား?`)) {
                                      onCancelSale(sale.id);
                                    }
                                  }}
                                  className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer border border-rose-200"
                                  title="ရောင်းရရှိမှု ဖျက်ပြီး ထီစာရင်းသို့ ပြန်သွင်းမည်"
                                >
                                  <Undo2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl py-12 text-center text-slate-400 text-xs">
              ရောင်းရရှိမှု မှတ်တမ်း မရှိသေးပါ သို့မဟုတ် ရှာဖွေမှုနှင့် မကိုက်ညီပါ
            </div>
          )}
        </div>
      ) : (
        /* View Mode 2: Standard Detailed Table */
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 text-center">အမှတ်စဉ်</th>
                  <th className="py-3.5 px-4">ထီနံပါတ် ၆ လုံး</th>
                  <th className="py-3.5 px-4">ထီဖွင့်ရက် (Draw Date)</th>
                  <th className="py-3.5 px-4">ရောင်းချသည့်ရက် (Sale Date)</th>
                  <th className="py-3.5 px-4">ဝယ်ယူသူ နာမည် / ဖုန်း</th>
                  <th className="py-3.5 px-4">ရောင်းဈေး</th>
                  <th className="py-3.5 px-4 text-center">ငွေပေးချေမှု</th>
                  <th className="py-3.5 px-4 text-right">လုပ်ဆောင်ချက်</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.length > 0 ? (
                  filteredSales.map((sale, idx) => {
                    const isPaid = sale.paymentStatus === 'paid';
                    const relativeLabel = getRelativeDateLabel(sale.saleDate);
                    return (
                      <tr
                        key={sale.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Index No */}
                        <td className="py-3.5 px-4 text-center font-mono text-slate-400 font-bold">
                          {idx + 1}
                        </td>

                        {/* Ticket Number & Series */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {sale.serialCode && (
                              <span className="text-[10px] bg-slate-900 text-amber-300 font-mono font-bold px-1.5 py-0.5 rounded border border-slate-700">
                                🔖 {sale.serialCode}
                              </span>
                            )}
                            <span className="font-mono font-black text-amber-300 text-sm tracking-wider bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {sale.ticketNumber}
                            </span>
                            {sale.seriesNumber && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium border border-slate-200">
                                {sale.seriesNumber}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Draw Date */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-1 rounded-lg text-xs font-bold">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{formatDateBurmese(sale.drawDate)}</span>
                          </span>
                        </td>

                        {/* Sale Date & Relative Badge */}
                        <td className="py-3.5 px-4">
                          <div>
                            <span className="font-bold text-slate-800 text-xs block font-mono">
                              {formatDateBurmese(sale.saleDate)}
                            </span>
                            {relativeLabel ? (
                              <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60 inline-block mt-0.5">
                                {relativeLabel}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 block">
                                {sale.saleDate}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Customer Name & Phone */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{sale.customerName}</div>
                          <div className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{sale.customerPhone}</span>
                          </div>
                          {sale.notes && (
                            <span className="text-[10px] text-slate-400 italic block mt-0.5">
                              "{sale.notes}"
                            </span>
                          )}
                        </td>

                        {/* Price MMK */}
                        <td className="py-3.5 px-4 font-bold">
                          <span className="text-emerald-700 block font-mono text-xs sm:text-sm">
                            {(sale.currency === 'MMK' ? sale.salePrice : Math.round(sale.salePrice * exchangeRate)).toLocaleString('en-US')} MMK
                          </span>
                        </td>

                        {/* Payment Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => onTogglePaymentStatus(sale.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-transform active:scale-95 ${
                              sale.paymentStatus === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : sale.paymentStatus === 'pending'
                                ? 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                            }`}
                            title="နှိပ်ပါက ငွေပေးချေမှု အခြေအနေ ပြောင်းလဲပါမည်"
                          >
                            {sale.paymentStatus === 'paid' ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>ငွေရှင်းပြီး</span>
                              </>
                            ) : sale.paymentStatus === 'pending' ? (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin-slow" />
                                <span>စစ်ဆေးဆဲ (ယာယီ)</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>အကြွေးကျန်</span>
                              </>
                            )}
                          </button>
                          {sale.paymentSlipUrl && (
                            <span className="block mt-1 text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                              📷 Slip SS ရှိသည်
                            </span>
                          )}
                        </td>

                        {/* Action buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {onEditSale && (
                              <button
                                onClick={() => onEditSale(sale)}
                                className="p-1.5 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer border border-blue-200"
                                title="ဝယ်သူနှင့် အရောင်းအချက်အလက် ပြင်ဆင်ရန်"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => onViewReceipt(sale)}
                              className="p-1.5 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-200"
                              title="ပြေစာ ကြည့်ရန် / ထုတ်ရန်"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-600" />
                            </button>

                            <button
                              onClick={() => {
                                if (confirm(`ထီနံပါတ် ${sale.ticketNumber} ကို ရောင်းရရှိမှုမှ ဖျက်သိမ်းပြီး ပြန်လည်ရောင်းရန် ထီစာရင်းသို့ ပြန်ထည့်မှာ သေချာပါသလား?`)) {
                                  onCancelSale(sale.id);
                                }
                              }}
                              className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer border border-rose-200"
                              title="ရောင်းရရှိမှု ဖျက်ပြီး ထီစာရင်းသို့ ပြန်သွင်းမည်"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      ရောင်းရရှိမှု မှတ်တမ်း မရှိသေးပါ သို့မဟုတ် စစ်ထုတ်မှုနှင့် မကိုက်ညီပါ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: RESET ALL SALES */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-rose-200 space-y-4 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold mx-auto">
              <RefreshCw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-lg font-bold text-slate-900">အရောင်းနှင့် အကြွေးစာရင်းများ Reset ချမည်</h4>
              <p className="text-xs text-slate-600">
                ရောင်းရငွေ စာရင်း၊ အကြွေးကျန်ငွေ၊ အရောင်းမှတ်တမ်း <strong>{sales.length}</strong> စောင်နှင့် ဝယ်သူစာရင်းများ အားလုံးကို ရှင်းလင်းပြီး ရောင်းထားသော ထီလက်မှတ်များကို အစမှ အသင့်ရောင်းနိုင်သော လက်မှတ်များအဖြစ် ပြန်လည်ထားရှိပါမည်။
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                မလုပ်တော့ပါ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onResetAllSalesAndDebts) {
                    onResetAllSalesAndDebts();
                  }
                  setConfirmResetOpen(false);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
              >
                သေချာသည်၊ Reset ချမည်
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
