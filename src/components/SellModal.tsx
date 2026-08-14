import React, { useState, useEffect } from 'react';
import { Ticket, SaleRecord, PaymentStatus } from '../types';
import { getTicketPriceMMK, formatDateBurmese } from '../utils/formatters';
import { X, Check, User, Phone, DollarSign, Calendar, FileText, Sparkles } from 'lucide-react';

interface SellModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketsToSell: Ticket[];
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
}

export const SellModal: React.FC<SellModalProps> = ({
  isOpen,
  onClose,
  ticketsToSell,
  onConfirmSale,
  existingCustomers = [],
  exchangeRate = 120,
  fixedTicketPriceMMK = 15000,
}) => {

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [notes, setNotes] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [customPrice, setCustomPrice] = useState<number>(0);

  // Calculate default total price from selected tickets in MMK
  useEffect(() => {
    if (ticketsToSell.length > 0) {
      const total = ticketsToSell.reduce(
        (sum, t) => sum + getTicketPriceMMK(t, fixedTicketPriceMMK, exchangeRate),
        0
      );
      setCustomPrice(total);
    }
  }, [ticketsToSell, exchangeRate, fixedTicketPriceMMK]);

  if (!isOpen || ticketsToSell.length === 0) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('ကျေးဇူးပြု၍ ဝယ်ယူသူ နာမည် နှင့် ဖုန်းနံပါတ် ထည့်သွင်းပါ');
      return;
    }

    onConfirmSale({
      ticketIds: ticketsToSell.map((t) => t.id),
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
    onClose();
  };

  const handleSelectExistingCustomer = (c: { name: string; phone: string }) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
  };

  const isMulti = ticketsToSell.length > 1;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full overflow-hidden shadow-xl my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {isMulti ? `အုပ်စုလိုက် ထီထိုးသူ အချက်အလက် မှတ်တမ်းတင်ရန် (${ticketsToSell.length} စောင်)` : 'ထီထိုးသူ အချက်အလက် မှတ်တမ်းတင်ရန်'}
              </h2>
              <p className="text-xs text-slate-400">
                Ticket Purchase & Customer Record Form
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Selected Ticket Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              ရွေးချယ်ထားသော ထီလက်မှတ်များ (Selected Ticket):
            </p>

            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {ticketsToSell.map((t) => (
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
                    <span className="font-mono font-bold text-amber-800 text-sm tracking-wider">
                      {t.number}
                    </span>
                    <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                      {t.setCount || 1} စောင်တွဲ
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-700 font-bold block font-mono">
                      {getTicketPriceMMK(t, fixedTicketPriceMMK, exchangeRate).toLocaleString('en-US')} MMK
                    </span>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Previous Customers Quick Picker */}
          {existingCustomers.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-slate-500 mb-1.5">
                ယခင် ဝယ်ယူဖူးသူများအနက် ရွေးချယ်ရန်:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {existingCustomers.slice(0, 5).map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectExistingCustomer(c)}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 transition-colors cursor-pointer font-medium"
                  >
                    {c.name} ({c.phone.slice(-4)})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fields */}
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ဖုန်းနံပါတ် <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="0912345678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-amber-800 font-bold focus:outline-none focus:bg-white focus:border-emerald-500"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
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
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500"
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>ရောင်းရရှိမှု မှတ်တမ်းတင်မည်</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
