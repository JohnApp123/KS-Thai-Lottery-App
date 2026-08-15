import React, { useState } from 'react';
import { Ticket, ShoppingBag, Users, Trophy, Plus, RefreshCw, Coins, Sparkles, Check, X, ArrowUpRight, Lock, ShieldCheck, PhoneCall, KeyRound, UserCheck, Eye, Settings, Edit3, BarChart3, Calendar, Archive, QrCode, CreditCard, Search, Cloud, CloudCheck, Wifi } from 'lucide-react';
import { AppTab, UserRole, AdminUser, Ticket as TicketType, SaleRecord } from '../types';
import { SyncStatus } from '../services/supabaseSync';
import { GlobalSearchBar } from './GlobalSearchBar';

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onOpenAddModal: () => void;
  selectedDrawDate: string;
  setSelectedDrawDate: (date: string) => void;
  drawDates: string[];
  archivedDrawDates?: string[];
  onOpenDrawCycleModal?: () => void;
  onOpenPaymentAccountsModal?: () => void;
  onResetData: () => void;
  exchangeRate: number;
  setExchangeRate: (rate: number) => void;
  onAutoFetchRate: () => Promise<void>;
  isFetchingRate?: boolean;
  fixedTicketPriceMMK: number;
  onUpdateFixedTicketPrice: (newPrice: number, applyToAllAvailable: boolean) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  admins: AdminUser[];
  activeAdminId: string;
  setActiveAdminId: (id: string) => void;
  onUpdateAdmins: (updatedAdmins: AdminUser[]) => void;
  tickets?: TicketType[];
  sales?: SaleRecord[];
  onSellSingle?: (ticket: TicketType) => void;
  onViewReceipt?: (sale: SaleRecord) => void;
  onViewBuyer?: (ticket: TicketType) => void;
  onVerifyReservation?: (ticket: TicketType) => void;
  syncStatus?: SyncStatus;
  onManualCloudSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  selectedDrawDate,
  setSelectedDrawDate,
  drawDates,
  archivedDrawDates = [],
  onOpenDrawCycleModal,
  onOpenPaymentAccountsModal,
  onResetData,
  exchangeRate,
  setExchangeRate,
  onAutoFetchRate,
  isFetchingRate = false,
  fixedTicketPriceMMK,
  onUpdateFixedTicketPrice,
  userRole,
  setUserRole,
  admins,
  activeAdminId,
  setActiveAdminId,
  onUpdateAdmins,
  tickets = [],
  sales = [],
  onSellSingle,
  onViewReceipt,
  onViewBuyer,
  onVerifyReservation,
  syncStatus = 'connected',
  onManualCloudSync,
}) => {
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'ticketPrice' | 'exchangeRate'>('ticketPrice');
  const [tempFixedPriceInput, setTempFixedPriceInput] = useState(fixedTicketPriceMMK.toString());
  const [applyToAllAvailable, setApplyToAllAvailable] = useState(true);
  const [tempRateInput, setTempRateInput] = useState(exchangeRate.toString());
  
  // Admin Login modal state
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string>(activeAdminId || admins[0]?.id || 'admin-1');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Admin Management modal state
  const [manageAdminsOpen, setManageAdminsOpen] = useState(false);
  const [editingAdmins, setEditingAdmins] = useState<AdminUser[]>(admins);

  React.useEffect(() => {
    setEditingAdmins(admins);
  }, [admins]);

  React.useEffect(() => {
    setTempFixedPriceInput(fixedTicketPriceMMK.toString());
  }, [fixedTicketPriceMMK]);

  React.useEffect(() => {
    setTempRateInput(exchangeRate.toString());
  }, [exchangeRate]);

  const activeAdmin = admins.find((a) => a.id === activeAdminId) || admins[0];

  const handleSavePriceAndRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeSettingsTab === 'ticketPrice') {
      const parsedPrice = parseFloat(tempFixedPriceInput);
      if (!isNaN(parsedPrice) && parsedPrice > 0) {
        onUpdateFixedTicketPrice(parsedPrice, applyToAllAvailable);
        setRateModalOpen(false);
      }
    } else {
      const parsedRate = parseFloat(tempRateInput);
      if (!isNaN(parsedRate) && parsedRate > 0) {
        setExchangeRate(parsedRate);
        setRateModalOpen(false);
      }
    }
  };

  const handleSelectPricePreset = (preset: number) => {
    setTempFixedPriceInput(preset.toString());
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetAdmin = admins.find((a) => a.id === selectedAdminId);
    if (targetAdmin && pinInput === targetAdmin.pin) {
      setActiveAdminId(targetAdmin.id);
      setUserRole('admin');
      setPinModalOpen(false);
      setPinInput('');
      setPinError('');
    } else {
      setPinError(`${targetAdmin?.name || 'အက်ဒမင်'} ၏ PIN နံပါတ် မှားယွင်းနေပါသည်။`);
    }
  };

  const handleSaveAdminEdits = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAdmins(editingAdmins);
    setManageAdminsOpen(false);
    alert('အက်ဒမင် ၃ ဦး အချက်အလက်နှင့် PIN နံပါတ်များကို ပြင်ဆင်ပြီးပါပြီ။');
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        {/* Top bar with branding & quick actions */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500 text-slate-950 font-black text-lg sm:text-xl flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <span>ထီ</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                  ထိုင်းထီ အရောင်းစနစ်
                </h1>
                {/* Mode Indicator Badge */}
                {userRole === 'admin' ? (
                  <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    <span>👑 {activeAdmin.name}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                    <UserCheck className="w-3 h-3 text-emerald-400" />
                    <span>ဝယ်သူမုဒ်</span>
                  </span>
                )}

                {/* Supabase Cloud Sync Status Badge */}
                <button
                  type="button"
                  onClick={onManualCloudSync}
                  title="Supabase Database Real-time Sync (နှိပ်၍ Data ပြန်လည် Refresh လုပ်နိုင်ပါသည်)"
                  className="inline-flex items-center gap-1 bg-sky-500/15 text-sky-300 border border-sky-500/30 hover:bg-sky-500/25 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 transition-all cursor-pointer"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : syncStatus === 'syncing' ? 'bg-amber-400 animate-spin' : 'bg-sky-400'}`} />
                  <span className="hidden xs:inline">Supabase Sync</span>
                  <span className="xs:hidden">Sync</span>
                </button>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium hidden sm:block">
                Thai Lottery Sales & Management System
              </p>
            </div>
          </div>

          {/* Clean Quick Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Draw Date Quick Selector */}
            <div className="hidden md:flex items-center bg-slate-800 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs shadow-xs">
              <span className="text-slate-400 mr-1.5 whitespace-nowrap font-medium text-[11px]">ဖွင့်ရက်:</span>
              <select
                value={selectedDrawDate}
                onChange={(e) => setSelectedDrawDate(e.target.value)}
                className="bg-transparent text-emerald-400 font-bold focus:outline-none cursor-pointer text-xs"
              >
                <option value="all" className="bg-slate-800 text-white">ရက်အားလုံး</option>
                {drawDates.map((d) => (
                  <option key={d} value={d} className="bg-slate-800 text-white">
                    {d} {archivedDrawDates.includes(d) ? '(သိမ်းဆည်းပြီး)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Admin-only Add New Ticket Quick Button */}
            {userRole === 'admin' && (
              <button
                type="button"
                onClick={onOpenAddModal}
                className="px-2.5 sm:px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden xs:inline">+ ထီလက်မှတ် သွင်း</span>
                <span className="xs:hidden">ထီသွင်း</span>
              </button>
            )}

            {/* Dedicated Settings Button */}
            {userRole === 'admin' ? (
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  activeTab === 'settings'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-amber-400/50'
                }`}
                title="စျေးနှုန်း၊ ဘတ်ငွေလဲနှုန်း၊ ငွေလွှဲအကောင့်၊ ထီဖွင့်ရက် နှင့် စနစ် ဆက်တင်များ ပြင်ဆင်ရန်"
              >
                <Settings className={`w-3.5 h-3.5 ${activeTab === 'settings' ? 'text-slate-950 animate-spin-slow' : 'text-amber-400'}`} />
                <span className="hidden sm:inline">ဆက်တင်</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPinInput('');
                  setPinError('');
                  setPinModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-2.5 sm:px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer shadow-md"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">အက်ဒမင် ဝင်မည်</span>
                <span className="xs:hidden">Admin</span>
              </button>
            )}

            {/* Role Switcher for Admin -> Customer */}
            {userRole === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  setUserRole('customer');
                  setActiveTab('self-select');
                }}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer"
                title="ဝယ်ယူသူ မုဒ်သို့ ပြောင်းလဲကြည့်ရှုမည်"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">ဝယ်သူမုဒ်</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs & Global Search Bar */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-2 sm:gap-3">
          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
            {/* Customer Main Tab: Self Selection */}
            <button
              onClick={() => setActiveTab('self-select')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'self-select'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs font-bold'
                  : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>ထီရွေးဝယ်မည်</span>
            </button>

            {/* Customer Tab: My Orders / Lookup */}
            <button
              onClick={() => setActiveTab('my-orders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'my-orders'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>ဝယ်မှတ်တမ်းရှာ</span>
            </button>

            {/* Tab: Check Draw Results */}
            <button
              onClick={() => setActiveTab('results')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'results'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>ထီပေါက်စဉ်</span>
            </button>

            {/* Admin-only Tabs */}
            {userRole === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('inventory')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'inventory'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>ထီစာရင်း</span>
                </button>

                <button
                  onClick={() => setActiveTab('sales')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'sales'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>အရောင်းမှတ်တမ်း</span>
                </button>

                <button
                  onClick={() => setActiveTab('customers')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'customers'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>ဝယ်သူများ</span>
                </button>

                <button
                  onClick={() => setActiveTab('reports')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'reports'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>အစီရင်ခံစာ</span>
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/60'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 text-amber-400" />
                  <span>ဆက်တင် (Settings)</span>
                </button>
              </>
            )}
          </div>

          {/* Admin Global Search Bar */}
          {userRole === 'admin' && (
            <div className="w-full lg:w-auto lg:min-w-[280px] xl:min-w-[340px] shrink-0">
              <GlobalSearchBar
                tickets={tickets}
                sales={sales}
                exchangeRate={exchangeRate}
                fixedTicketPriceMMK={fixedTicketPriceMMK}
                onNavigateTab={setActiveTab}
                onSellSingle={onSellSingle}
                onViewReceipt={onViewReceipt}
                onViewBuyer={onViewBuyer}
                onVerifyReservation={onVerifyReservation}
                onSelectDrawDate={setSelectedDrawDate}
              />
            </div>
          )}
        </div>
      </div>

      {/* Admin Login PIN Modal */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">အက်ဒမင် မုဒ် (Admin Login)</h3>
                  <p className="text-[10px] text-slate-500">အက်ဒမင် ၃ ဦးအနက် မိမိအကောင့် ရွေးပါ</p>
                </div>
              </div>
              <button
                onClick={() => setPinModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              {/* Select from 3 Admins */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  အက်ဒမင် အကောင့် ရွေးချယ်ပါ (၃ ဦး):
                </label>
                <div className="space-y-2">
                  {admins.map((adm) => (
                    <div
                      key={adm.id}
                      onClick={() => setSelectedAdminId(adm.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        selectedAdminId === adm.id
                          ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg ${adm.avatarColor || 'bg-amber-500'} text-white font-bold text-xs flex items-center justify-center shadow-xs`}>
                          👑
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{adm.name}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-amber-800">
                        {adm.roleName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ရွေးချယ်ထားသော အက်ဒမင်၏ PIN နံပါတ် ရိုက်ထည့်ပါ
                </label>
                <input
                  type="password"
                  placeholder="PIN နံပါတ်"
                  autoFocus
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError('');
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-center text-lg font-mono tracking-widest font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500"
                />
                {pinError && <p className="text-xs text-rose-600 font-medium mt-1.5">{pinError}</p>}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>အက်ဒမင်အဖြစ် ဝင်မည်</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Management Modal (Edit Names & PINs for 3 Admins) */}
      {manageAdminsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-slate-900">အက်ဒမင် ၃ ဦး အကောင့် စီမံရန်</h3>
              </div>
              <button
                onClick={() => setManageAdminsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdminEdits} className="space-y-4">
              <p className="text-xs text-slate-500">
                အက်ဒမင် ၃ ဦး၏ အမည်များနှင့် လျှို့ဝှက် PIN နံပါတ်များကို စိတ်ကြိုက် ပြောင်းလဲသတ်မှတ်နိုင်ပါသည်။
              </p>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {editingAdmins.map((adm, idx) => (
                  <div key={adm.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>အက်ဒမင် ({idx + 1}): {adm.roleName}</span>
                      </span>
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                        {adm.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          အက်ဒမင် အမည်
                        </label>
                        <input
                          type="text"
                          required
                          value={adm.name}
                          onChange={(e) => {
                            const updated = [...editingAdmins];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setEditingAdmins(updated);
                          }}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          PIN နံပါတ်
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={adm.pin}
                          onChange={(e) => {
                            const updated = [...editingAdmins];
                            updated[idx] = { ...updated[idx], pin: e.target.value.replace(/\D/g, '') };
                            setEditingAdmins(updated);
                          }}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-amber-800 text-center focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setManageAdminsOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
                >
                  မလုပ်တော့ပါ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-2xs"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>အချက်အလက်များ သိမ်းဆည်းမည်</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Price & Exchange Rate Edit Modal */}
      {rateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 border border-slate-200 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Ticket className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">ထိုင်းထီ စျေးနှုန်း နှင့် ငွေလဲနှုန်း သတ်မှတ်ရန်</h3>
                  <p className="text-[11px] text-slate-500">Ticket Price & Exchange Rate Settings</p>
                </div>
              </div>
              <button
                onClick={() => setRateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub Tabs: Ticket Price vs Exchange Rate */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveSettingsTab('ticketPrice')}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeSettingsTab === 'ticketPrice'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Ticket className="w-3.5 h-3.5 text-emerald-600" />
                <span>ထီ ၁ စောင် ရောင်းစျေး (MMK)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSettingsTab('exchangeRate')}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeSettingsTab === 'exchangeRate'
                    ? 'bg-white text-amber-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                <span>ငွေလဲနှုန်း (Exchange Rate)</span>
              </button>
            </div>

            <form onSubmit={handleSavePriceAndRate} className="space-y-4">
              {activeSettingsTab === 'ticketPrice' ? (
                /* Tab 1: Ticket Price (MMK) */
                <div className="space-y-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-800">
                        ထိုင်းထီ ၁ စောင် သတ်မှတ်ရောင်းစျေး (ကျပ်):
                      </label>
                      <span className="text-[11px] font-bold text-emerald-700 font-mono">
                        {Number(tempFixedPriceInput || 0).toLocaleString('en-US')} ကျပ်
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        step="100"
                        min="1000"
                        required
                        value={tempFixedPriceInput}
                        onChange={(e) => setTempFixedPriceInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-lg font-mono font-black text-emerald-800 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                        placeholder="15000"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                        MMK (ကျပ်)
                      </span>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div>
                    <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                      စျေးနှုန်း အမြန်ရွေးချယ်ရန် (Quick Presets):
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[10000, 12000, 14000, 15000, 16000, 18000, 20000, 25000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleSelectPricePreset(preset)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                            tempFixedPriceInput === preset.toString()
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {preset.toLocaleString('en-US')}
                          {preset === 15000 && <span className="block text-[9px] font-sans text-amber-200">သတ်မှတ်</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auto Calculation Preview */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 text-xs">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>စောင်ရေအလိုက် တွက်ချက်မှု နမူနာ:</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-slate-500 block">၁ စောင်တွဲ စျေး:</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          {Number(tempFixedPriceInput || 0).toLocaleString('en-US')} MMK
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-slate-500 block">၂ စောင်တွဲ စျေး:</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          {(Number(tempFixedPriceInput || 0) * 2).toLocaleString('en-US')} MMK
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Checkbox to apply to all available tickets */}
                  <label className="flex items-start gap-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyToAllAvailable}
                      onChange={(e) => setApplyToAllAvailable(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-emerald-950 block">
                        လက်ကျန် ထီလက်မှတ်များအားလုံးကိုပါ ဤစျေးနှုန်းအသစ်ဖြင့် အလိုအလျောက် ပြောင်းလဲမည်
                      </span>
                      <span className="text-[11px] text-emerald-800">
                        (Inventory ရှိ ရောင်းရန်ကျန်သော ထီလက်မှတ်များ စျေးနှုန်းအသစ် ချက်ချင်းဖြစ်သွားပါမည်)
                      </span>
                    </div>
                  </label>
                </div>
              ) : (
                /* Tab 2: Exchange Rate */
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      1 THB (ဘတ်) = ဘယ်လောက် MMK (ကျပ်)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        required
                        value={tempRateInput}
                        onChange={(e) => setTempRateInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-base font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                        MMK / Baht
                      </span>
                    </div>
                  </div>

                  {/* Auto Fetch Button */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                    <p className="text-[11px] text-amber-900 font-medium">
                      အွန်လိုင်းမှ လက်ရှိ ပေါက်ဈေး အလိုအလျောက် ရယူလိုပါက:
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        await onAutoFetchRate();
                        setRateModalOpen(false);
                      }}
                      disabled={isFetchingRate}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isFetchingRate ? 'animate-spin' : ''}`} />
                      <span>{isFetchingRate ? 'စျေးနှုန်း ရယူနေပါသည်...' : 'အွန်လိုင်းမှ အလိုအလျောက် ရယူမည် (Auto Fetch)'}</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                >
                  မလုပ်တော့ပါ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>သတ်မှတ်သိမ်းဆည်းမည်</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

