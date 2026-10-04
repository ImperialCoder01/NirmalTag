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
    const { oldTagId, newTagId, reason, idempotencyKey } = body;

    if (!oldTagId || !newTagId || !reason) {
      return NextResponse.json({
        success: false,
        code: "INVALID_PARAMETERS",
        message: "oldTagId, newTagId, and reason parameters are required.",
      }, { status: 400 });
    }

    const activeIdempotencyKey = idempotencyKey || `REPLACE-${oldTagId}-${Date.now()}`;

    // Execute PostgreSQL procedure: replace_damaged_or_lost_tag
    const { data: dbResult, error: dbError } = await supabaseUserClient.rpc(
      "replace_damaged_or_lost_tag",
      {
        p_old_tag_id: oldTagId,
        p_new_tag_id: newTagId,
        p_reason: reason,
        p_idempotency_key: activeIdempotencyKey,
      }
    );

    if (dbError) {
      return NextResponse.json({
        success: false,
        code: "REPLACEMENT_FAILED",
        message: `Tag replacement failed: ${dbError.message}`,
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      code: "TAG_REPLACED",
      result: dbResult,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Tag replacement failed due to server error.",
    }, { status: 500 });
  }
}
