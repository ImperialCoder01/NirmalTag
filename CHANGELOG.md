# CHANGELOG

All notable changes to the **NirmalTag Civic Tech Platform** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-04

### Added
- **Authentication**: Native Firebase Email/Password & Google Sign-In with Android Credential Manager & Web SDK. Added multi-account Google switching on physical Android devices.
- **7 Canonical User Roles**: Implemented complete functionality for `HOUSEHOLD`, `COLLECTOR`, `TAG_OFFICER`, `RWA_ADMIN`, `BWG_ADMIN`, `MCD_OFFICER`, and `SYSTEM_ADMIN`.
- **Collector Android App**: Native Kotlin app featuring CameraX, ML Kit Barcode Scanning, Room local DB offline queue (`WAITING_FOR_NETWORK`), and WorkManager sync (`PickupSyncWorker`).
- **PostgreSQL Backend & Identity Bridge**: Hosted Supabase database with RLS policies mapping Firebase UIDs (`auth.jwt() -> 'sub'`). Added RPC procedures (`pickup_transaction_rpc`, `activate_household_tag`, `redeem_household_credits`, `create_tag_batch_and_records`, `assign_tag_to_household`, `replace_damaged_or_lost_tag`, `assign_user_role`).
- **Legal & Compliance**: Published DPDP Act 2023 compliant Privacy Policy (`/privacy`), Terms of Use (`/terms`), Cookies Policy (`/cookies`), and Refund Policy (`/refund-policy`).
- **Testing & Verification**: 54/54 web integration test suite, 54/54 android unit test suite, 39 prerendered Next.js web routes compiled cleanly.

### Fixed
- **PostgreSQL Error Codes**: Replaced hardcoded `ERRCODE = '42P01'` statements in database procedures with standard semantic codes (`22023` parameter invalid, `22000` business rule error, `42501` auth denial).
- **Google Session Reset**: Resolved Google Sign-In session caching bug by invoking `signOut()` prior to launching native account chooser.

### Security
- Scanned repository and build outputs confirming zero exposed `service_role` keys, `sb_secret` management tokens, Supabase PATs, or Firebase private credentials.
- Isolated test credentials (`COLLECTOR_TEST_EMAIL` & `COLLECTOR_TEST_PASSWORD`) strictly to `debug` build type.
