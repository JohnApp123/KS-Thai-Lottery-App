import React, { useState } from 'react';
import { Ticket, SaleRecord, DrawResult } from '../types';
import { formatDateBurmese } from '../utils/formatters';
import {
  Calendar,
  Archive,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  History,
  Plus,
  X,
  Layers,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Clock,
  Coins,
} from 'lucide-react';

interface DrawCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDrawDate: string;
  onSelectDrawDate: (drawDate: string) => void;
  tickets: Ticket[];
  sales: SaleRecord[];
  results: DrawResult[];
  archivedDrawDates: string[];
  onArchiveDrawDate: (drawDateToArchive: string, newDrawDate: string) => void;
  onUnarchiveDrawDate?: (drawDate: string) => void;
  onOpenAddModalWithDate?: (newDate: string) => void;
  fixedTicketPriceMMK?: number;
}

export const DrawCycleModal: React.FC<DrawCycleModalProps> = ({
  isOpen,
  onClose,
  currentDrawDate,
  onSelectDrawDate,
  tickets,
  sales,
  results,
  archivedDrawDates,
  onArchiveDrawDate,
  onUnarchiveDrawDate,
  onOpenAddModalWithDate,
  fixedTicketPriceMMK = 15000,
}) => {
  const [activeTab, setActiveTab] = useState<'switch' | 'archive-wizard'>('archive-wizard');

  // Next draw date calculation logic
  const calculateNextDatePreset = (baseDateStr: string): string => {
    try {
      const parts = baseDateStr.split('-');
      if (parts.length === 3) {
        let year = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10); // 1-12
        let day = parseInt(parts[2], 10);

        if (day === 16) {
          // Next is 1st of next month
          month += 1;
          if (month > 12) {
            month = 1;
            year += 1;
          }
          return `${year}-${String(month).padStart(2, '0')}-01`;
        } else {
          // Next is 16th of same month
          return `${year}-${String(month).padStart(2, '0')}-16`;
        }
      }
    } catch {
      // fallback
    }
    return '2026-09-01';
  };

  const defaultNextDate = calculateNextDatePreset(currentDrawDate || '2026-08-16');
  const [newDrawDateInput, setNewDrawDateInput] = useState(defaultNextDate);
  const [archiveConfirmationStep, setArchiveConfirmationStep] = useState(false);

  if (!isOpen) return null;

  // Extract all draw dates present in tickets and sales
  const allKnownDates = Array.from(
    new Set([
      ...tickets.map((t) => t.drawDate).filter(Boolean),
      ...sales.map((s) => s.drawDate).filter(Boolean),
      ...results.map((r) => r.drawDate).filter(Boolean),
      currentDrawDate,
    ])
  ).filter(Boolean).sort().reverse();

  // Statistics for current active draw date
  const currentTickets = tickets.filter((t) => t.drawDate === currentDrawDate);
  const currentSold = currentTickets.filter((t) => t.status === 'sold');
  const currentUnsold = currentTickets.filter((t) => t.status === 'available');
  const currentSales = sales.filter((s) => s.drawDate === currentDrawDate);

  const handleStartNewCycle = () => {
    if (!newDrawDateInput.trim()) return;
    onArchiveDrawDate(currentDrawDate, newDrawDateInput.trim());
    setArchiveConfirmationStep(false);
    onClose();
    if (onOpenAddModalWithDate) {
      onOpenAddModalWithDate(newDrawDateInput.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 border border-slate-200 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Calendar className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                ထီဖွင့်ရက် အလှည့်အသစ် စီမံခန့်ခွဲမှု
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Draw Round Cycle & History Archive Management
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Subtabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('archive-wizard')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'archive-wizard'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>ထီပွဲသစ် စတင်ဖွင့်လှစ်မည် (New Draw Round)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('switch')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'switch'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 text-slate-600" />
            <span>ထီဖွင့်ရက် အားလုံး စာရင်း ({allKnownDates.length})</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto pr-1 space-y-4 flex-1">
          {activeTab === 'archive-wizard' ? (
            /* Tab 1: Start New Draw & Archive Previous Draw */
            <div className="space-y-4">
              
              {/* Current Active Draw Status Card */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    လက်ရှိ ရောင်းချနေသော ထီဖွင့်ရက် (Active Round)
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    ရောင်းချဆဲ
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <h3 className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                    {formatDateBurmese(currentDrawDate)}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono font-bold">
                    ({currentDrawDate})
                  </span>
                </div>

                {/* Mini Stats of Active Draw */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
                  <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block font-medium">စုစုပေါင်း</span>
                    <span className="text-sm sm:text-base font-black text-white font-mono">
                      {currentTickets.length} စောင်
                    </span>
                  </div>
                  <div className="bg-emerald-950/40 p-2 rounded-xl border border-emerald-700/40">
                    <span className="text-[10px] text-emerald-400 block font-medium">ရောင်းပြီး</span>
                    <span className="text-sm sm:text-base font-black text-emerald-300 font-mono">
                      {currentSold.length} စောင်
                    </span>
                  </div>
                  <div className="bg-amber-950/40 p-2 rounded-xl border border-amber-700/40">
                    <span className="text-[10px] text-amber-400 block font-medium">မရောင်းရ ကျန်</span>
                    <span className="text-sm sm:text-base font-black text-amber-300 font-mono">
                      {currentUnsold.length} စောင်
                    </span>
                  </div>
                </div>
              </div>

              {/* Step: Workflow Explanation */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 space-y-2">
                <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>ထီထွက်ပြီး နောက်ရက်သစ်အတွက် ဘာတွေ အလိုအလျောက် လုပ်ပေးမလဲ?</span>
                </h4>
                <ul className="text-xs text-emerald-900 space-y-1.5 list-disc pl-4 font-medium">
                  <li>
                    <strong className="text-emerald-950">ကျန်ရှိသော ထီဟောင်းများ သိမ်းဆည်းမည်:</strong> ယခု ဖွင့်ရက် ({currentDrawDate}) ရှိ မရောင်းရသေးသော ထီလက်မှတ် {currentUnsold.length} စောင်ကို အဟောင်းမှတ်တမ်း (Archive) အဖြစ် သီးသန့် ခွဲထုတ်သိမ်းဆည်းပေးပါမည်။
                  </li>
                  <li>
                    <strong className="text-emerald-950">ရောင်းချမှတ်တမ်းများ မပျောက်ပျက်ပါ:</strong> ရောင်းပြီးသား စာရင်းများ၊ ဝယ်ယူသူများ၏ နာမည်/ဖုန်းနှင့် ထီပေါက်စဉ် စစ်ဆေးချက်များ အားလုံး သမိုင်းမှတ်တမ်းတွင် အမြဲ ရှိနေပါမည်။
                  </li>
                  <li>
                    <strong className="text-emerald-950">ရက်သစ်အတွက် သီးသန့် ဇယားဖြစ်သွားမည်:</strong> နောက်ထွက်မည့် ရက်သစ်ကို ရွေးချယ်ပြီးသည်နှင့် ထီလက်မှတ် အသစ်များကို သန့်ရှင်းရှင်းလင်းလင်း တိုက်ရိုက် စတင် ထည့်သွင်းနိုင်ပါမည်။
                  </li>
                </ul>
              </div>

              {/* Step: Choose Next Draw Date */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  နောက်ထွက်မည့် ထီဖွင့်ရက် အသစ် သတ်မှတ်ပါ (Select Next Draw Date):
                </label>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="date"
                    required
                    value={newDrawDateInput}
                    onChange={(e) => setNewDrawDateInput(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
                  />
                  <div className="flex items-center gap-1.5">
                    {/* Quick presets for standard Thai lottery dates */}
                    {['2026-09-01', '2026-09-16', '2026-10-01'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewDrawDateInput(preset)}
                        className={`px-2.5 py-2 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer ${
                          newDrawDateInput === preset
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {preset.split('-').slice(1).join('/')}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  ရွေးချယ်ထားသော ရက်သစ်: <strong className="text-slate-800 font-mono">{formatDateBurmese(newDrawDateInput)}</strong>
                </p>
              </div>

              {/* Confirmation Action Button */}
              {!archiveConfirmationStep ? (
                <button
                  type="button"
                  onClick={() => setArchiveConfirmationStep(true)}
                  disabled={!newDrawDateInput || newDrawDateInput === currentDrawDate}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer active:scale-98"
                >
                  <Archive className="w-4 h-4" />
                  <span>ထီပွဲဟောင်း သိမ်းဆည်းပြီး ({formatDateBurmese(newDrawDateInput)}) သို့ ပြောင်းမည်</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-amber-950">
                        ထီဖွင့်ရက်ဟောင်း ({currentDrawDate}) ကို သိမ်းဆည်းရန် သေချာပါသလား?
                      </h4>
                      <p className="text-[11px] text-amber-900 font-medium mt-0.5">
                        မရောင်းရသေးသော လက်မှတ် {currentUnsold.length} စောင်ကို အဟောင်းမှတ်တမ်းသို့ ရွှေ့ပေးမည်ဖြစ်ပြီး ရက်သစ် ({newDrawDateInput}) အတွက် ထီလက်မှတ်အသစ် သွင်းနိုင်ရန် ချက်ချင်း ပြင်ဆင်ပေးပါမည်။
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setArchiveConfirmationStep(false)}
                      className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      မလုပ်တော့ပါ
                    </button>
                    <button
                      type="button"
                      onClick={handleStartNewCycle}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>သေချာသည်၊ သိမ်းဆည်းပြီး ရက်သစ် စတင်မည်</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Tab 2: All Draw Dates List & History Switcher */
            <div className="space-y-3">
              <p className="text-xs text-slate-500 font-medium">
                ထီဖွင့်ရက်အလိုက် စာရင်းများကို ရွေးချယ်ကြည့်ရှုနိုင်ပါသည် (သို့မဟုတ် လက်ရှိ ရောင်းချလိုသော ရက်ကို ပြောင်းလဲနိုင်ပါသည်):
              </p>

              <div className="space-y-2">
                {allKnownDates.map((dateStr) => {
                  const dTickets = tickets.filter((t) => t.drawDate === dateStr);
                  const dSold = dTickets.filter((t) => t.status === 'sold');
                  const dUnsold = dTickets.filter((t) => t.status === 'available');
                  const isCurrent = dateStr === currentDrawDate;
                  const isArchived = archivedDrawDates.includes(dateStr);

                  return (
                    <div
                      key={dateStr}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-emerald-50/70 border-emerald-400/80 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black font-mono text-slate-900">
                            {formatDateBurmese(dateStr)}
                          </h4>
                          {isCurrent ? (
                            <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-black">
                              လက်ရှိဖွင့်ရက် (Active)
                            </span>
                          ) : isArchived ? (
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <Archive className="w-3 h-3" />
                              <span>သိမ်းဆည်းပြီး (Archived)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                              ယခင်ရက်
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                          <span>စုစုပေါင်း: <strong className="text-slate-800">{dTickets.length}</strong> စောင်</span>
                          <span>•</span>
                          <span>ရောင်းပြီး: <strong className="text-emerald-700">{dSold.length}</strong></span>
                          <span>•</span>
                          <span>ကျန်: <strong className="text-amber-700">{dUnsold.length}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectDrawDate(dateStr);
                              onClose();
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <span>ဤရက်သို့ ပြောင်းမည်</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onOpenAddModalWithDate && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectDrawDate(dateStr);
                              onClose();
                              onOpenAddModalWithDate(dateStr);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                            title="ဤရက်အတွက် ထီလက်မှတ် အသစ်ထပ်ထည့်ရန်"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>ထီထည့်မည်</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>ထိုင်းထီသည် လစဉ် ၁ ရက် နှင့် ၁၆ ရက်တိုင်း ထွက်ရှိပါသည်</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
          >
            ပိတ်မည်
          </button>
        </div>

      </div>
    </div>
  );
};
