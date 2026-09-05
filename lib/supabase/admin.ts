import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Privileged Supabase client using the SERVICE ROLE key. This bypasses RLS
// and can write to any user's metadata, so it must NEVER be imported into
// client-side code — only use it inside Route Handlers, after you've
// independently verified the request server-side (e.g. a confirmed
// Paystack payment). Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
