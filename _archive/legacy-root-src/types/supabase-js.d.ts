/**
 * Fallback type declarations for @supabase/supabase-js when the package
 * is not resolved by tsc (e.g. in some CI/Vercel environments with moduleResolution: bundler).
 * The runtime package must still be in dependencies and installed so Vite can bundle it.
 */
declare module '@supabase/supabase-js' {
  export interface RealtimeChannel {
    on(
      event: string,
      filter: Record<string, unknown>,
      callback: (payload?: unknown) => void
    ): RealtimeChannel;
    subscribe(callback: (status: string) => void): RealtimeChannel;
    untrack(): RealtimeChannel;
    unsubscribe(): RealtimeChannel;
    track(payload: unknown): RealtimeChannel;
    presenceState(): Record<string, unknown[]>;
    send(message: { type: string; event: string; payload?: unknown }): void;
  }

  export interface SupabaseClient {
    channel(name: string, options?: { config?: { presence?: { key?: string } } }): RealtimeChannel;
    removeChannel(channel: RealtimeChannel): void;
  }

  export function createClient(url: string, anonKey: string): SupabaseClient;
}
