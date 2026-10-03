import { createClient } from "@supabase/supabase-js";

/**
 * Server-Only Administrative Supabase Client.
 * Uses `SUPABASE_SERVICE_ROLE_KEY` for backend API operations requiring full access.
 * NEVER import this file into browser components.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ubphrqumpqdifupwbvpe.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "demo-key";

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
