# NIRMALTAG v1.0.0 RELEASE NOTES

**Release Date**: October 4, 2026  
**Version**: `1.0.0` (Version Code: `1`)  
**Application ID**: `com.nirmaltag.app`  
**Status**: **DIRECT APK RELEASE — READY**  
**Web Deployment**: [https://nirmaltag.vercel.app](https://nirmaltag.vercel.app)  

---

## 🚀 OVERVIEW

NirmalTag v1.0.0 is the inaugural production release of the master civic-tech platform for sanitary and special-care waste segregation, QR tracking, doorstep collector processing, and municipal compliance reporting.

---

## 📱 ANDROID RELEASE ARTIFACTS

### Direct Distribution Release APK (Primary Release Artifact)
- **File Name**: `NirmalTag.apk`
- **Location**: `android/app/build/outputs/apk/release/NirmalTag.apk`
- **File Size**: `46,855,064 bytes` (~44.68 MB)
- **SHA-256 Checksum**:  
  `F249A146D6C613019FA628B2E0B323A754651D5DD19F7F2AF0193F54AE944319`

### Optional Play Store Bundle (Future Channel)
- **File Name**: `app-release.aab`
- **Location**: `android/app/build/outputs/bundle/release/app-release.aab`
- **File Size**: `26,429,374 bytes` (~25.20 MB)
- **SHA-256 Checksum**:  
  `8EB15BD30F9EC275E461469E88999056694C2CCB4709F0EF23400EE938044F4E`

---

## 🌟 KEY FEATURES INCLUDED

1. **Authentication & Multi-Account Switching**:
   - Firebase Email/Password & Google Sign-In across Android and Web.
   - Native Google account switching without clearing app data (Account A $\rightarrow$ Sign Out $\rightarrow$ Account B chooser $\rightarrow$ Sign Out $\rightarrow$ Account A).
2. **7 Canonical User Roles**:
   - `HOUSEHOLD`, `COLLECTOR`, `TAG_OFFICER`, `RWA_ADMIN`, `BWG_ADMIN`, `MCD_OFFICER`, `SYSTEM_ADMIN`.
3. **Collector Mobile Scanner (`NirmalTag.apk`)**:
   - CameraX + ML Kit QR barcode auto-scanner.
   - Local Room DB offline queueing (`WAITING_FOR_NETWORK`).
   - WorkManager background sync executing Supabase `pickup_transaction_rpc` with Firebase Bearer Tokens.
   - Server-side credit allocation (+10 pts household, +₹2.00 collector) with duplicate retry idempotency.
4. **Supply Chain & Inventory Management**:
   - Batch tag creation (1 to 5,000 tags), inventory search, household assignment, and tag replacement.
5. **Municipal Compliance & Reporting**:
   - RWA Segregation Compliance Index (%) calculations and incident reporting.
   - BWG daily waste volume logging and dynamic MCD Compliance Certificate generation.
   - MCD Ward Executive Command Dashboard and dispute resolution queue.
   - System Admin user directory search and RBAC role assignment.
6. **Security & DPDP Compliance**:
   - Supabase Row-Level Security (RLS) with Firebase UID identity bridge.
   - DPDP Act 2023 compliant Privacy Policy (`/privacy`), Terms of Use (`/terms`), Cookies Policy (`/cookies`), and Refund Policy (`/refund-policy`).

---

## ⚠️ AI CAPABILITY NOTICE

The trained domain-specific `.tflite` model asset is not bundled in this release (`MODEL_UNAVAILABLE`). The application transparently displays visual verification status without claiming trained AI inference.
