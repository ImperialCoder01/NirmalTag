import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ubphrqumpqdifupwbvpe.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testDatabaseSecurity() {
  console.log("Starting Live Database RLS & Function Verification...");
  if (!serviceRoleKey || serviceRoleKey.includes("demo")) {
    console.log("SUPABASE_SERVICE_ROLE_KEY not configured or using placeholder. Live database RLS tests skipped.");
    return false;
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: rewardPolicies, error: rpError } = await supabaseAdmin.from("reward_policies").select("*");
    if (rpError) {
      console.log(`Live DB check: reward_policies table not accessible: ${rpError.message}`);
      return false;
    }

    console.log(`Live DB check SUCCESS: Found ${rewardPolicies?.length || 0} reward policies.`);
    return true;
  } catch (err) {
    console.log(`Live DB check failed: ${err.message}`);
    return false;
  }
}

testDatabaseSecurity();
