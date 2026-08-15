import React, { useState } from 'react';
import { Ticket, SaleRecord } from '../types';
import { TicketCard } from './TicketCard';
import { Search, Filter, Layers, CheckSquare, Square, ShoppingBag, X, Calendar, Archive, Plus, Sparkles, Clock, ArrowRight } from 'lucide-react';
import { matchTicketDigits, formatDateBurmese } from '../utils/formatters';

interface TicketGridProps {
  tickets: Ticket[];
  sales?: SaleRecord[];
  onSellSingle: (ticket: Ticket) => void;
  onSellBatch: (tickets: Ticket[]) => void;
  onViewBuyer: (ticket: Ticket) => void;
  onConfirmPayment?: (ticket: Ticket) => void;
  onCancelReservation?: (ticket: Ticket) => void;
  onVerifyReservation?: (ticket: Ticket, saleRecord?: SaleRecord) => void;
  onDeleteTicket?: (ticket: Ticket) => void;
  selectedDrawDate: string;
  exchangeRate?: number;
  fixedTicketPriceMMK?: number;
  archivedDrawDates?: string[];
  onOpenDrawCycleModal?: () => void;
  onOpenAddModal?: () => void;
  onGoToSalesTab?: () => void;
  statusFilter?: 'all' | 'available' | 'reserved' | 'sold';
  setStatusFilter?: (status: 'all' | 'available' | 'reserved' | 'sold') => void;
}

