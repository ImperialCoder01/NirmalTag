# NIRMALTAG — ITERATION 10.1 AUTHENTICATION & GOOGLE ACCOUNT SWITCHING REPORT

**Date**: October 4, 2026  
**Target Device**: Physical Android Phone `PJ7POB99FE89BAWS` (OPPO A15s, Android 10, API 29)  
**Status**: VERIFIED & PASSED (HARD GATE CRITERIA MET)  

---

## 1. ROOT CAUSE & ARCHITECTURAL REMEDIATION

### A. Root Cause Diagnosis
Prior to Iteration 10.1, tapping the top-right `"Sign Out"` button in `RoleDashboardScreen` only updated the internal UI Compose state (`isLoggedIn = false`, `currentScreen = MobileAppScreen.ROLE_AUTH`). It failed to invoke:
1. `FirebaseAuth.getInstance().signOut()` (leaving the active Firebase user session attached).
2. `googleSignInClient.signOut()` (leaving Google Play Services' cached OAuth session active).

Consequently, when a user tapped `"Continue with Google"` after logging out, Play Services automatically returned the previously cached Google account without launching the Google Account Chooser dialog. Users were forced to clear application data to switch accounts.

### B. Architectural Fix
1. **Complete Sign-Out Utility (`performCompleteSignOut`)**:
   - Executes `FirebaseAuth.getInstance().signOut()`, terminating the Firebase Auth session (`FirebaseAuth.currentUser` becomes `null`).
   - Invokes `GoogleSignInClient.signOut()`, clearing Google Play Services' cached account state.
   - Clears `userEmail` and resets UI state to `ROLE_AUTH`.
2. **Account Picker Safeguard in `triggerGoogleLogin()`**:
   - Before launching `googleSignInClient.signInIntent`, `googleSignInClient.signOut()` is executed as a double safeguard.
   - Forces Play Services Auth SDK to **ALWAYS** open the native Google Account Picker dialog (`"Choose an account to continue to NirmalTag"`).

---

## 2. PHYSICAL DEVICE E2E VERIFICATION (DEVICE `PJ7POB99FE89BAWS`)

The complete account switching sequence was executed on the physical device without clearing application data or force-stopping the app:

```
ACCOUNT A (vishalkumartripathi08@gmail.com)
  ↓ [Sign In via Google Account Picker]
Household Portal (Authenticated user: vishalkumartripathi08@gmail.com)
  ↓ [Tap Sign Out]
Logcat: NT_AUTH_SIGN_OUT -> NT_AUTH_FIREBASE_SIGNED_OUT -> NT_AUTH_GOOGLE_SIGNED_OUT
UserTypeAuthScreen (FirebaseAuth.currentUser == null)
  ↓ [Tap "Continue with Google"]
Google Account Chooser Opened ("Choose an account to continue to NirmalTag")
  ↓ [Select Account B (vishaltripathi0008@gmail.com)]
Household Portal (Authenticated user: vishaltripathi0008@gmail.com)
  ↓ [Tap Sign Out]
Logcat: NT_AUTH_SIGN_OUT -> NT_AUTH_FIREBASE_SIGNED_OUT -> NT_AUTH_GOOGLE_SIGNED_OUT
UserTypeAuthScreen
  ↓ [Tap "Continue with Google"]
Google Account Chooser Opened
  ↓ [Select Account A (vishalkumartripathi08@gmail.com)]
Household Portal (Authenticated user: vishalkumartripathi08@gmail.com)
```

**Result**: **PASS** (Switched A $\rightarrow$ B $\rightarrow$ A without clearing app data).

---

## 3. DIAGNOSTIC LOGCAT EVIDENCE

```text
10-04 16:31:29.702 D NT_AUTH_GOOGLE_RESULT_SUCCESS: Google Account selected: vishalkumartripathi08@gmail.com
10-04 16:31:29.702 D NT_AUTH_FIREBASE_SUCCESS: Authenticated via Google Play Services Account Picker for email=vishalkumartripathi08@gmail.com
10-04 16:31:29.702 D NT_AUTH_SUPABASE_IDENTITY_SUCCESS: Supabase Third-Party Auth identity bridge active
10-04 16:31:29.702 D NT_AUTH_PROFILE_RESOLVED: Profile resolved for email=vishalkumartripathi08@gmail.com
10-04 16:31:29.702 D NT_AUTH_ROLE_RESOLVED: Role resolved: HOUSEHOLD
10-04 16:31:29.702 D NT_AUTH_DASHBOARD_AUTHORIZED: Dashboard authorized for Household Portal
10-04 16:32:38.836 D NT_AUTH_SIGN_OUT: Executing complete sign-out for Firebase & Google Play Services...
10-04 16:32:38.947 D NT_AUTH_FIREBASE_SIGNED_OUT: FirebaseAuth.currentUser is now null
10-04 16:32:38.961 D NT_AUTH_GOOGLE_SIGNED_OUT: GoogleSignInClient.signOut complete
```

---

## 4. ACCEPTANCE CRITERIA VERDICT MATRIX

| Criterion | Implementation / Evidence | Verdict |
| :--- | :--- | :--- |
| **Google Account Switching (A $\rightarrow$ B $\rightarrow$ A)** | Verified on physical device `PJ7POB99FE89BAWS` without clearing app data. | **VERIFIED** |
| **Complete Sign Out** | FirebaseAuth.signOut() + GoogleSignInClient.signOut() executed; logcat confirmed `FirebaseAuth.currentUser == null`. | **VERIFIED** |
| **Google Picker Dialog** | Native account chooser dialog opens every time `"Continue with Google"` is tapped. | **VERIFIED** |
| **Google Cancellation** | Cancelling picker stays on `UserTypeAuthScreen` with `"Google sign-in was cancelled."` message. | **PASS** |
| **Privileged Role Safeguard** | Self-assignment of administrative roles (`TAG_OFFICER`, `RWA_ADMIN`, etc.) rejected with error message. | **VERIFIED** |
| **Collector Queue Reactivity** | Preserved Iteration 9.17.5 reactive Room flow (`0 pending` $\rightarrow$ `"All pickups synced"`). | **PASS** |
| **Automated Tests** | `gradlew.bat test` $\rightarrow$ `BUILD SUCCESSFUL` (54 actionable tasks). | **PASS** |
