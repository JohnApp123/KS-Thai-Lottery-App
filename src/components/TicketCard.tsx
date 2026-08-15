import React, { useState } from 'react';
import { Ticket, SaleRecord } from '../types';
import { formatDateBurmese, toBurmeseDigits, getTicketPriceMMK, getRelativeDateLabel } from '../utils/formatters';
import { ShoppingBag, Eye, CheckCircle2, XCircle, Camera, Maximize2, X, Clock, Check, RefreshCw, Phone, User, Calendar, ShieldCheck, Image as ImageIcon, Trash2 } from 'lucide-react';

interface TicketCardProps {
  ticket: Ticket;
  saleRecord?: SaleRecord;
  onSell: (ticket: Ticket) => void;
  onViewBuyer: (ticket: Ticket) => void;
  onConfirmPayment?: (ticket: Ticket) => void;
  onCancelReservation?: (ticket: Ticket) => void;
  onVerifyReservation?: (ticket: Ticket, saleRecord?: SaleRecord) => void;
  onDeleteTicket?: (ticket: Ticket) => void;
  isSelectedForBatch?: boolean;
  onToggleBatchSelect?: (ticket: Ticket) => void;
  batchSelectActive?: boolean;
  exchangeRate?: number;
  fixedTicketPriceMMK?: number;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  saleRecord,
  onSell,
  onViewBuyer,
  onConfirmPayment,
  onCancelReservation,
  onVerifyReservation,
  onDeleteTicket,
  isSelectedForBatch = false,
  onToggleBatchSelect,
  batchSelectActive = false,
  exchangeRate = 120,
  fixedTicketPriceMMK = 15000,
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const digits = ticket.number.padStart(6, '0').split('');
  const isAvailable = ticket.status === 'available';
  const isReserved = ticket.status === 'reserved';
  const isSold = ticket.status === 'sold';

  const mmkPrice = getTicketPriceMMK(ticket, fixedTicketPriceMMK, exchangeRate);

