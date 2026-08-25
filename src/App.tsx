/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { safeStorage } from './utils/storage';
import {
  fetchSupabaseData,
  saveEntireStateToSupabase,
  subscribeToSupabaseRealtime,
  AppSyncState,
  SyncStatus,
} from './services/supabaseSync';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  // Role State: default to 'customer' view (can toggle to 'admin' via PIN modal in Header)
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (safeStorage.getString('tl_user_role', 'customer') as UserRole) || 'customer';
  });

  // Load state from LocalStorage or fallback to INITIAL mock data
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
    return safeStorage.get<Ticket[]>('tl_tickets', []);
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
    return 120; // 1 THB = 120 MMK default
  });

  const [fixedTicketPriceMMK, setFixedTicketPriceMMK] = useState<number>(() => {
    const saved = localStorage.getItem('tl_fixed_ticket_price_mmk');
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 15000; // 15,000 MMK default fixed price
  });

  const [archivedDrawDates, setArchivedDrawDates] = useState<string[]>(() => {
    return safeStorage.get<string[]>('tl_archived_draw_dates', []);
  });

  // Navigation & Filter states: Customer starts on 'self-select'
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const saved = safeStorage.getString('tl_active_tab', '');
    if (saved) return saved as AppTab;
    const savedRole = safeStorage.getString('tl_user_role', 'customer');
    return savedRole === 'customer' ? 'self-select' : 'inventory';
  });

  const [selectedDrawDate, setSelectedDrawDate] = useState<string>(() => {
    const saved = safeStorage.getString('tl_selected_draw_date', '2026-09-01');
    if (saved === '2026-08-16' || !saved) return '2026-09-01';
    return saved;
  });

  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<'all' | 'available' | 'reserved' | 'sold'>(() => {
    return safeStorage.getString('tl_inventory_status_filter', 'available') as any;
  });

  // Modals state
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [ticketsToSell, setTicketsToSell] = useState<Ticket[]>([]);
  
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [drawCycleModalOpen, setDrawCycleModalOpen] = useState(false);
  const [paymentAccountsModalOpen, setPaymentAccountsModalOpen] = useState(false);
  
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [activeReceiptSale, setActiveReceiptSale] = useState<SaleRecord | null>(null);

  // Admin Edit Sale Record Modal state
  const [editSaleModalOpen, setEditSaleModalOpen] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState<SaleRecord | null>(null);

  // Admin Edit Lottery Ticket Modal state
  const [editTicketModalOpen, setEditTicketModalOpen] = useState(false);
  const [ticketToEdit, setTicketToEdit] = useState<Ticket | null>(null);

  // Admin Payment Verification Modal state (for confirming temporary sold out / reserved tickets with slip screenshots)
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [ticketToVerify, setTicketToVerify] = useState<Ticket | null>(null);
  const [saleToVerify, setSaleToVerify] = useState<SaleRecord | null>(null);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Supabase Real-time Sync State
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting');
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const isRemoteSyncRef = React.useRef(false);
  const isInitialLoadDoneRef = React.useRef(false);

  // Helper to persist to LocalStorage and immediately execute direct write to Supabase
  const persistAndBroadcast = useCallback((overrides: Partial<AppSyncState>) => {
    const currentTickets = overrides.tickets !== undefined ? overrides.tickets : tickets;
    const currentSales = overrides.sales !== undefined ? overrides.sales : sales;
    const currentResults = overrides.results !== undefined ? overrides.results : results;
    const currentPaymentAccounts = overrides.paymentAccounts !== undefined ? overrides.paymentAccounts : paymentAccounts;
    const currentAdmins = overrides.admins !== undefined ? overrides.admins : admins;
    const currentDrawDate = overrides.selectedDrawDate !== undefined ? overrides.selectedDrawDate : selectedDrawDate;
    const currentRate = overrides.exchangeRate !== undefined ? overrides.exchangeRate : exchangeRate;
    const currentPrice = overrides.fixedTicketPriceMMK !== undefined ? overrides.fixedTicketPriceMMK : fixedTicketPriceMMK;
    const currentArchivedDates = overrides.archivedDrawDates !== undefined ? overrides.archivedDrawDates : archivedDrawDates;

    // 1. Sync to local storage for fast client caching
    if (overrides.tickets !== undefined) safeStorage.set('tl_tickets', currentTickets);
    if (overrides.sales !== undefined) safeStorage.set('tl_sales', currentSales);
    if (overrides.results !== undefined) safeStorage.set('tl_results', currentResults);
    if (overrides.paymentAccounts !== undefined) safeStorage.set('tl_payment_accounts', currentPaymentAccounts);
    if (overrides.admins !== undefined) safeStorage.set('tl_admins', currentAdmins);
    if (overrides.selectedDrawDate !== undefined) safeStorage.set('tl_selected_draw_date', currentDrawDate);
    if (overrides.exchangeRate !== undefined) safeStorage.set('tl_exchange_rate', currentRate.toString());
    if (overrides.fixedTicketPriceMMK !== undefined) safeStorage.set('tl_fixed_ticket_price_mmk', currentPrice.toString());
    if (overrides.archivedDrawDates !== undefined) safeStorage.set('tl_archived_draw_dates', currentArchivedDates);

    // 2. Execute direct live write to Supabase
    saveEntireStateToSupabase({
      tickets: currentTickets,
      sales: currentSales,
      results: currentResults,
      paymentAccounts: currentPaymentAccounts,
      admins: currentAdmins,
      selectedDrawDate: currentDrawDate,
      exchangeRate: currentRate,
      fixedTicketPriceMMK: currentPrice,
      archivedDrawDates: currentArchivedDates,
    }).then((success) => {
      if (success) {
        setSyncStatus('connected');
      } else {
        console.warn('[Supabase Sync] Direct update had an issue, retrying...');
      }
    });
  }, [tickets, sales, results, paymentAccounts, admins, selectedDrawDate, exchangeRate, fixedTicketPriceMMK, archivedDrawDates]);

  // 1. Initial Data Fetch & Real-time Subscription with Supabase Database
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initSupabase = async () => {
      setSyncStatus('connecting');
      try {
        console.log('[Supabase Init] Fetching latest live tickets and data from Supabase...');
        const cloudData = await fetchSupabaseData();
        if (cloudData && Object.keys(cloudData).length > 0) {
          isRemoteSyncRef.current = true;
          
          // Apply live data directly from Supabase (never override with mock data)
          if (cloudData.tickets !== undefined && Array.isArray(cloudData.tickets)) {
            setTickets(cloudData.tickets);
            safeStorage.set('tl_tickets', cloudData.tickets);
          }
          if (cloudData.sales !== undefined && Array.isArray(cloudData.sales)) {
            setSales(cloudData.sales);
            safeStorage.set('tl_sales', cloudData.sales);
          }
          if (cloudData.results !== undefined && Array.isArray(cloudData.results)) {
            setResults(cloudData.results);
            safeStorage.set('tl_results', cloudData.results);
          }
          if (cloudData.paymentAccounts !== undefined && Array.isArray(cloudData.paymentAccounts)) {
            setPaymentAccounts(cloudData.paymentAccounts);
            safeStorage.set('tl_payment_accounts', cloudData.paymentAccounts);
          }
          if (cloudData.admins !== undefined && Array.isArray(cloudData.admins)) {
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
          if (cloudData.archivedDrawDates && Array.isArray(cloudData.archivedDrawDates)) {
            setArchivedDrawDates(cloudData.archivedDrawDates);
            safeStorage.set('tl_archived_draw_dates', cloudData.archivedDrawDates);
          }
          setTimeout(() => {
            isRemoteSyncRef.current = false;
          }, 300);
          setSyncStatus('connected');
        } else {
          // In the rare event table is clean/new, push initial state to seed Supabase database once
          console.log('[Supabase Init] Database is brand new. Seeding initial tickets to Supabase...');
          setTickets(INITIAL_TICKETS);
          safeStorage.set('tl_tickets', INITIAL_TICKETS);
          await saveEntireStateToSupabase({
            tickets: INITIAL_TICKETS,
            sales,
            results,
            paymentAccounts,
            admins,
            selectedDrawDate: '2026-09-01',
            exchangeRate,
            fixedTicketPriceMMK,
            archivedDrawDates,
          });
          setSyncStatus('connected');
        }

        // Subscribe to live Postgres changes on `lottery_data` table
        unsubscribe = subscribeToSupabaseRealtime((updated) => {
          console.log('[Supabase Realtime Trigger] State update received from channel:', Object.keys(updated));
          isRemoteSyncRef.current = true;
          if (updated.tickets !== undefined && Array.isArray(updated.tickets)) {
            setTickets(updated.tickets);
            safeStorage.set('tl_tickets', updated.tickets);
          }
          if (updated.sales !== undefined && Array.isArray(updated.sales)) {
            setSales(updated.sales);
            safeStorage.set('tl_sales', updated.sales);
          }
          if (updated.results !== undefined && Array.isArray(updated.results)) {
            setResults(updated.results);
            safeStorage.set('tl_results', updated.results);
          }
          if (updated.paymentAccounts !== undefined && Array.isArray(updated.paymentAccounts)) {
            setPaymentAccounts(updated.paymentAccounts);
            safeStorage.set('tl_payment_accounts', updated.paymentAccounts);
          }
          if (updated.admins !== undefined && Array.isArray(updated.admins)) {
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
          if (updated.archivedDrawDates && Array.isArray(updated.archivedDrawDates)) {
            setArchivedDrawDates(updated.archivedDrawDates);
            safeStorage.set('tl_archived_draw_dates', updated.archivedDrawDates);
          }
          setTimeout(() => {
            isRemoteSyncRef.current = false;
          }, 300);
        }, setSyncStatus);

        isInitialLoadDoneRef.current = true;
        setIsInitialLoading(false);
      } catch (err) {
        console.error('[Supabase Init Error]:', err);
        setSyncStatus('offline');
        setIsInitialLoading(false);
      }
    };

    initSupabase();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleManualCloudSync = async () => {
    setSyncStatus('syncing');
    showToast('Supabase Database မှ နောက်ဆုံး အချက်အလက်များ ရယူနေပါသည်...');
    const cloudData = await fetchSupabaseData();
    if (cloudData) {
      isRemoteSyncRef.current = true;
      if (cloudData.tickets !== undefined && Array.isArray(cloudData.tickets)) {
        setTickets(cloudData.tickets);
        safeStorage.set('tl_tickets', cloudData.tickets);
      }
      if (cloudData.sales !== undefined && Array.isArray(cloudData.sales)) {
        setSales(cloudData.sales);
        safeStorage.set('tl_sales', cloudData.sales);
      }
      if (cloudData.results !== undefined && Array.isArray(cloudData.results)) {
        setResults(cloudData.results);
        safeStorage.set('tl_results', cloudData.results);
      }
      if (cloudData.paymentAccounts !== undefined && Array.isArray(cloudData.paymentAccounts)) {
        setPaymentAccounts(cloudData.paymentAccounts);
        safeStorage.set('tl_payment_accounts', cloudData.paymentAccounts);
      }
      if (cloudData.admins !== undefined && Array.isArray(cloudData.admins)) {
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
      if (cloudData.archivedDrawDates && Array.isArray(cloudData.archivedDrawDates)) {
        setArchivedDrawDates(cloudData.archivedDrawDates);
        safeStorage.set('tl_archived_draw_dates', cloudData.archivedDrawDates);
      }
      setTimeout(() => {
        isRemoteSyncRef.current = false;
      }, 300);
      setSyncStatus('connected');
      showToast('Supabase Database နှင့် အောင်မြင်စွာ Real-time Sync ပြုလုပ်ပြီးပါပြီ');
    } else {
      setSyncStatus('connected');
      showToast('Supabase Database နှင့် လက်ရှိ အချက်အလက်များ တူညီနေပါသည်');
    }
  };

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

  // Sync to LocalStorage & Supabase Database immediately whenever any state changes
  useEffect(() => {
    safeStorage.set('tl_admins', admins);
    safeStorage.set('tl_payment_accounts', paymentAccounts);
    safeStorage.set('tl_tickets', tickets);
    safeStorage.set('tl_sales', sales);
    safeStorage.set('tl_results', results);
    safeStorage.set('tl_exchange_rate', exchangeRate.toString());
    safeStorage.set('tl_fixed_ticket_price_mmk', fixedTicketPriceMMK.toString());
    safeStorage.set('tl_archived_draw_dates', archivedDrawDates);
    safeStorage.set('tl_selected_draw_date', selectedDrawDate);

    // Save entire state into Supabase 'lottery_data' table (id: 'current_lottery_state')
    if (!isRemoteSyncRef.current && isInitialLoadDoneRef.current) {
      saveEntireStateToSupabase({
        tickets,
        sales,
        results,
        paymentAccounts,
        admins,
        selectedDrawDate,
        exchangeRate,
        fixedTicketPriceMMK,
        archivedDrawDates,
      });
    }
  }, [
    tickets,
    sales,
    results,
    paymentAccounts,
    admins,
    selectedDrawDate,
    exchangeRate,
    fixedTicketPriceMMK,
    archivedDrawDates,
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleArchiveDrawDate = (drawDateToArchive: string, newDrawDate: string) => {
    setArchivedDrawDates((prev) => Array.from(new Set([...prev, drawDateToArchive])));
    setSelectedDrawDate(newDrawDate);
    showToast(`ထီဖွင့်ရက်ဟောင်း (${drawDateToArchive}) ကို သိမ်းဆည်းပြီး ရက်သစ် (${newDrawDate}) သို့ ဖွင့်လှစ်ပြီးပါပြီ`);
  };

  const handleUnarchiveDrawDate = (drawDate: string) => {
    setArchivedDrawDates((prev) => prev.filter((d) => d !== drawDate));
    showToast(`ထီဖွင့်ရက် (${drawDate}) ကို ပြန်လည်ဖွင့်လှစ်ပြီးပါပြီ`);
  };

  const handleAddNewDrawDate = (newDate: string) => {
    setSelectedDrawDate(newDate);
    showToast(`ထီဖွင့်ရက်အသစ် (${newDate}) ကို သတ်မှတ်လိုက်ပါပြီ`);
  };

  const handleAutoFetchRate = async () => {
    const newRate = await fetchLatestTHBRate();
    if (newRate) {
      setExchangeRate(newRate);
      showToast(`ယနေ့ Baht စျေးနှုန်း အသစ် (1 THB = ${newRate} MMK) သို့ ရယူပြင်ဆင်ပြီးပါပြီ`);
    } else {
      showToast('Baht စျေးနှုန်း ရယူရာတွင် အဆင်မပြေပါ၊ လက်ရှိ စျေးနှုန်းကိုသာ အသုံးပြုပါမည်');
    }
  };

  // Update fixed ticket price and optionally update all available tickets
  const handleUpdateFixedTicketPrice = (newPrice: number, applyToAllAvailable: boolean) => {
    setFixedTicketPriceMMK(newPrice);
    let updatedTickets = tickets;
    if (applyToAllAvailable) {
      updatedTickets = tickets.map((t) => (t.status === 'available' ? { ...t, priceMMK: newPrice * (t.setCount || 1) } : t));
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
    const updatedSales = sales.map((s) => (s.id === saleId ? { ...s, paymentSlipUrl: newSlipUrl } : s));
    setSales(updatedSales);
    persistAndBroadcast({ sales: updatedSales });
    showToast('ငွေလွှဲပြေစာ ပုံ အသစ် ထည့်သွင်းပြီးပါပြီ');
  };

  // Confirm payment for reserved ticket -> changes to sold and marks sale as paid
  const handleConfirmPayment = (ticket: Ticket) => {
    const activeAdmin = admins.find((a) => a.id === activeAdminId);
    const verifierName = activeAdmin ? activeAdmin.name : 'Admin';

    const updatedTickets = tickets.map((t) => {
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

    const updatedSales = sales.map((s) => {
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

  // Open Payment Verification Modal for Admin to inspect Payment Slip Screenshot
  const handleOpenVerification = (ticket: Ticket, saleRecord?: SaleRecord) => {
    const matchingSale =
      saleRecord ||
      sales.find((s) => s.ticketId === ticket.id || s.ticketNumber === ticket.number);
    setTicketToVerify(ticket);
    setSaleToVerify(matchingSale || null);
    setVerificationModalOpen(true);
  };

  // Handle Admin approval from PaymentVerificationModal
  const handleConfirmPaymentVerification = (
    ticket: Ticket,
    sale: SaleRecord | undefined,
    paidStatus: PaymentStatus,
    verifierNotes?: string
  ) => {
    const activeAdmin = admins.find((a) => a.id === activeAdminId);
    const verifierName = activeAdmin ? activeAdmin.name : 'Admin';

    const updatedTickets = tickets.map((t) => {
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

    const updatedSales = sales.map((s) => {
      if (
        s.ticketId === ticket.id ||
        s.ticketNumber === ticket.number ||
        (sale && s.id === sale.id)
      ) {
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

  // Handle Admin rejection from PaymentVerificationModal
  const handleRejectPaymentVerification = (
    ticket: Ticket,
    sale: SaleRecord | undefined,
    reason?: string
  ) => {
    const updatedTickets = tickets.map((t) => {
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

    const updatedSales = sales.filter(
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

  // Cancel reservation -> returns ticket to available and cancels pending sale
  const handleCancelReservation = (ticket: Ticket) => {
    const updatedTickets = tickets.map((t) => {
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

    const updatedSales = sales.filter(
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

  // Extract unique draw dates
  const uniqueDrawDates = Array.from(new Set(tickets.map((t) => t.drawDate).filter(Boolean)));

  // Filtered lists according to draw date
  const activeTickets = selectedDrawDate === 'all' 
    ? tickets 
    : tickets.filter((t) => t.drawDate === selectedDrawDate);

  const activeSales = selectedDrawDate === 'all'
    ? sales
    : sales.filter((s) => s.drawDate === selectedDrawDate);

  // Calculate Overview Stats
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

  // Actions
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

    // If payment status is pending, ticket status becomes 'reserved' (ယာယီ Sold Out)
    const newTicketStatus = saleData.paymentStatus === 'pending' ? 'reserved' : 'sold';
    const nowIso = new Date().toISOString();

    // Update ticket statuses
    const updatedTickets = tickets.map((t) => {
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

    const updatedSales = [...newSales, ...sales];
    setTickets(updatedTickets);
    setSales(updatedSales);
    persistAndBroadcast({ tickets: updatedTickets, sales: updatedSales });

    if (saleData.paymentStatus === 'pending') {
      showToast(
        `ထီနံပါတ် ${saleData.ticketIds.length} စောင်ကို ဝယ်သူ "${saleData.customerName}" အတွက် ယာယီ Sold Out (ငွေလွှဲစစ်ဆေးဆဲ) အဖြစ် သတ်မှတ်လိုက်ပါပြီ`
      );
    } else {
      showToast(`ထီနံပါတ် ${saleData.ticketIds.length} စောင်ကို ဝယ်သူ "${saleData.customerName}" ထံ ရောင်းချပြီးပါပြီ`);
    }

    // Show receipt modal for first sale if available and not pending
    if (newSales.length > 0 && saleData.paymentStatus !== 'pending') {
      setActiveReceiptSale(newSales[0]);
      setReceiptModalOpen(true);
    }
  };

  const handleAddTickets = (
    newTicketsData: Omit<Ticket, 'id' | 'createdAt' | 'status'>[]
  ) => {
    const createdTickets: Ticket[] = newTicketsData.map((d, index) => ({
      ...d,
      id: `t-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      status: 'available',
      createdAt: new Date().toISOString(),
    }));

    const updatedTickets = [...createdTickets, ...tickets];
    setTickets(updatedTickets);
    persistAndBroadcast({ tickets: updatedTickets });
    showToast(`ထီလက်မှတ် အသစ် ${createdTickets.length} စောင် စာရင်းထဲသို့ ထည့်သွင်းပြီးပါပြီ`);
  };

  const handleTogglePaymentStatus = (saleId: string) => {
    let changedTicketNumber = '';
    let changedStatus: PaymentStatus = 'paid';

    const updated = sales.map((s) => {
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
    const saleToCancel = sales.find((s) => s.id === saleId);
    if (!saleToCancel) return;

    // Return ticket to available
    const updatedTickets = tickets.map((t) => {
      if (t.id === saleToCancel.ticketId || t.number === saleToCancel.ticketNumber) {
        return { ...t, status: 'available' as const };
      }
      return t;
    });

    const updatedSales = sales.filter((s) => s.id !== saleId);
    setTickets(updatedTickets);
    setSales(updatedSales);
    persistAndBroadcast({ tickets: updatedTickets, sales: updatedSales });
    showToast(`ထီနံပါတ် ${saleToCancel.ticketNumber} ကို ထီစာရင်းထဲသို့ ပြန်လည်သွင်းယူပြီးပါပြီ`);
  };

  const handleDeleteSingleTicket = (ticket: Ticket) => {
    if (confirm(`ထီနံပါတ် "${ticket.number}" ကို စာရင်းမှ ဖျက်ပစ်ရန် သေချာပါသလား?`)) {
      const remainingTickets = tickets.filter((t) => t.id !== ticket.id);
      const remainingSales = sales.filter((s) => s.ticketId !== ticket.id && s.ticketNumber !== ticket.number);
      setTickets(remainingTickets);
      setSales(remainingSales);
      persistAndBroadcast({ tickets: remainingTickets, sales: remainingSales });
      showToast(`ထီနံပါတ် ${ticket.number} ကို စာရင်းမှ ဖျက်ပစ်ပြီးပါပြီ`);
    }
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
    const updatedSales = sales.map((s) => (s.id === updatedSale.id ? updatedSale : s));

    // Sync ticket status / details if applicable
    const updatedTickets = tickets.map((t) => {
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
    const originalTicket = tickets.find((t) => t.id === updatedTicket.id);
    const updatedTickets = tickets.map((t) => (t.id === updatedTicket.id ? updatedTicket : t));

    // If ticket number or serial or drawDate changed, also sync any matching sales records
    let updatedSales = sales;
    if (
      originalTicket &&
      (originalTicket.number !== updatedTicket.number ||
        originalTicket.serialCode !== updatedTicket.serialCode ||
        originalTicket.seriesNumber !== updatedTicket.seriesNumber ||
        originalTicket.drawDate !== updatedTicket.drawDate)
    ) {
      updatedSales = sales.map((s) => {
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
    if (updatedSales !== sales) {
      setSales(updatedSales);
    }
    persistAndBroadcast({ tickets: updatedTickets, sales: updatedSales });
    showToast(`ထီနံပါတ် ${updatedTicket.number} ၏ အချက်အလက်များကို အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ`);
    setEditTicketModalOpen(false);
    setTicketToEdit(null);
  };

  const handleViewBuyerFromTicket = (ticket: Ticket) => {
    const matchingSale = sales.find(
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
    const updatedTickets = tickets.map((t) => ({ ...t, status: 'available' as const }));
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
    persistAndBroadcast({ tickets: [] });
    showToast('ထီလက်မှတ် စာရင်းအားလုံးကို ဖျက်ပစ်ပြီးပါပြီ');
  };

  const handleDeleteSoldTickets = () => {
    const remaining = tickets.filter((t) => t.status !== 'sold');
    setTickets(remaining);
    persistAndBroadcast({ tickets: remaining });
    showToast('ရောင်းပြီးသား ထီလက်မှတ်ဟောင်းများကို ရှင်းလင်းပြီးပါပြီ');
  };

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
    showToast(`${newResult.drawDate} ထွက်ရက်အတွက် ထီပေါက်စဉ်များ သိမ်းဆည်းပြီးပါပြီ`);
  }, [persistAndBroadcast]);

  // Get existing customer names and phones for quick selection in sell modal
  const existingCustomers = Array.from(
    new Map(sales.map((s) => [s.customerName + s.customerPhone, { name: s.customerName, phone: s.customerPhone }])).values()
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2 border border-emerald-500 animate-bounce">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-100" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main App Navigation Header */}
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
        onManualCloudSync={handleManualCloudSync}
        onOpenSellModal={() => {
          setTicketsToSell([]);
          setSellModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Tab: Customer Self-Selection Mode */}
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

        {/* Tab: Customer Order Lookup (Check Purchased Tickets & Receipt) */}
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

        {/* Tab 1: Ticket Inventory Grid & Top Stats Overview (Admin Only) */}
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
              onGoToSalesTab={(type) => {
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

        {/* Tab 2: Sales & Customer Database Table (Admin Only) */}
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

        {/* Tab 3: Customer Directory (Admin Only) */}
        {activeTab === 'customers' && userRole === 'admin' && (
          <CustomerDirectory
            sales={sales}
            onTogglePaymentStatus={handleTogglePaymentStatus}
            exchangeRate={exchangeRate}
            fixedTicketPriceMMK={fixedTicketPriceMMK}
            onGoBackToHome={() => setActiveTab('inventory')}
          />
        )}

        {/* Tab 4: Lottery Results Checker (Admin & Customer) */}
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

        {/* Tab 5: Reports & Analytics (Admin Only) */}
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

        {/* Tab 6: Comprehensive Settings Page (Admin Only) */}
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
            onNavigateTab={setActiveTab}
            onOpenAddModal={() => setAddModalOpen(true)}
            showToast={showToast}
          />
        )}
      </main>

      {/* Modals */}
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

      {/* Admin Edit Ticket Modal */}
      <EditTicketModal
        isOpen={editTicketModalOpen}
        onClose={() => {
          setEditTicketModalOpen(false);
          setTicketToEdit(null);
        }}
        ticket={ticketToEdit}
        onSaveTicket={handleSaveEditedTicket}
        exchangeRate={exchangeRate}
        drawDates={uniqueDrawDates}
      />

      <DrawCycleModal
        isOpen={drawCycleModalOpen}
        onClose={() => setDrawCycleModalOpen(false)}
        currentDrawDate={selectedDrawDate !== 'all' ? selectedDrawDate : '2026-08-16'}
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

      {/* Admin Payment Slip Verification Modal */}
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

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 text-xs py-4 text-center">
        <p>
          ထိုင်းထီ ရောင်းချရေး နှင့် မှတ်တမ်းထိန်းချုပ်စနစ် (Thai Lottery Sales & Customer Records System)
        </p>
      </footer>
    </div>
  );
}
