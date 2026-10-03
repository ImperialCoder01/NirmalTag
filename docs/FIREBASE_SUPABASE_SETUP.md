# NIRMALTAG — FIREBASE & SUPABASE INTEGRATION SETUP GUIDE

This document provides exact instructions for configuring first-class **Firebase Third-Party Authentication** in your Supabase Console.

---

## 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) -> Select Project **nirmaltag**.
2. Under **Project Settings** -> **General**, note your **Project ID**: `nirmaltag`.
3. Under **Authentication** -> **Sign-in method**, ensure **Email/Password** and **Google** sign-in providers are enabled.
4. Under **Settings** -> **Authorized domains**, add `nirmaltag.vercel.app` and `localhost`.

---

## 2. Supabase Console Setup (Third-Party Auth Integration)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) -> Select Project **ubphrqumpqdifupwbvpe**.
2. Go to **Authentication** -> **Providers** -> **Third-Party Auth / Firebase**.
3. Enable **Firebase Auth Provider**.
4. Enter your Firebase Project ID: `nirmaltag`.
5. Save Configuration.

> [!NOTE]
> When configured, Supabase automatically validates incoming Firebase ID Tokens passed in the `Authorization: Bearer <ID_TOKEN>` header or set via `createClient(URL, KEY, { accessToken })` on the Supabase JS client.

---

## 3. Firebase Custom Claim ({ role: "authenticated" })

For Supabase Data API to grant standard `authenticated` role access to Supabase RLS policies, Firebase users must have `{ role: "authenticated" }` in their JWT claims.

### Setting Custom Claim via Script:
1. Download a service account JSON key from Firebase Console -> **Project Settings** -> **Service accounts**.
2. Save it locally to `scripts/firebase/service-account-key.json` (*Never commit this file to git*).
3. Run:
   ```bash
   node scripts/firebase/set-authenticated-claim.mjs <USER_FIREBASE_UID>
   ```
