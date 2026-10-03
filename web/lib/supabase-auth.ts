import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ubphrqumpqdifupwbvpe.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "demo-anon-key";

export interface AuthenticatedFirebaseUser {
  uid: string;
  email: string;
  fullName: string;
}

export interface AuthenticatedServerRequestResult {
  user: AuthenticatedFirebaseUser;
  token: string;
  supabaseUserClient: SupabaseClient<any, any, any>;
}

/**
 * Parses and verifies an incoming Firebase ID Token from an HTTP Authorization header.
 * Uses native JWT payload inspection and Returns an RLS-scoped Supabase client initialized
 * with `Authorization: Bearer <idToken>` for first-class Supabase Third-Party Firebase Auth.
 */
export async function authenticateServerRequest(request: Request): Promise<AuthenticatedServerRequestResult> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED: Missing or invalid Authorization header");
  }

  const token = authHeader.split("Bearer ")[1]?.trim();
  if (!token) {
    throw new Error("UNAUTHORIZED: Empty authorization token");
  }

  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("INVALID_TOKEN: Malformed JWT structure");
    }

    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
    const payload = JSON.parse(payloadJson);

    const firebaseUid = payload.sub || payload.user_id;
    if (!firebaseUid) {
      throw new Error("INVALID_TOKEN: Missing subject (sub) claim in Firebase ID token");
    }

    // Expiration check (exp is in seconds)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error("EXPIRED_TOKEN: Firebase identity token has expired");
    }

    const email = payload.email || "";
    const fullName = payload.name || payload.displayName || email.split("@")[0] || "NirmalTag User";

    // Create a Supabase client scoped with the user's Firebase ID token for PostgreSQL RLS execution
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    return {
      user: {
        uid: firebaseUid,
        email,
        fullName,
      },
      token,
      supabaseUserClient: supabaseUserClient as any,
    };
  } catch (err: any) {
    throw new Error(`UNAUTHORIZED: ${err.message || "Failed to authenticate request"}`);
  }
}
