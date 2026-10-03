# NIRMALTAG — SECURITY INCIDENT TRIAGE REPORT: GITHUB JSON WEB TOKEN SECRET-SCANNING ALERT

**Triage Date**: October 4, 2026  
**Target Repository**: `ImperialCoder01/NirmalTag`  
**Current HEAD Commit**: `4fde61312b7698caf90be38811f29ec2a455d3ab`  
**Current Branch**: `main` (Clean working tree)  

---

## 1. Executive Summary

A forensic investigation was conducted regarding the GitHub Secret Scanning "JSON Web Token" alert.

- **Incident Result**: **FALSE POSITIVE / NON-CREDENTIAL**
- **Detected Value**: The flagged string is the **Supabase Public Anonymous API Key** (`role: "anon"`, `ref: "ubphrqumpqdifupwbvpe"`).
- **Security Impact**: **ZERO**. The public anon key is intended for public client distribution in web browsers and mobile apps. It contains zero administrative (`service_role`) privileges, zero private user sessions, and zero Firebase private credentials.
- **Trigger Cause**: Iteration 9.4 (`commit 4fde613`) added `val supabaseAnonKey = "eyJ..."` to `PickupSyncWorker.kt` as an inline literal for HTTP POST requests to Supabase REST RPC. GitHub's automated secret scanner uses a generic regex matching any `eyJ...` base64url JWT pattern, triggering the alert on the public anon key.

---

## 2. Forensic Investigation & Token Payload Decoding

All `eyJ...` JWT strings across the current working tree and entire Git history were extracted and safely decoded without exposing signature bytes or full tokens:

```json
{
  "iss": "supabase",
  "ref": "ubphrqumpqdifupwbvpe",
  "role": "anon",
  "iat": 1791017269,
  "exp": 2106593269
}
```

### Forensic Findings:
1. **100% Match Ratio**: Every single JWT in the repository history decodes to `role: "anon"`.
2. **Zero Admin Secrets**: No `service_role` keys, no Firebase service account private keys, no Supabase Personal Access Tokens (PAT), and no private user session JWTs exist in HEAD or history.
3. **Build Artifact Audit**: `git ls-files android/app/build` returned 0 tracked files. No build artifacts or binaries are tracked by Git.

---

## 3. GitHub Secret Scanning Alert Metadata

- **GitHub Alert Metadata**: `GITHUB_ALERT_METADATA_NOT_AVAILABLE_LOCALLY` (Alert ID & line details managed on GitHub Cloud Security Console).
- **Location in HEAD**: 
  - `android/app/src/main/java/com/nirmaltag.app/sync/PickupSyncWorker.kt` (Line 157)
  - `web/tests/adversarial_security.test.mjs` (Line 6)
  - `web/tests/live_tag_supply_chain.test.mjs` (Line 6)
  - `web/scripts/pre_deployment_snapshot.mjs` (Line 4)

---

## 4. Comprehensive Security Metric Summary

| Security Metric | Result | Detailed Evidence |
|---|---|---|
| **GitHub JWT Alert** | **FOUND LOCALLY** | Matched `supabaseAnonKey` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Classification** | **FALSE POSITIVE / NON-CREDENTIAL** | Supabase Public Anonymous Client API key (`role: "anon"`) |
| **Current HEAD Exposure** | **YES** | Public `anon` key present in HEAD (intended public key) |
| **History Exposure** | **YES** | Public `anon` key present in Git history (intended public key) |
| **Build Artifact Exposure** | **NO** | Zero tracked files in `android/app/build` |
| **Firebase Credential Exposure** | **NO** | Zero Firebase private keys or ID tokens committed |
| **Supabase Credential Exposure** | **NO** | Only public `anon` key present; zero `service_role` keys |
| **Administrative Credential Exposure** | **NO** | `ADMIN_SECRET_CURRENT_HEAD = NO`, `ADMIN_SECRET_HISTORY = NO` |
| **Iteration 9.4 Introduced Value** | **YES** | Iteration 9.4 (`4fde613`) added inline `supabaseAnonKey` string to `PickupSyncWorker.kt` |

---

## 5. Recommended Remediation & Next Steps

1. **GitHub Alert Management**: In the GitHub Security Console (`https://github.com/ImperialCoder01/NirmalTag/security/secret-scanning`), mark the alert as **"False Positive"** / **"Public key / non-secret"**.
2. **No Credential Rotation Needed**: Do NOT rotate or revoke the public Supabase Anon Key, as it is required by live frontend and mobile clients.
3. **No Force-Push / History Rewrite Needed**: Git history contains zero real secrets or private credentials.
