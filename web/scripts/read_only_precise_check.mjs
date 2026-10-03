import { createClient } from "@supabase/supabase-js";

const url = "https://ubphrqumpqdifupwbvpe.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicGhycXVtcHFkaWZ1cHdidnBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjUwNzYsImV4cCI6MjEwNjYwMTA3Nn0.gYl7pOeKSc_8YxTnDczFgPkcLaA3qMIH7DEggpulH7U";

const supabase = createClient(url, key);

async function verifyPreciseBaseline() {
  console.log("=== PRECISE READ-ONLY LIVE SUPABASE BASELINE AUDIT ===");

  // 1. Table Verification
  const tables = [
    "profiles",
    "roles",
    "user_roles",
    "tags",
    "pickups",
    "credit_accounts",
    "collectors",
    "households",
    "officer_profiles",
    "organizations",
    "mcd_wards",
    "mcd_zones",
    "audit_logs"
  ];

  const tableResults = {};
  for (const t of tables) {
    const res = await fetch(`${url}/rest/v1/${t}?select=*&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    tableResults[t] = res.status === 200 || res.status === 401 || res.status === 403;
    console.log(`Table 'public.${t}': ${tableResults[t] ? "PASS (EXISTS)" : "FAIL (MISSING)"} [HTTP ${res.status}]`);
  }

  // 2. Function has_role Verification
  const { data: hrData, error: hrErr } = await supabase.rpc("has_role", { p_role: "SYSTEM_ADMIN" });
  const hasRoleExists = hrErr === null;
  console.log(`Function 'public.has_role(p_role user_role_enum)': ${hasRoleExists ? "PASS (EXISTS)" : "FAIL (MISSING)"} [Return: ${hrData}, Error: ${hrErr?.message || "none"}]`);

  // 3. Iteration 1.5/1.6 function checks
  const { error: r15Err } = await supabase.rpc("process_verified_pickup_transaction_v2", { p_pickup_id: "00000000-0000-0000-0000-000000000000", p_tag_id: "00000000-0000-0000-0000-000000000000" });
  console.log(`Iteration 1.5 RPC process_verified_pickup_transaction_v2: ${r15Err?.code !== "PGRST202" ? "EXISTS" : "MISSING (PGRST202)"}`);

  const { error: r16Err } = await supabase.rpc("get_auth_jwt_sub");
  console.log(`Iteration 1.6 RPC get_auth_jwt_sub: ${r16Err?.code !== "PGRST202" ? "EXISTS" : "MISSING (PGRST202)"}`);
}

verifyPreciseBaseline();
