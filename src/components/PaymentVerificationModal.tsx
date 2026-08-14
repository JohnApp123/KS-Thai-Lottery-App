import React, { useState } from 'react';
import { Ticket, SaleRecord, PaymentStatus } from '../types';
import { formatDateBurmese, getTicketPriceMMK, getTicketPriceTHB, formatMMK, formatTHB } from '../utils/formatters';
import { 
  X, Check, AlertCircle, Phone, User, Calendar, 
  DollarSign, Image as ImageIcon, ZoomIn, ZoomOut, Maximize2, 
  RotateCw, ExternalLink, CheckCircle2, XCircle, Clock, 
  FileText, ShieldCheck, ArrowRight, Upload, Trash2, Copy
} from 'lucide-react';

interface PaymentVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  saleRecord?: SaleRecord | null;
  sale?: SaleRecord | null;
  relatedTickets?: Ticket[];
  activeAdminName?: string;
  exchangeRate?: number;
  fixedTicketPriceMMK?: number;
  onConfirmSold: (ticket: Ticket, sale?: SaleRecord, paymentStatus?: PaymentStatus, notes?: string) => void;
  onRejectReservation: (ticket: Ticket, sale?: SaleRecord, reason?: string) => void;
  onUpdateSlipImage?: (saleId: string, newSlipUrl: string) => void;
}

