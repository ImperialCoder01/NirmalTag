import { createClient } from "@supabase/supabase-js";

const url = "https://ubphrqumpqdifupwbvpe.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicGhycXVtcHFkaWZ1cHdidnBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjUwNzYsImV4cCI6MjEwNjYwMTA3Nn0.gYl7pOeKSc_8YxTnDczFgPkcLaA3qMIH7DEggpulH7U";

const supabase = createClient(url, key);

const tables = [
  "profiles",
  "roles",
  "user_roles",
  "tags",
  "tag_batches",
  "pickups",
  "credit_accounts",
  "credit_transactions",
  "collectors",
  "collector_incentive_accounts",
  "collector_incentive_transactions",
  "households",
  "officer_profiles",
  "organizations",
  "mcd_wards",
  "mcd_zones",
  "audit_logs",
  "reward_policies"
];

async function checkBaseline() {
  console.log("=== READ-ONLY LIVE SUPABASE BASELINE AUDIT ===");
  console.log(`URL: ${url}`);
  console.log("--------------------------------------------");

  for (const table of tables) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
      }
    });

    const status = res.status;
    const json = await res.json().catch(() => ({}));

    if (status === 200) {
      const keys = Array.isArray(json) && json.length > 0 ? Object.keys(json[0]) : "table_exists_0_rows";
      console.log(`[EXISTS] Table 'public.${table}': HTTP 200 OK | Sample/Columns:`, keys);
    } else if (status === 401 || status === 403) {
      console.log(`[EXISTS - RLS PROTECTED] Table 'public.${table}': HTTP ${status} | ${json.message || json.error}`);
    } else if (json.code === "PGRST205" || status === 404) {
      console.log(`[MISSING] Table 'public.${table}': HTTP ${status} | ${json.message || "Not found"}`);
    } else {
      console.log(`[UNKNOWN] Table 'public.${table}': HTTP ${status} | Code: ${json.code} | Message: ${json.message}`);
    }
  }

  console.log("--------------------------------------------");
  console.log("=== FUNCTION EXISTENCE CHECKS ===");

  const functions = [
    { name: "has_role", params: { role_name: "SYSTEM_ADMIN" } },
    { name: "validate_tag_state_transition", params: {} },
    { name: "transition_tag_state", params: {} },
    { name: "process_verified_pickup_transaction_v2", params: {} },
    { name: "create_tag_batch_and_records", params: {} },
    { name: "get_auth_jwt_sub", params: {} }
  ];

  for (const fn of functions) {
    const { data, error } = await supabase.rpc(fn.name, fn.params);
    if (error) {
      if (error.code === "PGRST202") {
        console.log(`[MISSING] Function 'public.${fn.name}': PGRST202 (Not in schema cache)`);
      } else {
        console.log(`[EXISTS - INVOKED] Function 'public.${fn.name}': Error ${error.code} | ${error.message}`);
      }
    } else {
      console.log(`[EXISTS] Function 'public.${fn.name}': Result:`, data);
    }
  }
}

checkBaseline();
