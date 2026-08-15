import React, { useState, useEffect, useMemo } from 'react';
import { Ticket, SaleRecord, PaymentStatus } from '../types';
import { getTicketPriceMMK, formatDateBurmese, matchTicketDigits } from '../utils/formatters';
import { X, Check, User, Phone, DollarSign, Calendar, FileText, Sparkles, Search, ShoppingBag, Plus, Trash2, Tag } from 'lucide-react';

interface SellModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketsToSell: Ticket[];
  availableTickets?: Ticket[];
  onConfirmSale: (saleData: {
    ticketIds: string[];
    customerName: string;
    customerPhone: string;
    salePrice: number;
    paymentStatus: PaymentStatus;
    notes: string;
    saleDate: string;
  }) => void;
  existingCustomers?: { name: string; phone: string }[];
  exchangeRate?: number;
  fixedTicketPriceMMK?: number;
  selectedDrawDate?: string;
}

export const SellModal: React.FC<SellModalProps> = ({
  isOpen,
  onClose,
  ticketsToSell,
  availableTickets = [],
  onConfirmSale,
  existingCustomers = [],
  exchangeRate = 120,
  fixedTicketPriceMMK = 15000,
  selectedDrawDate,
}) => {
  // Selected tickets state (can be initialized from props or selected manually)
  const [selectedTickets, setSelectedTickets] = useState<Ticket[]>([]);
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [notes, setNotes] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [customPrice, setCustomPrice] = useState<number>(0);

  // Sync selected tickets when modal opens or ticketsToSell changes
  useEffect(() => {
    if (isOpen) {
      if (ticketsToSell && ticketsToSell.length > 0) {
        setSelectedTickets(ticketsToSell);
      } else {
        setSelectedTickets([]);
      }
      setTicketSearchQuery('');
    }
  }, [isOpen, ticketsToSell]);

  // Calculate default total price from selected tickets in MMK
  useEffect(() => {
    if (selectedTickets.length > 0) {
      const total = selectedTickets.reduce(
        (sum, t) => sum + getTicketPriceMMK(t, fixedTicketPriceMMK, exchangeRate),
        0
      );
      setCustomPrice(total);
    } else {
      setCustomPrice(0);
    }
  }, [selectedTickets, exchangeRate, fixedTicketPriceMMK]);

  // Filter available tickets that can be picked in the modal
  const selectableAvailableTickets = useMemo(() => {
    const selectedIds = new Set(selectedTickets.map((t) => t.id));
    return availableTickets
      .filter((t) => t.status === 'available' && !selectedIds.has(t.id))
      .filter((t) => {
        if (selectedDrawDate && selectedDrawDate !== 'all' && t.drawDate !== selectedDrawDate) {
          return false;
        }
        if (ticketSearchQuery.trim()) {
          return matchTicketDigits(t.number, ticketSearchQuery, 'all');
        }
        return true;
      });
  }, [availableTickets, selectedTickets, selectedDrawDate, ticketSearchQuery]);

  if (!isOpen) return null;

  const handleAddTicket = (ticket: Ticket) => {
    if (!selectedTickets.some((t) => t.id === ticket.id)) {
      setSelectedTickets((prev) => [...prev, ticket]);
    }
  };

  const handleRemoveTicket = (ticketId: string) => {
    setSelectedTickets((prev) => prev.filter((t) => t.id !== ticketId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTickets.length === 0) {
      alert('ကျေးဇူးပြု၍ ရောင်းချမည့် ထီလက်မှတ် အနည်းဆုံး ၁ စောင် ရွေးချယ်ပါ');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      alert('ကျေးဇူးပြု၍ ဝယ်ယူသူ နာမည် နှင့် ဆက်သွယ်ရန် (Phone / Viber / Social Acc) ထည့်သွင်းပါ');
      return;
    }

    onConfirmSale({
      ticketIds: selectedTickets.map((t) => t.id),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      salePrice: Number(customPrice),
      paymentStatus,
      notes: notes.trim(),
      saleDate,
    });

    // Reset fields
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setSelectedTickets([]);
    onClose();
  };

  const handleSelectExistingCustomer = (c: { name: string; phone: string }) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
  };

  const isMulti = selectedTickets.length > 1;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>ထီလက်မှတ် အရောင်း မှတ်တမ်းတင်ရန် (Admin Sell Option)</span>
                {selectedTickets.length > 0 && (
                  <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                    {selectedTickets.length} စောင်
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Admin Ticket Sales & Customer Record Form
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Selected Ticket Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                ရွေးချယ်ထားသော ထီလက်မှတ်များ ({selectedTickets.length} စောင်):
              </p>
              {selectedTickets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTickets([])}
                  className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  အကုန်ပြန်ဖြုတ်မည်
                </button>
              )}
            </div>

            {selectedTickets.length > 0 ? (
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {selectedTickets.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200 shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      {t.serialCode && (
                        <span className="text-[10px] font-mono font-bold bg-slate-900 text-amber-300 px-1.5 py-0.5 rounded border border-slate-700">
                          🔖 {t.serialCode}
                        </span>
                      )}
                      <span className="font-mono font-black text-slate-900 text-sm tracking-wider">
                        {t.number}
                      </span>
                      <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                        {t.setCount || 1} စောင်တွဲ
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-700 font-bold font-mono text-xs">
                        {getTicketPriceMMK(t, fixedTicketPriceMMK, exchangeRate).toLocaleString('en-US')} MMK
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTicket(t.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                        title="ဖြုတ်မည်"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center bg-amber-50/60 border border-dashed border-amber-300 rounded-lg">
                <p className="text-xs text-amber-900 font-medium">
                  ရောင်းချမည့် ထီလက်မှတ် ရွေးချယ်ထားခြင်း မရှိသေးပါ။ အောက်ပါ ရောင်းရန်ရှိသော စာရင်းမှ ရွေးချယ်ပါ-
                </p>
              </div>
            )}

            {/* Quick Ticket Search & Selector if availableTickets provided */}
            {availableTickets.length > 0 && (
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                  <span>+ ထီလက်မှတ် ထပ်မံရွေးချယ်ရန်:</span>
                  <span className="text-slate-500 font-normal">
                    ရောင်းရန်ရှိ: {selectableAvailableTickets.length} စောင်
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ထီနံပါတ် ရိုက်ရှာပါ (ဥပမာ: 582, 914)..."
                    value={ticketSearchQuery}
                    onChange={(e) => setTicketSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {selectableAvailableTickets.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-white rounded-lg border border-slate-200">
                    {selectableAvailableTickets.slice(0, 15).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleAddTicket(t)}
                        className="inline-flex items-center gap-1 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 px-2 py-1 rounded text-xs font-mono font-bold text-slate-800 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-emerald-600" />
                        <span>{t.number}</span>
                      </button>
                    ))}
                    {selectableAvailableTickets.length > 15 && (
                      <span className="text-[10px] text-slate-400 self-center px-1 font-medium">
                        +{selectableAvailableTickets.length - 15} စောင် ကျန်သေးသည် (နံပါတ်ရိုက်ရှာပါ)
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Previous Customers Quick Picker */}
          {existingCustomers.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-slate-500 mb-1.5">
                ယခင် ဝယ်ယူဖူးသူများအနက် ရွေးချယ်ရန်:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {existingCustomers.slice(0, 6).map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectExistingCustomer(c)}
                    className="text-[11px] bg-slate-100 hover:bg-amber-50 hover:border-amber-300 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 transition-colors cursor-pointer font-medium"
                  >
                    {c.name} ({c.phone.slice(-4)})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customer & Sale Info Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Customer Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ဝယ်ယူသူ နာမည် <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="ဦးမောင်မောင်"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500"
                />
              </div>
            </div>

            {/* Contact Info (Phone / Viber / Social) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ဆက်သွယ်ရန် (ဖုန်းနံပါတ် / Viber / Social Acc) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="ဖုန်းနံပါတ် (09...) သို့မဟုတ် Viber / FB / TG Acc"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500"
                />
              </div>
            </div>

            {/* Total Sale Price */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ကျသင့်ငွေ စုစုပေါင်း (MMK)
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  required
                  min="0"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:bg-white focus:border-amber-500"
                />
              </div>
            </div>

            {/* Sale Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ဝယ်ယူသည့် ရက်စွဲ
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Status Option */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ငွေပေးချေမှု အခြေအနေ (Payment Status):
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentStatus('paid')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  paymentStatus === 'paid'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Check className={`w-4 h-4 text-emerald-600 ${paymentStatus === 'paid' ? 'opacity-100' : 'opacity-0'}`} />
                <span>ငွေရှင်းပြီး ( Paid )</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentStatus('unpaid')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  paymentStatus === 'unpaid'
                    ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Check className={`w-4 h-4 text-rose-600 ${paymentStatus === 'unpaid' ? 'opacity-100' : 'opacity-0'}`} />
                <span>အကြွေးကျန် ( Unpaid )</span>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              မှတ်ချက် (Notes)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <textarea
                rows={2}
                placeholder="ဥပမာ: KPay မှ ငွေလွှဲပေးသည် / ဆိုင်လာယူမည်..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500"
              />
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
            >
              မလုပ်တော့ပါ
            </button>
            <button
              type="submit"
              disabled={selectedTickets.length === 0}
              className={`px-5 py-2 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer ${
                selectedTickets.length > 0
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>
                {selectedTickets.length > 0
                  ? `${selectedTickets.length} စောင် ရောင်းချမှတ်တမ်းတင်မည်`
                  : 'ရောင်းချမှတ်တမ်းတင်မည်'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

