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

    const { user: firebaseUser, supabaseUserClient } = authResult;
    const actorUid = firebaseUser.uid;

    const body = await request.json().catch(() => ({}));
    const { tagId, newStatus, reason, idempotencyKey } = body;

    if (!tagId || !newStatus) {
      return NextResponse.json({
        success: false,
        code: "INVALID_PARAMETERS",
        message: "Tag ID and newStatus are required parameters.",
      }, { status: 400 });
    }

    // Execute PostgreSQL procedure: transition_tag_state using RLS-scoped user client
    const { data: transitionResult, error: dbError } = await supabaseUserClient.rpc(
      "transition_tag_state",
      {
        p_tag_id: tagId,
        p_new_status: newStatus,
        p_actor_profile_id: actorUid,
        p_actor_role: null,
        p_reason: reason || "API Lifecycle Request",
        p_idempotency_key: idempotencyKey || `TAG-TRANS-${tagId}-${Date.now()}`,
      }
    );

    if (dbError) {
      return NextResponse.json({
        success: false,
        code: "TRANSITION_REJECTED",
        message: `Tag lifecycle transition failed: ${dbError.message}`,
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      code: "TRANSITION_COMPLETED",
      tagId,
      status: transitionResult,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Tag lifecycle transition failed due to server error.",
    }, { status: 500 });
  }
}
