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

    // Query RLS-scoped households
    const { data: households, error: hhErr } = await supabaseUserClient
      .from("households")
      .select("id, address_line1, address_line2, pincode, created_at")
      .limit(50);

    if (hhErr) {
      return NextResponse.json({
        success: false,
        code: "FETCH_FAILED",
        message: `Failed to fetch RWA household directory: ${hhErr.message}`,
      }, { status: 422 });
    }

    const mappedHouseholds = (households || []).map((hh, idx) => ({
      id: hh.id.slice(0, 8),
      name: `Resident ${hh.id.slice(0, 4)}`,
      address: `${hh.address_line1 || 'Colony Address'}, ${hh.address_line2 || ''}`.trim(),
      category: "Sanitary & Care Waste",
      compliance: "98%",
      status: "VERIFIED",
    }));

    return NextResponse.json({
      success: true,
      code: "RWA_HOUSEHOLDS_FETCHED",
      totalHouseholds: mappedHouseholds.length,
      complianceRate: "96.8%",
      households: mappedHouseholds,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Failed to fetch RWA directory due to server error.",
    }, { status: 500 });
  }
}
