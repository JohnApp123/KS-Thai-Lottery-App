import { supabase, SUPABASE_TABLE } from './supabaseClient';
import { Ticket, SaleRecord, DrawResult, AdminUser, PaymentAccount } from '../types';
import { INITIAL_TICKETS } from '../data/initialData';

export const CURRENT_STATE_ROW_ID = 'current_lottery_state';

export interface AppSyncState {
  tickets: Ticket[];
  sales: SaleRecord[];
  results: DrawResult[];
  paymentAccounts: PaymentAccount[];
  admins: AdminUser[];
  selectedDrawDate: string;
  exchangeRate: number;
  fixedTicketPriceMMK: number;
  archivedDrawDates: string[];
  updatedAt?: string;
}

export type SyncStatus = 'connecting' | 'connected' | 'syncing' | 'error' | 'offline';

// Helper to determine payload from row
function extractRowData(row: any): any {
  if (!row) return null;
  if (row.data !== undefined && row.data !== null) return row.data;
  if (row.value !== undefined && row.value !== null) return row.value;
  if (row.payload !== undefined && row.payload !== null) return row.payload;
  if (row.content !== undefined && row.content !== null) return row.content;
  return row;
}

/**
 * Fetch all lottery data from Supabase `lottery_data` table directly
 */
export async function fetchSupabaseData(): Promise<Partial<AppSyncState> | null> {
  try {
    console.log('[Supabase Direct Sync] Fetching live data from table:', SUPABASE_TABLE);
    
    // 1. Direct query for the primary unified state row
    const { data: primaryRow, error: primaryErr } = await supabase
      .from(SUPABASE_TABLE)
      .select('*')
      .eq('id', CURRENT_STATE_ROW_ID)
      .maybeSingle();

    if (!primaryErr && primaryRow) {
      const content = extractRowData(primaryRow);
      if (content && typeof content === 'object') {
        const state: Partial<AppSyncState> = {};
        if (Array.isArray(content.tickets)) state.tickets = content.tickets;
        if (Array.isArray(content.sales)) state.sales = content.sales;
        if (Array.isArray(content.results)) state.results = content.results;
        if (Array.isArray(content.paymentAccounts)) state.paymentAccounts = content.paymentAccounts;
        if (Array.isArray(content.admins)) state.admins = content.admins;
        if (content.selectedDrawDate) state.selectedDrawDate = content.selectedDrawDate;
        if (typeof content.exchangeRate === 'number') state.exchangeRate = content.exchangeRate;
        if (typeof content.fixedTicketPriceMMK === 'number') state.fixedTicketPriceMMK = content.fixedTicketPriceMMK;
        if (Array.isArray(content.archivedDrawDates)) state.archivedDrawDates = content.archivedDrawDates;
        if (content.updatedAt) state.updatedAt = content.updatedAt;

        console.log('[Supabase Direct Sync] Loaded unified state:', {
          ticketsCount: state.tickets?.length ?? 0,
          salesCount: state.sales?.length ?? 0,
          drawDate: state.selectedDrawDate,
        });
        return state;
      }
    }

    // 2. Fallback query across table if unified row is not yet initialized
    const { data, error } = await supabase.from(SUPABASE_TABLE).select('*').limit(20);
    if (error) {
      console.warn('[Supabase Fetch Warning]:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('[Supabase Direct Sync] No existing rows found in database.');
      return null;
    }

    const state: Partial<AppSyncState> = {};

    for (const row of data) {
      const key = String(row.id || row.key || row.name || '').toLowerCase();
      const content = extractRowData(row);

      if (key === CURRENT_STATE_ROW_ID || key === 'app_state' || key === 'main_state') {
        if (content && typeof content === 'object') {
          if (Array.isArray(content.tickets)) state.tickets = content.tickets;
          if (Array.isArray(content.sales)) state.sales = content.sales;
          if (Array.isArray(content.results)) state.results = content.results;
          if (Array.isArray(content.paymentAccounts)) state.paymentAccounts = content.paymentAccounts;
          if (Array.isArray(content.admins)) state.admins = content.admins;
          if (content.selectedDrawDate) state.selectedDrawDate = content.selectedDrawDate;
          if (typeof content.exchangeRate === 'number') state.exchangeRate = content.exchangeRate;
          if (typeof content.fixedTicketPriceMMK === 'number') state.fixedTicketPriceMMK = content.fixedTicketPriceMMK;
          if (Array.isArray(content.archivedDrawDates)) state.archivedDrawDates = content.archivedDrawDates;
          if (content.updatedAt) state.updatedAt = content.updatedAt;
        }
      } else if (key === 'tickets' || key === 'lottery_tickets') {
        if (Array.isArray(content) && state.tickets === undefined) state.tickets = content;
        else if (content && Array.isArray(content.tickets) && state.tickets === undefined) state.tickets = content.tickets;
      } else if (key === 'sales' || key === 'sale_records') {
        if (Array.isArray(content) && state.sales === undefined) state.sales = content;
        else if (content && Array.isArray(content.sales) && state.sales === undefined) state.sales = content.sales;
      } else if (key === 'results' || key === 'draw_results') {
        if (Array.isArray(content) && state.results === undefined) state.results = content;
        else if (content && Array.isArray(content.results) && state.results === undefined) state.results = content.results;
      } else if (key === 'payment_accounts' || key === 'payment_methods') {
        if (Array.isArray(content) && state.paymentAccounts === undefined) state.paymentAccounts = content;
        else if (content && Array.isArray(content.paymentAccounts) && state.paymentAccounts === undefined) state.paymentAccounts = content.paymentAccounts;
      } else if (key === 'admins' || key === 'admin_users') {
        if (Array.isArray(content) && state.admins === undefined) state.admins = content;
        else if (content && Array.isArray(content.admins) && state.admins === undefined) state.admins = content.admins;
      } else if (key === 'pricing' || key === 'settings' || key === 'config') {
        if (typeof content === 'object' && content !== null) {
          if (typeof content.exchangeRate === 'number' && state.exchangeRate === undefined) state.exchangeRate = content.exchangeRate;
          if (typeof content.fixedTicketPriceMMK === 'number' && state.fixedTicketPriceMMK === undefined) state.fixedTicketPriceMMK = content.fixedTicketPriceMMK;
          if (content.selectedDrawDate && !state.selectedDrawDate) state.selectedDrawDate = content.selectedDrawDate;
          if (Array.isArray(content.archivedDrawDates) && !state.archivedDrawDates) state.archivedDrawDates = content.archivedDrawDates;
        }
      }
    }

    console.log('[Supabase Direct Sync] Loaded state from fallback query:', {
      ticketsCount: state.tickets?.length ?? 'none',
      salesCount: state.sales?.length ?? 'none',
      drawDate: state.selectedDrawDate,
    });

    return Object.keys(state).length > 0 ? state : null;
  } catch (err) {
    console.warn('[Supabase Fetch Notice]:', err);
    return null;
  }
}

/**
 * Direct save of all application state to Supabase `lottery_data` table
 */
export async function saveEntireStateToSupabase(state: AppSyncState): Promise<boolean> {
  try {
    const timestamp = new Date().toISOString();
    const payload = {
      tickets: Array.isArray(state.tickets) ? state.tickets : [],
      sales: Array.isArray(state.sales) ? state.sales : [],
      results: Array.isArray(state.results) ? state.results : [],
      paymentAccounts: Array.isArray(state.paymentAccounts) ? state.paymentAccounts : [],
      admins: Array.isArray(state.admins) ? state.admins : [],
      selectedDrawDate: state.selectedDrawDate || '2026-09-01',
      exchangeRate: typeof state.exchangeRate === 'number' ? state.exchangeRate : 120,
      fixedTicketPriceMMK: typeof state.fixedTicketPriceMMK === 'number' ? state.fixedTicketPriceMMK : 15000,
      archivedDrawDates: Array.isArray(state.archivedDrawDates) ? state.archivedDrawDates : [],
      updatedAt: timestamp,
    };

    // Fast, lightweight multi-row upsert to ensure complete sync across query formats
    const upsertRows = [
      {
        id: CURRENT_STATE_ROW_ID,
        data: payload,
        updated_at: timestamp,
      },
      {
        id: 'tickets',
        data: payload.tickets,
        updated_at: timestamp,
      },
      {
        id: 'sales',
        data: payload.sales,
        updated_at: timestamp,
      },
      {
        id: 'payment_accounts',
        data: payload.paymentAccounts,
        updated_at: timestamp,
      },
      {
        id: 'pricing',
        data: {
          exchangeRate: payload.exchangeRate,
          fixedTicketPriceMMK: payload.fixedTicketPriceMMK,
          selectedDrawDate: payload.selectedDrawDate,
          archivedDrawDates: payload.archivedDrawDates,
        },
        updated_at: timestamp,
      }
    ];

    const { error } = await supabase
      .from(SUPABASE_TABLE)
      .upsert(upsertRows, { onConflict: 'id' });

    if (error) {
      // Fallback to single primary row upsert if batch encounters column differences
      const { error: fallbackErr } = await supabase
        .from(SUPABASE_TABLE)
        .upsert({
          id: CURRENT_STATE_ROW_ID,
          data: payload,
          updated_at: timestamp,
        }, { onConflict: 'id' });

      if (fallbackErr) {
        console.warn('[Supabase Save Warning]:', fallbackErr.message);
        return false;
      }
    }

    console.log('[Supabase Direct Save] Synced state with', payload.tickets.length, 'tickets');
    return true;
  } catch (err) {
    console.warn('[Supabase Direct Save Notice]:', err);
    return false;
  }
}

/**
 * Direct CRUD helper: Save tickets directly
 */
export async function directSaveTicketsToSupabase(tickets: Ticket[], allState: AppSyncState): Promise<boolean> {
  return saveEntireStateToSupabase({
    ...allState,
    tickets,
  });
}

/**
 * Direct CRUD helper: Save sales and tickets directly
 */
export async function directSaveSalesAndTicketsToSupabase(
  tickets: Ticket[],
  sales: SaleRecord[],
  allState: AppSyncState
): Promise<boolean> {
  return saveEntireStateToSupabase({
    ...allState,
    tickets,
    sales,
  });
}

/**
 * Subscribe to real-time changes on the `lottery_data` table
 */
export function subscribeToSupabaseRealtime(
  onUpdate: (updatedState: Partial<AppSyncState>) => void,
  onStatusChange?: (status: SyncStatus) => void
) {
  onStatusChange?.('connecting');

  const channelName = `lottery-realtime-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  console.log('[Supabase Realtime] Subscribing to channel:', channelName, 'for table:', SUPABASE_TABLE);

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: SUPABASE_TABLE,
      },
      (payload) => {
        try {
          console.log('[Supabase Realtime] Event received:', payload.eventType, (payload.new as any)?.id);
          const newRow = payload.new as any;
          if (!newRow) return;

          const key = String(newRow.id || newRow.key || newRow.name || '').toLowerCase();
          const content = extractRowData(newRow);

          const partial: Partial<AppSyncState> = {};

          if (
            key === CURRENT_STATE_ROW_ID ||
            key === 'app_state' ||
            key === 'main_state'
          ) {
            if (content && typeof content === 'object') {
              if (Array.isArray(content.tickets)) partial.tickets = content.tickets;
              if (Array.isArray(content.sales)) partial.sales = content.sales;
              if (Array.isArray(content.results)) partial.results = content.results;
              if (Array.isArray(content.paymentAccounts)) partial.paymentAccounts = content.paymentAccounts;
              if (Array.isArray(content.admins)) partial.admins = content.admins;
              if (content.selectedDrawDate) partial.selectedDrawDate = content.selectedDrawDate;
              if (typeof content.exchangeRate === 'number') partial.exchangeRate = content.exchangeRate;
              if (typeof content.fixedTicketPriceMMK === 'number') partial.fixedTicketPriceMMK = content.fixedTicketPriceMMK;
              if (Array.isArray(content.archivedDrawDates)) partial.archivedDrawDates = content.archivedDrawDates;
              if (content.updatedAt) partial.updatedAt = content.updatedAt;
              onUpdate(partial);
              return;
            }
          } else if (key === 'tickets' || key === 'lottery_tickets') {
            if (Array.isArray(content)) partial.tickets = content;
            else if (content && Array.isArray(content.tickets)) partial.tickets = content.tickets;
          } else if (key === 'sales' || key === 'sale_records') {
            if (Array.isArray(content)) partial.sales = content;
            else if (content && Array.isArray(content.sales)) partial.sales = content.sales;
          } else if (key === 'results' || key === 'draw_results') {
            if (Array.isArray(content)) partial.results = content;
          } else if (key === 'payment_accounts' || key === 'payment_methods') {
            if (Array.isArray(content)) partial.paymentAccounts = content;
          } else if (key === 'admins' || key === 'admin_users') {
            if (Array.isArray(content)) partial.admins = content;
          } else if (key === 'pricing' || key === 'settings' || key === 'config') {
            if (typeof content === 'object' && content !== null) {
              if (typeof content.exchangeRate === 'number') partial.exchangeRate = content.exchangeRate;
              if (typeof content.fixedTicketPriceMMK === 'number') partial.fixedTicketPriceMMK = content.fixedTicketPriceMMK;
              if (content.selectedDrawDate) partial.selectedDrawDate = content.selectedDrawDate;
              if (Array.isArray(content.archivedDrawDates)) partial.archivedDrawDates = content.archivedDrawDates;
            }
          }

          if (Object.keys(partial).length > 0) {
            onUpdate(partial);
          }
        } catch (err) {
          console.error('[Supabase Realtime Event Error]:', err);
        }
      }
    )
    .subscribe((status) => {
      console.log('[Supabase Realtime] Channel status:', status);
      if (status === 'SUBSCRIBED') {
        onStatusChange?.('connected');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onStatusChange?.('error');
      } else if (status === 'CLOSED') {
        onStatusChange?.('offline');
      }
    });

  return () => {
    console.log('[Supabase Realtime] Unsubscribing channel:', channelName);
    supabase.removeChannel(channel);
  };
}


