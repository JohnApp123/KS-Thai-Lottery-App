import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Ticket,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  PieChart as PieIcon,
  Coins,
  ArrowUpRight,
  Printer,
  Sparkles,
  Layers,
  ChevronRight,
  CircleDollarSign,
  ArrowLeft,
} from 'lucide-react';
import { SaleRecord, Ticket as TicketType } from '../types';
import { formatCurrency, formatDateBurmese, getSalePriceMMK, getSalePriceTHB } from '../utils/formatters';

interface ReportsTabProps {
  sales: SaleRecord[];
  tickets: TicketType[];
  exchangeRate: number;
  selectedDrawDate: string;
  setSelectedDrawDate: (date: string) => void;
  drawDates: string[];
  onGoBackToHome?: () => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  sales,
  tickets,
  exchangeRate,
  selectedDrawDate,
  setSelectedDrawDate,
  drawDates,
  onGoBackToHome,
}) => {
  const [currencyMode, setCurrencyMode] = useState<'THB' | 'MMK'>('MMK');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [timeFilter, setTimeFilter] = useState<'all' | '7days' | '30days'>('all');

  // Filter sales based on selectedDrawDate if not 'all'
  const filteredSales = useMemo(() => {
    let result = sales;
    if (selectedDrawDate !== 'all') {
      result = result.filter((s) => s.drawDate === selectedDrawDate);
    }
    return result;
  }, [sales, selectedDrawDate]);

  // Overall Financial Metrics - Accurately calculated without double exchange-rate multiplication
  const metrics = useMemo(() => {
    const totalSalesCount = filteredSales.length;
    const totalRevenueMMK = filteredSales.reduce(
      (sum, s) => sum + getSalePriceMMK(s, exchangeRate),
      0
    );
    const totalRevenueTHB = filteredSales.reduce(
      (sum, s) => sum + getSalePriceTHB(s, exchangeRate),
      0
    );

    const paidSales = filteredSales.filter((s) => s.paymentStatus === 'paid');
    const paidRevenueMMK = paidSales.reduce(
      (sum, s) => sum + getSalePriceMMK(s, exchangeRate),
      0
    );
    const paidRevenueTHB = paidSales.reduce(
      (sum, s) => sum + getSalePriceTHB(s, exchangeRate),
      0
    );

    const unpaidSales = filteredSales.filter((s) => s.paymentStatus === 'unpaid');
    const unpaidRevenueMMK = unpaidSales.reduce(
      (sum, s) => sum + getSalePriceMMK(s, exchangeRate),
      0
    );
    const unpaidRevenueTHB = unpaidSales.reduce(
      (sum, s) => sum + getSalePriceTHB(s, exchangeRate),
      0
    );

    // Total tickets in inventory corresponding to draw filter
    const relevantTickets =
      selectedDrawDate === 'all'
        ? tickets
        : tickets.filter((t) => t.drawDate === selectedDrawDate);

    const totalTicketsCount = relevantTickets.length;
    const soldTicketsCount = relevantTickets.filter((t) => t.status === 'sold').length;
    const availableTicketsCount = relevantTickets.filter((t) => t.status === 'available').length;
    const sellThroughRate =
      totalTicketsCount > 0 ? Math.round((soldTicketsCount / totalTicketsCount) * 100) : 0;
    const collectionRate =
      totalRevenueMMK > 0 ? Math.round((paidRevenueMMK / totalRevenueMMK) * 100) : 0;

    return {
      totalSalesCount,
      totalRevenueTHB,
      totalRevenueMMK,
      paidRevenueTHB,
      paidRevenueMMK,
      unpaidRevenueTHB,
      unpaidRevenueMMK,
      paidCount: paidSales.length,
      unpaidCount: unpaidSales.length,
      totalTicketsCount,
      soldTicketsCount,
      availableTicketsCount,
      sellThroughRate,
      collectionRate,
    };
  }, [filteredSales, tickets, selectedDrawDate, exchangeRate]);

  // Daily Sales Trend Chart Data
  const dailyTrendData = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        displayDate: string;
        totalTHB: number;
        totalMMK: number;
        paidTHB: number;
        paidMMK: number;
        unpaidTHB: number;
        unpaidMMK: number;
        ticketsCount: number;
        orderCount: number;
      }
    >();

    // Sort sales by date ascending
    const sorted = [...filteredSales].sort(
      (a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime()
    );

    sorted.forEach((sale) => {
      const dateKey = sale.saleDate;
      const existing = map.get(dateKey) || {
        date: dateKey,
        displayDate: formatDateBurmese(dateKey),
        totalTHB: 0,
        totalMMK: 0,
        paidTHB: 0,
        paidMMK: 0,
        unpaidTHB: 0,
        unpaidMMK: 0,
        ticketsCount: 0,
        orderCount: 0,
      };

      const mmk = getSalePriceMMK(sale, exchangeRate);
      const thb = getSalePriceTHB(sale, exchangeRate);

      existing.totalTHB += thb;
      existing.totalMMK += mmk;
      existing.orderCount += 1;
      existing.ticketsCount += 1;

      if (sale.paymentStatus === 'paid') {
        existing.paidTHB += thb;
        existing.paidMMK += mmk;
      } else {
        existing.unpaidTHB += thb;
        existing.unpaidMMK += mmk;
      }

      map.set(dateKey, existing);
    });

    let dataArray = Array.from(map.values());

    if (timeFilter === '7days') {
      dataArray = dataArray.slice(-7);
    } else if (timeFilter === '30days') {
      dataArray = dataArray.slice(-30);
    }

    return dataArray;
  }, [filteredSales, exchangeRate, timeFilter]);

  // Revenue per Draw Cycle Summary Data
  const drawCycleData = useMemo(() => {
    const cycleMap = new Map<
      string,
      {
        drawDate: string;
        displayDrawDate: string;
        totalTickets: number;
        soldTickets: number;
        availableTickets: number;
        totalRevenueTHB: number;
        totalRevenueMMK: number;
        paidRevenueTHB: number;
        paidRevenueMMK: number;
        unpaidRevenueTHB: number;
        unpaidRevenueMMK: number;
        salesCount: number;
        sellThroughRate: number;
        collectionRate: number;
      }
    >();

    // Collect all known draw dates
    const allDrawDateSet = new Set<string>([...drawDates, ...sales.map((s) => s.drawDate)]);

    allDrawDateSet.forEach((dDate) => {
      if (!dDate) return;
      const cycleTickets = tickets.filter((t) => t.drawDate === dDate);
      const cycleSales = sales.filter((s) => s.drawDate === dDate);

      const totalTix = cycleTickets.length;
      const soldTix = cycleTickets.filter((t) => t.status === 'sold').length;
      const availTix = totalTix - soldTix;

      const totalRevMMK = cycleSales.reduce(
        (sum, s) => sum + getSalePriceMMK(s, exchangeRate),
        0
      );
      const totalRevTHB = cycleSales.reduce(
        (sum, s) => sum + getSalePriceTHB(s, exchangeRate),
        0
      );

      const paidRevMMK = cycleSales
        .filter((s) => s.paymentStatus === 'paid')
        .reduce((sum, s) => sum + getSalePriceMMK(s, exchangeRate), 0);
      const paidRevTHB = cycleSales
        .filter((s) => s.paymentStatus === 'paid')
        .reduce((sum, s) => sum + getSalePriceTHB(s, exchangeRate), 0);

      const unpaidRevMMK = totalRevMMK - paidRevMMK;
      const unpaidRevTHB = totalRevTHB - paidRevTHB;

      const sellThrough = totalTix > 0 ? Math.round((soldTix / totalTix) * 100) : 0;
      const collRate = totalRevMMK > 0 ? Math.round((paidRevMMK / totalRevMMK) * 100) : 0;

      cycleMap.set(dDate, {
        drawDate: dDate,
        displayDrawDate: formatDateBurmese(dDate),
        totalTickets: totalTix,
        soldTickets: soldTix,
        availableTickets: availTix,
        totalRevenueTHB: totalRevTHB,
        totalRevenueMMK: totalRevMMK,
        paidRevenueTHB: paidRevTHB,
        paidRevenueMMK: paidRevMMK,
        unpaidRevenueTHB: unpaidRevTHB,
        unpaidRevenueMMK: unpaidRevMMK,
        salesCount: cycleSales.length,
        sellThroughRate: sellThrough,
        collectionRate: collRate,
      });
    });

    return Array.from(cycleMap.values()).sort(
      (a, b) => new Date(a.drawDate).getTime() - new Date(b.drawDate).getTime()
    );
  }, [drawDates, sales, tickets, exchangeRate]);

  // Payment Status Pie Chart Data
  const paymentPieData = useMemo(() => {
    return [
      {
        name: 'ငွေရှင်းပြီး (Paid)',
        value: currencyMode === 'THB' ? metrics.paidRevenueTHB : metrics.paidRevenueMMK,
        count: metrics.paidCount,
        color: '#10b981', // emerald-500
      },
      {
        name: 'အကြွေးကျန် (Unpaid)',
        value: currencyMode === 'THB' ? metrics.unpaidRevenueTHB : metrics.unpaidRevenueMMK,
        count: metrics.unpaidCount,
        color: '#f43f5e', // rose-500
      },
    ];
  }, [metrics, currencyMode]);

  // Peak sales day calculation
  const peakDay = useMemo(() => {
    if (dailyTrendData.length === 0) return null;
    return [...dailyTrendData].sort((a, b) => b.totalTHB - a.totalTHB)[0];
  }, [dailyTrendData]);

  // Print Report Action
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Global Control Bar */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {onGoBackToHome && (
                <button
                  onClick={onGoBackToHome}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 mr-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                  <span>ပင်မစာမျက်နှာ (Back)</span>
                </button>
              )}
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>အက်ဒမင် အရောင်းစာရင်းဇယား အစီရင်ခံစာ (Sales Analytics)</span>
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>အရောင်းဝင်ငွေနှင့် ထီဖွင့်ရက်အလိုက် စာရင်းချုပ်</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              ရက်အလိုက် ရောင်းအားတက်ကျမှု နှင့် ထီဖွင့်ရက် တစ်ခုချင်းစီ၏ ဝင်ငွေအခြေအနေများကို visual chart များဖြင့် လေ့လာနိုင်ပါသည်
            </p>
          </div>

          {/* Action Tools & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Currency Selector */}
            <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex items-center">
              <button
                type="button"
                onClick={() => setCurrencyMode('THB')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currencyMode === 'THB'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🇹🇭 ฿ Baht
              </button>
              <button
                type="button"
                onClick={() => setCurrencyMode('MMK')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currencyMode === 'MMK'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🇲🇲 Ks ကျပ်
              </button>
            </div>

            {/* Draw Date Selector */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
              <select
                value={selectedDrawDate}
                onChange={(e) => setSelectedDrawDate(e.target.value)}
                className="bg-transparent text-emerald-400 font-bold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">
                  ထီဖွင့်ရက် အားလုံး (All Cycles)
                </option>
                {drawDates.map((d) => (
                  <option key={d} value={d} className="bg-slate-900 text-white">
                    {formatDateBurmese(d)} ({d})
                  </option>
                ))}
              </select>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrintReport}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="အစီရင်ခံစာ ပရင့်ထုတ်ရန်"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ပရင့်ထုတ်မည်</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Gross Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              စုစုပေါင်း အရောင်းဝင်ငွေ
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <CircleDollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {currencyMode === 'THB'
                ? `฿ ${metrics.totalRevenueTHB.toLocaleString('en-US')}`
                : `${metrics.totalRevenueMMK.toLocaleString('en-US')} Ks`}
            </div>
            <div className="text-xs text-slate-500 font-medium font-mono mt-0.5">
              {currencyMode === 'THB'
                ? `≈ ${metrics.totalRevenueMMK.toLocaleString('en-US')} Ks`
                : `≈ ฿ ${metrics.totalRevenueTHB.toLocaleString('en-US')}`}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>အရောင်းအော်ဒါ:</span>
            <span className="font-bold text-slate-800 font-mono">{metrics.totalSalesCount} ကြိမ်</span>
          </div>
        </div>

        {/* Collected Revenue (Paid) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              ငွေရရှိပြီး ပမာဏ (Paid)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-emerald-700 tracking-tight">
              {currencyMode === 'THB'
                ? `฿ ${metrics.paidRevenueTHB.toLocaleString('en-US')}`
                : `${metrics.paidRevenueMMK.toLocaleString('en-US')} Ks`}
            </div>
            <div className="text-xs text-emerald-600 font-medium font-mono mt-0.5">
              ကောက်ခံမှုနှုန်း: <span className="font-bold">{metrics.collectionRate}%</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>ငွေရှင်းပြီးသူ:</span>
            <span className="font-bold text-emerald-700 font-mono">{metrics.paidCount} ဦး</span>
          </div>
        </div>

        {/* Outstanding Credit (Unpaid) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              အကြွေးကျန်ငွေ (Unpaid)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-rose-700 tracking-tight">
              {currencyMode === 'THB'
                ? `฿ ${metrics.unpaidRevenueTHB.toLocaleString('en-US')}`
                : `${metrics.unpaidRevenueMMK.toLocaleString('en-US')} Ks`}
            </div>
            <div className="text-xs text-rose-600 font-medium font-mono mt-0.5">
              စုစုပေါင်း၏ <span className="font-bold">{100 - metrics.collectionRate}%</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>အကြွေးကျန်သူ:</span>
            <span className="font-bold text-rose-700 font-mono">{metrics.unpaidCount} ဦး</span>
          </div>
        </div>

        {/* Sell-Through & Ticket Volume */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ထီလက်မှတ် ရောင်းချရမှု
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-slate-900 tracking-tight flex items-baseline gap-1">
              <span>{metrics.soldTicketsCount}</span>
              <span className="text-sm font-semibold text-slate-400 font-sans">
                / {metrics.totalTicketsCount} စောင်
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(metrics.sellThroughRate, 100)}%` }}
              />
            </div>
          </div>
          <div className="pt-1.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>ရောင်းထွက်နှုန်း:</span>
            <span className="font-bold text-emerald-700 font-mono">{metrics.sellThroughRate}%</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Total Sales Trends by Date (Chart) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                ရက်အလိုက် အရောင်းဝင်ငွေ တက်ကျမှုဇယား (Daily Sales Trend)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ရက်စွဲတစ်ခုချင်းစီအလိုက် ရောင်းချရငွေနှင့် ငွေရှင်းပြီး/အကြွေးကျန် စာရင်းများ
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter 7 / 30 / All days */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs">
              <button
                type="button"
                onClick={() => setTimeFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  timeFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ရက်အားလုံး
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('7days')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  timeFilter === '7days'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ၇ ရက်
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('30days')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  timeFilter === '30days'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ၃၀ ရက်
              </button>
            </div>

            {/* Chart Style Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs">
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  chartType === 'area'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Area Chart
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  chartType === 'bar'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Bar Chart
              </button>
            </div>
          </div>
        </div>

        {/* Peak day banner */}
        {peakDay && (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 border border-emerald-200/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-emerald-600 text-white">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <div>
                <span className="font-bold text-emerald-950">အရောင်းအကောင်းဆုံးနေ့ (Peak Sales Day): </span>
                <span className="font-bold text-emerald-800">{peakDay.displayDate} ({peakDay.date})</span>
              </div>
            </div>
            <div className="font-mono font-bold text-emerald-900 flex items-center gap-2">
              <span>{peakDay.ticketsCount} စောင် ရောင်းချခဲ့ရသည်</span>
              <span>•</span>
              <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                {currencyMode === 'THB'
                  ? `฿ ${peakDay.totalTHB.toLocaleString('en-US')}`
                  : `${peakDay.totalMMK.toLocaleString('en-US')} Ks`}
              </span>
            </div>
          </div>
        )}

        {/* Recharts Area / Bar Chart */}
        <div className="h-80 w-full pt-2">
          {dailyTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="paidColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="unpaidColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => val.slice(5)} // MM-DD
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      currencyMode === 'THB'
                        ? `฿${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`
                        : `${v >= 100000 ? (v / 100000).toFixed(1) + 'L' : v}`
                    }
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 text-xs space-y-1.5 min-w-[200px]">
                            <div className="font-bold text-amber-400 border-b border-slate-800 pb-1 flex justify-between">
                              <span>{data.displayDate}</span>
                              <span className="text-slate-400 font-mono">{label}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-300">
                              <span>စုစုပေါင်း ရောင်းရငွေ:</span>
                              <span className="font-bold font-mono text-white">
                                {currencyMode === 'THB'
                                  ? `฿ ${data.totalTHB.toLocaleString('en-US')}`
                                  : `${data.totalMMK.toLocaleString('en-US')} Ks`}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-emerald-400">
                              <span>ငွေရှင်းပြီး (Paid):</span>
                              <span className="font-bold font-mono">
                                {currencyMode === 'THB'
                                  ? `฿ ${data.paidTHB.toLocaleString('en-US')}`
                                  : `${data.paidMMK.toLocaleString('en-US')} Ks`}
                              </span>
                            </div>
                            {data.unpaidTHB > 0 && (
                              <div className="flex justify-between items-center text-rose-400">
                                <span>အကြွေးကျန် (Unpaid):</span>
                                <span className="font-bold font-mono">
                                  {currencyMode === 'THB'
                                    ? `฿ ${data.unpaidTHB.toLocaleString('en-US')}`
                                    : `${data.unpaidMMK.toLocaleString('en-US')} Ks`}
                                </span>
                              </div>
                            )}
                            <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
                              <span>ရောင်းရသည့် စောင်ရေ:</span>
                              <span className="font-bold text-amber-300">{data.ticketsCount} စောင်</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey={currencyMode === 'THB' ? 'totalTHB' : 'totalMMK'}
                    name="စုစုပေါင်း ရောင်းရငွေ"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#totalColor)"
                  />
                  <Area
                    type="monotone"
                    dataKey={currencyMode === 'THB' ? 'paidTHB' : 'paidMMK'}
                    name="ငွေရှင်းပြီး (Paid)"
                    stroke="#059669"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#paidColor)"
                  />
                  <Area
                    type="monotone"
                    dataKey={currencyMode === 'THB' ? 'unpaidTHB' : 'unpaidMMK'}
                    name="အကြွေးကျန် (Unpaid)"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#unpaidColor)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={dailyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => val.slice(5)}
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      currencyMode === 'THB'
                        ? `฿${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`
                        : `${v >= 100000 ? (v / 100000).toFixed(1) + 'L' : v}`
                    }
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 text-xs space-y-1.5 min-w-[200px]">
                            <div className="font-bold text-amber-400 border-b border-slate-800 pb-1 flex justify-between">
                              <span>{data.displayDate}</span>
                              <span className="text-slate-400 font-mono">{label}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-300">
                              <span>စုစုပေါင်း ရောင်းရငွေ:</span>
                              <span className="font-bold font-mono text-white">
                                {currencyMode === 'THB'
                                  ? `฿ ${data.totalTHB.toLocaleString('en-US')}`
                                  : `${data.totalMMK.toLocaleString('en-US')} Ks`}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-emerald-400">
                              <span>ငွေရှင်းပြီး (Paid):</span>
                              <span className="font-bold font-mono">
                                {currencyMode === 'THB'
                                  ? `฿ ${data.paidTHB.toLocaleString('en-US')}`
                                  : `${data.paidMMK.toLocaleString('en-US')} Ks`}
                              </span>
                            </div>
                            {data.unpaidTHB > 0 && (
                              <div className="flex justify-between items-center text-rose-400">
                                <span>အကြွေးကျန် (Unpaid):</span>
                                <span className="font-bold font-mono">
                                  {currencyMode === 'THB'
                                    ? `฿ ${data.unpaidTHB.toLocaleString('en-US')}`
                                    : `${data.unpaidMMK.toLocaleString('en-US')} Ks`}
                                </span>
                              </div>
                            )}
                            <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
                              <span>ရောင်းရသည့် စောင်ရေ:</span>
                              <span className="font-bold text-amber-300">{data.ticketsCount} စောင်</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                  />
                  <Bar
                    dataKey={currencyMode === 'THB' ? 'paidTHB' : 'paidMMK'}
                    name="ငွေရှင်းပြီး (Paid)"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey={currencyMode === 'THB' ? 'unpaidTHB' : 'unpaidMMK'}
                    name="အကြွေးကျန် (Unpaid)"
                    fill="#f43f5e"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              ရောင်းချမှု မှတ်တမ်း မရှိသေးပါ
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Lottery Draw Cycle Summary (Revenue per Draw Cycle) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                ထီဖွင့်ပွဲ အလှည့်အလိုက် ဝင်ငွေအကျဉ်းချုပ် (Draw Cycle Revenue Summary)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ထီဖွင့်ရက် တစ်ခုချင်းစီအတွက် တင်သွင်းထားသော ထီစောင်ရေ၊ ရောင်းရငွေ နှင့် ငွေကောက်ခံရရှိမှု
            </p>
          </div>
        </div>

        {/* Draw Cycle Comparative Bar Chart */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="h-72 w-full">
            {drawCycleData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={drawCycleData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="drawDate"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => formatDateBurmese(val)}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      currencyMode === 'THB'
                        ? `฿${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`
                        : `${v >= 100000 ? (v / 100000).toFixed(1) + 'L' : v}`
                    }
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 text-xs space-y-1.5 min-w-[220px]">
                            <div className="font-bold text-amber-400 border-b border-slate-800 pb-1">
                              ထီဖွင့်ရက်: {data.displayDrawDate} ({data.drawDate})
                            </div>
                            <div className="flex justify-between items-center text-slate-300">
                              <span>စုစုပေါင်း ဝင်ငွေ:</span>
                              <span className="font-bold font-mono text-white">
                                {currencyMode === 'THB'
                                  ? `฿ ${data.totalRevenueTHB.toLocaleString('en-US')}`
                                  : `${data.totalRevenueMMK.toLocaleString('en-US')} Ks`}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-emerald-400">
                              <span>ငွေရှင်းပြီး (Paid):</span>
                              <span className="font-bold font-mono">
                                {currencyMode === 'THB'
                                  ? `฿ ${data.paidRevenueTHB.toLocaleString('en-US')}`
                                  : `${data.paidRevenueMMK.toLocaleString('en-US')} Ks`}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-rose-400">
                              <span>အကြွေးကျန် (Unpaid):</span>
                              <span className="font-bold font-mono">
                                {currencyMode === 'THB'
                                  ? `฿ ${data.unpaidRevenueTHB.toLocaleString('en-US')}`
                                  : `${data.unpaidRevenueMMK.toLocaleString('en-US')} Ks`}
                              </span>
                            </div>
                            <div className="pt-1.5 border-t border-slate-800 flex justify-between text-[11px] text-slate-400">
                              <span>ရောင်းထွက်နှုန်း:</span>
                              <span className="font-bold text-emerald-400">
                                {data.soldTickets} / {data.totalTickets} စောင် ({data.sellThroughRate}%)
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                  />
                  <Bar
                    dataKey={currencyMode === 'THB' ? 'paidRevenueTHB' : 'paidRevenueMMK'}
                    name="ငွေရှင်းပြီး ဝင်ငွေ (Paid)"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey={currencyMode === 'THB' ? 'unpaidRevenueTHB' : 'unpaidRevenueMMK'}
                    name="အကြွေးကျန်ငွေ (Unpaid)"
                    fill="#f43f5e"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                ထီဖွင့်ပွဲ အချက်အလက် မရှိသေးပါ
              </div>
            )}
          </div>
        </div>

        {/* Detailed Draw Cycles Breakdown Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drawCycleData.map((cycle) => {
            const isSelected = selectedDrawDate === cycle.drawDate;
            return (
              <div
                key={cycle.drawDate}
                className={`bg-white rounded-3xl p-5 border transition-all space-y-4 shadow-sm relative overflow-hidden ${
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Header with Draw Date */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      <Calendar className="w-3 h-3 text-amber-700" />
                      <span>{cycle.drawDate}</span>
                    </div>
                    <h4 className="text-base font-black text-slate-900 mt-1">
                      {cycle.displayDrawDate}
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDrawDate(selectedDrawDate === cycle.drawDate ? 'all' : cycle.drawDate)
                    }
                    className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected ? 'ရွေးချယ်ထားသည်' : 'စစ်ထုတ်ကြည့်မည်'}
                  </button>
                </div>

                {/* Main Revenue Figure */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    ဤထီပွဲ စုစုပေါင်း ဝင်ငွေ (Total Revenue)
                  </span>
                  <div className="text-xl font-black font-mono text-slate-900">
                    {currencyMode === 'THB'
                      ? `฿ ${cycle.totalRevenueTHB.toLocaleString('en-US')}`
                      : `${cycle.totalRevenueMMK.toLocaleString('en-US')} Ks`}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {currencyMode === 'THB'
                      ? `≈ ${cycle.totalRevenueMMK.toLocaleString('en-US')} Ks`
                      : `≈ ฿ ${cycle.totalRevenueTHB.toLocaleString('en-US')}`}
                  </div>
                </div>

                {/* Sub breakdown: Paid vs Unpaid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-emerald-800 block">
                      ငွေရှင်းပြီး (Paid)
                    </span>
                    <span className="font-bold font-mono text-emerald-900 block truncate">
                      {currencyMode === 'THB'
                        ? `฿ ${cycle.paidRevenueTHB.toLocaleString('en-US')}`
                        : `${cycle.paidRevenueMMK.toLocaleString('en-US')} Ks`}
                    </span>
                  </div>

                  <div className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-rose-800 block">
                      အကြွေးကျန် (Unpaid)
                    </span>
                    <span className="font-bold font-mono text-rose-900 block truncate">
                      {currencyMode === 'THB'
                        ? `฿ ${cycle.unpaidRevenueTHB.toLocaleString('en-US')}`
                        : `${cycle.unpaidRevenueMMK.toLocaleString('en-US')} Ks`}
                    </span>
                  </div>
                </div>

                {/* Ticket Sell-Through Progress */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>လက်ကျန်နှင့် ရောင်းထွက်မှု:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {cycle.soldTickets} / {cycle.totalTickets} စောင်
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(cycle.sellThroughRate, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>ရောင်းထွက်နှုန်း: {cycle.sellThroughRate}%</span>
                    <span>ကျန်ရှိ: {cycle.availableTickets} စောင်</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Payment Collection Distribution & Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Collection Donut Chart */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4 lg:col-span-1">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <PieIcon className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black text-slate-900">
              ငွေကောက်ခံမှု အချိုးအစား (Payment Ratio)
            </h3>
          </div>

          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {paymentPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) =>
                    currencyMode === 'THB'
                      ? `฿ ${Number(val).toLocaleString('en-US')}`
                      : `${Number(val).toLocaleString('en-US')} Ks`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black font-mono text-slate-800">
                {metrics.collectionRate}%
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">ငွေရရှိမှု</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="font-bold text-emerald-900">ငွေရှင်းပြီး (Paid)</span>
              </div>
              <span className="font-mono font-bold text-emerald-900">
                {currencyMode === 'THB'
                  ? `฿ ${metrics.paidRevenueTHB.toLocaleString('en-US')}`
                  : `${metrics.paidRevenueMMK.toLocaleString('en-US')} Ks`}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/60 border border-rose-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="font-bold text-rose-900">အကြွေးကျန် (Unpaid)</span>
              </div>
              <span className="font-mono font-bold text-rose-900">
                {currencyMode === 'THB'
                  ? `฿ ${metrics.unpaidRevenueTHB.toLocaleString('en-US')}`
                  : `${metrics.unpaidRevenueMMK.toLocaleString('en-US')} Ks`}
              </span>
            </div>
          </div>
        </div>

        {/* Sales Performance Summary Table */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                ရက်အလိုက် အသေးစိတ် စာရင်းဇယား (Daily Sales Log)
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              စုစုပေါင်း {dailyTrendData.length} ရက်
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3 rounded-l-lg">ရက်စွဲ (Date)</th>
                  <th className="py-2.5 px-3 text-center">ရောင်းရစောင်ရေ</th>
                  <th className="py-2.5 px-3 text-right">ငွေရှင်းပြီး</th>
                  <th className="py-2.5 px-3 text-right">အကြွေးကျန်</th>
                  <th className="py-2.5 px-3 text-right rounded-r-lg">စုစုပေါင်း ကျသင့်ငွေ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyTrendData.length > 0 ? (
                  dailyTrendData.map((row) => (
                    <tr key={row.date} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        <span>{row.displayDate}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">{row.date}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {row.ticketsCount} စောင်
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">
                        {currencyMode === 'THB'
                          ? `฿ ${row.paidTHB.toLocaleString('en-US')}`
                          : `${row.paidMMK.toLocaleString('en-US')} Ks`}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-700">
                        {row.unpaidTHB > 0
                          ? currencyMode === 'THB'
                            ? `฿ ${row.unpaidTHB.toLocaleString('en-US')}`
                            : `${row.unpaidMMK.toLocaleString('en-US')} Ks`
                          : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                        {currencyMode === 'THB'
                          ? `฿ ${row.totalTHB.toLocaleString('en-US')}`
                          : `${row.totalMMK.toLocaleString('en-US')} Ks`}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400">
                      ရောင်းချမှု မှတ်တမ်း မရှိသေးပါ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
