import React, { useState, useEffect } from 'react';
import { Ticket } from '../types';
import { X, Edit3, Check, Camera, Image as ImageIcon, Trash2, RefreshCw } from 'lucide-react';
import { SAMPLE_TICKET_IMAGES } from '../data/initialData';

interface EditTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onSaveTicket: (updatedTicket: Ticket) => void;
  onDeleteTicket?: (ticket: Ticket) => void;
  exchangeRate?: number;
  drawDates?: string[];
}

export const EditTicketModal: React.FC<EditTicketModalProps> = ({
  isOpen,
  onClose,
  ticket,
  onSaveTicket,
  onDeleteTicket,
  exchangeRate = 120,
  drawDates = [],
}) => {
  const [ticketNumber, setTicketNumber] = useState('');
  const [serialCode, setSerialCode] = useState('');
  const [seriesNumber, setSeriesNumber] = useState('');
  const [drawDate, setDrawDate] = useState('');
  const [priceMMK, setPriceMMK] = useState<number>(15000);
  const [setCount, setSetCount] = useState<number>(1);
  const [status, setStatus] = useState<'available' | 'reserved' | 'sold'>('available');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (ticket) {
      setTicketNumber(ticket.number || '');
      setSerialCode(ticket.serialCode || '');
      setSeriesNumber(ticket.seriesNumber || '');
      setDrawDate(ticket.drawDate || '');
      setPriceMMK(ticket.priceMMK || 15000);
      setSetCount(ticket.setCount || 1);
      setStatus(ticket.status || 'available');
      setNotes(ticket.notes || '');
      setImageUrl(ticket.imageUrl || '');
      setValidationError(null);
    }
  }, [ticket]);

  if (!isOpen || !ticket) return null;

  // Process image file selection/capture with canvas compression
  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 900;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.8);
            setImageUrl(compressed);
          } else {
            setImageUrl(reader.result as string);
          }
        };
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanNum = ticketNumber.trim();
    if (!cleanNum || cleanNum.length < 6) {
      setValidationError('ကျေးဇူးပြု၍ ၆ လုံးပြည့် ထီနံပါတ် မှန်ကန်စွာ ထည့်သွင်းပါ');
      return;
    }

    const updated: Ticket = {
      ...ticket,
      number: cleanNum,
      serialCode: serialCode.trim() || undefined,
      seriesNumber: seriesNumber.trim() || undefined,
      drawDate,
      priceMMK: Number(priceMMK),
      price: Math.round(Number(priceMMK) / (exchangeRate || 120)),
      currency: 'MMK',
      setCount: Number(setCount),
      status,
      notes: notes.trim(),
      imageUrl: imageUrl || undefined,
    };

    onSaveTicket(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl my-8">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                ထီလက်မှတ် အချက်အလက် ပြင်ဆင်ရန်
              </h2>
              <p className="text-xs text-slate-400">
                Edit Ticket Details: {ticket.number}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
              <X className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Ticket Number & Serial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                ထီနံပါတ် ၆ လုံး <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={ticketNumber}
                onChange={(e) => {
                  setTicketNumber(e.target.value.replace(/\D/g, ''));
                  if (validationError) setValidationError(null);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-base font-mono font-black tracking-widest text-amber-800 focus:outline-none focus:bg-white focus:border-amber-500"
                placeholder="582914"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                အမှတ်စဉ် (Serial / Tracking)
              </label>
              <input
                type="text"
                value={serialCode}
                onChange={(e) => setSerialCode(e.target.value)}
                placeholder="SN-001"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500"
              />
            </div>
          </div>

          {/* Series & Draw Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                အတွဲအမှတ် (Series)
              </label>
              <input
                type="text"
                value={seriesNumber}
                onChange={(e) => setSeriesNumber(e.target.value)}
                placeholder="အတွဲ (၀၁)"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                ထွက်မည့်ရက် (Draw Date) <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={drawDate}
                onChange={(e) => setDrawDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500"
              />
            </div>
          </div>

          {/* Price & Set Count */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                ရောင်းစျေးနှုန်း (MMK ကျပ်) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="100"
                  step="100"
                  required
                  value={priceMMK}
                  onChange={(e) => setPriceMMK(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-3 pr-12 py-2 text-sm font-mono font-black text-emerald-800 focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                  MMK
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                တွဲစောင်ရေ
              </label>
              <select
                value={setCount}
                onChange={(e) => setSetCount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500 cursor-pointer"
              >
                <option value={1}>၁ စောင်တွဲ</option>
                <option value={2}>၂ စောင်တွဲ</option>
                <option value={3}>၃ စောင်တွဲ</option>
                <option value={5}>၅ စောင်တွဲ</option>
              </select>
            </div>
          </div>

          {/* Ticket Status */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              ထီလက်မှတ် အခြေအနေ (Status)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('available')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  status === 'available'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ပစ္စည်းရှိ (Available)
              </button>
              <button
                type="button"
                onClick={() => setStatus('reserved')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  status === 'reserved'
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ယာယီ Sold Out
              </button>
              <button
                type="button"
                onClick={() => setStatus('sold')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  status === 'sold'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ရောင်းပြီး (Sold)
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              မှတ်ချက် (Notes)
            </label>
            <input
              type="text"
              placeholder="ဥပမာ: ထီနံပါတ်လှ၊ အထူးတွဲ..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500"
            />
          </div>

          {/* Ticket Photo Attachment Section */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-amber-600" />
                <span>ထီလက်မှတ် ဓာတ်ပုံ ပြင်ဆင်ရန် (Ticket Photo)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Optional</span>
            </label>

            {imageUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-slate-300 group">
                <img
                  src={imageUrl}
                  alt="Attached Lottery Ticket"
                  className="w-full h-36 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-lg shadow-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ဖျက်မည်</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col items-center justify-center p-2.5 border border-slate-300 rounded-xl cursor-pointer bg-white hover:bg-emerald-50 hover:border-emerald-400 transition-all text-center">
                    <ImageIcon className="w-4 h-4 text-emerald-600 mb-0.5" />
                    <span className="text-xs font-bold text-slate-800">Gallery မှ ပုံရွေး</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>

                  <label className="flex flex-col items-center justify-center p-2.5 border border-slate-300 rounded-xl cursor-pointer bg-white hover:bg-amber-50 hover:border-amber-400 transition-all text-center">
                    <Camera className="w-4 h-4 text-amber-600 mb-0.5" />
                    <span className="text-xs font-bold text-slate-800">ကင်မရာ ရိုက်မည်</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="pt-1">
                  <span className="text-[10px] text-slate-400 block mb-1">
                    သို့မဟုတ် နမူနာပုံများ ရွေးပါ:
                  </span>
                  <div className="flex gap-2">
                    {SAMPLE_TICKET_IMAGES.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImageUrl(img)}
                        className="w-14 h-9 rounded-md overflow-hidden border border-slate-300 hover:border-amber-500 cursor-pointer"
                      >
                        <img src={img} alt={`Sample ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-100 flex-wrap">
            {onDeleteTicket ? (
              <button
                type="button"
                id="btn-modal-delete-ticket"
                onClick={() => {
                  onDeleteTicket(ticket);
                }}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-rose-200 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>ထီလက်မှတ် ဖျက်မည်</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer border border-slate-200"
              >
                မလုပ်တော့ပါ
              </button>
              <button
                type="submit"
                id="btn-modal-save-ticket"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>ပြင်ဆင်မှုများ သိမ်းဆည်းမည်</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
