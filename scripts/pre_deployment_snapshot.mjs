import { createClient } from "@supabase/supabase-js";

const url = "https://ubphrqumpqdifupwbvpe.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicGhycXVtcHFkaWZ1cHdidnBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjUwNzYsImV4cCI6MjEwNjYwMTA3Nn0.gYl7pOeKSc_8YxTnDczFgPkcLaA3qMIH7DEggpulH7U";

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

  const counts = {};
  for (const table of baselineTables) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) {
      counts[table] = `Error: ${error.code} - ${error.message}`;
    } else {
      counts[table] = count;
    }
  }

  console.log("Live Table Row Counts:");
  console.table(counts);
}

getPreDeploymentSnapshot();
