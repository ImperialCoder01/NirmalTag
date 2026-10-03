import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Pickup processing failed: Missing or invalid Authorization header.",
      }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const firebaseVerifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`;
    const firebaseRes = await fetch(firebaseVerifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    const firebaseData = await firebaseRes.json();
    if (!firebaseRes.ok || !firebaseData.users || firebaseData.users.length === 0) {
      return NextResponse.json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Pickup processing failed: Invalid or expired Firebase identity token.",
      }, { status: 401 });
    }

    const firebaseUser = firebaseData.users[0];
    const collectorUid = firebaseUser.localId;

    const body = await request.json();
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