export const TicketGrid: React.FC<TicketGridProps> = ({
  tickets,
  sales = [],
  onSellSingle,
  onSellBatch,
  onViewBuyer,
  onConfirmPayment,
  onCancelReservation,
  onVerifyReservation,
  onDeleteTicket,
  selectedDrawDate,
  exchangeRate = 120,
  fixedTicketPriceMMK = 15000,
  archivedDrawDates = [],
  onOpenDrawCycleModal,
  onOpenAddModal,
  onGoToSalesTab,
  statusFilter: externalStatusFilter,
  setStatusFilter: setExternalStatusFilter,
}) => {

  // Default to 'available' (ရောင်းဖို့ကျန်ရှိနေသော ထီလက်မှတ်များသာ ပထမဆုံး စာမျက်နှာတွင် ပြသမည်)
  const [internalStatusFilter, setInternalStatusFilter] = useState<'all' | 'available' | 'reserved' | 'sold'>('available');
  const statusFilter = externalStatusFilter !== undefined ? externalStatusFilter : internalStatusFilter;
  const setStatusFilter = (status: 'all' | 'available' | 'reserved' | 'sold') => {
    if (setExternalStatusFilter) {
      setExternalStatusFilter(status);
    } else {
      setInternalStatusFilter(status);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [matchType, setMatchType] = useState<'all' | 'front3' | 'back3' | 'back2'>('all');
  const [seriesFilter, setSeriesFilter] = useState('all');
  
  // Batch select state
  const [batchMode, setBatchMode] = useState(false);
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);

  // Unique series for filter
  const uniqueSeries = Array.from(new Set(tickets.map((t) => t.seriesNumber).filter(Boolean)));

  // Filter logic
  const filteredTickets = tickets.filter((t) => {
    // Draw date filter
    if (selectedDrawDate !== 'all' && t.drawDate !== selectedDrawDate) {
      return false;
    }
    // Status filter
    if (statusFilter !== 'all' && t.status !== statusFilter) {
      return false;
    }
    // Series filter
    if (seriesFilter !== 'all' && t.seriesNumber !== seriesFilter) {
      return false;
    }
    // Digit/Search match filter
    if (searchQuery.trim()) {
      return matchTicketDigits(t.number, searchQuery, matchType);
    }
    return true;
  });

  const availableFiltered = filteredTickets.filter((t) => t.status === 'available');

  const handleToggleBatchSelect = (ticket: Ticket) => {
    if (selectedTicketIds.includes(ticket.id)) {
      setSelectedTicketIds(selectedTicketIds.filter((id) => id !== ticket.id));
    } else {
      setSelectedTicketIds([...selectedTicketIds, ticket.id]);
    }
  };

  const handleSelectAllAvailable = () => {
    if (selectedTicketIds.length === availableFiltered.length) {
      setSelectedTicketIds([]);
    } else {
      setSelectedTicketIds(availableFiltered.map((t) => t.id));
    }
  };

  const handleBatchSellClick = () => {
    const selectedTickets = tickets.filter((t) => selectedTicketIds.includes(t.id));
    if (selectedTickets.length > 0) {
      onSellBatch(selectedTickets);
    }
  };

  const isArchivedDraw = selectedDrawDate !== 'all' && archivedDrawDates.includes(selectedDrawDate);

  return (
    <div id="ticket-inventory-section" className="space-y-4">
      {/* Contextual Draw Round Info Banner */}
      {isArchivedDraw ? (
        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-4.5 border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center shrink-0">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  သိမ်းဆည်းထားသော ထီဖွင့်ပွဲဟောင်း (Archived Past Draw)
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 font-mono">
                  {selectedDrawDate}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                ဤဖွင့်ရက် ({formatDateBurmese(selectedDrawDate)}) သည် ထီထွက်ပြီး သိမ်းဆည်းထားသော သမိုင်းမှတ်တမ်း ဖြစ်ပါသည်။
              </p>
            </div>
          </div>

          {onOpenDrawCycleModal && (
            <button
              type="button"
              onClick={onOpenDrawCycleModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>ထီပွဲသစ် စတင်ဖွင့်လှစ်မည်</span>
            </button>
          )}
        </div>
      ) : selectedDrawDate !== 'all' ? (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white rounded-2xl p-3.5 sm:p-4 border border-emerald-800/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  လက်ရှိ ရောင်းချနေသော ထီဖွင့်ရက် (Active Round)
                </span>
                <span className="text-xs font-bold font-mono text-white">
                  {formatDateBurmese(selectedDrawDate)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                ထီလက်မှတ် စုစုပေါင်း {filteredTickets.length} စောင် (ရောင်းရန်ရှိ: {availableFiltered.length} စောင်)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAddModal && (
              <button
                type="button"
                onClick={onOpenAddModal}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>ထီအသစ်ထည့်မည်</span>
              </button>
            )}

            {onOpenDrawCycleModal && (
              <button
                type="button"
                onClick={onOpenDrawCycleModal}
                title="ထီထွက်ပြီးပါက ဤပွဲဟောင်းကို သိမ်းဆည်းပြီး နောက်ထွက်မည့် ရက်သစ်ကို စတင်ဖွင့်လှစ်ရန်"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5 text-amber-400" />
                <span>ပွဲဟောင်းသိမ်း/ရက်သစ်ဖွင့်</span>
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* Search and Filters Section */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          
          {/* Main Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ထီနံပါတ် ရှာဖွေရန် (ဥပမာ: 582, 914, 582914)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/90 rounded-lg pl-9 pr-8 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Digit Match Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 text-xs">
            <span className="text-slate-500 mr-1 hidden sm:inline font-medium">ရှာဖွေပုံ:</span>
            <button
              onClick={() => setMatchType('all')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                matchType === 'all'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              တစ်ခုလုံး
            </button>
            <button
              onClick={() => setMatchType('front3')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                matchType === 'front3'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              ရှေ့ ၃ လုံး
            </button>
            <button
              onClick={() => setMatchType('back3')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                matchType === 'back3'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              နောက် ၃ လုံး
            </button>
            <button
              onClick={() => setMatchType('back2')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                matchType === 'back2'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              နောက် ၂ လုံး
            </button>
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200/80 text-xs overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              အားလုံး ({tickets.length})
            </button>
            <button
              onClick={() => setStatusFilter('available')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'available'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 hover:text-emerald-800'
              }`}
            >
              ရောင်းရန်ရှိ ({tickets.filter((t) => t.status === 'available').length})
            </button>
            <button
              onClick={() => setStatusFilter('reserved')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'reserved'
                  ? 'bg-amber-500 text-slate-950 shadow-2xs'
                  : 'text-amber-800 hover:text-amber-950 bg-amber-100/50'
              }`}
            >
              ယာယီ Sold Out ({tickets.filter((t) => t.status === 'reserved').length})
            </button>
            <button
              onClick={() => setStatusFilter('sold')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'sold'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-700 hover:text-rose-800'
              }`}
            >
              ရောင်းပြီး ({tickets.filter((t) => t.status === 'sold').length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Series Filter Dropdown */}
            {uniqueSeries.length > 0 && (
              <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs shadow-2xs">
                <Filter className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                <select
                  value={seriesFilter}
                  onChange={(e) => setSeriesFilter(e.target.value)}
                  className="bg-transparent text-slate-700 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="all">အတွဲ အားလုံး</option>
                  {uniqueSeries.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Batch Select Toggle */}
            <button
              onClick={() => {
                setBatchMode(!batchMode);
                if (batchMode) setSelectedTicketIds([]);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                batchMode
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{batchMode ? 'အုပ်စုရောင်း စနစ်ပိတ်' : 'အုပ်စုလိုက် ရောင်းမည်'}</span>
            </button>
          </div>
        </div>

        {/* Batch Action Bar when Batch Mode is Active */}
        {batchMode && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAllAvailable}
                className="flex items-center gap-1.5 text-amber-900 hover:text-amber-800 font-bold cursor-pointer"
              >
                {selectedTicketIds.length === availableFiltered.length && availableFiltered.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Square className="w-4 h-4 text-amber-600" />
                )}
                <span>
                  အကုန်ရွေးမည် (ရွေးချယ်ထားသော {selectedTicketIds.length} စောင်)
                </span>
              </button>
            </div>

            <button
              disabled={selectedTicketIds.length === 0}
              onClick={handleBatchSellClick}
              className={`px-4 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                selectedTicketIds.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>ရွေးချယ်ထားသော {selectedTicketIds.length} စောင်ကို ရောင်းမည်</span>
            </button>
          </div>
        )}
      </div>

      {/* Informative Banner when viewing Sold Tickets */}
      {statusFilter === 'sold' && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-slate-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-800 rounded-xl text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>ရောင်းပြီး ထီလက်မှတ်များ ({filteredTickets.length} စောင်)</span>
              </h4>
              <p className="text-xs text-slate-400">
                ရောင်းချခဲ့သည့် နေ့ရက်အလိုက် စာရင်းချုပ်များနှင့် ပြေစာများကို ကြည့်ရှုလိုပါက အောက်ပါခလုတ်ကို နှိပ်ပါ
              </p>
            </div>
          </div>
          {onGoToSalesTab && (
            <button
              onClick={onGoToSalesTab}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
            >
              <span>ရောင်းပြီးမှတ်တမ်း နေ့ရက်အလိုက် ကြည့်ရန်</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Grid of Tickets */}
      {filteredTickets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTickets.map((ticket) => {
            const matchingSale = sales.find(
              (s) => s.ticketId === ticket.id || s.ticketNumber === ticket.number
            );
            return (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                saleRecord={matchingSale}
                onSell={onSellSingle}
                onViewBuyer={onViewBuyer}
                onConfirmPayment={onConfirmPayment}
                onCancelReservation={onCancelReservation}
                onVerifyReservation={onVerifyReservation}
                onDeleteTicket={onDeleteTicket}
                isSelectedForBatch={selectedTicketIds.includes(ticket.id)}
                onToggleBatchSelect={handleToggleBatchSelect}
                batchSelectActive={batchMode}
                exchangeRate={exchangeRate}
                fixedTicketPriceMMK={fixedTicketPriceMMK}
              />
            );
          })}

        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center my-8 space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            ရှာဖွေထားသော ထီလက်မှတ် မရှိပါ
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            စစ်ထုတ်ထားသော အချက်အလက်များ သို့မဟုတ် ထီနံပါတ်ကို ပြန်လည်စစ်ဆေးပါ။
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setSeriesFilter('all');
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-emerald-700 font-bold rounded-lg text-xs transition-colors border border-slate-200 cursor-pointer"
          >
            ဇကာစစ်မှုများ ဖျက်မည်
          </button>
        </div>
      )}
    </div>
  );
};
