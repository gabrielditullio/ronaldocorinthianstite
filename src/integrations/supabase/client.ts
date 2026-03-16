import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://lsvkgowogmisayzwnnji.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxzdmtnb3dvZ21pc2F5endubmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNjU0MDksImV4cCI6MjA4NzY0MTQwOX0.-ft1ZH_Roh3VuBY4cxxz2OyFRks_Wz83g6JWAx69EF8";

let rateLimitedUntil = 0;

const rateLimitAwareFetch: typeof fetch = async (input, init) => {
  const now = Date.now();
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url;

  if (now < rateLimitedUntil && url.includes('/auth/v1/token')) {
    return new Response(JSON.stringify({ error: 'rate_limited_locally' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const response = await fetch(input, init);

  if (response.status === 429 && url.includes('/auth/v1/')) {
    rateLimitedUntil = Date.now() + 60_000;
    console.warn('[Supabase] Rate limited on auth — backing off 60s');
  }

  return response;
};

type SupabaseBrowserClient = SupabaseClient<Database>;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: rateLimitAwareFetch,
  },
});
