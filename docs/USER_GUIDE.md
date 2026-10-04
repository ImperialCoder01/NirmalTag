# NIRMALTAG — 7-ROLE COMPREHENSIVE USER MANUAL

**Platform**: NirmalTag Civic Tech Platform  
**Version**: `1.0.0`  
**Web Portal**: [https://nirmaltag.vercel.app](https://nirmaltag.vercel.app)  
**Mobile App**: `NirmalTag.apk` (Android Sideload Release)  

---

## 1. HOUSEHOLD RESIDENT ROLE (`HOUSEHOLD`)

### Purpose
Enables residents to manage registered sanitary waste pouches, request doorstep collection, track credit point rewards, and redeem catalog offers.

### User Journey & Primary Actions
1. **Login**: Authenticate using Google Sign-In or Email/Password at `/login` or via the mobile app.
2. **Dashboard**: Access `/household`. View assigned active tag serial (e.g. `NT-SAN-2026-917501`) and credit point balance.
3. **Tag Activation**: Tap **Activate Tag** to transition tag state from `ASSIGNED` to `ACTIVE`.
4. **Reward Redemption**: Click **Redeem Credits**. Select catalog reward (e.g. Municipal Utility Bill Credit - 10 pts). Confirm redemption.
5. **Real-time Balance**: Points are deducted server-side via `redeem_household_credits` RPC with atomic ledger tracking.
6. **Sign Out**: Tap **Sign Out** in top navbar.

---

## 2. COLLECTOR ROLE (`COLLECTOR`)

### Purpose
Equips municipal sanitation collectors with an offline-first mobile scanner (`NirmalTag.apk`) for QR verification, pouch evidence capture, and automated incentive earnings.

### User Journey & Primary Actions
1. **Login**: Open `NirmalTag.apk` on Android phone. Log in with Google or assigned collector credentials.
2. **Camera Scanner**: Tap **Open QR Scanner**. Point camera at physical pouch QR code. CameraX + ML Kit decodes tag serial.
3. **Evidence Photo**: Capture visual pouch photo. Evidence saved to local Room DB entity with state `WAITING_FOR_NETWORK`.
4. **WorkManager Sync**: When network is connected, `PickupSyncWorker` sends request with Firebase Bearer Token to Supabase `pickup_transaction_rpc`.
5. **Incentive Calculation**: Server credits Collector handling account (+₹2.00/pickup) and updates tag state to `CLOSED`.
6. **Idempotency Guard**: Scanning the same tag again returns `ALREADY_PROCESSED` with 0 duplicate reward/incentive additions.

---

## 3. TAG OFFICER ROLE (`TAG_OFFICER`)

### Purpose
Authorizes tag inventory managers to issue physical QR tag batches, track serial lifecycle states, and handle lost/damaged tag replacements.

### User Journey & Primary Actions
1. **Login**: Access `/tag-officer` on the web portal.
2. **Batch Tag Creation**: Enter batch quantity (1 to 5,000 tags) and click **Create Tag Batch**. `create_tag_batch_and_records` RPC inserts serial records with status `CREATED`.
3. **Serial Search**: Enter tag serial code in lookup field to inspect registration date, current state (`ASSIGNED`, `ACTIVE`, `CLOSED`), and assigned household.
4. **Household Assignment**: Assign serial code to target household UID via `assign_tag_to_household` RPC.
5. **Tag Replacement**: Replace damaged or lost tags using `replace_damaged_or_lost_tag` RPC. Old tag transitions to `REPLACED` and new tag to `ASSIGNED`.

---

## 4. RWA ADMIN ROLE (`RWA_ADMIN`)

### Purpose
Provides Residential Welfare Association administrators with colony-wide compliance analytics and incident logging.

### User Journey & Primary Actions
1. **Login**: Access `/rwa` on the web portal.
2. **Colony Directory**: View list of registered colony households and active pouch statistics.
3. **Segregation Compliance Index (%)**: Monitor colony segregation percentage calculated live: `(Households with verified pickups / Total households) * 100`.
4. **Incident Reporting**: Fill out incident form (e.g. unsegregated waste dumping) and submit via `/api/v1/rwa/incidents`. Record written to `rwa_incidents`.

---

## 5. BWG ADMIN ROLE (`BWG_ADMIN`)

### Purpose
Enables Bulk Waste Generators (hospitals, commercial complexes, hotels) to log daily waste volumes and generate compliance certificates.

### User Journey & Primary Actions
1. **Login**: Access `/bwg` on the web portal.
2. **Daily Volume Logging**: Enter total weight (kg), waste type (Diaper & Sanitary / Special Care), and bag seal verification code (e.g. `SEAL-9021-X`).
3. **MCD Certificate Generation**: Click **Generate MCD Certificate**. View dynamic HTML compliance certificate complete with official verification seal.

---

## 6. MCD OFFICER ROLE (`MCD_OFFICER`)

### Purpose
Gives Municipal Corporation of Delhi executive officers ward-level telemetry oversight and visual dispute resolution controls.

### User Journey & Primary Actions
1. **Login**: Access `/mcd` on the web portal.
2. **Ward Telemetry**: Filter aggregated telemetry metrics by ward ID (e.g. Ward 42 Rohini).
3. **Visual Review Queue**: Inspect collection disputes and visual evidence. Click **Approve Resolution** to insert audit record into `verification_reviews`.

---

## 7. SYSTEM ADMIN ROLE (`SYSTEM_ADMIN`)

### Purpose
System-wide administrator interface for user role management and audit trail export.

### User Journey & Primary Actions
1. **Login**: Access `/admin` on the web portal.
2. **User Search**: Search registered system user profiles by email or UID.
3. **Role Assignment**: Select target role (e.g. `TAG_OFFICER`) and click **Assign Role**. Executes `assign_user_role` RPC.
4. **Audit History**: Query system audit log history written to `audit_logs` table.
