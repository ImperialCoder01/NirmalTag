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

    const { supabaseUserClient } = authResult;

    // Aggregate counts from database
    const { count: totalPickups } = await supabaseUserClient
      .from("pickups")
      .select("id", { count: "exact", head: true });

    const { count: verifiedPickups } = await supabaseUserClient
      .from("pickups")
      .select("id", { count: "exact", head: true })
      .eq("status", "VERIFIED");

    const { count: totalTags } = await supabaseUserClient
      .from("tags")
      .select("id", { count: "exact", head: true });

    const { count: totalHouseholds } = await supabaseUserClient
      .from("households")
      .select("id", { count: "exact", head: true });

    const { count: totalCollectors } = await supabaseUserClient
      .from("collectors")
      .select("id", { count: "exact", head: true });

    const activeTotalPickups = totalPickups || 0;
    const activeVerifiedPickups = verifiedPickups || 0;
    const activeRate = activeTotalPickups > 0 ? Math.round((activeVerifiedPickups / activeTotalPickups) * 100) : 100;

    const wardStats = [
      { ward: "Ward 42 (Active)", pickups: activeTotalPickups, verified: activeVerifiedPickups, rate: activeRate },
      { ward: "Ward 41 (Synthetic)", pickups: 420, verified: 395, rate: 94 },
      { ward: "Ward 43 (Synthetic)", pickups: 310, verified: 285, rate: 92 },
      { ward: "Ward 44 (Synthetic)", pickups: 490, verified: 450, rate: 91 },
      { ward: "Ward 45 (Synthetic)", pickups: 620, verified: 605, rate: 97 },
    ];

    return NextResponse.json({
      success: true,
      code: "MCD_TELEMETRY_FETCHED",
      summary: {
        totalPickups: totalPickups || 0,
        verifiedPickups: verifiedPickups || 0,
        totalTags: totalTags || 0,
        totalHouseholds: totalHouseholds || 0,
        totalCollectors: totalCollectors || 0,
      },
      wardStats,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Failed to fetch MCD telemetry due to server error.",
    }, { status: 500 });
  }
}
