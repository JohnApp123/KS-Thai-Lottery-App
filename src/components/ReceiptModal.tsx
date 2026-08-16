import React, { useState, useEffect } from 'react';
import { SaleRecord, PaymentAccount } from '../types';
import { formatCurrency, formatDateBurmese, getSalePriceMMK } from '../utils/formatters';
import { X, Printer, CheckCircle, AlertCircle, Copy, QrCode, Download, Smartphone, Check, Award, Receipt, Calendar, User, Phone, Sparkles, Eye, Pencil, ArrowLeft } from 'lucide-react';
import QRCode from 'qrcode';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleRecord | null;
  exchangeRate?: number;
  paymentAccounts?: PaymentAccount[];
  onEditSale?: (sale: SaleRecord) => void;
  userRole?: 'admin' | 'customer';
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  exchangeRate = 120,
  paymentAccounts = [],
  onEditSale,
  userRole = 'customer',
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [generatedQrUrl, setGeneratedQrUrl] = useState<string>('');
  const [showQr, setShowQr] = useState<boolean>(true);
  const [copiedAmount, setCopiedAmount] = useState<boolean>(false);
  const [copiedAccNumber, setCopiedAccNumber] = useState<boolean>(false);
  const [zoomedQr, setZoomedQr] = useState<string | null>(null);

  const activeAccounts = paymentAccounts.filter((a) => a.isActive);

  // Set initial selected payment account based on sale.paymentMethod or first active account
  useEffect(() => {
    if (activeAccounts.length > 0) {
      if (sale?.paymentMethod) {
        const match = activeAccounts.find(
          (a) => a.provider.toLowerCase() === sale.paymentMethod?.toLowerCase()
        );
        if (match) {
          setSelectedAccountId(match.id);
          return;
        }
      }
      setSelectedAccountId(activeAccounts[0].id);
    }
  }, [sale, paymentAccounts]);

  const selectedAccount = activeAccounts.find((a) => a.id === selectedAccountId) || activeAccounts[0];

  const mmkPrice = getSalePriceMMK(sale, exchangeRate);

  // Generate QR if no admin uploaded QR is provided
  useEffect(() => {
    if (!sale) return;
    const accNum = selectedAccount ? selectedAccount.accountNumber : '';
    const accProv = selectedAccount ? selectedAccount.provider : 'KBZPay';
    const payload = `${accProv}:${accNum} | Ticket:${sale.ticketNumber} | Amount:${mmkPrice} MMK | Voucher:${sale.id}`;

    QRCode.toDataURL(payload, {
      width: 240,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setGeneratedQrUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [sale, mmkPrice, selectedAccount]);

  if (!isOpen || !sale) return null;

  const currentQrImage = selectedAccount?.qrCodeUrl || generatedQrUrl;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const accText = selectedAccount
      ? `\nငွေပေးချေရန် အကောင့်: ${selectedAccount.provider} - ${selectedAccount.accountNumber} (${selectedAccount.accountName})`
      : '';

    const text = `
----------------------------------
ထိုင်းထီ ရောင်းဝယ်ရေး ပြေစာ (Receipt)
----------------------------------
ပြေစာနံပါတ်: ${sale.id}
ဝယ်သူ နာမည်: ${sale.customerName}
ဖုန်းနံပါတ်: ${sale.customerPhone}
ထီနံပါတ်: ${sale.ticketNumber}
ကျသင့်ငွေ: ${mmkPrice.toLocaleString('en-US')} MMK
ငွေပေးချေမှု: ${sale.paymentStatus === 'paid' ? 'ငွေရှင်းပြီး' : 'အကြွေးကျန်'}
ဝယ်ယူသည့်ရက်: ${formatDateBurmese(sale.saleDate)}
ထွက်မည့်ရက်: ${formatDateBurmese(sale.drawDate)}${accText}
----------------------------------
ကျေးဇူးတင်ပါသည်!
    `.trim();

    navigator.clipboard.writeText(text);
    alert('ပြေစာ အချက်အလက်များ ကူးယူပြီးပါပြီ (Copied to Clipboard)');
  };

  const handleDownloadQr = () => {
    if (!currentQrImage) return;
    const link = document.createElement('a');
    link.href = currentQrImage;
    link.download = `Payment_QR_${sale.ticketNumber}_${selectedAccount?.provider || 'MMK'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyAmount = () => {
    const amtStr = mmkPrice.toString();
    navigator.clipboard.writeText(amtStr);
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const handleCopyAccNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedAccNumber(true);
    setTimeout(() => setCopiedAccNumber(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl my-6 transition-all ring-1 ring-slate-900/5">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                တရားဝင် ထီရောင်းပြေစာ (Official Receipt)
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">VOUCHER #{sale.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer border border-slate-700"
            title="ပိတ်မည်"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Receipt Container with Professional Border */}
        <div className="p-4 sm:p-6 bg-slate-50/60" id="printable-receipt">
          {/* Outer Border Box with Guilloche / Professional Framing */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden space-y-4">
            {/* Top Decorative Border Stripe */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-emerald-500 to-amber-500" />

            {/* Logo Placeholder & Shop Header */}
            <div className="pt-2 text-center pb-3.5 border-b border-slate-200 space-y-2">
              <div className="flex flex-col items-center justify-center">
                {/* Logo Placeholder Badge */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white flex items-center justify-center shadow-md border-2 border-white ring-2 ring-amber-400/40 mb-1.5 relative group">
                  <span className="font-serif font-black text-2xl tracking-tighter">TL</span>
                  <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-amber-300">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-200/80 text-[10px] font-bold">
                  <Award className="w-3 h-3 text-amber-600" />
                  <span>တရားဝင် ထိုင်းထီ အရောင်းဌာန (Official Retailer)</span>
                </div>
              </div>

              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  ထိုင်းထီ ရောင်းဝယ်ရေး ပြေစာ
                </h2>
                <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase font-mono">
                  THAI GOVERNMENT LOTTERY VOUCHER
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-mono pt-1">
                <span><b>ရက်စွဲ:</b> {formatDateBurmese(sale.saleDate)}</span>
                <span>•</span>
                <span><b>အချိန်:</b> {sale.createdAt ? new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00 PM'}</span>
              </div>
            </div>

            {/* Customer & Draw Details Grid */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold uppercase">
                  <User className="w-3 h-3 text-slate-500" />
                  <span>ဝယ်ယူသူ (Customer)</span>
                </span>
                <p className="font-bold text-slate-900 truncate">{sale.customerName}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold uppercase">
                  <Phone className="w-3 h-3 text-slate-500" />
                  <span>ဖုန်းနံပါတ် (Phone)</span>
                </span>
                <p className="font-mono font-bold text-slate-800">{sale.customerPhone || 'မရှိပါ'}</p>
              </div>

              <div className="space-y-0.5 col-span-2 pt-1 border-t border-slate-200/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold uppercase">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>ထီဖွင့်မည့်ရက် (Draw Date)</span>
                </span>
                <span className="font-bold text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded text-[11px]">
                  {formatDateBurmese(sale.drawDate)}
                </span>
              </div>
            </div>

            {/* 6-Digit Ticket Display Card */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-3.5 rounded-xl border border-slate-800 text-center shadow-inner relative overflow-hidden">
              <div className="absolute top-0 left-0 w-12 h-12 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between px-2 mb-0.5">
                <p className="text-[10px] text-amber-400 uppercase font-bold tracking-widest">
                  ထီနံပါတ် ၆ လုံး (Lottery Number)
                </p>
                {sale.serialCode && (
                  <span className="text-[10px] bg-slate-800 text-amber-300 font-mono font-bold px-2 py-0.5 rounded border border-slate-700">
                    အမှတ်စဉ်: {sale.serialCode}
                  </span>
                )}
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-amber-300 drop-shadow-sm py-1">
                {sale.ticketNumber}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {sale.serialCode ? `အမှတ်စဉ် ${sale.serialCode} ဖြင့် မှတ်တမ်းတင်ထားသော ထီလက်မှတ်` : 'အထူးစစ်ဆေးပြီး တရားဝင် ထီလက်မှတ်နံပါတ်'}
              </div>
            </div>

            {/* Clear Summary Section with Grid-Aligned Pricing Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  ကုန်ကျငွေ အသေးစိတ် စာရင်း (Price Breakdown)
                </h4>
              </div>

              {/* Structured Grid Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                {/* Table Header */}
                <div className="flex items-center justify-between bg-slate-100/90 px-4 py-2 font-bold text-slate-600 text-[11px] border-b border-slate-200">
                  <div>ဖော်ပြချက် (Description)</div>
                  <div className="text-right">ကျသင့်ငွေ (MMK)</div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-slate-100 bg-white">
                  <div className="flex items-center justify-between px-4 py-2.5 text-slate-700">
                    <div className="font-medium">
                      <span className="font-bold text-slate-900">ထီလက်မှတ် ({sale.ticketNumber})</span>
                      <span className="block text-[10px] text-slate-400 font-mono">1 Ticket</span>
                    </div>
                    <div className="text-right font-mono font-bold text-slate-900">
                      {mmkPrice.toLocaleString('en-US')} MMK
                    </div>
                  </div>
                </div>

                {/* Total Highlight Row */}
                <div className="flex items-center justify-between px-4 py-3 bg-amber-50/70 border-t-2 border-slate-200 font-bold">
                  <div className="text-slate-900 font-black text-xs sm:text-sm">
                    စုစုပေါင်း ကျသင့်ငွေ (Total Due)
                  </div>
                  <div className="text-right font-mono font-black text-emerald-800 text-sm sm:text-base">
                    {mmkPrice.toLocaleString('en-US')} MMK
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Status Bar */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="text-slate-600 font-medium">ငွေပေးချေမှု အခြေအနေ:</span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  sale.paymentStatus === 'paid'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : sale.paymentStatus === 'pending'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}
              >
                {sale.paymentStatus === 'paid' ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-700 stroke-[2.5]" />
                    <span>ငွေရှင်းပြီး (Paid)</span>
                  </>
                ) : sale.paymentStatus === 'pending' ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                    <span>ယာယီ Sold Out (ငွေလွှဲစစ်ဆေးဆဲ)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-700 stroke-[2.5]" />
                    <span>အကြွေးကျန် (Unpaid)</span>
                  </>
                )}
              </span>
            </div>

            {/* Payment Slip and Transaction Details */}
            {(sale.paymentSlipUrl || sale.transactionId || sale.paymentMethod) && (
              <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-900 flex items-center gap-1">
                    <span>💳 ငွေလွှဲအချက်အလက် (Payment Transfer Info)</span>
                  </span>
                  {sale.paymentMethod && (
                    <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                      {sale.paymentMethod}
                    </span>
                  )}
                </div>

                {sale.transactionId && (
                  <div className="flex items-center justify-between text-slate-700 text-[11px]">
                    <span className="text-slate-500">ငွေလွှဲအမှတ် (Txn ID):</span>
                    <span className="font-mono font-bold text-slate-900">{sale.transactionId}</span>
                  </div>
                )}

                {sale.paymentSlipUrl && (
                  <div className="pt-2 border-t border-indigo-100 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-600 block">
                      ငွေလွှဲပြေစာ Screenshot (Payment Slip):
                    </span>
                    <div className="rounded-lg overflow-hidden border border-indigo-200 bg-white max-h-48 flex items-center justify-center">
                      <img
                        src={sale.paymentSlipUrl}
                        alt="Payment Slip"
                        className="w-full object-contain max-h-44 hover:scale-105 transition-transform"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {sale.notes && (
              <div className="text-[11px] text-slate-600 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/60 flex items-start gap-1.5">
                <span className="font-bold text-amber-800">မှတ်ချက်:</span>
                <span>{sale.notes}</span>
              </div>
            )}

            {/* Payment QR Code Section */}
            <div className="pt-2 border-t border-dashed border-slate-300 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-900">
                    ငွေပေးချေရန် QR နှင့် အကောင့်များ (Payment Account & QR)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                >
                  {showQr ? 'ခေါက်ထားမည်' : 'QR ပြမည်'}
                </button>
              </div>

              {showQr && (
                <div className="bg-slate-900 text-white rounded-2xl p-3.5 space-y-3 border border-slate-800 shadow-inner">
                  {/* Account Selector if multiple active accounts */}
                  {activeAccounts.length > 1 && (
                    <div className="flex bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 gap-1">
                      {activeAccounts.map((acc) => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => setSelectedAccountId(acc.id)}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            selectedAccount?.id === acc.id
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span>{acc.provider}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Amount Display & Quick Copy */}
                  <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        ပေးချေရမည့်ပမာဏ (MMK):
                      </span>
                      <span className="text-lg font-black font-mono text-amber-300">
                        {mmkPrice.toLocaleString('en-US')}{' '}
                        <span className="text-xs font-bold text-slate-300">MMK</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyAmount}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      {copiedAmount ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">ကူးပြီးပြီ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>ပမာဏ ကူးမည်</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Selected Account Info Card */}
                  {selectedAccount && (
                    <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400">
                          {selectedAccount.provider} အကောင့်ပိုင်ရှင်:
                        </span>
                        <span className="text-xs font-bold text-amber-300">
                          {selectedAccount.accountName}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                        <span className="text-sm font-black font-mono text-white tracking-wider">
                          {selectedAccount.accountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyAccNumber(selectedAccount.accountNumber)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedAccNumber ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                              <span>ကူးပြီး</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Number</span>
                            </>
                          )}
                        </button>
                      </div>

                      {selectedAccount.notes && (
                        <p className="text-[10px] text-slate-400 italic pt-0.5">
                          📌 {selectedAccount.notes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Generated or Uploaded QR Code Card */}
                  <div className="flex flex-col items-center justify-center bg-white p-3 rounded-xl border border-slate-200 text-slate-900 space-y-2">
                    {currentQrImage ? (
                      <div
                        onClick={() => setZoomedQr(currentQrImage)}
                        className="relative group cursor-pointer"
                        title="QR Code ချဲ့ကြည့်ရန် နှိပ်ပါ"
                      >
                        <img
                          src={currentQrImage}
                          alt="Payment QR Code MMK"
                          className="w-40 h-40 object-contain rounded-lg border border-slate-100 shadow-2xs group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-slate-950/60 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold">
                          <Eye className="w-4 h-4 mr-1" /> ချဲ့ကြည့်မည်
                        </div>
                      </div>
                    ) : (
                      <div className="w-40 h-40 flex items-center justify-center text-slate-400 text-xs font-mono">
                        Generating QR...
                      </div>
                    )}

                    <div className="text-center">
                      <p className="text-[11px] font-bold text-slate-800 flex items-center justify-center gap-1">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Scan QR code to Pay ({selectedAccount?.provider || 'KBZPay'})</span>
                      </p>
                      <p className="text-[9px] text-slate-500">
                        KBZPay / WavePay / Mobile Banking ဖြင့် Scan ဖတ်ပေးချေနိုင်ပါသည်
                      </p>
                    </div>
                  </div>

                  {/* Download QR Button */}
                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>QR Code ပုံ ရယူမည် (Download)</span>
                  </button>
                </div>
              )}
            </div>

            {/* QR Zoom Preview Modal */}
            {zoomedQr && (
              <div
                className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setZoomedQr(null)}
              >
                <div
                  className="bg-white rounded-2xl p-4 max-w-sm w-full space-y-3 text-center shadow-2xl relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-xs text-slate-800">
                      {selectedAccount?.provider || 'Payment'} QR Code
                    </span>
                    <button
                      onClick={() => setZoomedQr(null)}
                      className="p-1 text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <img
                    src={zoomedQr}
                    alt="Zoomed QR"
                    className="w-full max-h-80 object-contain rounded-lg border border-slate-200"
                  />
                  <p className="text-xs font-mono font-bold text-slate-800">
                    {selectedAccount?.accountNumber} ({selectedAccount?.accountName})
                  </p>
                </div>
              </div>
            )}

            {/* Footer note */}
            <div className="text-center pt-2 text-[11px] text-slate-400 font-medium border-t border-dashed border-slate-200">
              ဝယ်ယူအားပေးမှုကို အထူးပင် ကျေးဇူးတင်ရှိပါသည် • ကံထူးပါစေ!
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              title="ပိတ်မည် / ပင်မသို့ ပြန်သွားမည်"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>နောက်သို့ (Back)</span>
            </button>

            <button
              onClick={handleCopyText}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300 shadow-2xs"
            >
              <Copy className="w-3.5 h-3.5 text-amber-700" />
              <span>စာသား ကူးယူမည်</span>
            </button>

            {userRole === 'admin' && onEditSale && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditSale(sale);
                }}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200 shadow-2xs"
                title="ဝယ်သူနှင့် အရောင်းအချက်အလက် ပြင်ဆင်ရန်"
              >
                <Pencil className="w-3.5 h-3.5 text-blue-600" />
                <span>အချက်အလက် ပြင်မည်</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>ပရင့်ထုတ်မည် (Print)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