  return (
    <>
      <div
        className={`relative rounded-xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
          isAvailable
            ? isSelectedForBatch
              ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
              : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md'
            : isReserved
            ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-400/30 shadow-xs'
            : 'bg-slate-50/80 border-slate-200 opacity-90'
        }`}
      >
        {/* Ticket Header pattern / strip */}
        <div
          className={`px-3.5 py-2 flex items-center justify-between border-b gap-1.5 flex-wrap ${
            isAvailable
              ? 'bg-slate-50 border-slate-100'
              : isReserved
              ? 'bg-amber-100/70 border-amber-200'
              : 'bg-rose-50/60 border-rose-100'
          }`}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            {batchSelectActive && isAvailable && onToggleBatchSelect && (
              <input
                type="checkbox"
                checked={isSelectedForBatch}
                onChange={() => onToggleBatchSelect(ticket)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 bg-white cursor-pointer"
              />
            )}
            {ticket.serialCode && (
              <span className="text-[10px] bg-slate-900 text-amber-300 border border-slate-700 px-2 py-0.5 rounded-md font-mono font-black shadow-2xs">
                🔖 {ticket.serialCode}
              </span>
            )}
            <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md font-bold">
              {ticket.setCount || 1} စောင်တွဲ
            </span>
          </div>

          {/* Status Badge & Delete Action */}
          <div className="flex items-center gap-1.5">
            <div
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                isAvailable
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                  : isReserved
                  ? 'bg-amber-500 text-slate-950 border border-amber-400 animate-pulse'
                  : 'bg-rose-50 text-rose-700 border border-rose-200/80'
              }`}
            >
              {isAvailable ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>ပစ္စည်းရှိ</span>
                </>
              ) : isReserved ? (
                <>
                  <Clock className="w-3 h-3 text-slate-950" />
                  <span>ယာယီ Sold Out (ငွေလွှဲစစ်ဆေးဆဲ)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 text-rose-600" />
                  <span>ရောင်းပြီး</span>
                </>
              )}
            </div>

            {onDeleteTicket && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTicket(ticket);
                }}
                title="ဤထီလက်မှတ်ကို စာရင်းမှ ဖျက်ပစ်မည်"
                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Attached Ticket Photo Thumbnail Banner */}
        {ticket.imageUrl && (
          <div
            onClick={() => setLightboxOpen(true)}
            className="relative h-28 w-full bg-slate-900 cursor-pointer overflow-hidden group border-b border-slate-200"
          >
            <img
              src={ticket.imageUrl}
              alt={`Ticket ${ticket.number}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-between p-2">
              <span className="inline-flex items-center gap-1 text-[10px] bg-slate-900/80 text-amber-300 font-bold px-2 py-0.5 rounded backdrop-blur-xs">
                <Camera className="w-3 h-3 text-amber-400" />
                <span>မူရင်း ထီလက်မှတ်ပုံ</span>
              </span>
              <span className="text-[10px] text-white/90 bg-slate-900/80 p-1 rounded hover:bg-amber-500 hover:text-slate-950 transition-colors flex items-center gap-1">
                <Maximize2 className="w-3 h-3" />
                <span>ချဲ့ကြည့်မည်</span>
              </span>
            </div>
          </div>
        )}

        {/* Main Ticket Visual Body */}
        <div className="p-4 space-y-3 relative">
          {/* Draw Date & Price Header inside Ticket */}
          <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
            <div>
              <span className="text-slate-400 block text-[10px] font-medium">ထွက်မည့်ရက်</span>
              <span className="font-semibold text-slate-800">{formatDateBurmese(ticket.drawDate)}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] font-medium">ထီလက်မှတ်ဖိုး</span>
              <span className="font-black text-emerald-700 text-sm font-mono">
                {mmkPrice.toLocaleString('en-US')} MMK
              </span>
            </div>
          </div>

          {/* 6 Digit Big Display Box */}
          <div className="my-1 text-center">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                ထီနံပါတ် ၆ လုံး
              </p>
              {ticket.serialCode && (
                <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-50/90 px-2 py-0.5 rounded-md border border-amber-200">
                  အမှတ်စဉ်: {ticket.serialCode}
                </span>
              )}
            </div>
            <div className="flex justify-center items-center gap-1 sm:gap-1.5">
              {digits.map((digit, idx) => (
                <div
                  key={idx}
                  className={`w-7 h-9 sm:w-8 sm:h-10 rounded-lg flex items-center justify-center text-lg sm:text-xl font-black font-mono shadow-xs transition-transform ${
                    isAvailable
                      ? 'bg-slate-900 text-amber-300 border border-slate-800'
                      : isReserved
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-slate-200 text-slate-600 border border-slate-300'
                  }`}
                >
                  {digit}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 font-sans">
              (မြန်မာ: <span className="text-slate-700 font-semibold">{toBurmeseDigits(ticket.number)}</span>)
            </p>
          </div>

          {ticket.notes && (
            <p className="text-[11px] text-slate-500 italic line-clamp-1 bg-slate-50 px-2 py-1 rounded border border-slate-200/60">
              {ticket.notes}
            </p>
          )}

          {/* Sold / Reserved Customer & Sale Date Info */}
          {saleRecord && (isSold || isReserved) && (
            <div className={`p-2.5 rounded-lg border text-xs space-y-1.5 ${
              isSold ? 'bg-slate-100/90 border-slate-200 text-slate-800' : 'bg-amber-100/70 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-500" />
                  <span>{saleRecord.customerName}</span>
                </span>
                <span className="font-mono text-[10px] text-slate-600">
                  {saleRecord.customerPhone}
                </span>
              </div>

              {/* Payment Slip Thumbnail Badge if uploaded */}
              {saleRecord.paymentSlipUrl && (
                <div className="flex items-center gap-1.5 bg-white/90 p-1.5 rounded-lg border border-amber-300/80 text-[10px] font-bold text-amber-950">
                  <img
                    src={saleRecord.paymentSlipUrl}
                    alt="Slip SS"
                    className="w-5 h-5 object-cover rounded border border-slate-200 shrink-0"
                  />
                  <span className="flex-1 truncate">ငွေလွှဲပြေစာ SS ပူးတွဲထားပါသည်</span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-mono font-bold">
                    Slip
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/70 font-medium">
                <span className="flex items-center gap-1 text-slate-600">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{isReserved ? 'မှာယူသည့်ရက်:' : 'ရောင်းချသည့်ရက်:'}</span>
                </span>
                <span className="font-mono font-bold text-slate-900 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200/60">
                  {formatDateBurmese(saleRecord.saleDate)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col gap-1.5">
          {isAvailable ? (
            <button
              type="button"
              onClick={() => onSell(ticket)}
              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.98] text-white font-bold rounded-lg text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>ထီထိုးမည် / ရောင်းမည်</span>
            </button>
          ) : isReserved ? (
            <div className="space-y-1.5">
              {/* Primary Verification Action Button */}
              <button
                type="button"
                onClick={() => onVerifyReservation ? onVerifyReservation(ticket, saleRecord) : (onConfirmPayment ? onConfirmPayment(ticket) : onViewBuyer(ticket))}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                <span>ငွေလွှဲ SS စစ်ဆေးအတည်ပြုမည်</span>
              </button>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onViewBuyer(ticket)}
                  className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-[11px] flex items-center justify-center gap-1 transition-all border border-slate-200 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-600" />
                  <span>ဝယ်သူအချက်အလက်</span>
                </button>

                <button
                  type="button"
                  onClick={() => onCancelReservation && onCancelReservation(ticket)}
                  className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg text-[11px] flex items-center justify-center gap-1 transition-all border border-rose-200 cursor-pointer"
                  title="ငွေမလွှဲပါက ယာယီပိတ်ထားမှုကို ပယ်ဖျက်ပြီး ပြန်ရောင်းမည်"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>ပယ်ဖျက်မည်</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onViewBuyer(ticket)}
              className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-lg text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all border border-slate-200 shadow-xs cursor-pointer"
            >
              <Eye className="w-4 h-4 text-amber-600" />
              <span>ဝယ်သူ အချက်အလက် ကြည့်ရန်</span>
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen Photo Lightbox Modal */}
      {lightboxOpen && ticket.imageUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 flex items-center justify-between border-b border-slate-800 text-white">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm tracking-tight text-white">
                  ထီနံပါတ် {ticket.number} ၏ မူရင်း ဓာတ်ပုံ
                </h3>
              </div>
              <button
                onClick={() => setLightboxOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/60 min-h-[300px]">
              <img
                src={ticket.imageUrl}
                alt={`Lottery Ticket ${ticket.number}`}
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg shadow-lg border border-slate-800"
              />
            </div>
            <div className="p-3 bg-slate-900 border-t border-slate-800 text-center text-xs text-slate-300">
              ထွက်မည့်ရက်: {formatDateBurmese(ticket.drawDate)}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

