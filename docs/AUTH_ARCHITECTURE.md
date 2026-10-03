# NIRMALTAG — AUTHENTICATION & AUTHORIZATION ARCHITECTURE

## 1. Identity vs Authorization Decoupling

NirmalTag strictly separates **Identity** from **Authorization**:

- **IDENTITY Provider**: Firebase Authentication (Email/Password & Google OAuth).
- **AUTHORIZATION Source of Truth**: PostgreSQL Database (`profiles`, `user_roles`, `roles`, `permissions`, `households`, `collectors`, `wards`, `organizations`).

> [!CAUTION]
> The browser client MUST NEVER determine authorization via `localStorage.getItem("nirmaltag_user_role")`. Any client-side role state is strictly UI presentation layer cache.

---

## 2. Server-Backed Authorization Flow

```
[ User Action / Login ]
         │
         ▼
[ Firebase Authentication ] ──► Validates Credentials ──► Issues Firebase ID Token
         │
         ▼
[ Next.js API / Auth Session Endpoint ] ◄── Header: Authorization: Bearer <Firebase_ID_Token>
         │
         ├── 1. Verifies Firebase ID Token Signature & Claims
         ├── 2. Extracts `firebase_uid` and `email`
         ├── 3. Queries PostgreSQL Database:
         │      - SELECT profiles WHERE firebase_uid = $1
         │      - SELECT user_roles JOIN roles ON role_id = roles.id WHERE user_id = profile.id
         │      - SELECT scope (Household ID, Collector Ward ID, RWA ID, BWG ID)
         │
         └── 4. Returns Authoritative User Authorization Payload to Client:
                {
                   user: { uid, email, full_name },
                   assignedRoles: ["HOUSEHOLD", "COLLECTOR"],
                   activeRole: "HOUSEHOLD",
                   scope: { level: "WARD", wardId: "ward-42" },
                   isAuthorized: true
                }
```

---

## 3. Role Hierarchy & Scope Boundaries

| Role Name | Access Level | Authorized Scope Boundary |
| :--- | :--- | :--- |
| `HOUSEHOLD` | Citizen | Restricted to own `household_id`, own pouches, own credit ledger transactions. |
| `COLLECTOR` | Field Worker | Restricted to assigned `assigned_ward_id` pickups, assigned pickup queue, own incentive wallet. |
| `TAG_OFFICER` | Inventory Officer | Restricted to tag batch creation, tag assignment within assigned municipality zone/ward. |
| `RWA_ADMIN` | Society Admin | Restricted to registered `rwa_id` colony households, resident roster, colony compliance score. |
| `BWG_ADMIN` | Commercial Admin | Restricted to registered `bwg_id` commercial establishment, volume logs, MCD compliance certs. |
| `MCD_OFFICER` | Municipal Executive | Ward/Zone-wide telemetry (`assigned_ward_id`), dispute resolution, violation notice issuance. |
| `SYSTEM_ADMIN` | System Administrator | System-wide scope (`SYSTEM`), global RBAC provisioning, security audit logs. |

---

## 4. Session & Logout Behavior

- **Token Expiration**: Firebase ID tokens expire after 60 minutes and auto-refresh via Firebase SDK.
- **Role Revocation**: If an administrator revokes a user's role in the `user_roles` database table, the change takes effect immediately on the next API server verification request.
- **Logout Flow**: Invoking `signOut(auth)` clears the Firebase session and resets React/Compose state.
