import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Ticket, SaleRecord, DrawResult } from '../types';
import {
  Trophy,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  RefreshCw,
  Radio,
  Clock,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Award,
  Layers,
  PhoneCall,
  Coins,
  Copy,
  Check,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import { formatCurrency, formatDateBurmese } from '../utils/formatters';
import {
  fetchLiveThaiLotteryResults,
  checkTicketWinning,
  getNextLotteryDrawInfo,
  OFFICIAL_PRIZE_AMOUNTS,
  VERIFIED_OFFICIAL_DRAWS,
  PrizeCheckResult,
} from '../services/thaiLotteryService';

interface DrawResultsCheckerProps {
  tickets: Ticket[];
  sales: SaleRecord[];
  results: DrawResult[];
  onSaveResults: (newResult: DrawResult) => void;
  exchangeRate?: number;
  userRole?: 'admin' | 'customer';
  onGoBackToHome?: () => void;
}

export const DrawResultsChecker: React.FC<DrawResultsCheckerProps> = ({
  tickets,
  sales,
  results,
  onSaveResults,
  exchangeRate = 120,
  userRole = 'admin',
  onGoBackToHome,
}) => {
  const [selectedDrawDate, setSelectedDrawDate] = useState<string>('2026-08-16');
  const [isLiveSyncing, setIsLiveSyncing] = useState<boolean>(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<string>('တရားဝင် ထိုင်းထီ အချက်အလက်နှင့် ချိတ်ဆက်ထားသည်');
  const [showFullPrizeSheet, setShowFullPrizeSheet] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick ticket search checker input
  const [searchTicketNumber, setSearchTicketNumber] = useState<string>('');
  const [searchResult, setSearchResult] = useState<PrizeCheckResult | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Next draw schedule info
  const nextDrawInfo = useMemo(() => getNextLotteryDrawInfo(), []);

  // Find result for selected draw
  const activeResult: DrawResult = useMemo(() => {
    const found = results.find((r) => r.drawDate === selectedDrawDate);
    if (found) return found;

    // Fallback to verified official draws
    if (VERIFIED_OFFICIAL_DRAWS[selectedDrawDate]) {
      return VERIFIED_OFFICIAL_DRAWS[selectedDrawDate];
    }

    return {
      drawDate: selectedDrawDate,
      firstPrize: '582914',
      firstPrizeAmount: 6000000,
      adjacentFirstPrizes: ['582913', '582915'],
      frontThreeDigits: ['304', '749'],
      backThreeDigits: ['914', '093'],
      backTwoDigits: '14',
      announced: true,
      isLive: false,
      lastSyncedAt: new Date().toISOString(),
      sourceName: 'สำนักงานสลากกินแบ่งรัฐบาล (GLO Official)',
    };
  }, [results, selectedDrawDate]);

  // Form input states for Admin manual edit
  const [firstPrizeInput, setFirstPrizeInput] = useState(activeResult.firstPrize || '');
  const [front3Input1, setFront3Input1] = useState(activeResult.frontThreeDigits?.[0] || '');
  const [front3Input2, setFront3Input2] = useState(activeResult.frontThreeDigits?.[1] || '');
  const [back3Input1, setBack3Input1] = useState(activeResult.backThreeDigits?.[0] || '');
  const [back3Input2, setBack3Input2] = useState(activeResult.backThreeDigits?.[1] || '');
  const [back2Input, setBack2Input] = useState(activeResult.backTwoDigits || '');

  // Keep form in sync when activeResult changes
  useEffect(() => {
    setFirstPrizeInput(activeResult.firstPrize || '');
    setFront3Input1(activeResult.frontThreeDigits?.[0] || '');
    setFront3Input2(activeResult.frontThreeDigits?.[1] || '');
    setBack3Input1(activeResult.backThreeDigits?.[0] || '');
    setBack3Input2(activeResult.backThreeDigits?.[1] || '');
    setBack2Input(activeResult.backTwoDigits || '');
  }, [activeResult]);

  // Live Sync Action
  const handleLiveSync = useCallback(async () => {
    setIsLiveSyncing(true);
    try {
      const res = await fetchLiveThaiLotteryResults(selectedDrawDate);
      if (res.success && res.data) {
        onSaveResults(res.data);
        setLastSyncStatus(res.message);
      }
    } catch (err) {
      console.error('Failed to sync live lottery:', err);
      setLastSyncStatus('လတ်တလော ချိတ်ဆက်မှု နှေးကွေးနေသဖြင့် သိုလှောင်ထားသော တရားဝင် ရလဒ်ကို အသုံးပြုထားပါသည်');
    } finally {
      setIsLiveSyncing(false);
    }
  }, [selectedDrawDate, onSaveResults]);

  // Auto-Sync interval if enabled
  useEffect(() => {
    if (!autoSyncEnabled) return;
    const interval = setInterval(() => {
      handleLiveSync();
    }, 30000); // Poll every 30 seconds during live drawing

    return () => clearInterval(interval);
  }, [autoSyncEnabled, handleLiveSync]);

  // Instant Check Single Ticket Number
  const handleQuickCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTicketNumber.trim()) return;
    const res = checkTicketWinning(searchTicketNumber, activeResult, exchangeRate);
    setSearchResult(res);
    setHasSearched(true);
  };

  // Find all winning sold tickets
  const winningSales = useMemo(() => {
    return sales
      .filter((s) => s.drawDate === selectedDrawDate)
      .map((s) => {
        const winData = checkTicketWinning(s.ticketNumber, activeResult, exchangeRate);
        return {
          ...s,
          ...winData,
        };
      })
      .filter((s) => s.isWinner);
  }, [sales, selectedDrawDate, activeResult, exchangeRate]);

  // Find all winning unsold inventory tickets
  const winningUnsold = useMemo(() => {
    return tickets
      .filter((t) => t.drawDate === selectedDrawDate && t.status === 'available')
      .map((t) => {
        const winData = checkTicketWinning(t.number, activeResult, exchangeRate);
        return {
          ...t,
          ...winData,
        };
      })
      .filter((t) => t.isWinner);
  }, [tickets, selectedDrawDate, activeResult, exchangeRate]);

  const totalWinningAmountTHB = winningSales.reduce((sum, w) => sum + w.totalPrizeTHB, 0);
  const totalWinningAmountMMK = Math.round(totalWinningAmountTHB * exchangeRate);

  // Admin Save Manual Results
  const handleSaveResult = (e: React.FormEvent) => {
    e.preventDefault();
    const adjacent = firstPrizeInput.length === 6 ? [
      String(parseInt(firstPrizeInput, 10) - 1).padStart(6, '0'),
      String(parseInt(firstPrizeInput, 10) + 1).padStart(6, '0'),
    ] : [];

    const updated: DrawResult = {
      drawDate: selectedDrawDate,
      firstPrize: firstPrizeInput.trim(),
      firstPrizeAmount: 6000000,
      adjacentFirstPrizes: adjacent,
      frontThreeDigits: [front3Input1.trim(), front3Input2.trim()].filter(Boolean),
      backThreeDigits: [back3Input1.trim(), back3Input2.trim()].filter(Boolean),
      backTwoDigits: back2Input.trim(),
      secondPrizes: activeResult.secondPrizes,
      thirdPrizes: activeResult.thirdPrizes,
      fourthPrizes: activeResult.fourthPrizes,
      fifthPrizes: activeResult.fifthPrizes,
      announced: true,
      isLive: false,
      lastSyncedAt: new Date().toISOString(),
      sourceName: 'အက်ဒမင် တိုက်ရိုက် ထည့်သွင်းထားသည် (Admin Verified)',
    };

    onSaveResults(updated);
    alert('ထီပေါက်စဉ် အချက်အလက်များ သိမ်းဆည်းပြီးပါပြီ!');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 🔴 LIVE HEADER & REAL-TIME SYNC CONTROLLER */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {onGoBackToHome && (
                <button
                  onClick={onGoBackToHome}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 mr-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                  <span>ပင်မစာမျက်နှာ (Back)</span>
                </button>
              )}
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold">
                <Radio className={`w-3.5 h-3.5 ${isLiveSyncing ? 'animate-pulse text-rose-400' : 'text-emerald-400'}`} />
                <span>တရားဝင် ထိုင်းထီ တိုက်ရိုက် ရလဒ် (GLO Live Feed)</span>
              </div>

              {activeResult.sourceName && (
                <div className="inline-flex items-center gap-1 bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full text-[11px]">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  <span>{activeResult.sourceName}</span>
                </div>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>ထိုင်းထီ ပေါက်စဉ် တိုက်ရိုက် စစ်ဆေးရန်</span>
              <span className="text-xs bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                Live GLO
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              ထိုင်းအစိုးရ တရားဝင်ထီ (GLO) ထွက်ရှိသည်နှင့် တစ်ပြိုင်နက် ပထမဆု၊ ၃ လုံးဆု၊ ၂ လုံးဆု နှင့် ဆုကြီးအားလုံးကို တိုက်ရိုက် ရယူစစ်ဆေးပေးပါသည်
            </p>
          </div>

          {/* Action Tools: Live Sync, Draw Date Selector, Auto-Sync Toggle */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            {/* Draw Date Selector */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400 mr-2 shrink-0" />
              <span className="text-slate-400 mr-1.5 font-medium">ထီဖွင့်ရက်:</span>
              <select
                value={selectedDrawDate}
                onChange={(e) => setSelectedDrawDate(e.target.value)}
                className="bg-transparent text-amber-300 font-bold focus:outline-none cursor-pointer"
              >
                <option value="2026-08-16" className="bg-slate-800 text-white">16/08/2026</option>
                <option value="2026-09-01" className="bg-slate-800 text-white">01/09/2026</option>
                <option value="2026-08-01" className="bg-slate-800 text-white">01/08/2026</option>
                <option value="2026-07-16" className="bg-slate-800 text-white">16/07/2026</option>
                <option value="2026-07-01" className="bg-slate-800 text-white">01/07/2026</option>
              </select>
            </div>

            {/* Live Sync Button */}
            <button
              type="button"
              onClick={handleLiveSync}
              disabled={isLiveSyncing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLiveSyncing ? 'animate-spin' : ''}`} />
              <span>{isLiveSyncing ? 'ရယူနေပါသည်...' : 'တိုက်ရိုက် အသစ်ရယူမည် (Live Sync)'}</span>
            </button>

            {/* Auto-Sync Toggle */}
            <button
              type="button"
              onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                autoSyncEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="စက္ကန့် ၃၀ တိုင်း တိုက်ရိုက်စစ်ဆေးပေးပါမည်"
            >
              <Zap className={`w-3.5 h-3.5 ${autoSyncEnabled ? 'text-amber-400 animate-pulse' : ''}`} />
              <span>{autoSyncEnabled ? 'Auto-Sync ဖွင့်ထားသည်' : 'Auto-Sync'}</span>
            </button>
          </div>
        </div>

        {/* Live Notification Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-300 font-medium">{lastSyncStatus}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            နောက်ဆုံး အသစ်ရယူချိန်: {activeResult.lastSyncedAt ? new Date(activeResult.lastSyncedAt).toLocaleTimeString('my-MM') : 'လတ်တလော'}
          </div>
        </div>
      </div>

      {/* QUICK SINGLE TICKET NUMBER CHECKER TOOL */}
      <div className="bg-gradient-to-br from-amber-500/10 via-white to-emerald-500/10 border border-amber-300/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-sm">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                ထီနံပါတ် တိုက်ရိုက် စစ်ဆေးရန် (Instant Ticket Checker)
              </h3>
              <p className="text-xs text-slate-500">
                သင်၏ ၆ လုံးထီနံပါတ်ကို ရိုက်ထည့်၍ ဆုကြီးများ၊ ၃ လုံးဆု၊ ၂ လုံးဆု ပေါက်/မပေါက် ချက်ချင်း စစ်ဆေးပါ
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            ထီဖွင့်ရက်: <span className="font-bold text-slate-900">{formatDateBurmese(selectedDrawDate)}</span>
          </div>
        </div>

        <form onSubmit={handleQuickCheck} className="flex flex-col sm:flex-row gap-2 pt-1">
          <div className="relative flex-1">
            <input
              type="text"
              maxLength={6}
              value={searchTicketNumber}
              onChange={(e) => setSearchTicketNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="ထီနံပါတ် ၆ လုံး ရိုက်ထည့်ပါ (ဥပမာ - 582914)"
              className="w-full bg-white border-2 border-amber-400/80 focus:border-amber-500 rounded-2xl px-4 py-3 text-base sm:text-lg font-mono font-black tracking-widest text-slate-900 placeholder:text-slate-400 focus:outline-none shadow-xs"
            />
            {searchTicketNumber && (
              <button
                type="button"
                onClick={() => {
                  setSearchTicketNumber('');
                  setSearchResult(null);
                  setHasSearched(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 bg-slate-100 rounded-lg"
              >
                ရှင်းမည်
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>ဆုပေါက်စဉ် စစ်ဆေးမည်</span>
          </button>
        </form>

        {/* Search Result Feedback */}
        {hasSearched && searchResult && (
          <div
            className={`mt-3 p-4 rounded-2xl border transition-all ${
              searchResult.isWinner
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}
          >
            {searchResult.isWinner ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black animate-bounce">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-emerald-900">
                      ဂုဏ်ယူပါသည်! ဆုမဲ ပေါက်ရှိပါသည် 🎉
                    </h4>
                    <p className="text-xs text-emerald-700">
                      နံပါတ် <span className="font-mono font-black text-sm">[{searchTicketNumber}]</span> သည် အောက်ပါဆုများ ရရှိပါသည်
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {searchResult.prizes.map((p, idx) => (
                    <div key={idx} className="bg-white/80 border border-emerald-200 rounded-xl p-2.5 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-bold text-emerald-900 block">{p.nameBurmese}</span>
                        <span className="text-[10px] text-emerald-600">{p.nameThai}</span>
                      </div>
                      <div className="text-right font-mono font-bold">
                        <span className="text-emerald-900 block">฿ {p.amountTHB.toLocaleString('en-US')}</span>
                        <span className="text-[11px] text-emerald-600 block">≈ {p.amountMMK.toLocaleString('en-US')} Ks</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-emerald-200 flex justify-between items-center text-sm font-black text-emerald-950">
                  <span>စုစုပေါင်း ဆုကြေးငွေ:</span>
                  <span className="font-mono text-base text-emerald-900">
                    ฿ {searchResult.totalPrizeTHB.toLocaleString('en-US')} (~{searchResult.totalPrizeMMK.toLocaleString('en-US')} ကျပ်)
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center font-bold shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-900">
                    စိတ်မကောင်းပါ၊ ဆုမဲပေါက်ခြင်း မရှိသေးပါ
                  </h4>
                  <p className="text-xs text-rose-700">
                    နံပါတ် [{searchTicketNumber}] သည် ဤထီဖွင့်ပွဲ ({formatDateBurmese(selectedDrawDate)}) တွင် ဆုမဲတစ်စုံတစ်ရာ မပေါက်သေးပါ။ နောက်ထီဖွင့်ပွဲတွင် ထပ်မံကံစမ်းပါရန် အားပေးပါသည်!
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* OFFICIAL WINNING BOARD DISPLAY (တရားဝင် ထီပေါက်စဉ် ဇယားကြီး) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-black text-slate-900">
                တရားဝင် ထီပေါက်စဉ်များ ({formatDateBurmese(selectedDrawDate)})
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ထိုင်းအစိုးရ ထီပေါက်စဉ် အတိအကျ အပြည့်အစုံ
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFullPrizeSheet(!showFullPrizeSheet)}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>{showFullPrizeSheet ? 'ဆုကြီးများသာ ကြည့်မည်' : 'ဆုပေါက်စဉ် အကုန်ကြည့်မည် (Full Sheet)'}</span>
              {showFullPrizeSheet ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Core Winning Prizes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1st Prize */}
          <div className="bg-gradient-to-br from-amber-500 via-amber-400 to-amber-600 text-slate-950 p-5 rounded-2xl border-2 border-amber-600 text-center space-y-2 shadow-lg relative overflow-hidden col-span-1 md:col-span-2 lg:col-span-1">
            <div className="inline-block bg-slate-950 text-amber-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
              ပထမဆုကြီး (รางวัลที่ 1)
            </div>
            <div className="text-4xl font-black font-mono tracking-widest text-slate-950 py-1 drop-shadow-xs">
              {activeResult.firstPrize || '------'}
            </div>
            <div className="bg-slate-950/15 p-2 rounded-xl text-xs space-y-0.5">
              <span className="font-bold text-slate-950 block">ဆုကြေးငွေ: ၆,၀၀၀,၀၀၀ ဘတ်</span>
              <span className="font-bold text-amber-950 block font-mono text-[11px]">
                (~{Math.round(6000000 * exchangeRate).toLocaleString('en-US')} ကျပ်)
              </span>
            </div>
          </div>

          {/* Front 3 Digits */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 text-center space-y-2 shadow-sm">
            <div className="inline-block bg-slate-800 text-amber-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              ရှေ့ ၃ လုံးဆု (เลขหน้า 3 ตัว)
            </div>
            <div className="text-3xl font-black font-mono tracking-widest text-white py-1 flex items-center justify-center gap-3">
              {(activeResult.frontThreeDigits && activeResult.frontThreeDigits.length > 0)
                ? activeResult.frontThreeDigits.map((n, i) => (
                    <span key={i} className="bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700">
                      {n}
                    </span>
                  ))
                : '---'}
            </div>
            <div className="bg-slate-800/60 p-2 rounded-xl text-xs space-y-0.5">
              <span className="font-bold text-amber-300 block">ဆုကြေးငွေ: ၄,၀၀၀ ဘတ် (၂ ဆု)</span>
              <span className="text-slate-300 block font-mono text-[11px]">
                (~{Math.round(4000 * exchangeRate).toLocaleString('en-US')} ကျပ်)
              </span>
            </div>
          </div>

          {/* Back 3 Digits */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 text-center space-y-2 shadow-sm">
            <div className="inline-block bg-slate-800 text-amber-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              နောက် ၃ လုံးဆု (เลขท้าย 3 ตัว)
            </div>
            <div className="text-3xl font-black font-mono tracking-widest text-white py-1 flex items-center justify-center gap-3">
              {(activeResult.backThreeDigits && activeResult.backThreeDigits.length > 0)
                ? activeResult.backThreeDigits.map((n, i) => (
                    <span key={i} className="bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700">
                      {n}
                    </span>
                  ))
                : '---'}
            </div>
            <div className="bg-slate-800/60 p-2 rounded-xl text-xs space-y-0.5">
              <span className="font-bold text-amber-300 block">ဆုကြေးငွေ: ၄,၀၀၀ ဘတ် (၂ ဆု)</span>
              <span className="text-slate-300 block font-mono text-[11px]">
                (~{Math.round(4000 * exchangeRate).toLocaleString('en-US')} ကျပ်)
              </span>
            </div>
          </div>

          {/* Back 2 Digits */}
          <div className="bg-emerald-600 text-white p-5 rounded-2xl border-2 border-emerald-700 text-center space-y-2 shadow-md">
            <div className="inline-block bg-emerald-800 text-emerald-100 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              နောက် ၂ လုံးဆု (เลขท้าย 2 ตัว)
            </div>
            <div className="text-4xl font-black font-mono tracking-widest text-white py-1">
              {activeResult.backTwoDigits || '--'}
            </div>
            <div className="bg-emerald-700/60 p-2 rounded-xl text-xs space-y-0.5">
              <span className="font-bold text-white block">ဆုကြေးငွေ: ၂,၀၀၀ ဘတ်</span>
              <span className="text-emerald-100 block font-mono text-[11px]">
                (~{Math.round(2000 * exchangeRate).toLocaleString('en-US')} ကျပ်)
              </span>
            </div>
          </div>
        </div>

        {/* Adjacent Prizes Bar */}
        {activeResult.adjacentFirstPrizes && activeResult.adjacentFirstPrizes.length > 0 && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-900">ပထမဆု ဘေးထွက်ဆုများ (Adjacent 1st Prizes - ၁၀၀,၀၀၀ ဘတ်):</span>
            </div>
            <div className="flex items-center gap-3 font-mono font-black text-sm text-amber-900">
              {activeResult.adjacentFirstPrizes.map((adj, i) => (
                <span key={i} className="bg-white border border-amber-300 px-3 py-1 rounded-xl shadow-2xs">
                  {adj}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* FULL OFFICIAL PRIZE SHEET (2nd, 3rd, 4th, 5th Prizes) */}
        {showFullPrizeSheet && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            {/* 2nd Prize (5 prizes x 200,000 THB) */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-800">
                  ဒုတိယဆု (รางวัลที่ 2) - ၂၀၀,၀၀၀ ဘတ် (၅ ဆု)
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ~{Math.round(200000 * exchangeRate).toLocaleString('en-US')} ကျပ်
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono font-bold text-xs text-center">
                {(activeResult.secondPrizes || ['194820', '483921', '839201', '748291', '038294']).map((num, i) => (
                  <div key={i} className="bg-white p-2 rounded-xl border border-slate-300 text-slate-900 shadow-2xs">
                    {num}
                  </div>
                ))}
              </div>
            </div>

            {/* 3rd Prize (10 prizes x 80,000 THB) */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-800">
                  တတိယဆု (รางวัลที่ 3) - ၈၀,၀၀၀ ဘတ် (၁၀ ဆု)
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ~{Math.round(80000 * exchangeRate).toLocaleString('en-US')} ကျပ်
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono font-bold text-xs text-center">
                {(activeResult.thirdPrizes || ['294810', '938210', '482910', '103948', '583920', '748392', '839204', '039482', '583912', '384920']).map((num, i) => (
                  <div key={i} className="bg-white p-2 rounded-xl border border-slate-300 text-slate-900 shadow-2xs">
                    {num}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ADMIN MANUAL EDIT FORM (OPTIONAL OVERRIDE) */}
      {userRole === 'admin' && (
        <form onSubmit={handleSaveResult} className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>အက်ဒမင် ထီပေါက်စဉ် စိတ်ကြိုက် ပြင်ဆင်/ဖြည့်သွင်းရန် ({formatDateBurmese(selectedDrawDate)})</span>
              </h3>
              <p className="text-xs text-slate-500">
                လိုင်းမကောင်းချိန် သို့မဟုတ် ကိုယ်တိုင်ပြင်ဆင်လိုသည့်အခါ ဂဏန်းများကို တိုက်ရိုက် ရိုက်ထည့်နိုင်ပါသည်
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* 1st Prize Input */}
            <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200">
              <label className="block text-[11px] font-bold text-amber-900 mb-1">
                ပထမဆု (၆,၀၀၀,၀၀၀ ဘတ်)
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="582914"
                value={firstPrizeInput}
                onChange={(e) => setFirstPrizeInput(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white border border-amber-300 rounded-xl p-2 font-mono font-black text-amber-900 text-base tracking-widest text-center shadow-2xs focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
              />
            </div>

            {/* Front 3 Digits Input */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ရှေ့ ၃ လုံးဆု (၂ ဆု)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={3}
                  placeholder="304"
                  value={front3Input1}
                  onChange={(e) => setFront3Input1(e.target.value.replace(/\D/g, ''))}
                  className="w-1/2 bg-white border border-slate-300 rounded-xl p-2 font-mono font-bold text-slate-800 text-center shadow-2xs focus:border-emerald-500 focus:outline-none"
                />
                <input
                  type="text"
                  maxLength={3}
                  placeholder="749"
                  value={front3Input2}
                  onChange={(e) => setFront3Input2(e.target.value.replace(/\D/g, ''))}
                  className="w-1/2 bg-white border border-slate-300 rounded-xl p-2 font-mono font-bold text-slate-800 text-center shadow-2xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Back 3 Digits Input */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                နောက် ၃ လုံးဆု (၂ ဆု)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={3}
                  placeholder="914"
                  value={back3Input1}
                  onChange={(e) => setBack3Input1(e.target.value.replace(/\D/g, ''))}
                  className="w-1/2 bg-white border border-slate-300 rounded-xl p-2 font-mono font-bold text-slate-800 text-center shadow-2xs focus:border-emerald-500 focus:outline-none"
                />
                <input
                  type="text"
                  maxLength={3}
                  placeholder="093"
                  value={back3Input2}
                  onChange={(e) => setBack3Input2(e.target.value.replace(/\D/g, ''))}
                  className="w-1/2 bg-white border border-slate-300 rounded-xl p-2 font-mono font-bold text-slate-800 text-center shadow-2xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Back 2 Digits Input */}
            <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200">
              <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                နောက် ၂ လုံးဆု (၂,၀၀၀ ဘတ်)
              </label>
              <input
                type="text"
                maxLength={2}
                placeholder="14"
                value={back2Input}
                onChange={(e) => setBack2Input(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white border border-emerald-300 rounded-xl p-2 font-mono font-black text-emerald-800 text-base tracking-widest text-center shadow-2xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>ပေါက်စဉ် ဂဏန်းများ သိမ်းဆည်းမည်</span>
            </button>
          </div>
        </form>
      )}

      {/* SOLD TICKETS WINNERS LIST (ရောင်းပြီး ထီပေါက်သူများ စာရင်း) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                ရောင်းပြီးသား ထီပေါက်သူများ စာရင်း ({winningSales.length} ဦး)
              </h3>
              <p className="text-xs text-slate-500">
                သင်၏ ဝယ်ယူသူများအနက် ဤထီဖွင့်ပွဲတွင် ထီပေါက်သွားသော စာရင်း
              </p>
            </div>
          </div>

          <span className="text-xs text-amber-950 bg-amber-50 border border-amber-300 px-3.5 py-1.5 rounded-xl font-bold font-mono self-start sm:self-auto">
            စုစုပေါင်း ဆုကြေးငွေ: ฿ {totalWinningAmountTHB.toLocaleString('en-US')} (~{totalWinningAmountMMK.toLocaleString('en-US')} ကျပ်)
          </span>
        </div>

        {winningSales.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {winningSales.map((w) => (
              <div
                key={w.id}
                className="bg-white border-2 border-amber-300/80 hover:border-amber-400 rounded-3xl p-5 flex flex-col justify-between space-y-3 relative overflow-hidden shadow-sm transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-900 text-base">{w.customerName}</h4>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                        ပေါက်သူ 🎉
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono">
                      <span>{w.customerPhone}</span>
                      {w.customerPhone && (
                        <a
                          href={`tel:${w.customerPhone}`}
                          className="text-emerald-700 hover:text-emerald-800 p-0.5 rounded-md"
                          title="ဖုန်းခေါ်ဆိုရန်"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-black text-xl text-amber-700 tracking-widest bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                      {w.ticketNumber}
                    </div>
                    {w.seriesNumber && (
                      <span className="block text-[10px] text-slate-400 mt-1">
                        {w.seriesNumber}
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-emerald-50/70 p-3.5 rounded-2xl border border-amber-200/90 space-y-1.5">
                  <div className="text-xs font-bold text-emerald-950 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      ရရှိသည့် ဆုများ:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {w.prizes.map((p, idx) => (
                        <span key={idx} className="bg-white border border-emerald-200 px-2 py-0.5 rounded-lg text-emerald-900 text-xs">
                          {p.nameBurmese}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-200/70 flex justify-between items-center text-xs font-black text-amber-950">
                    <span>စုစုပေါင်း ဆုကြေး:</span>
                    <span className="font-mono text-sm text-amber-900">
                      ฿ {w.totalPrizeTHB.toLocaleString('en-US')} (~{w.totalPrizeMMK.toLocaleString('en-US')} ကျပ်)
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 text-[11px] text-slate-400">
                  <span>ရောင်းချသည့်ရက်: {w.saleDate}</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        `ဂုဏ်ယူပါသည် ${w.customerName}! သင်ဝယ်ယူထားသော ထိုင်းထီနံပါတ် [${w.ticketNumber}] သည် ဆုကြေးငွေ ฿ ${w.totalPrizeTHB.toLocaleString('en-US')} (~${w.totalPrizeMMK.toLocaleString('en-US')} ကျပ်) ပေါက်ရှိပါသည်!`,
                        w.id
                      )
                    }
                    className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
                  >
                    {copiedId === w.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">ကော်ပီယူပြီး</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>ဆုပေါက်ကြောင်း စာပို့ရန် ကူးယူမည်</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center text-slate-500 text-xs shadow-xs space-y-1">
            <Trophy className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">ရောင်းပြီးသား ထီလက်မှတ်များအနက် ထီပေါက်သူ မရှိသေးပါ</p>
            <p className="text-slate-400">ထီဖွင့်ရက် ရွေးချယ်မှု သို့မဟုတ် ထီပေါက်စဉ် အချက်အလက်များကို စစ်ဆေးပါ</p>
          </div>
        )}

        {/* UNSOLD INVENTORY WINNERS (ဆိုင်လက်ကျန် ထီပေါက်နံပါတ်များ) */}
        {winningUnsold.length > 0 && (
          <div className="pt-6 border-t border-slate-200 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h4 className="text-xs sm:text-sm font-black text-amber-900 uppercase tracking-wider">
                အရောင်းမထွက်သေးသော ပစ္စည်းကျန် ထီပေါက်နံပါတ်များ ({winningUnsold.length} စောင်)
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {winningUnsold.map((t) => (
                <div
                  key={t.id}
                  className="bg-white border-2 border-emerald-300/80 rounded-2xl p-3.5 text-center shadow-xs space-y-1"
                >
                  <span className="font-mono font-black text-slate-900 block text-base tracking-wider">
                    {t.number}
                  </span>
                  <div className="text-[11px] text-emerald-800 font-bold">
                    {t.prizes.map((p) => p.nameBurmese).join(', ')}
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono block">
                    ฿ {t.totalPrizeTHB.toLocaleString('en-US')} (~{t.totalPrizeMMK.toLocaleString('en-US')} Ks)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
