import React, { useState, useRef } from 'react';
import {
  Ticket,
  Coins,
  QrCode,
  Calendar,
  Trash2,
  ShieldCheck,
  Eye,
  RefreshCw,
  Plus,
  Check,
  AlertTriangle,
  KeyRound,
  UserCheck,
  Save,
  CreditCard,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Upload,
  Layers,
  Archive,
  Info,
  ArrowLeft,
  Edit3,
  Search,
} from 'lucide-react';
import {
  UserRole,
  AdminUser,
  PaymentAccount,
  PaymentAccountProvider,
  Ticket as TicketType,
  SaleRecord,
  AppTab,
} from '../types';

interface SettingsPageProps {
  fixedTicketPriceMMK: number;
  onUpdateFixedTicketPrice: (newPrice: number, applyToAllAvailable: boolean) => void;
  exchangeRate: number;
  setExchangeRate: (rate: number) => void;
  onAutoFetchRate: () => Promise<void>;
  isFetchingRate?: boolean;
  paymentAccounts: PaymentAccount[];
  onUpdatePaymentAccounts: (accounts: PaymentAccount[]) => void;
  selectedDrawDate: string;
  setSelectedDrawDate: (date: string) => void;
  drawDates: string[];
  archivedDrawDates: string[];
  onArchiveDrawDate: (drawDateToArchive: string, newDrawDate: string) => void;
  onUnarchiveDrawDate: (drawDate: string) => void;
  admins: AdminUser[];
  activeAdminId: string;
  setActiveAdminId: (id: string) => void;
  onUpdateAdmins: (admins: AdminUser[]) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  tickets: TicketType[];
  setTickets: React.Dispatch<React.SetStateAction<TicketType[]>>;
  sales: SaleRecord[];
  setSales: React.Dispatch<React.SetStateAction<SaleRecord[]>>;
  onResetData: () => void;
  onResetAllSalesAndDebts?: () => void;
  onDeleteAllTickets?: () => void;
  onDeleteSoldTickets?: () => void;
  onEditTicket?: (ticket: TicketType) => void;
  onNavigateTab: (tab: AppTab) => void;
  onOpenAddModal: () => void;
  showToast: (msg: string) => void;
}

type SettingsSection = 'pricing' | 'payments' | 'draws' | 'cleanup' | 'admins';

