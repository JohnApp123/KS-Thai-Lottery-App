import React, { useState, useEffect } from 'react';
import { SaleRecord, PaymentStatus } from '../types';
import { formatDateBurmese, getTicketPriceMMK, getSalePriceMMK } from '../utils/formatters';
import {
  X,
  Check,
  User,
  Phone,
  DollarSign,
  Calendar,
  FileText,
  CreditCard,
  Pencil,
  AlertCircle,
  CheckCircle,
  Clock,
  Tag,
} from 'lucide-react';

interface EditSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleRecord | null;
  onSaveSale: (updatedSale: SaleRecord) => void;
  exchangeRate?: number;
  drawDates?: string[];
}

export const EditSaleModal: React.FC<EditSaleModalProps> = ({
  isOpen,
  onClose,
  sale,
  onSaveSale,
  exchangeRate = 120,
  drawDates = [],
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [salePrice, setSalePrice] = useState<number>(0);
  const [currency, setCurrency] = useState<'THB' | 'MMK'>('MMK');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [drawDate, setDrawDate] = useState('');
  const [notes, setNotes] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [serialCode, setSerialCode] = useState('');
  const [seriesNumber, setSeriesNumber] = useState('');

  // Populate state when sale record changes
  useEffect(() => {
    if (sale && isOpen) {
      setCustomerName(sale.customerName || '');
      setCustomerPhone(sale.customerPhone || '');
      setSalePrice(sale.salePrice || 0);
      setCurrency(sale.currency || 'MMK');
      setPaymentStatus(sale.paymentStatus || 'paid');
      setPaymentMethod(sale.paymentMethod || 'KBZPay');
      setSaleDate(sale.saleDate || new Date().toISOString().slice(0, 10));
      setDrawDate(sale.drawDate || '');
      setNotes(sale.notes || '');
      setTransactionId(sale.transactionId || '');
      setSerialCode(sale.serialCode || '');
      setSeriesNumber(sale.seriesNumber || '');
    }
  }, [sale, isOpen]);

  if (!isOpen || !sale) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert('ကျေးဇူးပြု၍ ဝယ်ယူသူ နာမည် ဖြည့်သွင်းပါ');
      return;
    }

    if (!customerPhone.trim()) {
      alert('ကျေးဇူးပြု၍ ဆက်သွယ်ရန် (Phone / Viber / Social Acc) ထည့်သွင်းပါ');
      return;
    }

    if (salePrice < 0) {
      alert('ရောင်းဈေး မှန်ကန်စွာ ထည့်သွင်းပါ');
      return;
    }

    const updated: SaleRecord = {
      ...sale,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      salePrice: Number(salePrice),
      currency,
      paymentStatus,
      paymentMethod: paymentMethod.trim() || undefined,
      saleDate,
      drawDate: drawDate || sale.drawDate,
      notes: notes.trim(),
      transactionId: transactionId.trim() || undefined,
      serialCode: serialCode.trim() || undefined,
      seriesNumber: seriesNumber.trim() || undefined,
    };

    onSaveSale(updated);
    onClose();
  };

  const calculatedMMK = getSalePriceMMK({ salePrice, currency }, exchangeRate);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl my-6 animate-in fade-in-50 zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Pencil className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>ရောင်းချမှု မှတ်တမ်း ပြင်ဆင်ရန်</span>
                <span className="text-xs font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md">
                  {sale.ticketNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Edit Sold Ticket & Customer Information
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Ticket Information Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {sale.serialCode && (
                <span className="text-[10px] font-mono font-bold bg-slate-900 text-amber-300 px-1.5 py-0.5 rounded border border-slate-700">
                  🔖 {sale.serialCode}
                </span>
              )}
              <span className="font-mono font-black text-slate-900 text-base tracking-wider">
                {sale.ticketNumber}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                (ID: {sale.id})
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              {formatDateBurmese(sale.drawDate)} ထွက်ရက်
            </span>
          </div>

          {/* Customer Name & Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ဝယ်ယူသူ အမည် <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="ဥပမာ: ဦးမောင်မောင်"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ဆက်သွယ်ရန် (Phone / Viber / Social) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="09... သို့မဟုတ် Viber / FB / TG Acc"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Sale Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  ရောင်းဈေး ({currency}) <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setCurrency('MMK')}
                    className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                      currency === 'MMK'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    MMK
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('THB')}
                    className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                      currency === 'THB'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    THB (ဘတ်)
                  </button>
                </div>
              </div>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  required
                  min="0"
                  value={salePrice}
                  onChange={(e) => setSalePrice(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:bg-white focus:border-amber-500"
                />
              </div>
              {currency === 'THB' && (
                <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                  ≈ {calculatedMMK.toLocaleString('en-US')} MMK (ပေါက်ဈေး {exchangeRate})
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ရောင်းချသည့် ရက်စွဲ
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  required
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Status & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ငွေပေးချေမှု အခြေအနေ
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:bg-white focus:border-amber-500 cursor-pointer"
              >
                <option value="paid">✓ ငွေရှင်းပြီး (Paid)</option>
                <option value="unpaid">⚠ အကြွေးကျန် (Unpaid / Debt)</option>
                <option value="pending">⏳ စစ်ဆေးဆဲ ယာယီ (Pending Verification)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ငွေပေးချေသည့် နည်းလမ်း
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="KBZPay / WavePay / Cash / AYA"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Draw Date & Serial Code Optional Edit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ထီဖွင့်လှစ်မည့် ရက်စွဲ (Draw Date)
              </label>
              {drawDates.length > 0 ? (
                <select
                  value={drawDate}
                  onChange={(e) => setDrawDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500 cursor-pointer font-medium"
                >
                  {drawDates.map((d) => (
                    <option key={d} value={d}>
                      {formatDateBurmese(d)} ({d})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="date"
                  value={drawDate}
                  onChange={(e) => setDrawDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                လစဉ် ထီကုတ် (Serial Code)
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ဥပမာ: 85, 92..."
                  value={serialCode}
                  onChange={(e) => setSerialCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Transaction ID & Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              မှတ်ချက် (Notes) / လွှဲငွေအမှတ်အသား
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <textarea
                rows={2}
                placeholder="ဥပမာ: KPay နောက်ဆုံး ၄ လုံး 1234 / ဆိုင်လာယူမည်..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500"
              />
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
            >
              မလုပ်တော့ပါ (Cancel)
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>ပြင်ဆင်ချက် သိမ်းဆည်းမည်</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
