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
    const { data: primaryRow, error } = await supabase
      .from(SUPABASE_TABLE)
      .select('*')
      .eq('id', CURRENT_STATE_ROW_ID)
      .maybeSingle();

    if (error) {
      console.warn('[Supabase Fetch Error]:', error.message);
      return null;
    }

    if (primaryRow) {
      const content = extractRowData(primaryRow);
      if (content && typeof content === 'object') {
        const state: Partial<AppSyncState> = {
          tickets: Array.isArray(content.tickets) ? content.tickets : [],
          sales: Array.isArray(content.sales) ? content.sales : [],
          results: Array.isArray(content.results) ? content.results : [],
          paymentAccounts: Array.isArray(content.paymentAccounts) ? content.paymentAccounts : [],
          admins: Array.isArray(content.admins) ? content.admins : [],
          selectedDrawDate: content.selectedDrawDate || '2026-09-01',
          exchangeRate: typeof content.exchangeRate === 'number' ? content.exchangeRate : 120,
          fixedTicketPriceMMK: typeof content.fixedTicketPriceMMK === 'number' ? content.fixedTicketPriceMMK : 15000,
          archivedDrawDates: Array.isArray(content.archivedDrawDates) ? content.archivedDrawDates : [],
          updatedAt: content.updatedAt,
        };
        return state;
      }
    }

    return null;
  } catch (err) {
    console.warn('[Supabase Fetch Notice]:', err);
    return null;
  }
}

/**
 * Direct save of all application state to Supabase `lottery_data` table as a single master row
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

    const { error } = await supabase
      .from(SUPABASE_TABLE)
      .upsert({
        id: CURRENT_STATE_ROW_ID,
        data: payload,
        updated_at: timestamp,
      }, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase Save Warning]:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[Supabase Direct Save Notice]:', err);
    return false;
  }
}

/**
 * Subscribe to real-time changes on the `lottery_data` table
 */
export function subscribeToSupabaseRealtime(
  onUpdate: (updatedState: Partial<AppSyncState>) => void,
  onStatusChange?: (status: SyncStatus) => void
) {
  onStatusChange?.('connected');

  const channelName = `lottery-sync-${Date.now()}`;

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

          const key = String(newRow.id || '').toLowerCase();
          if (key === CURRENT_STATE_ROW_ID) {
            const content = extractRowData(newRow);
            if (content && typeof content === 'object') {
              const partial: Partial<AppSyncState> = {
                tickets: Array.isArray(content.tickets) ? content.tickets : [],
                sales: Array.isArray(content.sales) ? content.sales : [],
                results: Array.isArray(content.results) ? content.results : [],
                paymentAccounts: Array.isArray(content.paymentAccounts) ? content.paymentAccounts : [],
                admins: Array.isArray(content.admins) ? content.admins : [],
                selectedDrawDate: content.selectedDrawDate,
                exchangeRate: content.exchangeRate,
                fixedTicketPriceMMK: content.fixedTicketPriceMMK,
                archivedDrawDates: content.archivedDrawDates,
                updatedAt: content.updatedAt,
              };
              onUpdate(partial);
            }
          }
        } catch (err) {
          console.error('[Supabase Realtime Event Error]:', err);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        onStatusChange?.('connected');
      } else if (status === 'CLOSED') {
        onStatusChange?.('offline');
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
