# NIRMALTAG — ITERATION 10.2 ANDROID AUTHENTICATION & ACCOUNT SWITCHING E2E VERIFICATION

**Date**: October 4, 2026  
**Scope**: Android Mobile Application (`com.nirmaltag.app`) Authentication, Google Account Switching, Email Sign-In, Email Sign-Up, and Physical Device Runtime Proof  
**Target Hardware**: Physical Android Phone `PJ7POB99FE89BAWS` (OPPO A15s, Android 10, API 29)  
**Status**: VERIFIED & PASS  

---

## 1. GOOGLE ACCOUNT SWITCHING BUG FORENSIC & RESOLUTION

### A. Symptom Identified in Previous Iterations
Previously, signing out of the Android application and tapping "Continue with Google" immediately re-authenticated the previous Google account without opening the native Google Account Picker chooser modal. Switching accounts required clearing app data or force-stopping the application.

### B. Root Cause Analysis
The Sign Out action in Compose UI previously updated local UI state (`isLoggedIn = false`) but failed to call `FirebaseAuth.getInstance().signOut()` and `googleSignInClient.signOut()`. Consequently, Google Play Services retained cached OAuth tokens in memory and auto-selected the cached account on subsequent login attempts.

### C. Architectural Repair Implemented
1. **`performCompleteSignOut(context)` Method**:
   - Implemented in `MainActivity.kt` to perform an explicit, full session teardown:
     ```kotlin
     FirebaseAuth.getInstance().signOut()
     val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
         .requestIdToken(getString(R.string.default_web_client_id))
         .requestEmail()
         .build()
     GoogleSignIn.getClient(context, gso).signOut()
     ```
2. **Pre-Launch Sign Out Safeguard**:
   - In `triggerGoogleLogin()`, `googleSignInClient.signOut()` is called immediately before launching `signInIntent`. This guarantees that Google Play Services always invalidates local token cache and opens the native account selection modal every time "Continue with Google" is tapped.

---

## 2. PHYSICAL DEVICE RUNTIME VERIFICATION (OPPO A15s)

The Google Account Switching flow was tested on physical hardware (`PJ7POB99FE89BAWS`):

```text
Step 1: Authenticate with Google Account A (vishalkumartripathi08@gmail.com)
        Result: Successful authentication -> Reaches Collector Dashboard.
        Logcat: NT_AUTH_FIREBASE_SIGNED_IN

Step 2: Tap Sign Out Button
        Result: UI resets to Auth Screen.
        Logcat: NT_AUTH_FIREBASE_SIGNED_OUT
        Logcat: NT_AUTH_GOOGLE_SIGNED_OUT

Step 3: Tap "Continue with Google"
        Result: Native Google Account Picker modal opens displaying all Google accounts on the device.

Step 4: Select Google Account B (vishaltripathi0008@gmail.com)
        Result: Successful authentication -> Reaches Collector Dashboard as Account B.
        Logcat: NT_AUTH_FIREBASE_SIGNED_IN (UID B)

Step 5: Tap Sign Out Button again
        Result: Session cleared cleanly.

Step 6: Tap "Continue with Google" and select Google Account A
        Result: Re-authenticates as Account A cleanly.
```

**Zero app data clears, reinstalls, or force-stops were required.**

---

## 3. EMAIL AUTHENTICATION & UI AUDIT

| Authentication Flow | Screen / Component | Features & Validations | Hardware Verification Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Email Sign In** | `EmailSignInScreen.kt` | Compact single-screen layout (no vertical scrolling required), email format validation, password input with toggle visibility, error feedback. | Physical OPPO A15s | **VERIFIED** |
| **Email Sign Up** | `EmailSignUpScreen.kt` | Compact layout, full name input, email validation, password strength validation, role selection limited to `HOUSEHOLD` / `COLLECTOR`. | Physical OPPO A15s | **VERIFIED** |
| **Google Cancellation** | `MainActivity.kt` | User taps back or cancels Google Account Picker chooser dialog. App cleanly stays on Auth screen without crashing or hanging. | Physical OPPO A15s | **PASS** |
| **Privileged Protection**| `UserTypeAuthScreen` | Privileged roles (`TAG_OFFICER`, `RWA_ADMIN`, `BWG_ADMIN`, `MCD_OFFICER`, `SYSTEM_ADMIN`) are hidden from user sign-up choice. | Physical OPPO A15s | **VERIFIED** |
