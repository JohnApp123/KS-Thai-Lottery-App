/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Ticket, SaleRecord, DrawResult, PaymentStatus, AppTab, UserRole, AdminUser, PaymentAccount } from './types';
import { INITIAL_TICKETS, INITIAL_SALES, INITIAL_RESULTS, INITIAL_ADMINS, INITIAL_PAYMENT_ACCOUNTS } from './data/initialData';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { TicketGrid } from './components/TicketGrid';
import { SalesTable } from './components/SalesTable';
import { SellModal } from './components/SellModal';
import { AddTicketModal } from './components/AddTicketModal';
import { ReceiptModal } from './components/ReceiptModal';
import { EditSaleModal } from './components/EditSaleModal';
import { EditTicketModal } from './components/EditTicketModal';
import { DrawResultsChecker } from './components/DrawResultsChecker';
import { CustomerDirectory } from './components/CustomerDirectory';
import { CustomerSelfSelection } from './components/CustomerSelfSelection';
import { CustomerOrderLookup } from './components/CustomerOrderLookup';
import { ReportsTab } from './components/ReportsTab';
import { DrawCycleModal } from './components/DrawCycleModal';
import { PaymentAccountsModal } from './components/PaymentAccountsModal';
import { PaymentVerificationModal } from './components/PaymentVerificationModal';
import { SettingsPage } from './components/SettingsPage';
import { fetchLatestTHBRate, getSalePriceMMK } from './utils/formatters';
import { fetchLiveThaiLotteryResults } from './services/thaiLotteryService';
import { safeStorage } from './utils/storage';
import {
  fetchSupabaseData,
  saveEntireStateToSupabase,
  subscribeToSupabaseRealtime,
  AppSyncState,
  SyncStatus,
} from './services/supabaseSync';
import { CheckCircle2, Trash2, X } from 'lucide-react';

