import React, { useState, useEffect, useRef } from 'react';
import { PaymentAccount, PaymentAccountProvider } from '../types';
import { compressImageFile, safeStorage } from '../utils/storage';
import {
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  QrCode,
  Upload,
  Copy,
  AlertCircle,
  Eye,
  Smartphone,
  ShieldCheck,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface PaymentAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: PaymentAccount[];
  onSaveAccounts?: (accounts: PaymentAccount[]) => void;
  onUpdateAccounts?: (accounts: PaymentAccount[]) => void;
}

export const PROVIDER_OPTIONS: {
  id: PaymentAccountProvider;
  name: string;
  badgeColor: string;
  description: string;
}[] = [
  {
    id: 'KBZPay',
    name: 'KBZPay (KPay)',
    badgeColor: 'bg-blue-600 text-white border-blue-500',
    description: 'KPay အကောင့် / ဖုန်းနံပါတ် နှင့် KPay QR Code',
  },
  {
    id: 'WaveMoney',
    name: 'Wave Money (WavePay)',
    badgeColor: 'bg-amber-500 text-slate-950 border-amber-400',
    description: 'Wave Money အကောင့် / ဖုန်းနံပါတ် နှင့် Wave QR Code',
  },
];

export const PaymentAccountsModal: React.FC<PaymentAccountsModalProps> = ({
  isOpen,
  onClose,
  accounts = [],
  onSaveAccounts,
  onUpdateAccounts,
}) => {
  const [localAccounts, setLocalAccounts] = useState<PaymentAccount[]>(accounts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form State
  const [provider, setProvider] = useState<PaymentAccountProvider>('KBZPay');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Status message
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // QR Preview Lightbox
  const [zoomedQr, setZoomedQr] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize local accounts when prop accounts change or modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalAccounts(accounts);
      setIsAddingNew(false);
      setEditingId(null);
      setFeedbackMessage(null);
    }
  }, [isOpen, accounts]);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3500);
  };

  const commitChanges = (updated: PaymentAccount[]) => {
    setLocalAccounts(updated);
    if (onSaveAccounts) {
      onSaveAccounts(updated);
    }
    if (onUpdateAccounts) {
      onUpdateAccounts(updated);
    }
  };

  const handleStartAdd = () => {
    setEditingId(null);
    setProvider('KBZPay');
    setAccountName('');
    setAccountNumber('');
    setQrCodeUrl('');
    setNotes('');
    setIsActive(true);
    setIsAddingNew(true);
  };

  const handleStartEdit = (acc: PaymentAccount) => {
    setEditingId(acc.id);
    setProvider(acc.provider);
    setAccountName(acc.accountName);
    setAccountNumber(acc.accountNumber);
    setQrCodeUrl(acc.qrCodeUrl || '');
    setNotes(acc.notes || '');
    setIsActive(acc.isActive);
    setIsAddingNew(false);
  };

  const handleCancelForm = () => {
    setEditingId(null);
    setIsAddingNew(false);
  };

  const handleQrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('QR ပုံအရွယ်အစား 10MB ထက် မကျော်လွန်ရပါ');
        return;
      }
      try {
        const compressedDataUrl = await compressImageFile(file, 600, 600, 0.88);
        setQrCodeUrl(compressedDataUrl);
        showFeedback('QR Code ပုံ တင်သွင်းပြီးပါပြီ (အရွယ်အစား ချုံ့ပြီး သိမ်းဆည်းထားပါသည်)');
      } catch (err) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setQrCodeUrl(event.target.result as string);
            showFeedback('QR Code ပုံ တင်သွင်းပြီးပါပြီ');
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleGenerateDefaultQr = () => {
    if (!accountNumber) {
      alert('QR Code အလိုအလျောက် ဖန်တီးရန် အကောင့်နံပါတ် / ဖုန်းနံပါတ် အရင်ရိုက်ထည့်ပါ');
      return;
    }
    const safeData = encodeURIComponent(`${provider}:${accountNumber} (${accountName || 'ThaiLottery'})`);
    const generated = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${safeData}&format=png`;
    setQrCodeUrl(generated);
    showFeedback('QR Code ကို အလိုအလျောက် ထုတ်လုပ်ပေးလိုက်ပါပြီ');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim() || !accountNumber.trim()) {
      alert('ကျေးဇူးပြု၍ အကောင့်အမည် နှင့် အကောင့်နံပါတ် ဖြည့်စွက်ပေးပါ');
      return;
    }

    let updatedList: PaymentAccount[] = [];

    if (isAddingNew) {
      const newAcc: PaymentAccount = {
        id: `acc-${Date.now()}`,
        provider,
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        qrCodeUrl: qrCodeUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        isActive,
      };
      updatedList = [...localAccounts, newAcc];
      showFeedback(`"${newAcc.accountName}" အကောင့်သစ်ကို အောင်မြင်စွာ ထည့်သွင်းသိမ်းဆည်းလိုက်ပါပြီ`);
    } else if (editingId) {
      updatedList = localAccounts.map((acc) =>
        acc.id === editingId
          ? {
              ...acc,
              provider,
              accountName: accountName.trim(),
              accountNumber: accountNumber.trim(),
              qrCodeUrl: qrCodeUrl.trim() || undefined,
              notes: notes.trim() || undefined,
              isActive,
            }
          : acc
      );
      showFeedback('အကောင့် အချက်အလက်နှင့် QR ပြင်ဆင်မှုကို သိမ်းဆည်းလိုက်ပါပြီ');
    }

    commitChanges(updatedList);
    setEditingId(null);
    setIsAddingNew(false);
  };

  const handleDelete = (id: string) => {
    const target = localAccounts.find((a) => a.id === id);
    const targetName = target ? target.accountName : 'ဤအကောင့်';
    if (confirm(`${targetName} (${target?.provider || 'အကောင့်'}) ကို ဖျက်ရန် သေချာပါသလား?`)) {
      const updated = localAccounts.filter((a) => a.id !== id);
      commitChanges(updated);
      showFeedback(`${targetName} ကို ဖျက်လိုက်ပါပြီ`);
      if (editingId === id) {
        setEditingId(null);
        setIsAddingNew(false);
      }
    }
  };

  const handleToggleActive = (id: string) => {
    const updated = localAccounts.map((a) =>
      a.id === id ? { ...a, isActive: !a.isActive } : a
    );
    commitChanges(updated);
    const item = updated.find((a) => a.id === id);
    showFeedback(
      item?.isActive
        ? `"${item.accountName}" အကောင့်အား ဝယ်သူများထံ ဖွင့်ပြထားပါသည်`
        : `"${item?.accountName}" အကောင့်အား ယာယီ ပိတ်ထားလိုက်ပါသည်`
    );
  };

  const handleCopyNumber = (num: string, id: string) => {
    navigator.clipboard.writeText(num);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl my-auto overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  ငွေပေးချေမှု နံပါတ် နှင့် Acc QR များ ပြင်ဆင်ရန်
                </h3>
                <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-black">
                  Admin Settings
                </span>
              </div>
              <p className="text-xs text-slate-400">
                KBZPay (KPay) နှင့် Wave Money (WavePay) အကောင့်နံပါတ် / QR Code များကို စိတ်ကြိုက် ပြင်ဆင်စီမံပါ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Banner */}
        {feedbackMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{feedbackMessage}</span>
            </div>
            <button onClick={() => setFeedbackMessage(null)} className="text-white/80 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Top Actions: Add New Account Button */}
          {!isAddingNew && !editingId && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs text-slate-700 font-medium">
                  စုစုပေါင်း KPay/Wave အကောင့်: <strong>{localAccounts.length} ခု</strong> (ဖွင့်ထားသော အကောင့်: <strong>{localAccounts.filter((a) => a.isActive).length} ခု</strong>)
                </span>
              </div>
              <button
                type="button"
                onClick={handleStartAdd}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>KPay / Wave အကောင့်သစ် ထည့်မည်</span>
              </button>
            </div>
          )}

          {/* Form: Add or Edit Payment Account */}
          {(isAddingNew || editingId) && (
            <form onSubmit={handleSaveForm} className="bg-amber-50/60 border-2 border-amber-300/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm animate-in fade-in">
              <div className="flex items-center justify-between border-b border-amber-200/80 pb-2.5">
                <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  <span>{isAddingNew ? 'KPay / Wave အကောင့်သစ် ထည့်သွင်းခြင်း' : 'KPay / Wave အကောင့် ပြင်ဆင်ခြင်း'}</span>
                </h4>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  ပိတ်မည်
                </button>
              </div>

              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ငွေပေးချေမှု အမျိုးအစား ရွေးချယ်ပါ (Payment Provider):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PROVIDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setProvider(opt.id)}
                      className={`p-3 rounded-xl text-xs font-bold border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        provider === opt.id
                          ? 'bg-slate-900 text-amber-300 border-slate-900 shadow-sm ring-2 ring-amber-400/40'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Smartphone className={`w-4 h-4 shrink-0 mt-0.5 ${opt.id === 'KBZPay' ? 'text-blue-500' : 'text-amber-500'}`} />
                      <div>
                        <span className="block font-bold text-sm">{opt.name}</span>
                        <span className={`text-[11px] font-normal ${provider === opt.id ? 'text-slate-300' : 'text-slate-500'}`}>{opt.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Name & Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    အကောင့်ပိုင်ရှင် အမည် (Account Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="ဥပမာ: ဦးကျော် (ထိုင်းထီဆိုင်)"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    အကောင့်နံပါတ် / ဖုန်းနံပါတ် (Account / Phone) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="ဥပမာ: 09791234567 သို့မဟုတ် 123-4-56789-0"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* QR Code Upload & Management */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>ငွေပေးချေမှု QR Code ပုံ (Payment QR Code)</span>
                  </label>
                  {qrCodeUrl && (
                    <button
                      type="button"
                      onClick={() => setQrCodeUrl('')}
                      className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                    >
                      QR ပုံ ဖျက်မည်
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  {/* QR Preview Box */}
                  <div className="flex flex-col items-center justify-center p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    {qrCodeUrl ? (
                      <div className="relative group cursor-pointer" onClick={() => setZoomedQr(qrCodeUrl)}>
                        <img
                          src={qrCodeUrl}
                          alt="QR Code Preview"
                          className="w-24 h-24 object-contain rounded-lg border border-slate-200 bg-white p-1 shadow-2xs"
                        />
                        <div className="absolute inset-0 bg-slate-950/60 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold">
                          <Eye className="w-3.5 h-3.5 mr-1" /> ချဲ့ကြည့်
                        </div>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-center p-1">
                        <QrCode className="w-6 h-6 mb-1 text-slate-300" />
                        <span className="text-[9px]">QR ပုံ မရှိပါ</span>
                      </div>
                    )}
                  </div>

                  {/* Upload & Auto-Gen Controls */}
                  <div className="sm:col-span-2 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleQrFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>ဖုန်း/ကွန်ပျူတာထဲမှ QR ပုံတင်မည်</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleGenerateDefaultQr}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>အလိုအလျောက် QR ထုတ်မည်</span>
                      </button>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={qrCodeUrl}
                        onChange={(e) => setQrCodeUrl(e.target.value)}
                        placeholder="သို့မဟုတ် QR ပုံ၏ Image URL လိပ်စာ ထည့်ပါ..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-800 focus:outline-none focus:bg-white focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Transfer Notes / Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ငွေလွှဲရန် ညွှန်ကြားချက် / မှတ်ချက် (Notes / Instructions):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ဥပမာ: KPay မှ ငွေလွှဲပြီးပါက ပြေစာ (Slip) အား ဖုန်း သို့မဟုတ် Viber သို့ ပို့ပေးပါရန်"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Active Toggle Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800">
                  ဤအကောင့်အား ဝယ်သူများထံ ဖွင့်ပြထားမည် (Active & Visible to Customers)
                </span>
              </label>

              {/* Form Action Buttons */}
              <div className="flex justify-end items-center gap-2 pt-2 border-t border-amber-200">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  မလုပ်တော့ပါ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{isAddingNew ? 'အကောင့်သစ် သိမ်းဆည်းမည်' : 'ပြင်ဆင်မှု သိမ်းဆည်းမည်'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Accounts List View */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              လက်ရှိ သတ်မှတ်ထားသော ငွေပေးချေမှု အကောင့်များ ({localAccounts.length} ခု):
            </h4>

            {localAccounts.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">ငွေပေးချေမှု အကောင့် မရှိသေးပါ</p>
                <p className="text-[11px] text-slate-500">အထက်ပါ "KPay / Wave အကောင့်သစ် ထည့်မည်" ခလုတ်ကို နှိပ်၍ KBZPay သို့မဟုတ် Wave Money ထည့်သွင်းပါ</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {localAccounts.map((acc) => {
                  const opt = PROVIDER_OPTIONS.find((p) => p.id === acc.provider) || PROVIDER_OPTIONS[0];
                  return (
                    <div
                      key={acc.id}
                      className={`relative rounded-2xl border transition-all p-4 flex flex-col justify-between ${
                        acc.isActive
                          ? 'bg-white border-slate-200/90 shadow-xs hover:border-slate-300'
                          : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div>
                        {/* Account Top Row */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${opt.badgeColor}`}>
                              {opt.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(acc.id)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-all ${
                                acc.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                              }`}
                            >
                              {acc.isActive ? '● အသုံးပြုဆဲ' : '○ ပိတ်ထား'}
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(acc)}
                              className="p-1.5 text-slate-500 hover:text-amber-700 bg-slate-100 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors"
                              title="ပြင်ဆင်ရန်"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(acc.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                              title="ဖျက်မည်"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Account Details & QR Section */}
                        <div className="flex items-center gap-3 mt-3">
                          {acc.qrCodeUrl ? (
                            <div
                              onClick={() => setZoomedQr(acc.qrCodeUrl!)}
                              className="relative group shrink-0 cursor-pointer"
                              title="QR Code ချဲ့ကြည့်ရန်"
                            >
                              <img
                                src={acc.qrCodeUrl}
                                alt="Acc QR"
                                className="w-16 h-16 object-contain rounded-xl border border-slate-200 bg-white p-1 shadow-2xs group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-slate-950/60 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[9px] font-bold">
                                <Eye className="w-3 h-3" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 shrink-0">
                              <QrCode className="w-6 h-6 text-slate-300" />
                              <span className="text-[8px] text-slate-400">QR မရှိ</span>
                            </div>
                          )}

                          <div className="space-y-1 flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {acc.accountName}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-sm text-amber-900 tracking-wide">
                                {acc.accountNumber}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyNumber(acc.accountNumber, acc.id)}
                                className="text-slate-400 hover:text-emerald-600 p-0.5 transition-colors cursor-pointer"
                                title="နံပါတ် ကူးယူမည်"
                              >
                                {copiedId === acc.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            {acc.notes && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                                {acc.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500">
            * ဤအကောင့်များကို ဝယ်ယူသူများ ထီထိုးသည့်အခါ ငွေလွှဲနိုင်ရန် အလိုအလျောက် ပြသပေးမည် ဖြစ်ပါသည်။
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            ပြီးပါပြီ (Done)
          </button>
        </div>
      </div>

      {/* Fullscreen QR Lightbox */}
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

