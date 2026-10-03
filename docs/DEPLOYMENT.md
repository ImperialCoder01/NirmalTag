# NIRMALTAG — Deployment & Infrastructure Specification

## 🌐 Live Production Environments

- **Web Platform Production URL**: [https://web-sooty-theta-x39mzajs6t.vercel.app](https://web-sooty-theta-x39mzajs6t.vercel.app)
- **Vercel Project Inspector**: [https://vercel.com/imperialcoder01s-projects/web](https://vercel.com/imperialcoder01s-projects/web)
- **Supabase Backend Database**: `https://ubphrqumpqdifupwbvpe.supabase.co`
- **Firebase Auth Project ID**: `nirmaltag`

---

## 🚀 Deployed Web Routes

| Route | Purpose | Access Level |
| :--- | :--- | :--- |
| [`/`](https://web-sooty-theta-x39mzajs6t.vercel.app/) | Platform Landing & Role Showcase | Public |
| [`/household`](https://web-sooty-theta-x39mzajs6t.vercel.app/household) | Household Resident Portal | HOUSEHOLD |
| [`/collector`](https://web-sooty-theta-x39mzajs6t.vercel.app/collector) | Collector Mobile Field App | COLLECTOR |
| [`/tag-officer`](https://web-sooty-theta-x39mzajs6t.vercel.app/tag-officer) | Tag Officer Batch & Inventory Management | TAG_OFFICER |
| [`/rwa`](https://web-sooty-theta-x39mzajs6t.vercel.app/rwa) | Resident Welfare Association Dashboard | RWA_ADMIN |
| [`/bwg`](https://web-sooty-theta-x39mzajs6t.vercel.app/bwg) | Bulk Waste Generator Dashboard | BWG_ADMIN |
| [`/mcd`](https://web-sooty-theta-x39mzajs6t.vercel.app/mcd) | MCD Executive Municipal Command Dashboard | MCD_OFFICER |
| [`/admin`](https://web-sooty-theta-x39mzajs6t.vercel.app/admin) | System Security & RBAC Administrator Portal | SYSTEM_ADMIN |
| [`/login`](https://web-sooty-theta-x39mzajs6t.vercel.app/login) | Firebase Authentication Login Screen | Public |
| `/api/v1/tag-batches` | Mass Tag Generation API Endpoint | Server API |
| `/api/v1/pickups/sync` | Offline-First Pickup Sync & Single-Use Enforcement API | Server API |

---

## 🛠️ Automated Deployment Pipeline

1. **Web Deployment**: Configured via Vercel CLI. Continuous integration builds trigger automatically on push to `main` branch.
2. **Database Migrations**: Executed automatically via Supabase Management API using `scripts/apply_migrations.mjs`.
