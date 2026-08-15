import React, { useState, useRef } from 'react';
import { Ticket, PaymentStatus, PaymentAccount } from '../types';
import { getTicketPriceMMK, formatMMK, matchTicketDigits, formatDateBurmese } from '../utils/formatters';
import {
  Sparkles,
  Search,
  ShoppingBag,
  Check,
  Trash2,
  User,
  Phone,
  Wallet,
  X,
  ArrowRight,
  ShieldCheck,
  Ticket as TicketIcon,
  QrCode,
  Copy,
  Clock,
  AlertCircle,
  Eye,
  Upload,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  SlidersHorizontal,
  Maximize2,
} from 'lucide-react';

interface CustomerSelfSelectionProps {
  tickets: Ticket[];
  drawDate: string;
  exchangeRate: number;
  fixedTicketPriceMMK?: number;
  archivedDrawDates?: string[];
  paymentAccounts?: PaymentAccount[];
  onConfirmOrder: (orderData: {
    ticketIds: string[];
    customerName: string;
    customerPhone: string;
    totalPriceTHB: number;
    paymentStatus: PaymentStatus;
    paymentMethod: string;
    paymentSlipUrl?: string;
    transactionId?: string;
    notes: string;
  }) => void;
}

export const CustomerSelfSelection: React.FC<CustomerSelfSelectionProps> = ({
  tickets,
  drawDate,
  exchangeRate,
  fixedTicketPriceMMK = 15000,
  archivedDrawDates = [],
  paymentAccounts = [],
  onConfirmOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [matchType, setMatchType] = useState<'all' | 'front3' | 'back3' | 'back2'>('all');
  const [selectedSetCount, setSelectedSetCount] = useState<number | 'all'>('all');
  const [ticketAvailabilityFilter, setTicketAvailabilityFilter] = useState<'all' | 'available' | 'reserved'>('all');

  // Customer Shopping Cart / Selected Tickets
  const [cart, setCart] = useState<Ticket[]>([]);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  // Customer Order Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    paymentAccounts.find((a) => a.isActive)?.id || ''
  );
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [paymentSlipUrl, setPaymentSlipUrl] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);

  // View Mode & Sizing State
  const [viewMode, setViewMode] = useState<'horizontal' | 'grid'>('horizontal');
  const [cardSize, setCardSize] = useState<'compact' | 'standard'>('compact');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [zoomedTicketImage, setZoomedTicketImage] = useState<{ url: string; number: string } | null>(null);

  // Zoomed QR Lightbox state
  const [zoomedQr, setZoomedQr] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const activeAccounts = paymentAccounts.filter((a) => a.isActive);
  const currentSelectedAccount =
    paymentAccounts.find((a) => a.id === selectedAccountId) || activeAccounts[0];

  // Active tickets for customer view (available or reserved, excluding past archived draw dates and sold)
  const displayableTickets = tickets.filter((t) => {
    if (archivedDrawDates.includes(t.drawDate)) return false;
    if (drawDate !== 'all' && t.drawDate !== drawDate) return false;
    if (ticketAvailabilityFilter === 'available') return t.status === 'available';
    if (ticketAvailabilityFilter === 'reserved') return t.status === 'reserved';
    return t.status === 'available' || t.status === 'reserved';
  });

  const filteredTickets = displayableTickets.filter((ticket) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSerial = q && ticket.serialCode && ticket.serialCode.toLowerCase().includes(q);
    const matchesNumber = matchTicketDigits(ticket.number, searchQuery, matchType);
    const matchesSet = selectedSetCount === 'all' || ticket.setCount === selectedSetCount;
    return (matchesNumber || matchesSerial) && matchesSet;
  });

  const availableCount = tickets.filter(
    (t) =>
      t.status === 'available' &&
      !archivedDrawDates.includes(t.drawDate) &&
      (drawDate === 'all' || t.drawDate === drawDate)
  ).length;

  const reservedCount = tickets.filter(
    (t) =>
      t.status === 'reserved' &&
      !archivedDrawDates.includes(t.drawDate) &&
      (drawDate === 'all' || t.drawDate === drawDate)
  ).length;

  const toggleCartTicket = (ticket: Ticket) => {
    if (ticket.status !== 'available') return;
    if (cart.some((t) => t.id === ticket.id)) {
      setCart(cart.filter((t) => t.id !== ticket.id));
    } else {
      setCart([...cart, ticket]);
    }
  };

  const isInCart = (ticketId: string) => cart.some((t) => t.id === ticketId);

  const cartTotalMMK = cart.reduce(
    (sum, t) => sum + getTicketPriceMMK(t, fixedTicketPriceMMK, exchangeRate),
    0
  );

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('ပြေစာပုံအရွယ်အစား 5MB ထက် မကျော်လွန်ရပါ');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPaymentSlipUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('ကျေးဇူးပြု၍ ဝယ်ယူသူ နာမည် နှင့် ဆက်သွယ်ရန် (Phone / Viber / Social Acc) ဖြည့်သွင်းပေးပါ');
      return;
    }

    const providerName = currentSelectedAccount
      ? currentSelectedAccount.provider
      : 'Online Pay';

    onConfirmOrder({
      ticketIds: cart.map((t) => t.id),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      totalPriceTHB: cartTotalMMK,
      paymentStatus: 'pending', // Default to pending so it gets marked as reserved (ယာယီ Sold Out) until admin confirms!
      paymentMethod: providerName,
      paymentSlipUrl: paymentSlipUrl || undefined,
      transactionId: transactionId.trim() || undefined,
      notes: notes.trim()
        ? `[Self Order via ${providerName}] ${notes.trim()}`
        : `[Self Order via ${providerName}]`,
    });

    setOrderSuccess(true);
    setTimeout(() => {
      setCart([]);
      setCheckoutModalOpen(false);
      setOrderSuccess(false);
      setCustomerName('');
      setCustomerPhone('');
      setPaymentSlipUrl(null);
      setTransactionId('');
      setNotes('');
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* Compact Header Info Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
              ထိုင်းထီ စိတ်ကြိုက် ရွေးချယ်ဝယ်ယူရန်
            </h2>
            <p className="text-[11px] text-slate-400">
              ဂဏန်း ၆ လုံး၊ ရှေ့ ၃ လုံး သို့မဟုတ် နောက် ၂ လုံး ကြိုက်နှစ်သက်ရာ ရိုက်ထည့်ရှာပါ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-3 py-1.5 text-center">
            <span className="text-[10px] text-emerald-300 block font-semibold">၁ စောင်ရောင်းစျေး</span>
            <span className="text-sm font-black font-mono text-emerald-300">
              {fixedTicketPriceMMK.toLocaleString('en-US')} MMK
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Digit Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ထီနံပါတ် သို့မဟုတ် အမှတ်စဉ် ရိုက်ရှာပါ (ဥပမာ: 814, 914, SN-001...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Match Position Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs overflow-x-auto">
            <button
              onClick={() => setMatchType('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                matchType === 'all'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              နေရာမရွေး (All)
            </button>
            <button
              onClick={() => setMatchType('front3')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                matchType === 'front3'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ရှေ့ ၃ လုံး
            </button>
            <button
              onClick={() => setMatchType('back3')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                matchType === 'back3'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              နောက် ၃ လုံး
            </button>
            <button
              onClick={() => setMatchType('back2')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                matchType === 'back2'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              နောက် ၂ လုံး
            </button>
          </div>
        </div>

        {/* Secondary Filter Row: Set Count & Availability */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Set Count Quick Filter Pills */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold shrink-0">အတွဲ အမျိုးအစား:</span>
            <div className="flex gap-1.5 overflow-x-auto">
              {[
                { label: 'အားလုံး', value: 'all' },
                { label: '၁ စောင်တွဲ', value: 1 },
                { label: '၂ စောင်တွဲ', value: 2 },
                { label: '၅ စောင်တွဲ', value: 5 },
              ].map((item) => (
                <button
                  key={String(item.value)}
                  onClick={() => setSelectedSetCount(item.value as any)}
                  className={`px-3 py-1 rounded-full font-semibold border text-xs cursor-pointer transition-all ${
                    selectedSetCount === item.value
                      ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Availability Filter Toggle (Available vs Reserved) */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setTicketAvailabilityFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                ticketAvailabilityFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              အားလုံး ({availableCount + reservedCount})
            </button>
            <button
              onClick={() => setTicketAvailabilityFilter('available')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                ticketAvailabilityFilter === 'available'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              ဝယ်ယူနိုင်သည် ({availableCount})
            </button>
            {reservedCount > 0 && (
              <button
                onClick={() => setTicketAvailabilityFilter('reserved')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                  ticketAvailabilityFilter === 'reserved'
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'text-amber-800 hover:text-amber-950'
                }`}
              >
                ယာယီ Sold Out ({reservedCount})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Available & Reserved Tickets Section with Left-Right Carousel & Compact Grid */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
          {/* Header Title & Counts */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
              <TicketIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>ထီလက်မှတ်များ ({filteredTickets.length} စောင်)</span>
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                <span className="text-emerald-700 font-bold">ဝယ်ယူနိုင်သည်: {availableCount}</span>
                {reservedCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-amber-700 font-bold">ယာယီ Sold Out: {reservedCount}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* View Mode Switcher, Card Sizing & Left/Right Navigation */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle: Horizontal (ဘယ်ညာ) vs Grid (အကွက်လိုက်) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('horizontal')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'horizontal'
                    ? 'bg-white text-emerald-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="ဘယ်ညာ ပွတ်ဆွဲကြည့်မည်"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                <span>ဘယ်ညာ ကြည့်မည်</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-emerald-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="အကွက်လိုက် ကျစ်ကျစ်လျစ်လျစ် ကြည့်မည်"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
                <span>အကွက်လိုက်</span>
              </button>
            </div>

            {/* Compact Size Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setCardSize('compact')}
                className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  cardSize === 'compact'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Size သေး (Mini)
              </button>
              <button
                type="button"
                onClick={() => setCardSize('standard')}
                className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  cardSize === 'standard'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ပုံမှန်
              </button>
            </div>

            {/* Left/Right Scroll Arrows (Always usable for horizontal navigation) */}
            {viewMode === 'horizontal' && filteredTickets.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleScrollLeft}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center border border-slate-200 transition-all cursor-pointer active:scale-90"
                  title="ဘယ်ဘက်သို့ ရွှေ့မည်"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleScrollRight}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center border border-slate-200 transition-all cursor-pointer active:scale-90"
                  title="ညာဘက်သို့ ရွှေ့မည်"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tickets Container (Horizontal Carousel vs Dense Grid) */}
        {filteredTickets.length > 0 ? (
          viewMode === 'horizontal' ? (
            <div className="relative group/carousel">
              {/* Left Scroll Floating Button for Desktop */}
              <button
                type="button"
                onClick={handleScrollLeft}
                className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white shadow-lg items-center justify-center backdrop-blur-xs transition-all cursor-pointer border border-slate-700 hover:scale-110 active:scale-95"
                title="ဘယ်ဘက်သို့ ရွှေ့မည်"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
              </button>

              {/* Right Scroll Floating Button for Desktop */}
              <button
                type="button"
                onClick={handleScrollRight}
                className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white shadow-lg items-center justify-center backdrop-blur-xs transition-all cursor-pointer border border-slate-700 hover:scale-110 active:scale-95"
                title="ညာဘက်သို့ ရွှေ့မည်"
              >
                <ChevronRight className="w-5 h-5 stroke-[2.5]" />
              </button>

              {/* Horizontal Scroll Track */}
              <div
                ref={scrollContainerRef}
                className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 scroll-smooth snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-300"
                style={{ scrollbarWidth: 'thin' }}
              >
                {filteredTickets.map((ticket) => {
                  const selected = isInCart(ticket.id);
                  const isReserved = ticket.status === 'reserved';
                  const priceMMK = getTicketPriceMMK(ticket, fixedTicketPriceMMK, exchangeRate);

                  return (
                    <div
                      key={ticket.id}
                      className={`shrink-0 snap-start bg-white border rounded-2xl transition-all duration-200 relative overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md ${
                        cardSize === 'compact' ? 'w-44 sm:w-48 p-3' : 'w-56 sm:w-64 p-4'
                      } ${
                        selected
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                          : isReserved
                          ? 'border-amber-300 bg-amber-50/25'
                          : 'border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      {/* Ticket Header */}
                      <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                        <div className="flex items-center gap-1">
                          {ticket.serialCode && (
                            <span className="text-[10px] font-mono font-bold bg-slate-900 text-amber-300 px-1.5 py-0.5 rounded border border-slate-700">
                              🔖 {ticket.serialCode}
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md">
                            {ticket.setCount || 1} စောင်တွဲ
                          </span>
                        </div>

                        {isReserved ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full border border-amber-400">
                            <Clock className="w-2.5 h-2.5" />
                            <span>ယာယီ Sold</span>
                          </span>
                        ) : ticket.imageUrl ? (
                          <button
                            type="button"
                            onClick={() => setZoomedTicketImage({ url: ticket.imageUrl!, number: ticket.number })}
                            className="inline-flex items-center gap-0.5 text-[9px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer"
                            title="ထီလက်မှတ်ဓာတ်ပုံ ကြည့်မည်"
                          >
                            <ImageIcon className="w-2.5 h-2.5" />
                            <span>ပုံပါသည်</span>
                          </button>
                        ) : (
                          <span className="text-[9px] text-slate-400 font-medium">
                            {ticket.drawDate || '16-08-2026'}
                          </span>
                        )}
                      </div>

                      {/* Optional Photo Thumbnail preview */}
                      {ticket.imageUrl && cardSize === 'standard' && (
                        <div
                          onClick={() => setZoomedTicketImage({ url: ticket.imageUrl!, number: ticket.number })}
                          className="relative h-20 w-full bg-slate-900 rounded-lg overflow-hidden my-1 border border-slate-200 cursor-pointer group"
                        >
                          <img
                            src={ticket.imageUrl}
                            alt={`Ticket ${ticket.number}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute bottom-1 right-1 text-[8px] bg-slate-950/80 text-amber-300 px-1 py-0.5 rounded font-bold">
                            ပုံချဲ့ကြည့်ရန်
                          </span>
                        </div>
                      )}

                      {/* 6 Digits Display Box */}
                      <div
                        className={`text-center rounded-xl border shadow-inner my-1.5 ${
                          cardSize === 'compact' ? 'py-1.5 px-2' : 'py-2 px-3'
                        } ${
                          isReserved
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-slate-950 text-amber-300 border-slate-800'
                        }`}
                      >
                        <span
                          className={`font-mono font-black tracking-widest block ${
                            cardSize === 'compact' ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'
                          }`}
                        >
                          {ticket.number}
                        </span>
                      </div>

                      {/* Price Display */}
                      <div className="pt-1 border-t border-slate-100 mt-1 flex items-baseline justify-between">
                        <span className="text-[10px] text-slate-400 font-medium">ကျသင့်ငွေ:</span>
                        <div className="text-right">
                          <span className="text-xs sm:text-sm font-black text-emerald-700 font-mono block leading-tight">
                            {priceMMK.toLocaleString('en-US')} MMK
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-2">
                        {isReserved ? (
                          <div className="w-full py-1.5 px-2 bg-amber-100 border border-amber-300 rounded-xl text-center">
                            <span className="text-[10px] font-bold text-amber-950 flex items-center justify-center gap-1">
                              <Clock className="w-3 h-3 text-amber-700" />
                              <span>ငွေလွှဲစစ်ဆဲ</span>
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleCartTicket(ticket)}
                            className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 ${
                              selected
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300'
                            }`}
                          >
                            {selected ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                                <span>ရွေးပြီးပါပြီ</span>
                              </>
                            ) : (
                              <>
                                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                                <span>ရွေးမည်</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Horizontal Swipe hint */}
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-medium pt-1">
                <span>← ဘယ်ညာ ပွတ်ဆွဲ၍ ထီလက်မှတ်များ ကြည့်နိုင်ပါသည် →</span>
              </div>
            </div>
          ) : (
            /* Dense Multi-Column Compact Grid */
            <div
              className={`grid gap-2.5 sm:gap-3 ${
                cardSize === 'compact'
                  ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
                  : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
              }`}
            >
              {filteredTickets.map((ticket) => {
                const selected = isInCart(ticket.id);
                const isReserved = ticket.status === 'reserved';
                const priceMMK = getTicketPriceMMK(ticket, fixedTicketPriceMMK, exchangeRate);

                return (
                  <div
                    key={ticket.id}
                    className={`bg-white border rounded-2xl transition-all duration-200 relative overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md ${
                      cardSize === 'compact' ? 'p-3' : 'p-4'
                    } ${
                      selected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                        : isReserved
                        ? 'border-amber-300 bg-amber-50/25'
                        : 'border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    {/* Ticket Header */}
                    <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                      <div className="flex items-center gap-1">
                        {ticket.serialCode && (
                          <span className="text-[10px] font-mono font-bold bg-slate-900 text-amber-300 px-1.5 py-0.5 rounded border border-slate-700">
                            🔖 {ticket.serialCode}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md">
                          {ticket.setCount || 1} စောင်တွဲ
                        </span>
                      </div>

                      {isReserved ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full border border-amber-400">
                          <Clock className="w-2.5 h-2.5" />
                          <span>ယာယီ Sold</span>
                        </span>
                      ) : ticket.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => setZoomedTicketImage({ url: ticket.imageUrl!, number: ticket.number })}
                          className="inline-flex items-center gap-0.5 text-[9px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer"
                          title="ထီလက်မှတ်ဓာတ်ပုံ ကြည့်မည်"
                        >
                          <ImageIcon className="w-2.5 h-2.5" />
                          <span>ပုံပါသည်</span>
                        </button>
                      ) : (
                        <span className="text-[9px] text-slate-400 font-medium">
                          {ticket.drawDate || '16-08-2026'}
                        </span>
                      )}
                    </div>

                    {/* Optional Photo Thumbnail preview */}
                    {ticket.imageUrl && cardSize === 'standard' && (
                      <div
                        onClick={() => setZoomedTicketImage({ url: ticket.imageUrl!, number: ticket.number })}
                        className="relative h-20 w-full bg-slate-900 rounded-lg overflow-hidden my-1 border border-slate-200 cursor-pointer group"
                      >
                        <img
                          src={ticket.imageUrl}
                          alt={`Ticket ${ticket.number}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-1 right-1 text-[8px] bg-slate-950/80 text-amber-300 px-1 py-0.5 rounded font-bold">
                          ပုံချဲ့ကြည့်ရန်
                        </span>
                      </div>
                    )}

                    {/* 6 Digits Display Box */}
                    <div
                      className={`text-center rounded-xl border shadow-inner my-1.5 ${
                        cardSize === 'compact' ? 'py-1.5 px-2' : 'py-2 px-3'
                      } ${
                        isReserved
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-slate-950 text-amber-300 border-slate-800'
                      }`}
                    >
                      <span
                        className={`font-mono font-black tracking-widest block ${
                          cardSize === 'compact' ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'
                        }`}
                      >
                        {ticket.number}
                      </span>
                    </div>

                    {/* Price Display */}
                    <div className="pt-1 border-t border-slate-100 mt-1 flex items-baseline justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">ကျသင့်ငွေ:</span>
                      <div className="text-right">
                        <span className="text-xs sm:text-sm font-black text-emerald-700 font-mono block leading-tight">
                          {priceMMK.toLocaleString('en-US')} MMK
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-2">
                      {isReserved ? (
                        <div className="w-full py-1.5 px-2 bg-amber-100 border border-amber-300 rounded-xl text-center">
                          <span className="text-[10px] font-bold text-amber-950 flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3 text-amber-700" />
                            <span>ငွေလွှဲစစ်ဆဲ</span>
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleCartTicket(ticket)}
                          className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 ${
                            selected
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          {selected ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                              <span>ရွေးပြီးပါပြီ</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                              <span>ရွေးမည်</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-500 space-y-2">
            <p className="text-sm font-semibold">ရှာဖွေထားသော ထီဂဏန်း မရှိပါ သို့မဟုတ် ရောင်းကုန်သွားပါပြီ</p>
            <p className="text-xs text-slate-400">အခြား ဂဏန်း သို့မဟုတ် ရှာဖွေမှု ပုံစံ ပြောင်းလဲကြည့်ပါ</p>
          </div>
        )}
      </div>

      {/* Floating Customer Shopping Tray */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-96 z-40 bg-slate-900 text-white border border-slate-800 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold">
                {cart.length}
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">ရွေးချယ်ထားသော ထီလက်မှတ်များ</h4>
                <p className="text-[10px] text-slate-400 font-mono">
                  {cart.map((t) => t.number).slice(0, 3).join(', ')}
                  {cart.length > 3 ? '...' : ''}
                </p>
              </div>
            </div>

            <button
              onClick={() => setCart([])}
              className="text-slate-400 hover:text-rose-400 text-xs p-1 cursor-pointer"
              title="ရွေးချယ်ထားသည်များ ဖျက်မည်"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-3 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">စုစုပေါင်း ကျသင့်ငွေ</span>
              <span className="text-lg font-black text-amber-300 font-mono">
                {cartTotalMMK.toLocaleString('en-US')} MMK
              </span>
            </div>

            <button
              onClick={() => setCheckoutModalOpen(true)}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <span>ငွေပေးချေ/ဝယ်ယူမည်</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Customer Checkout Order Modal with Bank & QR Code Details */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl my-6 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold">ထီလက်မှတ်များ အတည်ပြုဝယ်ယူရန်</h3>
                  <p className="text-[11px] text-slate-400">ငွေပေးချေမှု နံပါတ်နှင့် QR စကင်ဖတ်၍ ငွေလွှဲပါ</p>
                </div>
              </div>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {orderSuccess ? (
              <div className="p-8 text-center space-y-4 my-auto">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900">မှာယူမှု အောင်မြင်ပါသည်!</h4>
                  <p className="text-xs text-amber-700 font-bold mt-1 bg-amber-50 py-1.5 px-3 rounded-lg border border-amber-200 inline-block">
                    ⏱️ သင်ရွေးချယ်ထားသော ထီလက်မှတ်များကို အခြားသူများ မဝယ်ယူနိုင်စေရန် "ယာယီ Sold Out" အဖြစ် သိမ်းဆည်းထားပြီး ဖြစ်ပါသည်။
                  </p>
                  <p className="text-xs text-slate-600 mt-2">
                    ငွေလွှဲပြေစာ (Slip) စစ်ဆေးပြီးသည်နှင့် ဝယ်ယူမှုအား အပြီးသတ် အတည်ပြုပေးပါမည်။
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCheckoutSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4.5 flex-1">
                {/* Selected Tickets Summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-700 uppercase">
                      ဝယ်ယူမည့် ထီနံပါတ်များ ({cart.length} စောင်):
                    </span>
                    <span className="text-xs font-black text-amber-900 font-mono">
                      {cartTotalMMK.toLocaleString('en-US')} MMK
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    {cart.map((t) => (
                      <span
                        key={t.id}
                        className="bg-white border border-slate-200 text-slate-900 font-mono font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs"
                      >
                        <span className="text-amber-800">{t.number}</span>
                        <button
                          type="button"
                          onClick={() => toggleCartTicket(t)}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bank / QR Payment Account Section */}
                <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                    <div className="flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-amber-700" />
                      <h4 className="text-xs font-bold text-amber-950">
                        ငွေလွှဲပေးချေရမည့် အကောင့် နှင့် QR Code:
                      </h4>
                    </div>
                    <span className="text-[10px] text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded">
                      ကျသင့်ငွေ: {cartTotalMMK.toLocaleString('en-US')} Ks
                    </span>
                  </div>

                  {/* Payment Account Selector Tabs */}
                  {activeAccounts.length > 0 ? (
                    <div>
                      <span className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                        ငွေလွှဲမည့် အကောင့် ရွေးချယ်ပါ:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {activeAccounts.map((acc) => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => setSelectedAccountId(acc.id)}
                            className={`p-2 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                              (currentSelectedAccount?.id === acc.id)
                                ? 'bg-slate-900 text-amber-300 border-slate-900 shadow-2xs ring-2 ring-amber-400/40'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span className="truncate block">{acc.provider}</span>
                          </button>
                        ))}
                      </div>

                      {/* Display Selected Payment Account with QR and Copy Number */}
                      {currentSelectedAccount && (
                        <div className="mt-3 bg-white border border-amber-300/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-center gap-3.5 shadow-2xs">
                          {currentSelectedAccount.qrCodeUrl ? (
                            <div
                              onClick={() => setZoomedQr(currentSelectedAccount.qrCodeUrl!)}
                              className="relative group cursor-pointer shrink-0"
                              title="QR Code ချဲ့ကြည့်ရန်"
                            >
                              <img
                                src={currentSelectedAccount.qrCodeUrl}
                                alt="Acc QR"
                                className="w-24 h-24 object-contain rounded-lg border border-slate-200 bg-white p-1 shadow-2xs group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-slate-950/60 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold">
                                <Eye className="w-3.5 h-3.5 mr-1" /> ချဲ့ကြည့်
                              </div>
                            </div>
                          ) : (
                            <div className="w-20 h-20 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 shrink-0">
                              <QrCode className="w-8 h-8 text-slate-300" />
                              <span className="text-[9px]">QR မရှိပါ</span>
                            </div>
                          )}

                          <div className="space-y-1.5 flex-1 min-w-0 text-center sm:text-left">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                                {currentSelectedAccount.provider}
                              </span>
                              <span className="text-xs font-bold text-slate-900">
                                {currentSelectedAccount.accountName}
                              </span>
                            </div>

                            <div className="flex items-center justify-center sm:justify-start gap-2 pt-0.5">
                              <span className="font-mono font-black text-base text-slate-950 tracking-wider">
                                {currentSelectedAccount.accountNumber}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(currentSelectedAccount.accountNumber, currentSelectedAccount.id)}
                                className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                {copiedId === currentSelectedAccount.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-700 stroke-[3]" />
                                    <span>ကူးပြီး</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {currentSelectedAccount.notes && (
                              <p className="text-[11px] text-slate-600 italic mt-1">
                                📌 {currentSelectedAccount.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-3 text-xs text-slate-500">
                      ငွေပေးချေမှု အကောင့် မရှိသေးပါ။ (ဆိုင်သို့ ဆက်သွယ်ပေးချေနိုင်ပါသည်)
                    </div>
                  )}
                </div>

                {/* Buyer Info Inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ဝယ်ယူသူ နာမည် <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="ဥပမာ: ကိုအောင်အောင်"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ဆက်သွယ်ရန် (ဖုန်းနံပါတ် / Viber / Social Acc) <span className="text-rose-500">*</span>
                      <span className="block text-[10px] text-amber-700 font-normal mt-0.5">
                        (ထီပေါက်ပါက အမြန်ဆုံး အကြောင်းကြား ဆက်သွယ်ပေးနိုင်ရန်)
                      </span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="ဖုန်းနံပါတ် (09...) သို့မဟုတ် Viber / Facebook / Telegram Acc"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Payment Slip Screenshot Upload (ငွေလွှဲပြေစာ SS ပုံ တင်ရန်) */}
                  <div className="bg-slate-50 border border-slate-300/80 rounded-2xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-amber-600" />
                        <span>ငွေလွှဲပြေစာ Screenshot ပုံ (Slip SS) တင်ရန်</span>
                      </span>
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                        အမြန်ဆုံး အတည်ပြုနိုင်ရန်
                      </span>
                    </div>

                    {paymentSlipUrl ? (
                      <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-emerald-300 shadow-2xs">
                        <img
                          src={paymentSlipUrl}
                          alt="Slip SS"
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>ပြေစာ SS တင်ပြီးပါပြီ</span>
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            Admin မှ ငွေလွှဲစစ်ဆေးရာတွင် ချက်ချင်းတွေ့မြင်ရပါမည်
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPaymentSlipUrl(null)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="ဖျက်ရန်"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 hover:border-amber-400 bg-white hover:bg-amber-50/40 rounded-xl p-3.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all">
                        <Upload className="w-5 h-5 text-amber-600" />
                        <span className="text-xs font-bold text-slate-700">
                          ငွေလွှဲပြေစာ SS ပုံ ရွေးချယ်တင်ရန် နှိပ်ပါ
                        </span>
                        <span className="text-[10px] text-slate-400">
                          (PNG, JPG - အများဆုံး 5MB)
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSlipUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Transaction ID */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ငွေလွှဲ Transaction ID / နောက်ဆုံး ၄ လုံး (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="ဥပမာ: 98401923 သို့မဟုတ် 1234"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      အခြား မှတ်ချက် (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="ဥပမာ: ဖုန်းဖြင့် ထပ်မံဆက်သွယ်ပေးပါရန်..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Important Notice */}
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    အတည်ပြုခလုတ် နှိပ်ပြီးပါက သင်ရွေးချယ်ထားသော ထီလက်မှတ်များကို အခြားသူများ မဝယ်ယူနိုင်စေရန် <strong>ယာယီ Sold Out (စစ်ဆေးဆဲ)</strong> အဖြစ် အလိုအလျောက် သီးသန့်ထားရှိပေးမည် ဖြစ်ပါသည်။
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCheckoutModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                  >
                    မလုပ်တော့ပါ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>ငွေလွှဲပြီးပါပြီ / ဝယ်ယူမှု အတည်ပြုမည်</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Ticket Photo Zoom Lightbox */}
      {zoomedTicketImage && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setZoomedTicketImage(null)}
        >
          <div
            className="bg-white rounded-2xl p-5 max-w-md w-full text-center space-y-3 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <h4 className="font-bold text-sm text-slate-900 font-mono">
                  ထီနံပါတ် {zoomedTicketImage.number} မူရင်းဓာတ်ပုံ
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setZoomedTicketImage(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center p-1">
              <img
                src={zoomedTicketImage.url}
                alt={`Lottery Ticket ${zoomedTicketImage.number}`}
                className="max-h-80 w-auto object-contain rounded-lg shadow-sm"
              />
            </div>

            <p className="text-xs text-slate-500 font-medium">
              ဆိုင်မှ တိုက်ရိုက်ရိုက်ကူးထားသော မူရင်းထိုင်းထီလက်မှတ် စစ်စစ်ဖြစ်ပါသည်
            </p>

            <button
              type="button"
              onClick={() => setZoomedTicketImage(null)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              ပိတ်မည်
            </button>
          </div>
        </div>
      )}

      {/* QR Lightbox */}
      {zoomedQr && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setZoomedQr(null)}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-sm text-slate-900">ငွေပေးချေမှု QR Code</h4>
              </div>
              <button
                type="button"
                onClick={() => setZoomedQr(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-center">
              <img
                src={zoomedQr}
                alt="Enlarged QR Code"
                className="max-h-72 w-auto object-contain rounded-lg shadow-sm"
              />
            </div>

            <p className="text-xs text-slate-600 font-medium">
              KBZPay / Wave Money အက်ပ်များဖြင့် စကင်ဖတ်၍ ငွေလွှဲနိုင်ပါသည်
            </p>

            <button
              type="button"
              onClick={() => setZoomedQr(null)}
              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              ပိတ်မည်
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

