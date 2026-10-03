# NIRMALTAG — UI DATA SOURCE AUDIT REPORT

This audit maps every visible number, metric, and table across all Web portal routes to its authoritative data origin.

---

## 1. Portal Data Source Inventory

| Route | UI Component | Displayed Metric / Feature | Data Origin | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/login` | Role Selector | `🌟 Most Used (Popular)` | STATIC ARRAY | Production UI Layout |
| `/login` | Submit Button | `Sign In as [Role]` | REACT STATE | Production Component |
| `/household` | Credit Wallet Banner | `Eco-Points Balance` | DATABASE API (`credit_accounts`) | Connected to API Gateway |
| `/household` | Pouch Batch List | `Registered Pouch Serials` | DATABASE API (`tags`) | Connected to API Gateway |
| `/collector` | Handling Incentive Wallet | `Collector Incentive (INR)` | DATABASE API (`collector_incentive_accounts`) | Connected to API Gateway |
| `/collector` | Camera Scanner | `MobileNetV3 AI Inference` | UI PREVIEW | Video viewfinder active; frame inference simulated |
| `/tag-officer` | Serial Batch Form | `Generate 1,000 Tag Serials` | DATABASE API (`tag_batches`, `tags`) | Connected to PostgreSQL RPC |
| `/rwa` | Colony Compliance Scorecard | `96.8% Segregation Rate` | HARDCODED / DEMO | Visual prototype widget |
| `/bwg` | Waste Audit Log | `120 kg Commercial Diapers` | HARDCODED / DEMO | Visual prototype widget |
| `/bwg` | MCD Compliance Cert | `MCD-BWG-2026-8942` | HTML GENERATOR | Production HTML Exporter |
| `/mcd` | Executive Command | `5,800 Verified Pickups` | HARDCODED / DEMO | Visual telemetry widget |
| `/admin` | Security Audit Trail | `System Event Audit CSV` | DATABASE API (`audit_logs`) | Connected to PostgreSQL table |

---

## 2. Empty & Error State Behavior

- Pages connect to `/api/v1/auth/session` to obtain authoritative session status.
- If database returns 0 records for a user account, pages display **LOADING**, **EMPTY**, or **UNAUTHORIZED_ROLE_REQUEST** states rather than injecting fake non-zero values.
