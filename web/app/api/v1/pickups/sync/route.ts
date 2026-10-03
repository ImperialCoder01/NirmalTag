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
    const collectorUid = firebaseUser.uid;

    const body = await request.json().catch(() => ({}));
    const { pickupId, tagId, idempotencyKey } = body;

    if (!pickupId || !tagId) {
      return NextResponse.json({
        success: false,
        code: "INVALID_PARAMETERS",
        message: "Pickup processing failed: pickupId and tagId are required parameters.",
      }, { status: 400 });
    }

    const activeIdempotencyKey = idempotencyKey || `SYNC-${pickupId}-${tagId}`;

    // Execute PostgreSQL transaction RPC: process_verified_pickup_transaction_v2
    // NO CLIENT-SUPPLIED REWARD AMOUNTS OR HOUSEHOLD IDS TRUSTED!
    const { data: dbResult, error: dbError } = await supabaseAdmin.rpc(
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
