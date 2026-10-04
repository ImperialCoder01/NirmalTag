# NIRMALTAG — ITERATION 10 ANDROID AUTHENTICATION & ONBOARDING REPAIR REPORT

**Date**: October 4, 2026  
**Target Device**: Physical Android Phone `PJ7POB99FE89BAWS` (OPPO A15s, Android 10, API 29)  
**Firebase Project**: `nirmaltag` (Project #72818659470)  
**Status**: VERIFIED & PASSED  

---

## 1. EXECUTIVE SUMMARY & DEFECT REMEDIATION

In Iteration 10, a full forensic audit and user interface repair of the NirmalTag Android application (`com.nirmaltag.app`) was executed. Prior defects regarding initial screen scrolling, simulated Google sign-in fallback buttons, unvalidated role scope self-selection, and non-standard Google Sign-In presentation have been completely resolved.

| Defect / Requirement | Before Iteration 10 | Iteration 10 Fix | Physical Device Verification Status |
| :--- | :--- | :--- | :--- |
| **Initial Onboarding Screen CTA** | Single outer scroll view forced the primary CTA ("Get Started") off-screen on launch. | Outer container uses `Column(modifier = Modifier.fillMaxSize())` with a weighted scroll area and a fixed bottom `Surface` bar. CTA is 100% visible on launch without vertical scrolling. | **PASS** (Confirmed via UI hierarchy dump `bounds="[32,1464][688,1544]"` on 720x1544 display) |
| **Google Sign-In Button Design** | Non-standard custom button. | Standard `"Continue with Google"` button using standard 4-color Google "G" vector logo (`R.drawable.ic_google_logo`). | **PASS** |
| **Google Authentication Flow** | Triggered hardcoded fallback credential login without launching real Play Services picker. | Integrated Google Play Services Auth API (`GoogleSignInOptions.DEFAULT_SIGN_IN`, `GoogleSignInClient`, `rememberLauncherForActivityResult`). Launches real Android Google Account Picker. | **PASS** (Authenticated real user `vishalkumartripathi08@gmail.com` on physical phone) |
| **Google Sign-In Cancellation** | Fallback to fake login or auto-dashboard redirect. | Handles `RESULT_CANCELED` and `SIGN_IN_CANCELLED` by setting `authErrorMsg = "Google sign-in was cancelled."` and remaining strictly on `UserTypeAuthScreen`. | **PASS** |
| **Unnecessary Auth Screen Scrolling** | Unoptimized padding & large text fields forced vertical scrolling for email sign-in / sign-up. | Re-engineered layout with compact text fields, 10.dp padding, segmented role toggle tabs, and optimized card heights. All fields fit on screen without vertical scrolling. | **PASS** |
| **Privileged Role Self-Registration Safeguard** | Users could self-select administrative roles (`TAG_OFFICER`, `RWA_ADMIN`, `BWG_ADMIN`, `MCD_OFFICER`, `SYSTEM_ADMIN`) during registration. | Self-registration scoped strictly to `COLLECTOR` and `HOUSEHOLD`. Privileged roles are marked read-only / admin-provisioned with warning. | **PASS** |
| **Collector Queue Reactivity (Iter 9.17.5)** | Risk of breaking reactive Room flow for `0 pending` $\rightarrow$ `"All pickups synced"`, `1 pending` $\rightarrow$ `"1 pickup waiting to sync"`. | Preserved Room Database `getPendingCountFlow()` collectAsState binding without modification. | **PASS** (Verified `"All pickups synced"` state on physical device) |

---

## 2. ARCHITECTURAL CHANGES & DEPENDENCIES

### A. Dependencies Added (`android/app/build.gradle.kts`)
- `com.google.android.gms:play-services-auth:21.2.0`
- `androidx.credentials:credentials:1.3.0`
- `androidx.credentials:credentials-play-services-auth:1.3.0`
- `com.google.android.libraries.identity.googleid:googleid:1.1.1`

### B. Vector Asset Created
- `android/app/src/main/res/drawable/ic_google_logo.xml`: Official 4-color Google "G" vector icon (Red `#EA4335`, Blue `#4285F4`, Yellow `#FBBC05`, Green `#34A853`).

### C. UI & Authentication Flow (`MainActivity.kt`)
1. **`AppIntroScreen`**: Re-architected into a vertical weighted column where info cards scroll smoothly while the `"Get Started / Select User Role"` CTA remains pinned at the bottom.
2. **`UserTypeAuthScreen`**:
   - Initialized `GoogleSignInClient` using `GoogleSignInOptions.DEFAULT_SIGN_IN`.
   - Registered `rememberLauncherForActivityResult` with `ActivityResultContracts.StartActivityForResult()`.
   - Tapping `"Continue with Google"` launches Google Account Picker intent.
   - On account selection, acquires `idToken` (or account email) and authenticates via Firebase Auth `signInWithCredential`.
   - Cancellation retains state on `UserTypeAuthScreen` with clear user feedback.
   - Scoped role selector strictly to `COLLECTOR` and `HOUSEHOLD` for self-registration.

---

## 3. VERIFICATION & REPRODUCIBILITY

1. **Gradle Build & Compilation**:
   ```bash
   cmd.exe /c gradlew.bat assembleDebug
   # Result: BUILD SUCCESSFUL
   ```

2. **APK Installation on Physical Phone**:
   ```bash
   adb -s PJ7POB99FE89BAWS install -r app\build\outputs\apk\debug\NirmalTag.apk
   # Result: Success
   ```

3. **Runtime UI & Auth Verification**:
   - App Launched $\rightarrow$ Onboarding Screen CTA visible immediately (`bounds="[32,1464][688,1544]"`).
   - Tap CTA $\rightarrow$ Navigated to `UserTypeAuthScreen`. All fields visible without scrolling.
   - Tap `"Continue with Google"` $\rightarrow$ Real Google Account Picker UI opened on phone.
   - Selected Google Account `vishalkumartripathi08@gmail.com` $\rightarrow$ Authenticated and redirected to Household / Collector Portal with user email displayed.
   - Verified Collector queue reactivity: Displayed `"All pickups synced"` when Room pending count = 0.

4. **Automated Unit Tests**:
   ```bash
   cmd.exe /c gradlew.bat test
   # Result: BUILD SUCCESSFUL (54 actionable tasks executed/up-to-date)
   ```
