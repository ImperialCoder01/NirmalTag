import { NextResponse } from "next/server";
import { authenticateServerRequest } from "@/lib/supabase-auth";

export async function POST(request: Request) {
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

    const body = await request.json().catch(() => ({}));
    const { tagId, householdId, idempotencyKey } = body;

    if (!tagId || !householdId) {
      return NextResponse.json({
        success: false,
        code: "INVALID_PARAMETERS",
        message: "tagId and householdId are required parameters.",
      }, { status: 400 });
    }

    const activeIdempotencyKey = idempotencyKey || `ASSIGN-${tagId}-${householdId}-${Date.now()}`;

    // Execute PostgreSQL procedure: assign_tag_to_household
    const { data: dbResult, error: dbError } = await supabaseUserClient.rpc(
      "assign_tag_to_household",
      {
        p_tag_id: tagId,
        p_household_id: householdId,
        p_idempotency_key: activeIdempotencyKey,
      }
    );

    if (dbError) {
      return NextResponse.json({
        success: false,
        code: "ASSIGNMENT_FAILED",
        message: `Tag assignment failed: ${dbError.message}`,
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      code: "TAG_ASSIGNED",
      result: dbResult,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Tag assignment failed due to server error.",
    }, { status: 500 });
  }
}
