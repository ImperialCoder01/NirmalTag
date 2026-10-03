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
    const collectorUid = firebaseUser.uid;

    const body = await request.json().catch(() => ({}));
    const { pickupId, tagId, householdId: clientSuppliedHouseholdId, idempotencyKey } = body;

    if (!pickupId || !tagId) {
      return NextResponse.json({
        success: false,
        code: "INVALID_PARAMETERS",
        message: "Pickup processing failed: pickupId and tagId are required parameters.",
      }, { status: 400 });
    }

    // Phase 3 — Household Mismatch Protection: If client supplies householdId, verify it matches the derived tag ownership
    if (clientSuppliedHouseholdId) {
      const { data: tagData, error: tagErr } = await supabaseUserClient
        .from("tags")
        .select("current_assigned_household_id")
        .eq("id", tagId)
        .single();

      if (tagErr || !tagData) {
        return NextResponse.json({
          success: false,
          code: "TAG_NOT_FOUND",
          message: "Specified tag does not exist.",
        }, { status: 404 });
      }

      if (tagData.current_assigned_household_id !== clientSuppliedHouseholdId) {
        return NextResponse.json({
          success: false,
          code: "HOUSEHOLD_MISMATCH",
          message: "Client-supplied household_id does not match authoritative tag ownership.",
        }, { status: 400 });
      }
    }

    const activeIdempotencyKey = idempotencyKey || `SYNC-${pickupId}-${tagId}`;

    // Execute PostgreSQL transaction RPC using RLS-scoped user client (passes Bearer JWT to Supabase)
    // NO CLIENT-SUPPLIED REWARD AMOUNTS OR HOUSEHOLD IDS TRUSTED!
    const { data: dbResult, error: dbError } = await supabaseUserClient.rpc(
      "process_verified_pickup_transaction_v2",
      {
        p_pickup_id: pickupId,
        p_tag_id: tagId,
        p_collector_profile_id: collectorUid,
        p_idempotency_key: activeIdempotencyKey,
      }
    );

    // CATASTROPHIC FALLBACK REMOVED: Database failure MUST NEVER produce fake success!
    if (dbError) {
      return NextResponse.json({
        success: false,
        code: "PICKUP_PROCESSING_FAILED",
        message: `Pickup could not be finalized. No reward was posted: ${dbError.message}`,
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      code: "PICKUP_FINALIZED",
      result: dbResult,
      idempotencyKey: activeIdempotencyKey,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Pickup processing failed due to server error.",
    }, { status: 500 });
  }
}