export const PaymentVerificationModal: React.FC<PaymentVerificationModalProps> = ({
  isOpen,
  onClose,
  ticket,
  saleRecord,
  sale,
  relatedTickets = [],
  activeAdminName = 'Admin',
  exchangeRate = 120,
  fixedTicketPriceMMK = 15000,
  onConfirmSold,
  onRejectReservation,
  onUpdateSlipImage,
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageRotation, setImageRotation] = useState(0);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [localSlipUrl, setLocalSlipUrl] = useState<string | null>(null);

  if (!isOpen || !ticket) return null;

  const actualSale = saleRecord || sale || null;
  const currentSlip = localSlipUrl || actualSale?.paymentSlipUrl || null;
  const isMulti = relatedTickets.length > 1;

  // Calculate pricing
  const totalMMK = isMulti
    ? relatedTickets.reduce((sum, t) => sum + getTicketPriceMMK(t, fixedTicketPriceMMK, exchangeRate), 0)
    : getTicketPriceMMK(ticket, fixedTicketPriceMMK, exchangeRate);

  const totalTHB = isMulti
    ? relatedTickets.reduce((sum, t) => sum + getTicketPriceTHB(t, exchangeRate, fixedTicketPriceMMK), 0)
    : getTicketPriceTHB(ticket, exchangeRate, fixedTicketPriceMMK);

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('ပုံအရွယ်အစား 5MB ထက် မကျော်လွန်ရပါ');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result as string;
      setLocalSlipUrl(dataUri);
      if (actualSale && onUpdateSlipImage) {
        onUpdateSlipImage(actualSale.id, dataUri);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApprovePaid = () => {
    onConfirmSold(ticket, actualSale || undefined, 'paid', adminNotes.trim());
    onClose();
  };

  const handleApproveUnpaid = () => {
    onConfirmSold(ticket, actualSale || undefined, 'unpaid', adminNotes.trim() ? `[အကြွေး] ${adminNotes.trim()}` : '[အကြွေး]');
    onClose();
  };

  const handleExecuteReject = () => {
    onRejectReservation(ticket, actualSale || undefined, rejectReason.trim() || 'ငွေလွှဲမမှန်ကန် သို့မဟုတ် ပယ်ဖျက်လိုက်ပါသည်');
    setShowRejectConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  ယာယီ Sold Out ငွေလွှဲပြေစာ စစ်ဆေးအတည်ပြုလွှာ
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  စစ်ဆေးရန်ကျန် (Pending)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Payment Slip Verification & Ticket Confirmation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Two-Column Responsive Layout */}
        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-h-[78vh] overflow-y-auto">
          
          {/* Left Column (5 cols): Payment Slip Screenshot Viewer */}
          <div className="lg:col-span-5 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <span>ငွေလွှဲပြေစာ Screenshot (Slip)</span>
              </span>
              {currentSlip && (
                <button
                  type="button"
                  onClick={() => setImageRotation((prev) => (prev + 90) % 360)}
                  className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  title="ပုံလှည့်ရန်"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>လှည့်ရန်</span>
                </button>
              )}
            </div>

            {/* Slip Image Card */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-2 relative overflow-hidden flex flex-col items-center justify-center min-h-[260px] group shadow-inner">
              {currentSlip ? (
                <>
                  <div 
                    className="w-full flex items-center justify-center cursor-pointer overflow-hidden rounded-xl bg-slate-900"
                    onClick={() => setLightboxOpen(true)}
                  >
                    <img
                      src={currentSlip}
                      alt="Payment Slip"
                      style={{ transform: `rotate(${imageRotation}deg)` }}
                      className="max-h-[280px] w-auto object-contain transition-transform duration-200 group-hover:scale-102"
                    />
                  </div>

                  {/* Image Action Overlay */}
                  <div className="absolute inset-x-2 bottom-2 bg-slate-950/80 backdrop-blur-xs p-2 rounded-xl flex items-center justify-between text-white text-xs opacity-90 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>အကြီးချဲ့ကြည့်ရန်</span>
                    </button>

                    <label className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer">
                      <Upload className="w-3 h-3" />
                      <span>အစားထိုးတင်မည်</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-300">
                      ငွေလွှဲပြေစာ SS ပုံ မရှိသေးပါ
                    </p>
                    <p className="text-[11px] text-slate-500">
                      ဖောက်သည်ထံမှ ရရှိသော ပြေစာပုံအား တင်ထားနိုင်ပါသည်
                    </p>
                  </div>

                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer transition-all shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>ပြေစာ SS ပုံ တင်မည်</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Transaction / Slip Reference if available */}
            {saleRecord?.transactionId && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs flex items-center justify-between">
                <span className="text-slate-500 font-medium">ငွေလွှဲ Transaction ID:</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {saleRecord.transactionId}
                </span>
              </div>
            )}
          </div>

          {/* Right Column (7 cols): Ticket Info & Verification Controls */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Customer Information Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  ဝယ်ယူသူ အချက်အလက် (Customer Info):
                </span>
                <span className="text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full">
                  {saleRecord?.paymentMethod || 'Online Transfer'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[11px] text-slate-500 block">ဝယ်ယူသူ အမည်:</span>
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                    <User className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{saleRecord?.customerName || ticket.reservedCustomerName || 'အမည်မဖော်ပြထားသူ'}</span>
                  </p>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block">ဖုန်းနံပါတ်:</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-sm font-mono font-bold text-slate-900">
                      {saleRecord?.customerPhone || ticket.reservedCustomerPhone || '-'}
                    </span>
                    {(saleRecord?.customerPhone || ticket.reservedCustomerPhone) && (
                      <button
                        type="button"
                        onClick={() => handleCopyPhone(saleRecord?.customerPhone || ticket.reservedCustomerPhone || '')}
                        className="text-[10px] text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-medium cursor-pointer"
                      >
                        {copiedPhone ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {saleRecord?.notes && (
                <div className="pt-2 border-t border-slate-200/80">
                  <span className="text-[11px] text-slate-500 block">ဖောက်သည် မှတ်ချက်:</span>
                  <p className="text-xs text-slate-800 italic mt-0.5 bg-white p-2 rounded-lg border border-slate-200">
                    "{saleRecord.notes}"
                  </p>
                </div>
              )}
            </div>

            {/* Ticket & Amount Breakdown */}
            <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950">
                  ထီလက်မှတ် နှင့် ကျသင့်ငွေစာရင်း:
                </span>
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>ထီဖွင့်ရက်: {formatDateBurmese(ticket.drawDate)}</span>
                </span>
              </div>

              {/* Tickets List */}
              <div className="bg-white border border-amber-200/80 rounded-xl p-2.5 max-h-28 overflow-y-auto space-y-1.5">
                {(isMulti ? relatedTickets : [ticket]).map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-amber-900 text-sm tracking-wider">
                        {t.number}
                      </span>
                      {t.seriesNumber && (
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {t.seriesNumber}
                        </span>
                      )}
                      <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-bold">
                        {t.setCount || 1} စောင်တွဲ
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      {getTicketPriceMMK(t, fixedTicketPriceMMK, exchangeRate).toLocaleString('en-US')} Ks
                    </span>
                  </div>
                ))}
              </div>

              {/* Total Summary */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-amber-950">
                  စုစုပေါင်း စစ်ဆေးလက်ခံရမည့် ငွေပမာဏ:
                </span>
                <div className="text-right">
                  <span className="font-mono font-black text-lg text-emerald-800 block">
                    {totalMMK.toLocaleString('en-US')} MMK
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Optional Confirmation Note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Admin စစ်ဆေးအတည်ပြုချက် မှတ်ချက် (Optional)
              </label>
              <input
                type="text"
                placeholder="ဥပမာ: KPay မှ 15,000Ks အပြည့်လက်ခံရရှိပြီး..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
              />
            </div>

            {/* Reject Box Accordion if Triggered */}
            {showRejectConfirm ? (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-3 animate-in fade-in">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-rose-900">
                      လျာထားမှုကို ပယ်ဖျက်ပြီး လက်မှတ်များကို ပြန်လည်ရောင်းချရန် သေချာပါသလား?
                    </p>
                    <p className="text-rose-700 text-[11px]">
                      ဤထီလက်မှတ်များသည် ရောင်းရန်စာရင်း (Available) သို့ ချက်ချင်း ပြန်လည်ရောက်ရှိသွားပါမည်။
                    </p>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="ပယ်ဖျက်ရသည့် အကြောင်းပြချက် (ဥပမာ: ငွေလွှဲပြေစာ အတုဖြစ်နေပါသည်)..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs text-rose-950 focus:outline-none"
                />

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRejectConfirm(false)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 cursor-pointer"
                  >
                    နောက်သို့
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteReject}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>ပယ်ဖျက်ပြီး ပြန်ရောင်းမည်</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Verification Action Buttons */
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Primary Approval Button: Mark as Sold & Paid */}
                  <button
                    type="button"
                    onClick={handleApprovePaid}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-98"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>ငွေလွှဲမှန်ကန် - Sold Out သတ်မှတ်မည်</span>
                  </button>

                  {/* Secondary: Mark as Unpaid/Credit Sold */}
                  <button
                    type="button"
                    onClick={handleApproveUnpaid}
                    className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-98"
                  >
                    <Clock className="w-4 h-4" />
                    <span>အကြွေးအဖြစ် Sold Out သတ်မှတ်မည်</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRejectConfirm(true)}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>ငွေလွှဲမမှန်ကန် / ပယ်ဖျက်မည်</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    ပိတ်မည်
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Fullscreen Lightbox for Slip Zoom */}
      {lightboxOpen && currentSlip && (
        <div 
          className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setImageRotation((prev) => (prev + 90) % 360)}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl cursor-pointer"
              title="လှည့်ရန်"
            >
              <RotateCw className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl cursor-pointer"
              title="ပိတ်ရန်"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="max-w-4xl max-h-[85vh] overflow-auto flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={currentSlip}
              alt="Payment Slip Full"
              style={{ transform: `rotate(${imageRotation}deg)` }}
              className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform"
            />
          </div>
          <p className="text-xs text-slate-400 mt-3">
            ပုံပြင်ပနေရာကို နှိပ်ပါက ပိတ်ပါမည်
          </p>
        </div>
      )}
    </div>
  );
};