export default function App() {
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (safeStorage.getString('tl_user_role', 'customer') as UserRole) || 'customer';
  });

  const [admins, setAdmins] = useState<AdminUser[]>(() => {
    return safeStorage.get<AdminUser[]>('tl_admins', INITIAL_ADMINS);
  });

  const [activeAdminId, setActiveAdminId] = useState<string>(() => {
    return safeStorage.getString('tl_active_admin_id', 'admin-1');
  });

  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>(() => {
    return safeStorage.get<PaymentAccount[]>('tl_payment_accounts', INITIAL_PAYMENT_ACCOUNTS);
  });

  const [tickets, setTickets] = useState<Ticket[]>(() => {
    const local = safeStorage.get<Ticket[]>('tl_tickets', []);
    return Array.isArray(local) ? local : [];
  });

  const [sales, setSales] = useState<SaleRecord[]>(() => {
    return safeStorage.get<SaleRecord[]>('tl_sales', []);
  });

  const [results, setResults] = useState<DrawResult[]>(() => {
    return safeStorage.get<DrawResult[]>('tl_results', []);
  });

  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    const saved = localStorage.getItem('tl_exchange_rate');
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 120;
  });

  const [fixedTicketPriceMMK, setFixedTicketPriceMMK] = useState<number>(() => {
    const saved = localStorage.getItem('tl_fixed_ticket_price_mmk');
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 15000;
  });

  const [archivedDrawDates, setArchivedDrawDates] = useState<string[]>(() => {
    return safeStorage.get<string[]>('tl_archived_draw_dates', []);
  });

  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const saved = safeStorage.getString('tl_active_tab', '');
    if (saved) return saved as AppTab;
    const savedRole = safeStorage.getString('tl_user_role', 'customer');
    return savedRole === 'customer' ? 'self-select' : 'inventory';
  });
  const [selectedDrawDate, setSelectedDrawDate] = useState<string>(() => {
    const saved = safeStorage.getString('tl_selected_draw_date', '2026-09-16');
    if (saved === '2026-08-16' || saved === '2026-09-01' || !saved) return '2026-09-16';
    return saved;
  });


  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<'all' | 'available' | 'reserved' | 'sold'>(() => {
    return safeStorage.getString('tl_inventory_status_filter', 'available') as any;
  });

  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [ticketsToSell, setTicketsToSell] = useState<Ticket[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [drawCycleModalOpen, setDrawCycleModalOpen] = useState(false);
  const [paymentAccountsModalOpen, setPaymentAccountsModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [activeReceiptSale, setActiveReceiptSale] = useState<SaleRecord | null>(null);
  const [editSaleModalOpen, setEditSaleModalOpen] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState<SaleRecord | null>(null);
  const [editTicketModalOpen, setEditTicketModalOpen] = useState(false);
  const [ticketToEdit, setTicketToEdit] = useState<Ticket | null>(null);
  const [deleteTicketModalOpen, setDeleteTicketModalOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [ticketToVerify, setTicketToVerify] = useState<Ticket | null>(null);
  const [saleToVerify, setSaleToVerify] = useState<SaleRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connected');

  const ticketsRef = useRef(tickets);
  const salesRef = useRef(sales);
  const resultsRef = useRef(results);
  const paymentAccountsRef = useRef(paymentAccounts);
  const adminsRef = useRef(admins);
  const selectedDrawDateRef = useRef(selectedDrawDate);
  const exchangeRateRef = useRef(exchangeRate);
  const fixedTicketPriceMMKRef = useRef(fixedTicketPriceMMK);
  const archivedDrawDatesRef = useRef(archivedDrawDates);
  const isSavingLocallyRef = useRef(false);

  useEffect(() => { ticketsRef.current = tickets; }, [tickets]);
  useEffect(() => { salesRef.current = sales; }, [sales]);
  useEffect(() => { resultsRef.current = results; }, [results]);
  useEffect(() => { paymentAccountsRef.current = paymentAccounts; }, [paymentAccounts]);
  useEffect(() => { adminsRef.current = admins; }, [admins]);
  useEffect(() => { selectedDrawDateRef.current = selectedDrawDate; }, [selectedDrawDate]);
  useEffect(() => { exchangeRateRef.current = exchangeRate; }, [exchangeRate]);
  useEffect(() => { fixedTicketPriceMMKRef.current = fixedTicketPriceMMK; }, [fixedTicketPriceMMK]);
  useEffect(() => { archivedDrawDatesRef.current = archivedDrawDates; }, [archivedDrawDates]);

  // Cloud ပေါ်သို့ တိုက်ရိုက် သေချာစွာ Save လုပ်ပေးမည့် function
  const persistAndBroadcast = useCallback(async (overrides: Partial<AppSyncState>) => {
    isSavingLocallyRef.current = true;
    const currentTickets = overrides.tickets !== undefined ? overrides.tickets : ticketsRef.current;
    const currentSales = overrides.sales !== undefined ? overrides.sales : salesRef.current;
    const currentResults = overrides.results !== undefined ? overrides.results : resultsRef.current;
    const currentPaymentAccounts = overrides.paymentAccounts !== undefined ? overrides.paymentAccounts : paymentAccountsRef.current;
    const currentAdmins = overrides.admins !== undefined ? overrides.admins : adminsRef.current;
    const currentDrawDate = overrides.selectedDrawDate !== undefined ? overrides.selectedDrawDate : selectedDrawDateRef.current;
    const currentRate = overrides.exchangeRate !== undefined ? overrides.exchangeRate : exchangeRateRef.current;
    const currentPrice = overrides.fixedTicketPriceMMK !== undefined ? overrides.fixedTicketPriceMMK : fixedTicketPriceMMKRef.current;
    const currentArchivedDates = overrides.archivedDrawDates !== undefined ? overrides.archivedDrawDates : archivedDrawDatesRef.current;

    safeStorage.set('tl_tickets', currentTickets);
    safeStorage.set('tl_sales', currentSales);
    safeStorage.set('tl_results', currentResults);
    safeStorage.set('tl_payment_accounts', currentPaymentAccounts);
    safeStorage.set('tl_admins', currentAdmins);
    safeStorage.set('tl_selected_draw_date', currentDrawDate);
    safeStorage.set('tl_exchange_rate', currentRate.toString());
    safeStorage.set('tl_fixed_ticket_price_mmk', currentPrice.toString());
    safeStorage.set('tl_archived_draw_dates', currentArchivedDates);

    setSyncStatus('syncing');
    const success = await saveEntireStateToSupabase({
      tickets: currentTickets,
      sales: currentSales,
      results: currentResults,
      paymentAccounts: currentPaymentAccounts,
      admins: currentAdmins,
      selectedDrawDate: currentDrawDate,
      exchangeRate: currentRate,
      fixedTicketPriceMMK: currentPrice,
      archivedDrawDates: currentArchivedDates,
    });

    if (success) {
      setSyncStatus('connected');
    }
    setTimeout(() => {
      isSavingLocallyRef.current = false;
    }, 1000);
    return success;
  }, []);

  // Initial Load & Realtime Subscription
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initSupabase = async () => {
      setSyncStatus('connecting');
      try {
        const cloudData = await fetchSupabaseData();
        if (cloudData && Object.keys(cloudData).length > 0) {
          setSyncStatus('connected');
          if (Array.isArray(cloudData.tickets)) {
            setTickets(cloudData.tickets);
            safeStorage.set('tl_tickets', cloudData.tickets);
          }
          if (Array.isArray(cloudData.sales)) {
            setSales(cloudData.sales);
            safeStorage.set('tl_sales', cloudData.sales);
          }
          if (Array.isArray(cloudData.results)) {
            setResults(cloudData.results);
            safeStorage.set('tl_results', cloudData.results);
          }
          if (Array.isArray(cloudData.paymentAccounts)) {
            setPaymentAccounts(cloudData.paymentAccounts);
            safeStorage.set('tl_payment_accounts', cloudData.paymentAccounts);
          }
          if (Array.isArray(cloudData.admins)) {
            setAdmins(cloudData.admins);
            safeStorage.set('tl_admins', cloudData.admins);
          }
          if (cloudData.selectedDrawDate) {
            setSelectedDrawDate(cloudData.selectedDrawDate);
            safeStorage.set('tl_selected_draw_date', cloudData.selectedDrawDate);
          }
          if (typeof cloudData.exchangeRate === 'number') {
            setExchangeRate(cloudData.exchangeRate);
            safeStorage.set('tl_exchange_rate', cloudData.exchangeRate.toString());
          }
          if (typeof cloudData.fixedTicketPriceMMK === 'number') {
            setFixedTicketPriceMMK(cloudData.fixedTicketPriceMMK);
            safeStorage.set('tl_fixed_ticket_price_mmk', cloudData.fixedTicketPriceMMK.toString());
          }
          if (Array.isArray(cloudData.archivedDrawDates)) {
            setArchivedDrawDates(cloudData.archivedDrawDates);
            safeStorage.set('tl_archived_draw_dates', cloudData.archivedDrawDates);
          }
        } else {
          setSyncStatus('connected');
        }

        unsubscribe = subscribeToSupabaseRealtime((updated) => {
          // မိမိကိုယ်တိုင် Save နေချိန်တွင် Realtime ကြောင့် ပြန် overwrite မဖြစ်အောင် တားထားသည်
          if (isSavingLocallyRef.current) return;

          if (Array.isArray(updated.tickets)) {
            setTickets(updated.tickets);
            safeStorage.set('tl_tickets', updated.tickets);
          }
          if (Array.isArray(updated.sales)) {
            setSales(updated.sales);
            safeStorage.set('tl_sales', updated.sales);
          }
          if (Array.isArray(updated.results)) {
            setResults(updated.results);
            safeStorage.set('tl_results', updated.results);
          }
          if (Array.isArray(updated.paymentAccounts)) {
            setPaymentAccounts(updated.paymentAccounts);
            safeStorage.set('tl_payment_accounts', updated.paymentAccounts);
          }
          if (Array.isArray(updated.admins)) {
            setAdmins(updated.admins);
            safeStorage.set('tl_admins', updated.admins);
          }
          if (updated.selectedDrawDate) {
            setSelectedDrawDate(updated.selectedDrawDate);
            safeStorage.set('tl_selected_draw_date', updated.selectedDrawDate);
          }
          if (typeof updated.exchangeRate === 'number') {
            setExchangeRate(updated.exchangeRate);
            safeStorage.set('tl_exchange_rate', updated.exchangeRate.toString());
          }
          if (typeof updated.fixedTicketPriceMMK === 'number') {
            setFixedTicketPriceMMK(updated.fixedTicketPriceMMK);
            safeStorage.set('tl_fixed_ticket_price_mmk', updated.fixedTicketPriceMMK.toString());
          }
          if (Array.isArray(updated.archivedDrawDates)) {
            setArchivedDrawDates(updated.archivedDrawDates);
            safeStorage.set('tl_archived_draw_dates', updated.archivedDrawDates);
          }
        }, setSyncStatus);

      } catch (err) {
        console.error('[Supabase Init Error]:', err);
        setSyncStatus('offline');
      }
    };

    initSupabase();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleSaveResult = useCallback((newResult: DrawResult) => {
    setResults((prev) => {
      const existingIdx = prev.findIndex((r) => r.drawDate === newResult.drawDate);
      let updated: DrawResult[];
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = newResult;
        updated = copy;
      } else {
        updated = [...prev, newResult];
      }
      persistAndBroadcast({ results: updated });
      return updated;
    });
  }, [persistAndBroadcast]);

  useEffect(() => {
    safeStorage.set('tl_user_role', userRole);
  }, [userRole]);
  useEffect(() => {
    safeStorage.set('tl_active_admin_id', activeAdminId);
  }, [activeAdminId]);
  useEffect(() => {
    safeStorage.set('tl_active_tab', activeTab);
  }, [activeTab]);
  useEffect(() => {
    safeStorage.set('tl_inventory_status_filter', inventoryStatusFilter);
  }, [inventoryStatusFilter]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // ထီလက်မှတ် အသစ်ထည့်သွင်းခြင်း (ချက်ချင်း အတည်ပြု သိမ်းဆည်းသည်)
  const handleAddTickets = async (newTicketsData: Omit<Ticket, 'id' | 'createdAt' | 'status'>[]) => {
    const nowIso = new Date().toISOString();
    const effectiveDrawDate = selectedDrawDate !== 'all' ? selectedDrawDate : '2026-09-01';

    const createdTickets: Ticket[] = newTicketsData.map((d, index) => ({
      ...d,
      id: `t-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      drawDate: d.drawDate || effectiveDrawDate,
      status: 'available' as const,
      createdAt: nowIso,
    }));

    const updated = [...createdTickets, ...ticketsRef.current];

    // UI နှင့် Ref ကို ချက်ချင်း အရင်တင်သည်
    ticketsRef.current = updated;
    setTickets(updated);

    // Cloud သို့ တိုက်ရိုက် Save သွားစေသည်
    await persistAndBroadcast({ tickets: updated });
    showToast(`ထီလက်မှတ် အသစ် ${createdTickets.length} စောင် အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ`);
  };

  // ထီလက်မှတ် ဖျက်ခြင်း (ချက်ချင်း အတည်ပြု သိမ်းဆည်းသည်)
  const handleDeleteSingleTicket = (ticket: Ticket) => {
    setTicketToDelete(ticket);
    setDeleteTicketModalOpen(true);
  };

  const handleConfirmDeleteTicket = async () => {
    if (!ticketToDelete) return;
    const ticketId = ticketToDelete.id;
    const ticketNum = ticketToDelete.number;

    const remainingTickets = ticketsRef.current.filter((t) => t.id !== ticketId);
    const remainingSales = salesRef.current.filter((s) => s.ticketId !== ticketId && s.ticketNumber !== ticketNum);

    ticketsRef.current = remainingTickets;
    salesRef.current = remainingSales;
    setTickets(remainingTickets);
    setSales(remainingSales);

    setDeleteTicketModalOpen(false);
    setTicketToDelete(null);

    await persistAndBroadcast({ tickets: remainingTickets, sales: remainingSales });
    showToast(`ထီနံပါတ် ${ticketNum} ကို စာရင်းမှ အပြီးအပိုင် ဖျက်ပစ်ပြီးပါပြီ`);

    if (editTicketModalOpen && ticketToEdit?.id === ticketId) {
      setEditTicketModalOpen(false);
      setTicketToEdit(null);
    }
  };

  const handleArchiveDrawDate = (drawDateToArchive: string, newDrawDate: string) => {
    const updated = Array.from(new Set([...archivedDrawDatesRef.current, drawDateToArchive]));
    setArchivedDrawDates(updated);
    setSelectedDrawDate(newDrawDate);
    persistAndBroadcast({ archivedDrawDates: updated, selectedDrawDate: newDrawDate });
    showToast(`ထီဖွင့်ရက်ဟောင်း (${drawDateToArchive}) ကို သိမ်းဆည်းပြီး ရက်သစ် (${newDrawDate}) သို့ ဖွင့်လှစ်ပြီးပါပြီ`);
  };

  const handleUnarchiveDrawDate = (drawDate: string) => {
    const updated = archivedDrawDatesRef.current.filter((d) => d !== drawDate);
    setArchivedDrawDates(updated);
    persistAndBroadcast({ archivedDrawDates: updated });
    showToast(`ထီဖွင့်ရက် (${drawDate}) ကို ပြန်လည်ဖွင့်လှစ်ပြီးပါပြီ`);
  };

  const handleAutoFetchRate = async () => {
    const newRate = await fetchLatestTHBRate();
    if (newRate) {
      setExchangeRate(newRate);
      persistAndBroadcast({ exchangeRate: newRate });
      showToast(`ယနေ့ Baht စျေးနှုန်း အသစ် (1 THB = ${newRate} MMK) သို့ ရယူပြင်ဆင်ပြီးပါပြီ`);
    } else {
      showToast('Baht စျေးနှုန်း ရယူရာတွင် အဆင်မပြေပါ၊ လက်ရှိ စျေးနှုန်းကိုသာ အသုံးပြုပါမည်');
    }
  };

  const handleUpdateFixedTicketPrice = (newPrice: number, applyToAllAvailable: boolean) => {
    setFixedTicketPriceMMK(newPrice);
    let updatedTickets = ticketsRef.current;
    if (applyToAllAvailable) {
      updatedTickets = updatedTickets.map((t) => (t.status === 'available' ? { ...t, priceMMK: newPrice * (t.setCount || 1) } : t));
      setTickets(updatedTickets);
    }
    persistAndBroadcast({ fixedTicketPriceMMK: newPrice, tickets: updatedTickets });
    showToast(`ထိုင်းထီ ၁ စောင် သတ်မှတ်ရောင်းစျေးကို ${newPrice.toLocaleString('en-US')} MMK သို့ ပြောင်းလဲသတ်မှတ်လိုက်ပါပြီ`);
  };

  const handleUpdatePaymentAccounts = (newAccounts: PaymentAccount[]) => {
    setPaymentAccounts(newAccounts);
    persistAndBroadcast({ paymentAccounts: newAccounts });
    showToast('ငွေပေးချေမှု အကောင့်များနှင့် QR များ အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ');
  };

  const handleUpdateAdmins = (newAdmins: AdminUser[]) => {
    setAdmins(newAdmins);
    persistAndBroadcast({ admins: newAdmins });
    showToast('အက်ဒမင် စာရင်းနှင့် PIN နံပါတ်များကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ');
  };

  const handleUpdateSlipImage = (saleId: string, newSlipUrl: string) => {
    const updatedSales = salesRef.current.map((s) => (s.id === saleId ? { ...s, paymentSlipUrl: newSlipUrl } : s));
    setSales(updatedSales);
    persistAndBroadcast({ sales: updatedSales });
    showToast('ငွေလွှဲပြေစာ ပုံ အသစ် ထည့်သွင်းပြီးပါပြီ');
  };

  const handleConfirmPayment = (ticket: Ticket) => {
    const activeAdmin = adminsRef.current.find((a) => a.id === activeAdminId);
    const verifierName = activeAdmin ? activeAdmin.name : 'Admin';

    const updatedTickets = ticketsRef.current.map((t) => {
      if (t.id === ticket.id || t.number === ticket.number) {
        return {
          ...t,
          status: 'sold' as const,
          confirmedBy: verifierName,
          confirmedAt: new Date().toISOString(),
        };
      }
      return t;
    });

    const updatedSales = salesRef.current.map((s) => {
      if (s.ticketId === ticket.id || s.ticketNumber === ticket.number) {
        return {
          ...s,
          paymentStatus: 'paid' as PaymentStatus,
          confirmedBy: verifierName,
          confirmedAt: new Date().toISOString(),
        };
      }
      return s;
    });

    setTickets(updatedTickets);
    setSales(updatedSales);
    persistAndBroadcast({ tickets: updatedTickets, sales: updatedSales });
    showToast(`ထီနံပါတ် ${ticket.number} အတွက် ငွေလွှဲအတည်ပြုပြီး ရောင်းချပြီး (Sold Out) အဖြစ် မှတ်တမ်းတင်လိုက်ပါပြီ`);
  };

  const handleOpenVerification = (ticket: Ticket, saleRecord?: SaleRecord) => {
    const matchingSale =
      saleRecord ||
      salesRef.current.find((s) => s.ticketId === ticket.id || s.ticketNumber === ticket.number);
    setTicketToVerify(ticket);
    setSaleToVerify(matchingSale || null);
    setVerificationModalOpen(true);
  };

  const handleConfirmPaymentVerification = (
    ticket: Ticket,
    sale: SaleRecord | undefined,
    paidStatus: PaymentStatus,
    verifierNotes?: string
  ) => {
    const activeAdmin = adminsRef.current.find((a) => a.id === activeAdminId);
    const verifierName = activeAdmin ? activeAdmin.name : 'Admin';

    const updatedTickets = ticketsRef.current.map((t) => {
      if (t.id === ticket.id || t.number === ticket.number) {
        return {
          ...t,
          status: 'sold' as const,
          confirmedBy: verifierName,
          confirmedAt: new Date().toISOString(),
        };
      }
      return t;
    });

    const updatedSales = salesRef.current.map((s) => {
      if (
        s.ticketId === ticket.id ||
        s.ticketNumber === ticket.number ||
        (sale && s.id === sale.id)) {
        return {
          ...s,
          paymentStatus: paidStatus,
          confirmedBy: verifierName,
          confirmedAt: new Date().toISOString(),
          notes: verifierNotes
            ? `${s.notes ? s.notes + ' | ' : ''}[Confirmed by ${verifierName}]: ${verifierNotes}`
            : s.notes,
        };
      }
      return s;
    });

    setTickets(updatedTickets);
    setSales(updatedSales);
    persistAndBroadcast({ tickets: updatedTickets, sales: updatedSales });
    setVerificationModalOpen(false);
    showToast(`ထီနံပါတ် ${ticket.number} အတွက် ငွေလွှဲပြေစာ စစ်ဆေးအတည်ပြုပြီး Sold Out သတ်မှတ်လိုက်ပါပြီ`);
  };

  const handleRejectPaymentVerification = (
    ticket: Ticket,
    sale: SaleRecord | undefined,
    reason?: string
  ) => {
    const updatedTickets = ticketsRef.current.map((t) => {
      if (t.id === ticket.id || t.number === ticket.number) {
        return {
          ...t,
          status: 'available' as const,
          confirmedBy: undefined,
          confirmedAt: undefined,
          reservedAt: undefined,
        };
      }
      return t;
    });

    const updatedSales = salesRef.current.filter(
      (s) =>
        !(
          (s.ticketId === ticket.id ||
            s.ticketNumber === ticket.number ||
            (sale && s.id === sale.id)) &&
          s.paymentStatus === 'pending'
        )
    );

    setTickets(updatedTickets);
    setSales(updatedSales);
    persistAndBroadcast({ tickets: updatedTickets, sales: updatedSales });
    setVerificationModalOpen(false);
    showToast(
      `ထီနံပါတ် ${ticket.number} ယာယီ Sold Out ကို ပယ်ဖျက်ပြီး ရောင်းရန် စာရင်းသို့ ပြန်ဖွင့်ပေးလိုက်ပါပြီ ${reason ? `(${reason})` : ''}`
    );
  };

  const handleCancelReservation = (ticket: Ticket) => {
    const updatedTickets = ticketsRef.current.map((t) => {
      if (t.id === ticket.id || t.number === ticket.number) {
        return {
          ...t,
          status: 'available' as const,
          confirmedBy: undefined,
          confirmedAt: undefined,
          reservedAt: undefined,
        };
      }
      return t;
    });

    const updatedSales = salesRef.current.filter(
      (s) =>
        !(
          (s.ticketId === ticket.id || s.ticketNumber === ticket.number) &&
          s.paymentStatus === 'pending'
        )
    );

    setTickets(updatedTickets);
    setSales(updatedSales);
    persistAndBroadcast({ tickets: updatedTickets, sales: updatedSales });
    showToast(`ထီနံပါတ် ${ticket.number} လျာထားမှု (ယာယီ Sold Out) ကို ပယ်ဖျက်ပြီး ရောင်းရန်စာရင်းသို့ ပြန်ထည့်လိုက်ပါပြီ`);
  };

  const uniqueDrawDates = Array.from(new Set(tickets.map((t) => t.drawDate).filter(Boolean)));
  const normalizeDate = (d?: string) => (d || '').replace(/[^0-9]/g, '');

  const activeTickets = selectedDrawDate === 'all' 
    ? tickets 
    : tickets.filter((t) => {
        if (!t.drawDate) return true;
        if (t.drawDate === selectedDrawDate) return true;
        return normalizeDate(t.drawDate) === normalizeDate(selectedDrawDate);
      });

  const activeSales = selectedDrawDate === 'all'
    ? sales
    : sales.filter((s) => {
        if (!s.drawDate) return true;
        if (s.drawDate === selectedDrawDate) return true;
        return normalizeDate(s.drawDate) === normalizeDate(selectedDrawDate);
      });

  const totalTicketsCount = activeTickets.length;
  const availableCount = activeTickets.filter((t) => t.status === 'available').length;
  const soldCount = activeTickets.filter((t) => t.status === 'sold').length;
  const reservedCount = activeTickets.filter((t) => t.status === 'reserved').length;
  const totalRevenue = activeSales.reduce(
    (sum, s) => sum + getSalePriceMMK(s, exchangeRate),
    0
  );
  const pendingCreditAmount = activeSales
    .filter((s) => s.paymentStatus === 'unpaid')
    .reduce((sum, s) => sum + getSalePriceMMK(s, exchangeRate), 0);

  const handleOpenSellSingle = (ticket: Ticket) => {
    setTicketsToSell([ticket]);
    setSellModalOpen(true);
  };

  const handleOpenSellBatch = (ticketsList: Ticket[]) => {
    setTicketsToSell(ticketsList);
    setSellModalOpen(true);
  };

  const handleConfirmSale = (saleData: {
    ticketIds: string[];
    customerName: string;
    customerPhone: string;
    salePrice: number;
    paymentStatus: PaymentStatus;
    paymentMethod?: string;
    paymentSlipUrl?: string;
    transactionId?: string;
    notes: string;
    saleDate: string;
  }) => {
    const newSales: SaleRecord[] = [];
    const soldIdsSet = new Set(saleData.ticketIds);
    const newTicketStatus = saleData.paymentStatus === 'pending' ? 'reserved' : 'sold';
    const nowIso = new Date().toISOString();

    const updatedTickets = ticketsRef.current.map((t) => {
      if (soldIdsSet.has(t.id)) {
        const unitPriceMMK = Math.round(saleData.salePrice / saleData.ticketIds.length);
        const saleRecord: SaleRecord = {
          id: `s-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          ticketId: t.id,
          ticketNumber: t.number,
          serialCode: t.serialCode,
          seriesNumber: t.seriesNumber,
          customerName: saleData.customerName,
          customerPhone: saleData.customerPhone,
          saleDate: saleData.saleDate,
          salePrice: unitPriceMMK,
          currency: 'MMK',
          paymentStatus: saleData.paymentStatus,
          paymentMethod: saleData.paymentMethod,
          paymentSlipUrl: saleData.paymentSlipUrl,
          transactionId: saleData.transactionId,
          notes: saleData.notes,
          drawDate: t.drawDate,
          createdAt: nowIso,
        };
        newSales.push(saleRecord);

        return {
          ...t,
          status: newTicketStatus as 'reserved' | 'sold',
          reservedAt: newTicketStatus === 'reserved' ? nowIso : undefined,
        };
      }
      return t;
    });

    const updatedSales = [...newSales, ...salesRef.current];
    setTickets(updatedTickets);
    setSales(updatedSales);
    persistAndBroadcast({ tickets: updatedTickets, sales: updatedSales });

    if (saleData.paymentStatus === 'pending') {
      showToast(`ထီနံပါတ် ${saleData.ticketIds.length} စောင်ကို ဝယ်သူ "${saleData.customerName}" အတွက် ယာယီ Sold Out (ငွေလွှဲစစ်ဆေးဆဲ) အဖြစ် သတ်မှတ်လိုက်ပါပြီ`);
    } else {
      showToast(`ထီနံပါတ် ${saleData.ticketIds.length} စောင်ကို ဝယ်သူ "${saleData.customerName}" ထံ ရောင်းချပြီးပါပြီ`);
    }

    if (newSales.length > 0 && saleData.paymentStatus !== 'pending') {
      setActiveReceiptSale(newSales[0]);
      setReceiptModalOpen(true);
    }
  };

  const handleTogglePaymentStatus = (saleId: string) => {
    let changedTicketNumber = '';
    let changedStatus: PaymentStatus = 'paid';

    const updated = salesRef.current.map((s) => {
      if (s.id === saleId) {
        let nextStatus: PaymentStatus = 'paid';
        if (s.paymentStatus === 'paid') {
          nextStatus = 'unpaid';
        } else if (s.paymentStatus === 'unpaid') {
          nextStatus = 'paid';
        } else if (s.paymentStatus === 'pending') {
          nextStatus = 'paid';
        }
        changedTicketNumber = s.ticketNumber;
        changedStatus = nextStatus;
        return { ...s, paymentStatus: nextStatus };
      }
      return s;
    });

    setSales(updated);
    persistAndBroadcast({ sales: updated });
    showToast(
      changedStatus === 'paid'
        ? `ထီနံပါတ် ${changedTicketNumber} အတွက် ငွေရှင်းပြီးကြောင်း မှတ်တမ်းတင်လိုက်ပါပြီ`
        : `ထီနံပါတ် ${changedTicketNumber} အတွက် အကြွေးကျန်အဖြစ် ပြောင်းလဲလိုက်ပါပြီ`
    );
  };

  const handleCancelSale = (saleId: string) => {
    const saleToCancel = salesRef.current.find((s) => s.id === saleId);
    if (!saleToCancel) return;

    const updatedTickets = ticketsRef.current.map((t) => {
      if (t.id === saleToCancel.ticketId || t.number === saleToCancel.ticketNumber) {
        return { ...t, status: 'available' as const };
      }
      return t;
    });

    const updatedSales = salesRef.current.filter((s) => s.id !== saleId);
    setTickets(updatedTickets);
    setSales(updatedSales);
    persistAndBroadcast({ tickets: updatedTickets, sales: updatedSales });
    showToast(`ထီနံပါတ် ${saleToCancel.ticketNumber} ကို ထီစာရင်းထဲသို့ ပြန်လည်သွင်းယူပြီးပါပြီ`);
  };

  const handleViewReceipt = (sale: SaleRecord) => {
    setActiveReceiptSale(sale);
    setReceiptModalOpen(true);
  };

  const handleOpenEditSale = (sale: SaleRecord) => {
    setSaleToEdit(sale);
    setEditSaleModalOpen(true);
  };

  const handleSaveEditedSale = (updatedSale: SaleRecord) => {
    const updatedSales = salesRef.current.map((s) => (s.id === updatedSale.id ? updatedSale : s));

    const updatedTickets = ticketsRef.current.map((t) => {
      if (t.id === updatedSale.ticketId || t.number === updatedSale.ticketNumber) {
        const newStatus = updatedSale.paymentStatus === 'pending' ? 'reserved' : 'sold';
        return {
          ...t,
          drawDate: updatedSale.drawDate || t.drawDate,
          serialCode: updatedSale.serialCode || t.serialCode,
          seriesNumber: updatedSale.seriesNumber || t.seriesNumber,
          status: newStatus as 'reserved' | 'sold',
          reservedCustomerName: updatedSale.customerName,
          reservedCustomerPhone: updatedSale.customerPhone,
        };
      }
      return t;
    });

    setTickets(updatedTickets);
    setSales(updatedSales);
    persistAndBroadcast({ tickets: updatedTickets, sales: updatedSales });
    showToast(`ထီနံပါတ် ${updatedSale.ticketNumber} ၏ ဝယ်သူအချက်အလက်များကို အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ`);
    setEditSaleModalOpen(false);
    setSaleToEdit(null);
  };

  const handleOpenEditTicket = (ticket: Ticket) => {
    setTicketToEdit(ticket);
    setEditTicketModalOpen(true);
  };

  const handleSaveEditedTicket = (updatedTicket: Ticket) => {
    const originalTicket = ticketsRef.current.find((t) => t.id === updatedTicket.id);
    const updatedTickets = ticketsRef.current.map((t) => (t.id === updatedTicket.id ? updatedTicket : t));

    let updatedSales = salesRef.current;
    if (
      originalTicket &&
      (originalTicket.number !== updatedTicket.number ||
        originalTicket.serialCode !== updatedTicket.serialCode ||
        originalTicket.seriesNumber !== updatedTicket.seriesNumber ||
        originalTicket.drawDate !== updatedTicket.drawDate)
    ) {
      updatedSales = salesRef.current.map((s) => {
        if (s.ticketId === updatedTicket.id || s.ticketNumber === originalTicket.number) {
          return {
            ...s,
            ticketNumber: updatedTicket.number,
            serialCode: updatedTicket.serialCode,
            seriesNumber: updatedTicket.seriesNumber,
            drawDate: updatedTicket.drawDate,
          };
        }
        return s;
      });
    }

    setTickets(updatedTickets);
    if (updatedSales !== salesRef.current) {
      setSales(updatedSales);
    }
    persistAndBroadcast({ tickets: updatedTickets, sales: updatedSales });
    showToast(`ထီနံပါတ် ${updatedTicket.number} ၏ အချက်အလက်များကို အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ`);
    setEditTicketModalOpen(false);
    setTicketToEdit(null);
  };

  const handleViewBuyerFromTicket = (ticket: Ticket) => {
    const matchingSale = salesRef.current.find(
      (s) => s.ticketId === ticket.id || s.ticketNumber === ticket.number
    );
    if (matchingSale) {
      setActiveReceiptSale(matchingSale);
      setReceiptModalOpen(true);
    } else {
      const fallbackSale: SaleRecord = {
        id: `sale-${ticket.id}`,
        ticketId: ticket.id,
        ticketNumber: ticket.number,
        serialCode: ticket.serialCode,
        seriesNumber: ticket.seriesNumber,
        customerName: ticket.reservedCustomerName || 'ဝယ်ယူသူ (Customer)',
        customerPhone: ticket.reservedCustomerPhone || '-',
        saleDate: ticket.createdAt ? ticket.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
        salePrice: ticket.priceMMK || fixedTicketPriceMMK,
        currency: 'MMK',
        paymentStatus: ticket.status === 'reserved' ? 'pending' : 'paid',
        drawDate: ticket.drawDate,
        createdAt: ticket.createdAt || new Date().toISOString(),
      };
      setActiveReceiptSale(fallbackSale);
      setReceiptModalOpen(true);
    }
  };

  const handleResetAllSalesAndDebts = () => {
    const updatedTickets = ticketsRef.current.map((t) => ({ ...t, status: 'available' as const }));
    setSales([]);
    setTickets(updatedTickets);
    persistAndBroadcast({ tickets: updatedTickets, sales: [] });
    showToast('ရောင်းရငွေ၊ အကြွေးကျန်ငွေ၊ အရောင်းမှတ်တမ်းနှင့် ဝယ်သူစာရင်းများကို အကုန် Reset ချပြီးပါပြီ');
  };

  const handleResetData = () => {
    if (confirm('နမူနာ ဒေတာများဖြင့် ပြန်လည်စတင်ရန် သေချာပါသလား?')) {
      setTickets(INITIAL_TICKETS);
      setSales(INITIAL_SALES);
      setResults(INITIAL_RESULTS);
      setPaymentAccounts(INITIAL_PAYMENT_ACCOUNTS);
      persistAndBroadcast({
        tickets: INITIAL_TICKETS,
        sales: INITIAL_SALES,
        results: INITIAL_RESULTS,
        paymentAccounts: INITIAL_PAYMENT_ACCOUNTS,
      });
      showToast('ဒေတာများကို မူလအတိုင်း ပြန်လည်ပြင်ဆင်ပြီးပါပြီ');
    }
  };

  const handleDeleteAllTickets = () => {
    setTickets([]);
    safeStorage.set('tl_tickets', []);
    persistAndBroadcast({ tickets: [] });
    showToast('ထီလက်မှတ် စာရင်းအားလုံးကို ဖျက်ပစ်ပြီးပါပြီ');
  };

  const handleDeleteSoldTickets = () => {
    const remaining = ticketsRef.current.filter((t) => t.status !== 'sold');
    setTickets(remaining);
    safeStorage.set('tl_tickets', remaining);
    persistAndBroadcast({ tickets: remaining });
    showToast('ရောင်းပြီးသား ထီလက်မှတ်ဟောင်းများကို ရှင်းလင်းပြီးပါပြီ');
  };

  const existingCustomers = Array.from(
    new Map(sales.map((s) => [s.customerName + s.customerPhone, { name: s.customerName, phone: s.customerPhone }])).values()
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2 border border-emerald-500 animate-bounce">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-100" />
          <span>{toastMessage}</span>
        </div>
      )}

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => setAddModalOpen(true)}
        selectedDrawDate={selectedDrawDate}
        setSelectedDrawDate={setSelectedDrawDate}
        drawDates={uniqueDrawDates}
        archivedDrawDates={archivedDrawDates}
        onOpenDrawCycleModal={() => setDrawCycleModalOpen(true)}
        onOpenPaymentAccountsModal={() => setPaymentAccountsModalOpen(true)}
        onResetData={handleResetData}
        exchangeRate={exchangeRate}
        setExchangeRate={setExchangeRate}
        fixedTicketPriceMMK={fixedTicketPriceMMK}
        onUpdateFixedTicketPrice={handleUpdateFixedTicketPrice}
        onAutoFetchRate={handleAutoFetchRate}
        userRole={userRole}
        setUserRole={setUserRole}
        admins={admins}
        activeAdminId={activeAdminId}
        setActiveAdminId={setActiveAdminId}
        onUpdateAdmins={handleUpdateAdmins}
        tickets={tickets}
        sales={sales}
        onSellSingle={handleOpenSellSingle}
        onViewReceipt={handleViewReceipt}
        onViewBuyer={handleViewBuyerFromTicket}
        onVerifyReservation={handleOpenVerification}
        syncStatus={syncStatus}
        onManualCloudSync={() => {}}
        onOpenSellModal={() => {
          setTicketsToSell([]);
          setSellModalOpen(true);
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeTab === 'self-select' && (
          <CustomerSelfSelection
            tickets={tickets}
            drawDate={selectedDrawDate}
            exchangeRate={exchangeRate}
            fixedTicketPriceMMK={fixedTicketPriceMMK}
            archivedDrawDates={archivedDrawDates}
            paymentAccounts={paymentAccounts}
            onConfirmOrder={(orderData) => {
              handleConfirmSale({
                ticketIds: orderData.ticketIds,
                customerName: orderData.customerName,
                customerPhone: orderData.customerPhone,
                salePrice: orderData.totalPriceTHB,
                paymentStatus: orderData.paymentStatus,
                paymentMethod: orderData.paymentMethod,
                paymentSlipUrl: orderData.paymentSlipUrl,
                transactionId: orderData.transactionId,
                notes: orderData.notes,
                saleDate: new Date().toISOString().slice(0, 10),
              });
              setActiveTab(userRole === 'admin' ? 'inventory' : 'my-orders');
            }}
          />
        )}

        {activeTab === 'my-orders' && (
          <CustomerOrderLookup
            sales={sales}
            results={results}
            exchangeRate={exchangeRate}
            onViewReceipt={handleViewReceipt}
            onGoToBuyTickets={() => setActiveTab('self-select')}
            onGoBackToHome={() => setActiveTab('self-select')}
          />
        )}

        {activeTab === 'inventory' && userRole === 'admin' && (
          <div className="space-y-6">
            <StatsOverview
              totalTicketsCount={totalTicketsCount}
              availableCount={availableCount}
              soldCount={soldCount}
              reservedCount={reservedCount}
              totalRevenue={totalRevenue}
              pendingCreditAmount={pendingCreditAmount}
              exchangeRate={exchangeRate}
              activeStatusFilter={inventoryStatusFilter}
              onSelectFilter={(filter) => {
                setInventoryStatusFilter(filter);
                const el = document.getElementById('ticket-inventory-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              onOpenPendingVerification={() => {
                const firstReserved = activeTickets.find((t) => t.status === 'reserved');
                if (firstReserved) {
                  handleOpenVerification(firstReserved);
                } else {
                  showToast('လက်ရှိတွင် စစ်ဆေးအတည်ပြုရန် ယာယီ Sold လက်မှတ် မရှိသေးပါ');
                }
              }}
              onGoToSalesTab={() => {
                setActiveTab('sales');
              }}
            />
            <TicketGrid
              tickets={tickets}
              sales={sales}
              statusFilter={inventoryStatusFilter}
              setStatusFilter={setInventoryStatusFilter}
              onSellSingle={handleOpenSellSingle}
              onSellBatch={handleOpenSellBatch}
              onViewBuyer={handleViewBuyerFromTicket}
              onConfirmPayment={handleConfirmPayment}
              onCancelReservation={handleCancelReservation}
              onVerifyReservation={handleOpenVerification}
              onDeleteTicket={handleDeleteSingleTicket}
              onEditTicket={handleOpenEditTicket}
              selectedDrawDate={selectedDrawDate}
              exchangeRate={exchangeRate}
              fixedTicketPriceMMK={fixedTicketPriceMMK}
              archivedDrawDates={archivedDrawDates}
              onOpenDrawCycleModal={() => setDrawCycleModalOpen(true)}
              onOpenAddModal={() => setAddModalOpen(true)}
              onGoToSalesTab={() => setActiveTab('sales')}
            />
          </div>
        )}

        {activeTab === 'sales' && userRole === 'admin' && (
          <SalesTable
            sales={sales}
            onTogglePaymentStatus={handleTogglePaymentStatus}
            onCancelSale={handleCancelSale}
            onViewReceipt={handleViewReceipt}
            onEditSale={handleOpenEditSale}
            onResetAllSalesAndDebts={handleResetAllSalesAndDebts}
            selectedDrawDate={selectedDrawDate}
            setSelectedDrawDate={setSelectedDrawDate}
            drawDates={uniqueDrawDates}
            archivedDrawDates={archivedDrawDates}
            exchangeRate={exchangeRate}
            fixedTicketPriceMMK={fixedTicketPriceMMK}
            onGoBackToHome={() => setActiveTab('inventory')}
          />
        )}

        {activeTab === 'customers' && userRole === 'admin' && (
          <CustomerDirectory
            sales={sales}
            onTogglePaymentStatus={handleTogglePaymentStatus}
            exchangeRate={exchangeRate}
            fixedTicketPriceMMK={fixedTicketPriceMMK}
            onGoBackToHome={() => setActiveTab('inventory')}
          />
        )}

        {activeTab === 'results' && (
          <DrawResultsChecker
            tickets={tickets}
            sales={sales}
            results={results}
            onSaveResults={handleSaveResult}
            exchangeRate={exchangeRate}
            userRole={userRole}
            initialDrawDate={selectedDrawDate}
            drawDates={uniqueDrawDates}
            onGoBackToHome={() => setActiveTab(userRole === 'admin' ? 'inventory' : 'self-select')}
          />
        )}

        {activeTab === 'reports' && userRole === 'admin' && (
          <ReportsTab
            sales={sales}
            tickets={tickets}
            exchangeRate={exchangeRate}
            selectedDrawDate={selectedDrawDate}
            setSelectedDrawDate={setSelectedDrawDate}
            drawDates={uniqueDrawDates}
            onGoBackToHome={() => setActiveTab('inventory')}
          />
        )}

        {activeTab === 'settings' && userRole === 'admin' && (
          <SettingsPage
            fixedTicketPriceMMK={fixedTicketPriceMMK}
            onUpdateFixedTicketPrice={handleUpdateFixedTicketPrice}
            exchangeRate={exchangeRate}
            setExchangeRate={setExchangeRate}
            onAutoFetchRate={handleAutoFetchRate}
            paymentAccounts={paymentAccounts}
            onUpdatePaymentAccounts={handleUpdatePaymentAccounts}
            drawDates={uniqueDrawDates}
            selectedDrawDate={selectedDrawDate}
            setSelectedDrawDate={setSelectedDrawDate}
            archivedDrawDates={archivedDrawDates}
            onArchiveDrawDate={handleArchiveDrawDate}
            onUnarchiveDrawDate={handleUnarchiveDrawDate}
            admins={admins}
            activeAdminId={activeAdminId}
            setActiveAdminId={setActiveAdminId}
            onUpdateAdmins={handleUpdateAdmins}
            userRole={userRole}
            setUserRole={setUserRole}
            tickets={tickets}
            setTickets={setTickets}
            sales={sales}
            setSales={setSales}
            onResetData={handleResetData}
            onResetAllSalesAndDebts={handleResetAllSalesAndDebts}
            onDeleteAllTickets={handleDeleteAllTickets}
            onDeleteSoldTickets={handleDeleteSoldTickets}
            onEditTicket={handleOpenEditTicket}
            onDeleteSingleTicket={handleDeleteSingleTicket}
            onNavigateTab={setActiveTab}
            onOpenAddModal={() => setAddModalOpen(true)}
            showToast={showToast}
          />
        )}
      </main>

      <SellModal
        isOpen={sellModalOpen}
        onClose={() => setSellModalOpen(false)}
        ticketsToSell={ticketsToSell}
        availableTickets={tickets.filter((t) => t.status === 'available')}
        onConfirmSale={handleConfirmSale}
        existingCustomers={existingCustomers}
        exchangeRate={exchangeRate}
        fixedTicketPriceMMK={fixedTicketPriceMMK}
        selectedDrawDate={selectedDrawDate}
      />

      <AddTicketModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAddTickets={handleAddTickets}
        selectedDrawDate={selectedDrawDate}
        exchangeRate={exchangeRate}
        fixedTicketPriceMMK={fixedTicketPriceMMK}
      />

      <EditTicketModal
        isOpen={editTicketModalOpen}
        onClose={() => {
          setEditTicketModalOpen(false);
          setTicketToEdit(null);
        }}
        ticket={ticketToEdit}
        onSaveTicket={handleSaveEditedTicket}
        onDeleteTicket={handleDeleteSingleTicket}
        exchangeRate={exchangeRate}
        drawDates={uniqueDrawDates}
      />

      <DrawCycleModal
        isOpen={drawCycleModalOpen}
        onClose={() => setDrawCycleModalOpen(false)}
        currentDrawDate={selectedDrawDate !== 'all' ? selectedDrawDate : '2026-09-01'}
        onSelectDrawDate={(date) => setSelectedDrawDate(date)}
        tickets={tickets}
        sales={sales}
        results={results}
        archivedDrawDates={archivedDrawDates}
        onArchiveDrawDate={handleArchiveDrawDate}
        onUnarchiveDrawDate={handleUnarchiveDrawDate}
        onOpenAddModalWithDate={(date) => {
          setSelectedDrawDate(date);
          setAddModalOpen(true);
        }}
        fixedTicketPriceMMK={fixedTicketPriceMMK}
      />

      <PaymentAccountsModal
        isOpen={paymentAccountsModalOpen}
        onClose={() => setPaymentAccountsModalOpen(false)}
        accounts={paymentAccounts}
        onSaveAccounts={handleUpdatePaymentAccounts}
        onUpdateAccounts={handleUpdatePaymentAccounts}
      />

      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        sale={activeReceiptSale}
        exchangeRate={exchangeRate}
        paymentAccounts={paymentAccounts}
        onEditSale={handleOpenEditSale}
        userRole={userRole}
      />

      <EditSaleModal
        isOpen={editSaleModalOpen}
        onClose={() => {
          setEditSaleModalOpen(false);
          setSaleToEdit(null);
        }}
        sale={saleToEdit}
        onSaveSale={handleSaveEditedSale}
        exchangeRate={exchangeRate}
        drawDates={uniqueDrawDates}
      />

      <PaymentVerificationModal
        isOpen={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        ticket={ticketToVerify}
        sale={saleToVerify}
        exchangeRate={exchangeRate}
        onConfirmSold={handleConfirmPaymentVerification}
        onRejectReservation={handleRejectPaymentVerification}
        onUpdateSlipImage={handleUpdateSlipImage}
      />

      {deleteTicketModalOpen && ticketToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    ထီလက်မှတ် ဖျက်ရန် အတည်ပြုပါ
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Delete Ticket Confirmation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteTicketModalOpen(false);
                  setTicketToDelete(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2 text-center">
                <p className="text-xs text-slate-600">
                  ဖျက်ပစ်မည့် ထီနံပါတ်
                </p>
                <div className="text-2xl font-black font-mono tracking-widest text-slate-900 bg-white py-2 px-4 rounded-lg border border-slate-200 shadow-2xs inline-block">
                  {ticketToDelete.number}
                </div>
                <div className="flex justify-center items-center gap-2 text-xs text-slate-600 font-medium">
                  {ticketToDelete.serialCode && (
                    <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono font-bold">
                      🔖 {ticketToDelete.serialCode}
                    </span>
                  )}
                  <span>ထွက်ရက်: {ticketToDelete.drawDate}</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed text-center">
                ဤထီလက်မှတ်ကို စာရင်းမှ ဖျက်ပစ်ရန် သေချာပါသလား? ဖျက်ပြီးပါက စာရင်းမှ လုံးဝ ပျက်ပြယ်သွားပါမည်။
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTicketModalOpen(false);
                    setTicketToDelete(null);
                  }}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-slate-200"
                >
                  မဖျက်တော့ပါ
                </button>
                <button
                  type="button"
                  id="btn-confirm-delete-ticket"
                  onClick={handleConfirmDeleteTicket}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>သေချာသည် ဖျက်မည်</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 text-xs py-4 text-center">
        <p>
          ထိုင်းထီ ရောင်းချရေး နှင့် မှတ်တမ်းထိန်းချုပ်စနစ် (Thai Lottery Sales & Customer Records System)
        </p>
      </footer>
    </div>
  );
}
