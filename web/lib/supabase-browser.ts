import { createClient } from "@supabase/supabase-js";
import { auth } from "./firebase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ubphrqumpqdifupwbvpe.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "demo-anon-key";

/**
 * Public Authenticated Supabase Browser Client.
 * Automatically injects the Firebase Auth ID Token as the Supabase accessToken
 * for first-class Third-Party Firebase Auth integration and RLS evaluation.
 */
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => {
    if (typeof window === "undefined") return null;
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    try {
      return await currentUser.getIdToken(false);
    } catch {
      return null;
    }
  },
});
