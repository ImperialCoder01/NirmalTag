import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
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

    const { user: firebaseUser } = authResult;
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

    // Resolve actor's DB role
    const { data: userRoleRecords } = await supabaseAdmin
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", actorUid);

    let actorRole = "AUTHENTICATED_USER";
    if (userRoleRecords && userRoleRecords.length > 0) {
      const firstRec = userRoleRecords[0] as any;
      if (Array.isArray(firstRec.roles)) {
        actorRole = firstRec.roles[0]?.name || actorRole;
      } else if (firstRec.roles?.name) {
        actorRole = firstRec.roles.name;
      }
    }

    // Invoke PostgreSQL transition function: transition_tag_state
    const { data: transitionResult, error: dbError } = await supabaseAdmin.rpc(
      "transition_tag_state",
      {
        p_tag_id: tagId,
        p_new_status: newStatus,
        p_actor_profile_id: actorUid,
        p_actor_role: actorRole,
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
