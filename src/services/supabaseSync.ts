import { supabase, SUPABASE_TABLE } from './supabaseClient';
import { Ticket, SaleRecord, DrawResult, AdminUser, PaymentAccount } from '../types';

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
}

export type SyncStatus = 'connecting' | 'connected' | 'syncing' | 'error' | 'offline';

// Helper to determine payload from row
function extractRowData(row: any): any {
  if (!row) return null;
  if (row.data !== undefined) return row.data;
  if (row.value !== undefined) return row.value;
  if (row.payload !== undefined) return row.payload;
  if (row.content !== undefined) return row.content;
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

    for (const row of data) {
      const key = String(row.id || row.key || row.name || '').toLowerCase();
      const content = extractRowData(row);

      if (key === 'tickets' || key === 'lottery_tickets') {
        if (Array.isArray(content)) state.tickets = content;
        else if (content && Array.isArray(content.tickets)) state.tickets = content.tickets;
      } else if (key === 'sales' || key === 'sale_records') {
        if (Array.isArray(content)) state.sales = content;
        else if (content && Array.isArray(content.sales)) state.sales = content.sales;
      } else if (key === 'results' || key === 'draw_results') {
        if (Array.isArray(content)) state.results = content;
        else if (content && Array.isArray(content.results)) state.results = content.results;
      } else if (key === 'payment_accounts' || key === 'payment_methods') {
        if (Array.isArray(content)) state.paymentAccounts = content;
        else if (content && Array.isArray(content.paymentAccounts)) state.paymentAccounts = content.paymentAccounts;
      } else if (key === 'admins' || key === 'admin_users') {
        if (Array.isArray(content)) state.admins = content;
        else if (content && Array.isArray(content.admins)) state.admins = content.admins;
      } else if (key === 'pricing' || key === 'settings' || key === 'config') {
        if (typeof content === 'object' && content !== null) {
          if (typeof content.exchangeRate === 'number') state.exchangeRate = content.exchangeRate;
          if (typeof content.fixedTicketPriceMMK === 'number') state.fixedTicketPriceMMK = content.fixedTicketPriceMMK;
          if (content.selectedDrawDate) state.selectedDrawDate = content.selectedDrawDate;
          if (Array.isArray(content.archivedDrawDates)) state.archivedDrawDates = content.archivedDrawDates;
        }
      } else if (key === 'app_state' || key === 'main_state') {
        if (typeof content === 'object' && content !== null) {
          if (!state.tickets && Array.isArray(content.tickets)) state.tickets = content.tickets;
          if (!state.sales && Array.isArray(content.sales)) state.sales = content.sales;
          if (!state.results && Array.isArray(content.results)) state.results = content.results;
          if (!state.paymentAccounts && Array.isArray(content.paymentAccounts)) state.paymentAccounts = content.paymentAccounts;
          if (!state.admins && Array.isArray(content.admins)) state.admins = content.admins;
          if (!state.selectedDrawDate && content.selectedDrawDate) state.selectedDrawDate = content.selectedDrawDate;
          if (state.exchangeRate === undefined && typeof content.exchangeRate === 'number') state.exchangeRate = content.exchangeRate;
          if (state.fixedTicketPriceMMK === undefined && typeof content.fixedTicketPriceMMK === 'number') state.fixedTicketPriceMMK = content.fixedTicketPriceMMK;
          if (!state.archivedDrawDates && Array.isArray(content.archivedDrawDates)) state.archivedDrawDates = content.archivedDrawDates;
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
 * Upsert a key-value record into Supabase `lottery_data`
 */
export async function saveRecordToSupabase(key: string, data: any): Promise<boolean> {
  try {
    const record = {
      id: key,
      data: data,
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
    await Promise.allSettled([
      saveRecordToSupabase('tickets', state.tickets),
      saveRecordToSupabase('sales', state.sales),
      saveRecordToSupabase('pricing', {
        exchangeRate: state.exchangeRate,
        fixedTicketPriceMMK: state.fixedTicketPriceMMK,
        selectedDrawDate: state.selectedDrawDate,
        archivedDrawDates: state.archivedDrawDates,
      }),
      saveRecordToSupabase('payment_accounts', state.paymentAccounts),
      saveRecordToSupabase('admins', state.admins),
      saveRecordToSupabase('results', state.results),
    ]);
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

          if (key === 'tickets' || key === 'lottery_tickets') {
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
          } else if (key === 'app_state' || key === 'main_state') {
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
