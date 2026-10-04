import { NextResponse } from "next/server";
import { authenticateServerRequest } from "@/lib/supabase-auth";

export async function GET(request: Request) {
  try {
    let authResult;
    try {
      authResult = await authenticateServerRequest(request);
    } catch (authErr: any) {
      return NextResponse.json({
        success: false,
        code: "UNAUTHORIZED",
        message: authErr.message || "Missing or invalid identity token.",
      }, { status: 401 });
    }

    const { user: firebaseUser, supabaseUserClient } = authResult;

    // Resolve collector ID
    const { data: colList, error: colErr } = await supabaseUserClient
      .from("collectors")
      .select("id, employee_id, full_name, is_active")
      .limit(1);

    if (colErr || !colList || colList.length === 0) {
      return NextResponse.json({
        success: true,
        code: "NO_COLLECTOR_PROFILE",
        walletBalance: 0,
        totalPickups: 0,
        recentPickups: [],
      });
    }

    const collector = colList[0];

    // Fetch incentive balance
    const { data: incAccounts } = await supabaseUserClient
      .from("collector_incentive_accounts")
      .select("current_balance_inr, total_earned_inr")
      .eq("collector_id", collector.id)
      .limit(1);

    const walletBalance = incAccounts && incAccounts.length > 0
      ? Number(incAccounts[0].current_balance_inr) || 0
      : 0;

    // Fetch completed pickups count
    const { count: pickupCount } = await supabaseUserClient
      .from("pickups")
      .select("id", { count: "exact", head: true })
      .eq("collector_id", collector.id);

    // Fetch recent pickups
    const { data: pickups } = await supabaseUserClient
      .from("pickups")
      .select("id, status, scan_timestamp, idempotency_key")
      .eq("collector_id", collector.id)
      .order("scan_timestamp", { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      code: "COLLECTOR_STATS_FETCHED",
      collectorId: collector.id,
      employeeId: collector.employee_id,
      walletBalance,
      totalPickups: pickupCount || 0,
      recentPickups: (pickups || []).map(p => ({
        id: p.id.slice(0, 8),
        timestamp: p.scan_timestamp ? new Date(p.scan_timestamp).toLocaleString() : "2026-10-04",
        status: p.status,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Failed to fetch collector stats due to server error.",
    }, { status: 500 });
  }
}
