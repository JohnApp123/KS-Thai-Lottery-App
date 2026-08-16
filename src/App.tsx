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
  saveRecordToSupabase,
  subscribeToSupabaseRealtime,
  pushFullStateToSupabase,
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
    const loaded = safeStorage.get<AdminUser[]>('tl_admins', INITIAL_ADMINS);
    if (Array.isArray(loaded) && (loaded.some((a) => a.name.includes('Owner-') || a.name.includes('ဦးကျော်') || a.name.includes('ကိုစိုး') || a.pin === '1234') || loaded.length === 0)) {
      return INITIAL_ADMINS;
    }
    return loaded;
  });

  const [activeAdminId, setActiveAdminId] = useState<string>(() => {
    return safeStorage.getString('tl_active_admin_id', 'admin-1');
  });

  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>(() => {
    const loaded = safeStorage.get<PaymentAccount[]>('tl_payment_accounts', INITIAL_PAYMENT_ACCOUNTS);
    if (Array.isArray(loaded) && (loaded.some((a) => a.accountName.includes('ဦးကျော်') || a.accountName.includes('ဒေါ်မြတ်') || a.accountNumber.includes('09791234567') || a.accountNumber.includes('******9569')) || loaded.length === 0)) {
      return INITIAL_PAYMENT_ACCOUNTS;
    }
    return loaded;
  });

  const [tickets, setTickets] = useState<Ticket[]>(() => {
    return safeStorage.get<Ticket[]>('tl_tickets', INITIAL_TICKETS);
  });

  const [sales, setSales] = useState<SaleRecord[]>(() => {
    return safeStorage.get<SaleRecord[]>('tl_sales', INITIAL_SALES);
  });

  const [results, setResults] = useState<DrawResult[]>(() => {
    const loaded = safeStorage.get<DrawResult[]>('tl_results', INITIAL_RESULTS);
    if (
      !Array.isArray(loaded) ||
      loaded.length === 0 ||
      loaded.some((r) => r.firstPrize === '095867' || r.firstPrize === '582914' || r.firstPrize === '394820' || r.firstPrize === '439812') ||
      !loaded.some((r) => r.firstPrize === '004615' && r.secondPrizes?.includes('259239'))
    ) {
      safeStorage.set('tl_results', INITIAL_RESULTS);
      return INITIAL_RESULTS;
    }
    return loaded;
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
    return 15000; // 15,000 MMK default fixed price requested by user
  });

  const [archivedDrawDates, setArchivedDrawDates] = useState<string[]>(() => {
    return safeStorage.get<string[]>('tl_archived_draw_dates', ['2026-08-01']);
  });

  // Navigation & Filter states: Customer starts on 'self-select'
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const saved = safeStorage.getString('tl_active_tab', '');
    if (saved) return saved as AppTab;
    const savedRole = safeStorage.getString('tl_user_role', 'customer');
    return savedRole === 'customer' ? 'self-select' : 'inventory';
  });

  const [selectedDrawDate, setSelectedDrawDate] = useState<string>(() => {
    return safeStorage.getString('tl_selected_draw_date', '2026-08-16');
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

  // Admin Payment Verification Modal state (for confirming temporary sold out / reserved tickets with slip screenshots)
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [ticketToVerify, setTicketToVerify] = useState<Ticket | null>(null);
  const [saleToVerify, setSaleToVerify] = useState<SaleRecord | null>(null);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Supabase Real-time Sync State
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting');
  const isRemoteSyncRef = React.useRef(false);
  const isInitialLoadDoneRef = React.useRef(false);

  // 1. Initial Data Fetch & Real-time Subscription with Supabase Database
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initSupabase = async () => {
      setSyncStatus('connecting');
      try {
        const cloudData = await fetchSupabaseData();
        if (cloudData && Object.keys(cloudData).length > 0) {
          isRemoteSyncRef.current = true;
          if (cloudData.tickets) setTickets(cloudData.tickets);
          if (cloudData.sales) setSales(cloudData.sales);
          if (cloudData.results) setResults(cloudData.results);
          if (cloudData.paymentAccounts) setPaymentAccounts(cloudData.paymentAccounts);
          if (cloudData.admins) setAdmins(cloudData.admins);
          if (cloudData.selectedDrawDate) setSelectedDrawDate(cloudData.selectedDrawDate);
          if (typeof cloudData.exchangeRate === 'number') setExchangeRate(cloudData.exchangeRate);
          if (typeof cloudData.fixedTicketPriceMMK === 'number') setFixedTicketPriceMMK(cloudData.fixedTicketPriceMMK);
          if (cloudData.archivedDrawDates) setArchivedDrawDates(cloudData.archivedDrawDates);
          setTimeout(() => {
            isRemoteSyncRef.current = false;
          }, 300);
          setSyncStatus('connected');
        } else {
          // Table is clean/new, push current state to seed Supabase database
          await pushFullStateToSupabase({
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
          setSyncStatus('connected');
        }

        // Subscribe to live Postgres changes on `lottery_data`
        unsubscribe = subscribeToSupabaseRealtime((updated) => {
          isRemoteSyncRef.current = true;
          if (updated.tickets) setTickets(updated.tickets);
          if (updated.sales) setSales(updated.sales);
          if (updated.results) setResults(updated.results);
          if (updated.paymentAccounts) setPaymentAccounts(updated.paymentAccounts);
          if (updated.admins) setAdmins(updated.admins);
          if (updated.selectedDrawDate) setSelectedDrawDate(updated.selectedDrawDate);
          if (typeof updated.exchangeRate === 'number') setExchangeRate(updated.exchangeRate);
          if (typeof updated.fixedTicketPriceMMK === 'number') setFixedTicketPriceMMK(updated.fixedTicketPriceMMK);
          if (updated.archivedDrawDates) setArchivedDrawDates(updated.archivedDrawDates);
          setTimeout(() => {
            isRemoteSyncRef.current = false;
          }, 300);
        }, setSyncStatus);

        isInitialLoadDoneRef.current = true;
      } catch (err) {
        console.error('Supabase initialization error:', err);
        setSyncStatus('offline');
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
      if (cloudData.tickets) setTickets(cloudData.tickets);
      if (cloudData.sales) setSales(cloudData.sales);
      if (cloudData.results) setResults(cloudData.results);
      if (cloudData.paymentAccounts) setPaymentAccounts(cloudData.paymentAccounts);
      if (cloudData.admins) setAdmins(cloudData.admins);
      if (cloudData.selectedDrawDate) setSelectedDrawDate(cloudData.selectedDrawDate);
      if (typeof cloudData.exchangeRate === 'number') setExchangeRate(cloudData.exchangeRate);
      if (typeof cloudData.fixedTicketPriceMMK === 'number') setFixedTicketPriceMMK(cloudData.fixedTicketPriceMMK);
      if (cloudData.archivedDrawDates) setArchivedDrawDates(cloudData.archivedDrawDates);
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

  // Sync to LocalStorage & Supabase Database whenever state changes
  useEffect(() => {
    safeStorage.set('tl_admins', admins);
    if (!isRemoteSyncRef.current && isInitialLoadDoneRef.current) {
      saveRecordToSupabase('admins', admins);
    }
  }, [admins]);

  useEffect(() => {
    safeStorage.set('tl_active_admin_id', activeAdminId);
  }, [activeAdminId]);

  useEffect(() => {
    safeStorage.set('tl_payment_accounts', paymentAccounts);
    if (!isRemoteSyncRef.current && isInitialLoadDoneRef.current) {
      saveRecordToSupabase('payment_accounts', paymentAccounts);
    }
  }, [paymentAccounts]);

  useEffect(() => {
    safeStorage.set('tl_tickets', tickets);
    if (!isRemoteSyncRef.current && isInitialLoadDoneRef.current) {
      saveRecordToSupabase('tickets', tickets);
    }
  }, [tickets]);

  useEffect(() => {
    safeStorage.set('tl_sales', sales);
    if (!isRemoteSyncRef.current && isInitialLoadDoneRef.current) {
      saveRecordToSupabase('sales', sales);
    }
  }, [sales]);

  useEffect(() => {
    safeStorage.set('tl_results', results);
    if (!isRemoteSyncRef.current && isInitialLoadDoneRef.current) {
      saveRecordToSupabase('results', results);
    }
  }, [results]);

  useEffect(() => {
    safeStorage.set('tl_exchange_rate', exchangeRate.toString());
    safeStorage.set('tl_fixed_ticket_price_mmk', fixedTicketPriceMMK.toString());
    safeStorage.set('tl_archived_draw_dates', archivedDrawDates);
    safeStorage.set('tl_selected_draw_date', selectedDrawDate);
    if (!isRemoteSyncRef.current && isInitialLoadDoneRef.current) {
      saveRecordToSupabase('pricing', {
        exchangeRate,
        fixedTicketPriceMMK,
        selectedDrawDate,
        archivedDrawDates,
      });
    }
  }, [exchangeRate, fixedTicketPriceMMK, archivedDrawDates, selectedDrawDate]);

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
    if (applyToAllAvailable) {
      setTickets((prev) =>
        prev.map((t) => (t.status === 'available' ? { ...t, priceMMK: newPrice * (t.setCount || 1) } : t))
      );
    }
    showToast(`ထိုင်းထီ ၁ စောင် သတ်မှတ်ရောင်းစျေးကို ${newPrice.toLocaleString('en-US')} MMK သို့ ပြောင်းလဲသတ်မှတ်လိုက်ပါပြီ`);
  };

  const handleUpdatePaymentAccounts = (newAccounts: PaymentAccount[]) => {
    setPaymentAccounts(newAccounts);
    localStorage.setItem('tl_payment_accounts', JSON.stringify(newAccounts));
    showToast('ငွေပေးချေမှု အကောင့်များနှင့် QR များ အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ');
  };

  const handleUpdateAdmins = (newAdmins: AdminUser[]) => {
    setAdmins(newAdmins);
    localStorage.setItem('tl_admins', JSON.stringify(newAdmins));
    showToast('အက်ဒမင် စာရင်းနှင့် PIN နံပါတ်များကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ');
  };

  const handleUpdateSlipImage = (saleId: string, newSlipUrl: string) => {
    setSales((prev) =>
      prev.map((s) => (s.id === saleId ? { ...s, paymentSlipUrl: newSlipUrl } : s))
    );
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

    setTickets(updatedTickets);
    setSales([...newSales, ...sales]);

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
      id: `t-${Date.now()}-${index}`,
      status: 'available',
      createdAt: new Date().toISOString(),
    }));

    setTickets([...createdTickets, ...tickets]);
    showToast(`ထီလက်မှတ် အသစ် ${createdTickets.length} စောင် စာရင်းထဲသို့ ထည့်သွင်းပြီးပါပြီ`);
  };

  const handleTogglePaymentStatus = (saleId: string) => {
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
        showToast(
          nextStatus === 'paid'
            ? `ထီနံပါတ် ${s.ticketNumber} အတွက် ငွေရှင်းပြီးကြောင်း မှတ်တမ်းတင်လိုက်ပါပြီ`
            : `ထီနံပါတ် ${s.ticketNumber} အတွက် အကြွေးကျန်အဖြစ် ပြောင်းလဲလိုက်ပါပြီ`
        );
        return { ...s, paymentStatus: nextStatus };
      }
      return s;
    });
    setSales(updated);
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

    setTickets(updatedTickets);
    setSales(sales.filter((s) => s.id !== saleId));
    showToast(`ထီနံပါတ် ${saleToCancel.ticketNumber} ကို ထီစာရင်းထဲသို့ ပြန်လည်သွင်းယူပြီးပါပြီ`);
  };

  const handleDeleteSingleTicket = (ticket: Ticket) => {
    if (confirm(`ထီနံပါတ် "${ticket.number}" ကို စာရင်းမှ ဖျက်ပစ်ရန် သေချာပါသလား?`)) {
      setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
      setSales((prev) => prev.filter((s) => s.ticketId !== ticket.id && s.ticketNumber !== ticket.number));
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
    setSales(updatedSales);

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

    showToast(`ထီနံပါတ် ${updatedSale.ticketNumber} ၏ ဝယ်သူအချက်အလက်များကို အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ`);
    setEditSaleModalOpen(false);
    setSaleToEdit(null);
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
    setSales([]);
    const updatedTickets = tickets.map((t) => ({ ...t, status: 'available' as const }));
    setTickets(updatedTickets);
    localStorage.setItem('tl_sales', JSON.stringify([]));
    localStorage.setItem('tl_tickets', JSON.stringify(updatedTickets));
    showToast('ရောင်းရငွေ၊ အကြွေးကျန်ငွေ၊ အရောင်းမှတ်တမ်းနှင့် ဝယ်သူစာရင်းများကို အကုန် Reset ချပြီးပါပြီ');
  };

  const handleResetData = () => {
    if (confirm('နမူနာ ဒေတာများဖြင့် ပြန်လည်စတင်ရန် သေချာပါသလား?')) {
      setTickets(INITIAL_TICKETS);
      setSales(INITIAL_SALES);
      setResults(INITIAL_RESULTS);
      setPaymentAccounts(INITIAL_PAYMENT_ACCOUNTS);
      localStorage.removeItem('tl_tickets');
      localStorage.removeItem('tl_sales');
      localStorage.removeItem('tl_results');
      localStorage.removeItem('tl_payment_accounts');
      showToast('ဒေတာများကို မူလအတိုင်း ပြန်လည်ပြင်ဆင်ပြီးပါပြီ');
    }
  };

  const handleDeleteAllTickets = () => {
    setTickets([]);
    localStorage.setItem('tl_tickets', JSON.stringify([]));
    showToast('ထီလက်မှတ် စာရင်းအားလုံးကို ဖျက်ပစ်ပြီးပါပြီ');
  };

  const handleDeleteSoldTickets = () => {
    const remaining = tickets.filter(t => t.status !== 'sold');
    setTickets(remaining);
    localStorage.setItem('tl_tickets', JSON.stringify(remaining));
    showToast('ရောင်းပြီးသား ထီလက်မှတ်ဟောင်းများကို ရှင်းလင်းပြီးပါပြီ');
  };

  const handleSaveResult = useCallback((newResult: DrawResult) => {
    setResults((prev) => {
      const existingIdx = prev.findIndex((r) => r.drawDate === newResult.drawDate);
      if (existingIdx >= 0) {
        const current = prev[existingIdx];
        if (
          current.firstPrize === newResult.firstPrize &&
          current.backTwoDigits === newResult.backTwoDigits &&
          JSON.stringify(current.frontThreeDigits) === JSON.stringify(newResult.frontThreeDigits) &&
          JSON.stringify(current.backThreeDigits) === JSON.stringify(newResult.backThreeDigits) &&
          JSON.stringify(current.secondPrizes) === JSON.stringify(newResult.secondPrizes) &&
          JSON.stringify(current.thirdPrizes) === JSON.stringify(newResult.thirdPrizes)
        ) {
          return prev;
        }
        const copy = [...prev];
        copy[existingIdx] = newResult;
        return copy;
      }
      return [...prev, newResult];
    });
    showToast(`${newResult.drawDate} ထွက်ရက်အတွက် ထီပေါက်စဉ်များ သိမ်းဆည်းပြီးပါပြီ`);
  }, []);

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
