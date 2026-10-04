# NIRMALTAG — SECURITY ARCHITECTURE & DPDP COMPLIANCE

**Platform**: NirmalTag Civic Tech Platform  
**Version**: `1.0.0`  
**Compliance Standard**: Digital Personal Data Protection Act, 2023 (India)  

---

## 1. IDENTITY & AUTHENTICATION ARCHITECTURE

NirmalTag implements a dual-tier identity architecture:
1. **Primary Authentication**: Firebase Authentication handles user login via Email/Password and Google Sign-In across web and Android.
2. **PostgreSQL Identity Bridge**: Protected API routes and PostgreSQL procedures receive the verified Firebase ID Token (`Authorization: Bearer <idToken>`). PostgreSQL extracts the caller identity directly from `auth.jwt() -> 'sub'`.

```text
[Client App] ──(Firebase Auth)──► [Firebase ID Token]
                                         │
[Supabase PostgREST] ◄──(Bearer Token)───┘
         │
[PostgreSQL Engine] ──► `auth.jwt() -> 'sub'` ──► RLS & Role Authorization
```

---

## 2. ROW-LEVEL SECURITY (RLS) & AUTHORIZATION

- **Default Deny**: All PostgreSQL tables have RLS enabled with default `RESTRICTIVE` access.
- **Server-Derived Identity**: Client applications cannot override their identity by passing parameter values like `user_id` or `collector_id`. All sensitive queries resolve identity via `get_authenticated_firebase_uid()`.
- **Role Guards**: Functions check role permissions via `has_role(required_role)`.
- **Unauthorized Escalation**: Unprivileged role escalation attempts (e.g. `HOUSEHOLD` invoking `assign_user_role`) are rejected with PostgreSQL exception code `42501` (`insufficient_privilege`).

---

## 3. SECRET MANAGEMENT & AGGRESSIVE SCANNING

- **Public Keys**: `NEXT_PUBLIC_FIREBASE_*` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are public client configurations.
- **Private Keys**: `SUPABASE_SERVICE_ROLE_KEY`, Firebase Private Service Accounts, and Supabase PATs are strictly server-side and **NEVER** embedded in client web code or Android APK resources.
- **Git Protection**: `.gitignore` excludes `.env`, `.env.local`, `local.properties`, `google-services.json`, `*.keystore`, and `*.jks`.

---

## 4. DPDP ACT 2023 COMPLIANCE (INDIA)

NirmalTag functions as a **Data Fiduciary** under the **Digital Personal Data Protection Act, 2023**:
- **Data Minimization**: Only essential operational data is processed (household name, email, ward ID, collector worker ID, pouch QR serial, visual evidence photo). No financial PII or unneeded credentials are collected.
- **Data Principal Rights**: Users can view their data summary, request corrections, or withdraw consent at `/privacy`.
- **Grievance Redressal**: Contact information for the Data Protection & Grievance Officer is published at `/privacy`.
