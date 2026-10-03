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
    const { tagId, idempotencyKey } = body;

    if (!tagId) {
      return NextResponse.json({
        success: false,
        code: "INVALID_PARAMETERS",
        message: "tagId parameter is required.",
      }, { status: 400 });
    }

    const activeIdempotencyKey = idempotencyKey || `ACT-HH-${tagId}-${Date.now()}`;

    // Execute PostgreSQL procedure: activate_household_tag
    const { data: dbResult, error: dbError } = await supabaseUserClient.rpc(
      "activate_household_tag",
      {
        p_tag_id: tagId,
        p_idempotency_key: activeIdempotencyKey,
      }
    );

    if (dbError) {
      return NextResponse.json({
        success: false,
        code: "ACTIVATION_FAILED",
        message: `Household tag activation failed: ${dbError.message}`,
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      code: "TAG_ACTIVATED",
      result: dbResult,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Household tag activation failed due to server error.",
    }, { status: 500 });
  }
}
