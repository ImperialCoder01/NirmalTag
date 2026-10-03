# NIRMALTAG — SUPABASE API KEY MIGRATION COMPLETED REPORT

**Migration Date**: October 4, 2026  
**Target Repository**: `ImperialCoder01/NirmalTag`  
**Current HEAD Commit**: `ba4b0a6eeecd4d3f2853a50a00769d6336a591ba`  
**Branch**: `main`  

---

## 1. Executive Summary

The migration from the legacy Supabase anon JWT (`eyJ...`) to the new **Supabase Publishable Key** (`sb_publishable_...`) has been completed across all Android and Web clients in the NirmalTag codebase.

- **Publishable Key**: `<REDACTED>`
- **Gradle & Build Configuration**: Supplied locally via git-ignored `android/local.properties` (`supabase.publishable.key`) and injected into Android Kotlin code via `BuildConfig.SUPABASE_PUBLISHABLE_KEY`.
- **Web Configuration**: Supplied locally via git-ignored `web/.env.local` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- **Legacy Anon JWT Search**: **ZERO** active references remain in current source code files.

---

## 2. Header & Auth Architecture

```
HTTP Transmission Contract:
├── apikey: BuildConfig.SUPABASE_PUBLISHABLE_KEY (sb_publishable_...)
└── Authorization: Bearer <FRESH_FIREBASE_ID_TOKEN> (Dynamic runtime user JWT)
```

1. **`apikey` Header**: Uses the Supabase Publishable Key (`sb_publishable_...`). It identifies the public client application and respects PostgreSQL Row-Level Security (RLS).
2. **`Authorization` Header**: Uses the dynamic RS256 Firebase ID Token acquired at runtime via `FirebaseAuth.getInstance().currentUser.getIdToken(true)`.
3. **Strict Separation**: The publishable key is NEVER used as the Authorization Bearer token, and the Firebase ID token is NEVER placed in the `apikey` header.

---

## 3. Comprehensive Verification Matrix

| Diagnostic / Task Item | Status | Empirical Evidence / Verification |
|---|---|---|
| **Files Changed** | **PASS** | Updated `android/app/build.gradle.kts`, `PickupSyncWorker.kt`, `web/scripts/pre_deployment_snapshot.mjs`, `web/tests/adversarial_security.test.mjs`, `web/tests/live_tag_supply_chain.test.mjs` |
| **Gradle Key Injection** | **PASS** | `buildConfigField("String", "SUPABASE_PUBLISHABLE_KEY", ...)` loads from `local.properties` |
| **Bearer Header Integrity** | **PASS** | `Authorization: Bearer <Firebase_ID_Token>` strictly maintained |
| **apikey Header Integrity** | **PASS** | `apikey` header uses `BuildConfig.SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`) |
| **Legacy Anon JWT Search** | **PASS** | `git grep -n "eyJ"` returned 0 matches in source files |
| **Admin Credential Audit** | **PASS** | Zero `service_role`, `sb_secret_`, `SUPABASE_ACCESS_TOKEN`, or `sbp_` keys present |
| **Secret Scan Result** | **PASS** | Zero secrets or private keys exposed in source tree or APK build |
| **Android Unit Tests** | **PASS** | 24 / 24 tests passed (`.\gradlew.bat test`) |
| **Android Debug Build** | **PASS** | BUILD SUCCESSFUL (`.\gradlew.bat assembleDebug`) |
| **Android Instrumentation** | **PASS** | 3 / 3 tests passed (`.\gradlew.bat connectedDebugAndroidTest` on `emulator-5554`) |
| **Web Unit Tests** | **PASS** | 39 / 39 tests passed (`node --test web/tests/*.test.mjs`) |
| **Web Build** | **PASS** | 28 static & dynamic routes compiled (`npm run build`) |
