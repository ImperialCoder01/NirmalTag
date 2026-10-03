import { createClient } from "@supabase/supabase-js";

const url = "https://ubphrqumpqdifupwbvpe.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_MVBto2fM-eKyqT_R5A-g7Q_GDzJKswE";

const supabase = createClient(url, key);

const baselineTables = [
  "profiles",
  "roles",
  "user_roles",
  "households",
  "collectors",
  "officer_profiles",
  "organizations",
  "mcd_wards",
  "mcd_zones",
  "tags",
  "tag_batches",
  "pickups",
  "credit_accounts",
  "credit_transactions",
  "collector_incentive_accounts",
  "collector_incentive_transactions",
  "audit_logs"
];

async function getPreDeploymentSnapshot() {
  console.log("=== PRE-DEPLOYMENT SNAPSHOT (LIVE SUPABASE READ-ONLY) ===");
  console.log(`Target Project: ubphrqumpqdifupwbvpe (${url})`);
  console.log("--------------------------------------------");

  for (const table of baselineTables) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.log(`Table 'public.${table}': Error: ${error.code} - ${error.message}`);
    } else {
      console.log(`Table 'public.${table}': Row count = ${count}`);
    }
  }
}

getPreDeploymentSnapshot();
