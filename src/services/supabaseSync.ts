import { supabase, SUPABASE_TABLE } from './supabaseClient';
import { Ticket, SaleRecord, DrawResult, AdminUser, PaymentAccount } from '../types';

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
 * Fetch all lottery data from Supabase `lottery_data` table
 */
export async function fetchSupabaseData(): Promise<Partial<AppSyncState> | null> {
  try {
    const { data, error } = await supabase.from(SUPABASE_TABLE).select('*');
    if (error) {
      console.warn('Supabase fetch notice:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const state: Partial<AppSyncState> = {};

    // 1. Look for the primary single unified state row: `current_lottery_state`
    const currentStateRow = data.find((row) => {
      const rowId = String(row.id || row.key || row.name || '').toLowerCase();
      return rowId === CURRENT_STATE_ROW_ID || rowId === 'app_state' || rowId === 'main_state';
    });

    if (currentStateRow) {
      const content = extractRowData(currentStateRow);
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
    }

    // 2. Also parse individual key-value rows if some fields were stored separately
    for (const row of data) {
      const key = String(row.id || row.key || row.name || '').toLowerCase();
      const content = extractRowData(row);

      if (key === 'tickets' || key === 'lottery_tickets') {
        if (Array.isArray(content) && !state.tickets) state.tickets = content;
        else if (content && Array.isArray(content.tickets) && !state.tickets) state.tickets = content.tickets;
      } else if (key === 'sales' || key === 'sale_records') {
        if (Array.isArray(content) && !state.sales) state.sales = content;
        else if (content && Array.isArray(content.sales) && !state.sales) state.sales = content.sales;
      } else if (key === 'results' || key === 'draw_results') {
        if (Array.isArray(content) && !state.results) state.results = content;
        else if (content && Array.isArray(content.results) && !state.results) state.results = content.results;
      } else if (key === 'payment_accounts' || key === 'payment_methods') {
        if (Array.isArray(content) && !state.paymentAccounts) state.paymentAccounts = content;
        else if (content && Array.isArray(content.paymentAccounts) && !state.paymentAccounts) state.paymentAccounts = content.paymentAccounts;
      } else if (key === 'admins' || key === 'admin_users') {
        if (Array.isArray(content) && !state.admins) state.admins = content;
        else if (content && Array.isArray(content.admins) && !state.admins) state.admins = content.admins;
      } else if (key === 'pricing' || key === 'settings' || key === 'config') {
        if (typeof content === 'object' && content !== null) {
          if (typeof content.exchangeRate === 'number' && state.exchangeRate === undefined) state.exchangeRate = content.exchangeRate;
          if (typeof content.fixedTicketPriceMMK === 'number' && state.fixedTicketPriceMMK === undefined) state.fixedTicketPriceMMK = content.fixedTicketPriceMMK;
          if (content.selectedDrawDate && !state.selectedDrawDate) state.selectedDrawDate = content.selectedDrawDate;
          if (Array.isArray(content.archivedDrawDates) && !state.archivedDrawDates) state.archivedDrawDates = content.archivedDrawDates;
        }
      }
    }

    return Object.keys(state).length > 0 ? state : null;
  } catch (err) {
    console.error('Error fetching Supabase data:', err);
    return null;
  }
}

/**
 * Upsert the entire unified application state into Supabase with id: 'current_lottery_state'
 */
export async function saveEntireStateToSupabase(state: AppSyncState): Promise<boolean> {
  try {
    const payload = {
      tickets: state.tickets,
      sales: state.sales,
      results: state.results,
      paymentAccounts: state.paymentAccounts,
      admins: state.admins,
      selectedDrawDate: state.selectedDrawDate,
      exchangeRate: state.exchangeRate,
      fixedTicketPriceMMK: state.fixedTicketPriceMMK,
      archivedDrawDates: state.archivedDrawDates,
      updatedAt: new Date().toISOString(),
    };

    const record = {
      id: CURRENT_STATE_ROW_ID,
      data: payload,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from(SUPABASE_TABLE).upsert(record, { onConflict: 'id' });
    if (!error) return true;

    // Fallback if table schema uses alternate column naming (key/value)
    const altRecord = { key: CURRENT_STATE_ROW_ID, value: payload };
    const { error: altError } = await supabase.from(SUPABASE_TABLE).upsert(altRecord);
    if (!altError) return true;

    console.warn('Supabase saveEntireState error:', error?.message || altError?.message);
    return false;
  } catch (err) {
    console.error('Failed to save entire state to Supabase:', err);
    return false;
  }
}

/**
 * Upsert a key-value record into Supabase `lottery_data`
 */
export async function saveRecordToSupabase(key: string, data: any): Promise<boolean> {
  try {
    const record = {
      id: key,
      data: data,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from(SUPABASE_TABLE).upsert(record, { onConflict: 'id' });
    if (!error) return true;

    // Fallback if table uses alternate column names
    const altRecord = { key: key, value: data };
    const { error: altError } = await supabase.from(SUPABASE_TABLE).upsert(altRecord);
    if (!altError) return true;

    console.warn('Supabase upsert warning:', error?.message || altError?.message);
    return false;
  } catch (err) {
    console.error('Failed to save to Supabase:', err);
    return false;
  }
}

/**
 * Push full current state to Supabase to initialize or sync
 */
export async function pushFullStateToSupabase(state: AppSyncState): Promise<void> {
  try {
    await saveEntireStateToSupabase(state);
  } catch (err) {
    console.error('Error pushing full state to Supabase:', err);
  }
}

/**
 * Subscribe to real-time changes on the `lottery_data` table
 */
export function subscribeToSupabaseRealtime(
  onUpdate: (updatedState: Partial<AppSyncState>) => void,
  onStatusChange?: (status: SyncStatus) => void
) {
  onStatusChange?.('connecting');

  // Unique channel identifier per connection to avoid reusing an already subscribed channel
  const channelName = `lottery-realtime-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
            }
          } else if (key === 'tickets' || key === 'lottery_tickets') {
            if (Array.isArray(content)) partial.tickets = content;
          } else if (key === 'sales' || key === 'sale_records') {
            if (Array.isArray(content)) partial.sales = content;
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
          console.error('Error handling realtime event:', err);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        onStatusChange?.('connected');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onStatusChange?.('error');
      } else if (status === 'CLOSED') {
        onStatusChange?.('offline');
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

