# NIRMALTAG — PRODUCTION DEPLOYMENT SPECIFICATION

**Platform**: NirmalTag Civic Tech Platform  
**Version**: `1.0.0`  
**Web Deployment**: Vercel (`https://nirmaltag.vercel.app`)  
**Android Deployment**: Direct APK Release (`NirmalTag.apk`)  

---

## 1. WEB PRODUCTION DEPLOYMENT (Vercel)

### Prerequisites
- Next.js 14 App Router project located in `/web`.
- Node.js 18+ runtime environment.

### Environment Variables
Configure the following environment variables in Vercel:

```env
# Public Client Variables (Exposed to Browser)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=nirmaltag.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=nirmaltag
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=nirmaltag.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=72818659470
NEXT_PUBLIC_FIREBASE_APP_ID=1:72818659470:web:e11c392f35660b2be339df

NEXT_PUBLIC_SUPABASE_URL=https://ubphrqumpqdifupwbvpe.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here

# Secret Server-Only Service Keys (Never exposed to client JS)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### Build & Deploy Commands
```bash
cd web
npm install
npm test          # Runs 54/54 integration tests
npm run build     # Compiles 39 static and dynamic routes
```

---

## 2. ANDROID PRODUCTION BUILD PIPELINE

### Prerequisites
- Android SDK 34 (compileSdk = 34, targetSdk = 34, minSdk = 26).
- Java 17 JDK.

### Build Commands
```bash
cd android

# Clean & run unit tests (54/54 PASS)
.\gradlew.bat clean
.\gradlew.bat test

# Build Direct Distribution Release APK (44.68 MB)
.\gradlew.bat assembleRelease
# Output: android/app/build/outputs/apk/release/NirmalTag.apk

# Build Optional Google Play Store App Bundle (25.20 MB)
.\gradlew.bat bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### Direct APK Distribution Metrics
- **Artifact**: `NirmalTag.apk`
- **File Size**: `46,855,064 bytes` (~44.68 MB)
- **SHA-256 Checksum**:  
  `F249A146D6C613019FA628B2E0B323A754651D5DD19F7F2AF0193F54AE944319`

---

## 3. DATABASE BACKUP & RECOVERY READINESS

- **Hosted Provider**: Supabase hosted PostgreSQL infrastructure.
- **Automated Backup**: Daily automated database backups & Point-in-Time Recovery (PITR) enabled.
- **Recovery Procedure**: Restoration performed via Supabase Cloud Dashboard or `supabase db restore` CLI migration scripts.
