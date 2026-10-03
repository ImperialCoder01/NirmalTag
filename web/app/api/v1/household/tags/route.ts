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

    // Resolve household ID for authenticated user
    const { data: hhList, error: hhErr } = await supabaseUserClient
      .from("households")
      .select("id, address_line1, address_line2, pincode, ward_id")
      .limit(1);

    if (hhErr || !hhList || hhList.length === 0) {
      return NextResponse.json({
        success: true,
        code: "NO_HOUSEHOLD_PROFILE",
        tags: [],
        message: "No registered household profile found for user.",
      });
    }

    const household = hhList[0];

    // Query RLS-scoped assigned tags
    const { data: tags, error: tagErr } = await supabaseUserClient
      .from("tags")
      .select("id, serial_code, canonical_code, status, activated_at, created_at, updated_at")
      .eq("current_assigned_household_id", household.id)
      .order("updated_at", { ascending: false });

    if (tagErr) {
      return NextResponse.json({
        success: false,
        code: "FETCH_FAILED",
        message: `Failed to fetch assigned tags: ${tagErr.message}`,
      }, { status: 422 });
    }

    const mappedTags = (tags || []).map(t => ({
      id: t.id,
      code: t.serial_code || t.canonical_code || t.id,
      category: "Sanitary & Care Waste",
      status: t.status,
      assignedDate: t.created_at ? new Date(t.created_at).toISOString().split("T")[0] : "2026-10-04",
      activatedDate: t.activated_at ? new Date(t.activated_at).toISOString().split("T")[0] : null,
    }));

    return NextResponse.json({
      success: true,
      code: "HOUSEHOLD_TAGS_FETCHED",
      householdId: household.id,
      tags: mappedTags,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Failed to fetch household tags due to server error.",
    }, { status: 500 });
  }
}