export const SettingsPage: React.FC<SettingsPageProps> = ({
  fixedTicketPriceMMK,
  onUpdateFixedTicketPrice,
  exchangeRate,
  setExchangeRate,
  onAutoFetchRate,
  isFetchingRate = false,
  paymentAccounts,
  onUpdatePaymentAccounts,
  selectedDrawDate,
  setSelectedDrawDate,
  drawDates,
  archivedDrawDates,
  onArchiveDrawDate,
  onUnarchiveDrawDate,
  admins,
  activeAdminId,
  setActiveAdminId,
  onUpdateAdmins,
  userRole,
  setUserRole,
  tickets,
  setTickets,
  sales,
  setSales,
  onResetData,
  onResetAllSalesAndDebts,
  onDeleteAllTickets,
  onDeleteSoldTickets,
  onEditTicket,
  onNavigateTab,
  onOpenAddModal,
  showToast,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('pricing');

  // Ticket Pricing state
  const [priceInput, setPriceInput] = useState(fixedTicketPriceMMK.toString());
  const [applyToAll, setApplyToAll] = useState(true);

  // Exchange rate state
  const [rateInput, setRateInput] = useState(exchangeRate.toString());

  // Payment account editing modal state
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [accProvider, setAccProvider] = useState<PaymentAccountProvider>('KBZPay');
  const [accName, setAccName] = useState('');
  const [accNumber, setAccNumber] = useState('');
  const [accQr, setAccQr] = useState('');
  const [accNotes, setAccNotes] = useState('');
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  // Draw Cycle creation state
  const [newDrawDateInput, setNewDrawDateInput] = useState('');
  const [archiveCurrentOnCreate, setArchiveCurrentOnCreate] = useState(true);

  // Admin PIN management state
  const [editingAdmins, setEditingAdmins] = useState<AdminUser[]>(admins);

  React.useEffect(() => {
    setPriceInput(fixedTicketPriceMMK.toString());
  }, [fixedTicketPriceMMK]);

  React.useEffect(() => {
    setRateInput(exchangeRate.toString());
  }, [exchangeRate]);

  React.useEffect(() => {
    setEditingAdmins(admins);
  }, [admins]);

  // Confirmation Modals
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);
  const [confirmDeleteSoldOpen, setConfirmDeleteSoldOpen] = useState(false);
  const [confirmResetSalesOpen, setConfirmResetSalesOpen] = useState(false);
  const [confirmRestoreDefaultOpen, setConfirmRestoreDefaultOpen] = useState(false);
  const [cleanupSearchQuery, setCleanupSearchQuery] = useState('');

  // Save Pricing
  const handleSavePrice = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(priceInput);
    if (!isNaN(val) && val > 0) {
      onUpdateFixedTicketPrice(val, applyToAll);
      showToast(`ထီ ၁ စောင် သတ်မှတ်ရောင်းစျေးကို ${val.toLocaleString('en-US')} MMK သို့ သိမ်းဆည်းလိုက်ပါပြီ`);
    }
  };

  // Save Rate
  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(rateInput);
    if (!isNaN(val) && val > 0) {
      setExchangeRate(val);
      showToast(`ဘတ်ငွေလဲလှယ်နှုန်း (1 THB = ${val} MMK) သို့ ပြင်ဆင်ပြီးပါပြီ`);
    }
  };

  // Save Admin changes
  const handleSaveAdmins = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAdmins(editingAdmins);
    showToast('အက်ဒမင် ၃ ဦး စာရင်းနှင့် PIN နံပါတ်များကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ');
  };

  // Payment Account Handlers
  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accNumber.trim()) {
      alert('အကောင့်/ဖုန်းနံပါတ် ဖြည့်သွင်းပေးပါ');
      return;
    }

    if (isAddingAccount) {
      const newAcc: PaymentAccount = {
        id: `acc-${Date.now()}`,
        provider: accProvider,
        accountName: accName || (accProvider === 'KBZPay' ? 'KPay User' : 'Wave User'),
        accountNumber: accNumber.trim(),
        qrCodeUrl: accQr || undefined,
        notes: accNotes.trim() || undefined,
        isActive: true,
      };
      onUpdatePaymentAccounts([...paymentAccounts, newAcc]);
      showToast('ငွေလွှဲအကောင့် အသစ် ထည့်သွင်းပြီးပါပြီ');
    } else if (editingAccount) {
      const updated = paymentAccounts.map((a) =>
        a.id === editingAccount.id
          ? {
              ...a,
              provider: accProvider,
              accountName: accName,
              accountNumber: accNumber.trim(),
              qrCodeUrl: accQr || undefined,
              notes: accNotes.trim() || undefined,
            }
          : a
      );
      onUpdatePaymentAccounts(updated);
      showToast('ငွေလွှဲအကောင့် အချက်အလက် ပြင်ဆင်သိမ်းဆည်းပြီးပါပြီ');
    }

    setIsAddingAccount(false);
    setEditingAccount(null);
  };

  const handleToggleAccountActive = (id: string) => {
    const updated = paymentAccounts.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a));
    onUpdatePaymentAccounts(updated);
  };

  const handleDeleteAccount = (id: string) => {
    if (confirm('ဤငွေလွှဲအကောင့်ကို ဖျက်ရန် သေချာပါသလား?')) {
      const updated = paymentAccounts.filter((a) => a.id !== id);
      onUpdatePaymentAccounts(updated);
      showToast('ငွေလွှဲအကောင့် ဖျက်ပြီးပါပြီ');
    }
  };

  // Handle QR upload as Data URI
  const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAccQr(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Delete All Tickets Handler (Requested by User)
  const handleDeleteAllTickets = () => {
    if (onDeleteAllTickets) {
      onDeleteAllTickets();
    } else {
      setTickets([]);
      localStorage.setItem('tl_tickets', JSON.stringify([]));
      showToast('ထီလက်မှတ် အဟောင်းများ အားလုံးကို အောင်မြင်စွာ ဖျက်ပစ်လိုက်ပါပြီ');
    }
    setConfirmDeleteAllOpen(false);
  };

  // Delete Only Sold Tickets
  const handleDeleteSoldTickets = () => {
    if (onDeleteSoldTickets) {
      onDeleteSoldTickets();
    } else {
      const filtered = tickets.filter((t) => t.status === 'available');
      setTickets(filtered);
      localStorage.setItem('tl_tickets', JSON.stringify(filtered));
      showToast('ရောင်းပြီးသား ထီလက်မှတ်များကို ဖျက်ပြီး အသင့်ရှိ လက်မှတ်များကိုသာ ချန်ထားပေးပါသည်');
    }
    setConfirmDeleteSoldOpen(false);
  };

  // Start New Draw Round
  const handleCreateNewDrawRound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrawDateInput.trim()) {
      alert('ထီဖွင့်ရက် အသစ် ဖြည့်သွင်းပေးပါ (ဥပမာ: 2026-09-01)');
      return;
    }

    if (archiveCurrentOnCreate && selectedDrawDate !== 'all') {
      onArchiveDrawDate(selectedDrawDate, newDrawDateInput.trim());
    } else {
      setSelectedDrawDate(newDrawDateInput.trim());
      showToast(`ထီဖွင့်ရက် အသစ် (${newDrawDateInput.trim()}) သို့ ပြောင်းလဲသတ်မှတ်ပြီးပါပြီ`);
    }
    setNewDrawDateInput('');
  };

  const activeAdmin = admins.find((a) => a.id === activeAdminId) || admins[0];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-in fade-in-50 duration-200">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>အက်ဒမင် စီမံခန့်ခွဲမှု ဆက်တင်များ (Admin Configuration)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              စနစ် ဆက်တင်များ နှင့် စျေးနှုန်းများ ပြင်ဆင်ရန်
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              ထိုင်းထီ ၁ စောင် သတ်မှတ်ရောင်းစျေး၊ ဘတ်ငွေလဲနှုန်း၊ ငွေလွှဲအကောင့် QR များ၊ ထီဖွင့်ရက် အလှည့်များနှင့် ထီစာရင်း အဟောင်းများ ဖျက်ပစ်ခြင်းတို့ကို တစ်နေရာတည်းတွင် စိတ်ကြိုက် ပြင်ဆင်နိုင်ပါသည်။
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => onNavigateTab('inventory')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
              title="ပင်မ ထီစာရင်း စာမျက်နှာသို့ ပြန်သွားမည်"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>ပင်မစာမျက်နှာ (Back)</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('self-select')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>ဝယ်သူမုဒ်သို့ ကြည့်မည်</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('inventory')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Ticket className="w-4 h-4" />
              <span>ထီစာရင်းသို့ သွားမည်</span>
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1.5 mt-6 pt-4 border-t border-slate-800/80 overflow-x-auto no-scrollbar">
          {[
            { id: 'pricing', label: 'စျေးနှုန်း & ဘတ်ငွေလဲနှုန်း', icon: Coins },
            { id: 'payments', label: 'ငွေလွှဲ Acc & QR စီမံရန်', icon: QrCode },
            { id: 'draws', label: 'ထီဖွင့်ရက် & ပွဲသစ်', icon: Calendar },
            { id: 'cleanup', label: 'ထီဟောင်းများ ဖျက်ရန် / စာရင်းရှင်းရန်', icon: Trash2 },
            { id: 'admins', label: 'Admin ၃ ဦး & PIN', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id as SettingsSection)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: TICKET PRICING & EXCHANGE RATE */}
      {activeSection === 'pricing' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fixed Ticket Price Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">ထိုင်းထီ ၁ စောင် သတ်မှတ်ရောင်းစျေး</h3>
                  <p className="text-xs text-slate-500">Fixed Selling Price per Ticket in MMK</p>
                </div>
              </div>
              <span className="bg-emerald-50 text-emerald-800 font-mono font-black text-sm px-3 py-1 rounded-xl border border-emerald-200">
                {fixedTicketPriceMMK.toLocaleString('en-US')} MMK
              </span>
            </div>

            <form onSubmit={handleSavePrice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ရောင်းစျေး သတ်မှတ်ပါ (ကျပ်ငွေ MMK)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-lg font-mono font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="15000"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    MMK
                  </span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500">လျင်မြန်စွာ ရွေးချယ်နိုင်သော စျေးနှုန်းများ:</span>
                <div className="flex flex-wrap gap-2">
                  {[12000, 13000, 15000, 16000, 18000, 20000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPriceInput(preset.toString())}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                        priceInput === preset.toString()
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset.toLocaleString('en-US')} Ks
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="applyToAllTickets"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                />
                <label htmlFor="applyToAllTickets" className="text-xs text-amber-950 font-medium cursor-pointer">
                  <strong>လက်ရှိ အသင့်ရှိ ထီလက်မှတ်များအားလုံး</strong> ၏ ရောင်းစျေးကို ဤသတ်မှတ်စျေးအတိုင်း အလိုအလျောက် ပြောင်းလဲသတ်မှတ်မည်။
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                <span>သတ်မှတ်ရောင်းစျေး သိမ်းဆည်းမည်</span>
              </button>
            </form>
          </div>

          {/* Exchange Rate Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">ထိုင်းဘတ်ငွေ လဲလှယ်နှုန်း (Exchange Rate)</h3>
                  <p className="text-xs text-slate-500">Thai Baht to Myanmar Kyat Rate</p>
                </div>
              </div>
              <span className="bg-amber-50 text-amber-900 font-mono font-black text-sm px-3 py-1 rounded-xl border border-amber-200">
                1 ฿ = {exchangeRate} MMK
              </span>
            </div>

            <form onSubmit={handleSaveRate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1 Baht (ဘတ်) လျှင် ကျပ်ငွေ (MMK)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="any"
                      value={rateInput}
                      onChange={(e) => setRateInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-lg font-mono font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      placeholder="120"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      MMK
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await onAutoFetchRate();
                    }}
                    disabled={isFetchingRate}
                    className="px-4 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black rounded-2xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition-all"
                    title="ယနေ့ ပေါက်စျေး တိုက်ရိုက် ရယူမည်"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetchingRate ? 'animate-spin' : ''}`} />
                    <span>{isFetchingRate ? 'ရယူနေဆဲ...' : 'Live Rate ရယူ'}</span>
                  </button>
                </div>
              </div>

              {/* Realtime Live Conversion Preview */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>ဘတ်စျေးနှုန်း တွက်ချက်မှု နမူနာများ:</span>
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">80 ฿</span>
                    <strong className="font-mono text-slate-800 font-bold">{(80 * exchangeRate).toLocaleString('en-US')} Ks</strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">100 ฿</span>
                    <strong className="font-mono text-slate-800 font-bold">{(100 * exchangeRate).toLocaleString('en-US')} Ks</strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">110 ฿</span>
                    <strong className="font-mono text-slate-800 font-bold">{(110 * exchangeRate).toLocaleString('en-US')} Ks</strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">220 ฿ (၂ စောင်)</span>
                    <strong className="font-mono text-emerald-700 font-bold">{(220 * exchangeRate).toLocaleString('en-US')} Ks</strong>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                <span>ဘတ်လဲနှုန်း ပြင်ဆင်သိမ်းဆည်းမည်</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SECTION 2: PAYMENT ACCOUNTS & QR CODES */}
      {activeSection === 'payments' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-600" />
                <span>ငွေပေးချေမှု အကောင့်များနှင့် QR Code များ စီမံရန်</span>
              </h3>
              <p className="text-xs text-slate-500">
                ဝယ်သူများ ထီလက်မှတ် ရွေးချယ်ပြီးပါက ငွေလွှဲပေးချေရန် ပြသပေးမည့် KBZPay, WaveMoney အကောင့်များနှင့် QR ပုံများ
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setAccProvider('KBZPay');
                setAccName('');
                setAccNumber('');
                setAccQr('');
                setAccNotes('');
                setIsAddingAccount(true);
                setEditingAccount(null);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ အကောင့်အသစ် ထည့်မည်</span>
            </button>
          </div>

          {/* Account Form Modal / Inline Form */}
          {(isAddingAccount || editingAccount) && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="font-bold text-sm text-slate-800">
                  {isAddingAccount ? '+ ငွေလွှဲအကောင့် အသစ် ထည့်သွင်းခြင်း' : 'ငွေလွှဲအကောင့် ပြင်ဆင်ခြင်း'}
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingAccount(false);
                    setEditingAccount(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  ပိတ်မည်
                </button>
              </div>

              <form onSubmit={handleSaveAccount} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ငွေလွှဲစနစ် ရွေးပါ</label>
                  <select
                    value={accProvider}
                    onChange={(e) => setAccProvider(e.target.value as PaymentAccountProvider)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="KBZPay">KBZPay (KPay)</option>
                    <option value="WaveMoney">Wave Money (WavePay)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">အကောင့်ပိုင်ရှင် အမည်</label>
                  <input
                    type="text"
                    value={accName}
                    onChange={(e) => setAccName(e.target.value)}
                    placeholder="ဦးကျော် (ထိုင်းထီဆိုင်)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">အကောင့် / ဖုန်းနံပါတ် *</label>
                  <input
                    type="text"
                    required
                    value={accNumber}
                    onChange={(e) => setAccNumber(e.target.value)}
                    placeholder="09791234567"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">QR Code ပုံ တင်ရန် (သို့မဟုတ် Image URL)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={accQr}
                      onChange={(e) => setAccQr(e.target.value)}
                      placeholder="https://... သို့မဟုတ် ပုံတင်ပါ"
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    />
                    <input
                      type="file"
                      ref={qrFileInputRef}
                      onChange={handleQrFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => qrFileInputRef.current?.click()}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>ပုံရွေး</span>
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">ညွှန်ကြားချက် / မှတ်ချက်</label>
                  <input
                    type="text"
                    value={accNotes}
                    onChange={(e) => setAccNotes(e.target.value)}
                    placeholder="ငွေလွှဲပြီးပါက ပြေစာ (Slip) အား ဖုန်း သို့မဟုတ် Viber သို့ ပို့ပေးပါရန်"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingAccount(false);
                      setEditingAccount(null);
                    }}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    မလုပ်တော့ပါ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm"
                  >
                    သိမ်းဆည်းမည်
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Accounts List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentAccounts.map((account) => {
              const isKpay = account.provider === 'KBZPay';
              return (
                <div
                  key={account.id}
                  className={`rounded-2xl p-4 border transition-all flex flex-col justify-between space-y-3 ${
                    account.isActive
                      ? isKpay
                        ? 'bg-blue-50/50 border-blue-200'
                        : 'bg-amber-50/50 border-amber-200'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isKpay ? 'bg-blue-600 text-white' : 'bg-amber-500 text-slate-950 font-black'
                        }`}
                      >
                        {isKpay ? 'KPay' : 'Wave'}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{account.accountName}</span>
                        <span className="text-sm font-mono font-black text-slate-800 block">
                          {account.accountNumber}
                        </span>
                        {account.notes && <p className="text-[11px] text-slate-500">{account.notes}</p>}
                      </div>
                    </div>

                    {account.qrCodeUrl && (
                      <img
                        src={account.qrCodeUrl}
                        alt="QR Code"
                        className="w-12 h-12 rounded-lg border border-slate-300 object-cover"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-2.5">
                    <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={account.isActive}
                        onChange={() => handleToggleAccountActive(account.id)}
                        className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer"
                      />
                      <span>{account.isActive ? 'အသုံးပြုနေသည်' : 'ပိတ်ထားသည်'}</span>
                    </label>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAccount(account);
                          setAccProvider(account.provider);
                          setAccName(account.accountName);
                          setAccNumber(account.accountNumber);
                          setAccQr(account.qrCodeUrl || '');
                          setAccNotes(account.notes || '');
                          setIsAddingAccount(false);
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        ပြင်မည်
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAccount(account.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 bg-white border border-slate-200 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: DRAW CYCLES & DATES */}
      {activeSection === 'draws' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <span>ထီဖွင့်ရက် အလှည့်များနှင့် ပွဲသစ်ဖွင့်လှစ်ခြင်း</span>
            </h3>
            <p className="text-xs text-slate-500">
              လက်ရှိ ရောင်းချနေသော ထီဖွင့်ရက် အလှည့် ရွေးချယ်ခြင်းနှင့် ထီဖွင့်ရက်အသစ် (ပွဲသစ်) ဖွင့်လှစ်ခြင်း
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Active Draw Date Selector */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
              <h4 className="font-bold text-sm text-slate-800">လက်ရှိ ရွေးချယ်ထားသော ထီဖွင့်ရက်</h4>
              
              <div className="flex items-center gap-3">
                <select
                  value={selectedDrawDate}
                  onChange={(e) => {
                    setSelectedDrawDate(e.target.value);
                    showToast(`လက်ရှိ ထီဖွင့်ရက်ကို ${e.target.value} သို့ ရွေးချယ်လိုက်ပါပြီ`);
                  }}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none"
                >
                  <option value="all">ရက်အားလုံး ကြည့်မည် (All Draws)</option>
                  {drawDates.map((d) => (
                    <option key={d} value={d}>
                      {d} {archivedDrawDates.includes(d) ? '(သိမ်းဆည်းထားပြီး)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-500">
                လက်ရှိ စာရင်းတွင် ရောင်းချနေသော ထီဖွင့်ရက်များ: <strong className="text-slate-800">{drawDates.join(', ')}</strong>
              </div>
            </div>

            {/* Start New Draw Round */}
            <div className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-200 space-y-4">
              <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>ထီဖွင့်ရက် အသစ် ဖွင့်လှစ်ခြင်း (ပွဲသစ်)</span>
              </h4>

              <form onSubmit={handleCreateNewDrawRound} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ထီဖွင့်ရက် အသစ် ရိုက်ထည့်ပါ (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    value={newDrawDateInput}
                    onChange={(e) => setNewDrawDateInput(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={archiveCurrentOnCreate}
                    onChange={(e) => setArchiveCurrentOnCreate(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-emerald-600"
                  />
                  <span>ယခင် ထီဖွင့်ရက်ဟောင်း ({selectedDrawDate}) ကို သိမ်းဆည်းမှတ်တမ်း (Archive) သို့ ရွှေ့မည်</span>
                </label>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm"
                >
                  ပွဲသစ် ဖွင့်လှစ်မည်
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: DATA CLEANUP & DELETE OLD TICKETS */}
      {activeSection === 'cleanup' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <span>ထီလက်မှတ် အဟောင်းများ ရှင်းလင်းခြင်းနှင့် ဒေတာစီမံခြင်း</span>
            </h3>
            <p className="text-xs text-slate-500">
              ထီလက်မှတ် စာရင်းအဟောင်းများ အကုန်ဖျက်ပစ်ခြင်း၊ ရောင်းပြီးသားများ ဖျက်ခြင်း သို့မဟုတ် ဒေတာအသစ် ပြန်စတင်ခြင်း
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Reset All Sales & Debts (User Requested) */}
            <div className="bg-rose-50/70 border border-rose-200 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-rose-950 text-sm">
                      အရောင်း & အကြွေး Reset ချမည်
                    </h4>
                    <p className="text-[11px] text-rose-700">
                      အရောင်းမှတ်တမ်း ({sales.length}) စောင် ရှင်းလင်းမည်
                    </p>
                  </div>
                </div>

                <p className="text-xs text-rose-900 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-rose-200">
                  အရောင်းမှတ်တမ်းနှင့် အကြွေးများကို ရှင်းလင်းပြီး လက်မှတ်များကို အသင့်ရောင်းနိုင်သောအခြေအနေသို့ ပြန်ထားပါမည်။
                </p>
              </div>

              <button
                type="button"
                onClick={() => setConfirmResetSalesOpen(true)}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>အရောင်း Reset ချမည်</span>
              </button>
            </div>

            {/* Card 2: Delete All Tickets */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      ထီလက်မှတ် အားလုံး ဖျက်မည်
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      လက်မှတ် ({tickets.length}) စောင် ဖျက်ပစ်မည်
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200">
                  ထီစာရင်းအဟောင်းများကို အကုန်ဖျက်ပြီး လက်မှတ်အသစ်များ အစမှ ပြန်လည်သွင်းလိုပါက သုံးနိုင်ပါသည်။
                </p>
              </div>

              <button
                type="button"
                onClick={() => setConfirmDeleteAllOpen(true)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ထီအားလုံး ဖျက်မည် ({tickets.length})</span>
              </button>
            </div>

            {/* Card 3: Delete Only Sold Tickets */}
            <div className="bg-amber-50/60 border border-amber-200 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0">
                    <Archive className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-950 text-sm">
                      ရောင်းပြီးသားသာ ဖျက်မည်
                    </h4>
                    <p className="text-[11px] text-amber-800">
                      ရောင်းပြီး လက်မှတ်များကိုသာ ဖယ်ထုတ်မည်
                    </p>
                  </div>
                </div>

                <p className="text-xs text-amber-900 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-amber-200">
                  ရောင်းပြီးသား လက်မှတ်များကို ရှင်းထုတ်ပြီး မရောင်းရသေးသည့် လက်မှတ်များကိုသာ ဆက်လက်ထားရှိပါမည်။
                </p>
              </div>

              <button
                type="button"
                onClick={() => setConfirmDeleteSoldOpen(true)}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>ရောင်းပြီးသားသာ ဖျက်မည်</span>
              </button>
            </div>

            {/* Card 4: Restore Default Demo Data */}
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-950 text-sm">
                      မူလ နမူနာဒေတာ ပြန်လည်ရယူရန်
                    </h4>
                    <p className="text-[11px] text-emerald-700">
                      Default Demo Data ပြန်ယူမည်
                    </p>
                  </div>
                </div>

                <p className="text-xs text-emerald-900 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                  စနစ်၏ မူလ နမူနာ ထီလက်မှတ်များနှင့် ဒေတာများကို Restore လုပ်၍ ပြန်လည် စတင်နိုင်ပါသည်။
                </p>
              </div>

              <button
                type="button"
                onClick={() => setConfirmRestoreDefaultOpen(true)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>မူလဒေတာ ပြန်ရယူမည် (Restore)</span>
              </button>
            </div>
          </div>

          {/* Quick Action: Add fresh tickets & Manage/Edit Tickets */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Info className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs text-slate-600 font-medium">
                ထီလက်မှတ် အသစ်များကို Batch စနစ်ဖြင့် အစောင်ရေများစွာ (သို့မဟုတ် Excel ကဲ့သို့ ကူးထည့်၍) လျင်မြန်စွာ ထည့်သွင်းနိုင်ပါသည်။
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onNavigateTab('inventory')}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>ထီစာရင်းသို့ သွားမည်</span>
              </button>
              <button
                type="button"
                onClick={onOpenAddModal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ ထီလက်မှတ် အသစ်သွင်းရန်</span>
              </button>
            </div>
          </div>

          {/* SUB-SECTION: QUICK EDIT & TICKET MANAGER TABLE */}
          {tickets.length > 0 && (
            <div className="border border-slate-200 rounded-2xl bg-white p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4 text-emerald-600" />
                    <span>ထီလက်မှတ်များ စာရင်းနှင့် အသေးစိတ် ပြင်ဆင်ရန် ({tickets.length} စောင်)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    ထီနံပါတ်၊ အတွဲ၊ စောင်တွဲ၊ ဈေးနှုန်း၊ ထွက်ရက်နှင့် ဓာတ်ပုံများကို ဤနေရာတွင်လည်း တိုက်ရိုက် Edit ပြင်ဆင်နိုင်ပါသည်
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={cleanupSearchQuery}
                    onChange={(e) => setCleanupSearchQuery(e.target.value)}
                    placeholder="နံပါတ်/အမှတ်အသား ရှာပါ..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {tickets
                  .filter((t) => {
                    if (!cleanupSearchQuery.trim()) return true;
                    const q = cleanupSearchQuery.trim().toLowerCase();
                    return (
                      t.number.includes(q) ||
                      (t.serialCode && t.serialCode.toLowerCase().includes(q)) ||
                      (t.seriesNumber && t.seriesNumber.toLowerCase().includes(q)) ||
                      (t.drawDate && t.drawDate.includes(q))
                    );
                  })
                  .slice(0, 30)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="bg-slate-900 text-amber-300 font-mono font-bold px-2 py-0.5 rounded text-sm tracking-wider border border-slate-800">
                          {t.number}
                        </div>

                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          {t.serialCode && (
                            <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-1.5 py-0.5 rounded border border-slate-200">
                              🔖 {t.serialCode}
                            </span>
                          )}
                          <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                            {t.setCount || 1} စောင်တွဲ
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            ထွက်ရက်: {t.drawDate || '16-08-2026'}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              t.status === 'available'
                                ? 'bg-emerald-100 text-emerald-800'
                                : t.status === 'reserved'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {t.status === 'available' ? 'အသင့်ရှိ' : t.status === 'reserved' ? 'ယာယီစစ်ဆဲ' : 'ရောင်းပြီး'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {onEditTicket && (
                          <button
                            type="button"
                            onClick={() => onEditTicket(t)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-200 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>ပြင်မည် (Edit)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: ADMIN ACCOUNTS & PIN */}
      {activeSection === 'admins' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-500" />
              <span>အက်ဒမင် ၃ ဦး စာရင်းနှင့် လုံခြုံရေး PIN နံပါတ်များ ပြင်ဆင်ရန်</span>
            </h3>
            <p className="text-xs text-slate-500">
              ဆိုင်ရှင် (Owner)၊ မန်နေဂျာ (Manager) နှင့် အက်ဒမင် (Admin) တို့၏ အမည်နှင့် လျှို့ဝှက် ၄ လုံး PIN ကို ပြင်ဆင်ပါ
            </p>
          </div>

          <form onSubmit={handleSaveAdmins} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {editingAdmins.map((admin, idx) => (
                <div
                  key={admin.id}
                  className={`rounded-2xl p-5 border space-y-3 transition-all ${
                    admin.id === activeAdminId
                      ? 'bg-amber-50/50 border-amber-300 shadow-xs'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                      {admin.roleName}
                    </span>
                    {admin.id === activeAdminId && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        လက်ရှိ အသုံးပြုနေသူ
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">အမည်</label>
                    <input
                      type="text"
                      value={admin.name}
                      onChange={(e) => {
                        const updated = [...editingAdmins];
                        updated[idx] = { ...updated[idx], name: e.target.value };
                        setEditingAdmins(updated);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">၄ လုံး လျှို့ဝှက် PIN</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={admin.pin}
                      onChange={(e) => {
                        const updated = [...editingAdmins];
                        updated[idx] = { ...updated[idx], pin: e.target.value.replace(/\D/g, '').slice(0, 4) };
                        setEditingAdmins(updated);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-900 focus:outline-none text-center tracking-widest"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveAdminId(admin.id);
                      showToast(`လက်ရှိ အက်ဒမင်ကို (${admin.name}) သို့ ပြောင်းလဲလိုက်ပါပြီ`);
                    }}
                    className={`w-full py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      admin.id === activeAdminId
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    }`}
                  >
                    {admin.id === activeAdminId ? '✓ လက်ရှိ ရွေးထားသည်' : 'ဤအကောင့်ဖြင့် သုံးမည်'}
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                <span>အက်ဒမင် အချက်အလက်နှင့် PIN များ အားလုံး သိမ်းဆည်းမည်</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRMATION MODAL: RESET ALL SALES & DEBTS */}
      {confirmResetSalesOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-rose-200 space-y-4 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold mx-auto">
              <RefreshCw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-lg font-bold text-slate-900">အရောင်းနှင့် အကြွေးစာရင်းများ Reset ချမည်</h4>
              <p className="text-xs text-slate-600">
                ရောင်းရငွေ စာရင်း၊ အကြွေးစာရင်းများနှင့် ဝယ်ယူသူမှတ်တမ်း <strong>{sales.length}</strong> စောင်စလုံးကို ရှင်းလင်းပြီး ရောင်းထားသော ထီလက်မှတ်များကို အသင့်ရောင်းနိုင်သော လက်မှတ်များအဖြစ် ပြန်လည်ထားရှိပါမည်။
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetSalesOpen(false)}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                မလုပ်တော့ပါ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onResetAllSalesAndDebts) {
                    onResetAllSalesAndDebts();
                  } else {
                    setSales([]);
                    const resetTickets = tickets.map((t) => ({ ...t, status: 'available' as const }));
                    setTickets(resetTickets);
                    localStorage.setItem('tl_sales', JSON.stringify([]));
                    localStorage.setItem('tl_tickets', JSON.stringify(resetTickets));
                    showToast('အရောင်းနှင့် အကြွေးမှတ်တမ်းများ အားလုံးကို Reset ချပြီးပါပြီ');
                  }
                  setConfirmResetSalesOpen(false);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
              >
                သေချာသည်၊ Reset ချမည်
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE ALL TICKETS */}
      {confirmDeleteAllOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-rose-200 space-y-4 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-lg font-bold text-slate-900">ထီလက်မှတ် အဟောင်းများ အားလုံး ဖျက်မည်</h4>
              <p className="text-xs text-slate-600">
                လက်ရှိ စာရင်းထဲတွင် ရှိနေသော ထီလက်မှတ် <strong>{tickets.length}</strong> စောင်စလုံးကို ဖျက်ပစ်ပါမည်။ ဤလုပ်ဆောင်ချက်ကို ပြန်လည်ပြင်ဆင်၍ မရပါ။
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteAllOpen(false)}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                မဖျက်တော့ပါ
              </button>
              <button
                type="button"
                onClick={handleDeleteAllTickets}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
              >
                သေချာသည်၊ ဖျက်မည်
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE SOLD TICKETS */}
      {confirmDeleteSoldOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-amber-200 space-y-4 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold mx-auto">
              <Archive className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-lg font-bold text-slate-900">ရောင်းပြီးသား လက်မှတ်များသာ ဖျက်မည်</h4>
              <p className="text-xs text-slate-600">
                ရောင်းပြီး (Sold) လက်မှတ်များကိုသာ ဖျက်ထုတ်ပြီး မရောင်းရသေးသော လက်မှတ်များကိုသာ ထီစာရင်းတွင် ဆက်လက်ချန်ထားပါမည်။
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteSoldOpen(false)}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                မဖျက်တော့ပါ
              </button>
              <button
                type="button"
                onClick={handleDeleteSoldTickets}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow-md"
              >
                ဖျက်မည်
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: RESTORE DEFAULT DEMO DATA */}
      {confirmRestoreDefaultOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-emerald-200 space-y-4 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-lg font-bold text-slate-900">မူလ နမူနာဒေတာ ပြန်လည်ရယူမည်</h4>
              <p className="text-xs text-slate-600">
                စနစ်၏ မူလ နမူနာ ထီလက်မှတ်များနှင့် ဒေတာများကို Restore ပြန်လည် ဆောင်ရွက်ပါမည်။ ဆက်လက်လုပ်ဆောင်လိုပါသလား?
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRestoreDefaultOpen(false)}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                မလုပ်တော့ပါ
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetData();
                  setConfirmRestoreDefaultOpen(false);
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Restore ပြုလုပ်မည်</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
