import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { qrToken, collectorId, idempotencyKey, confidenceScore, modelVersion, scanTimestamp } = body;

    if (!qrToken || !idempotencyKey) {
      return NextResponse.json({ error: "Missing required pickup fields" }, { status: 400 });
    }

    // 1. Authoritative lookup of tag
    const { data: tag, error: tagError } = await supabase
      .from("tags")
      .select("id, status, waste_category_id, current_assigned_household_id")
      .eq("qr_token", qrToken)
      .single();

    if (tagError || !tag) {
      return NextResponse.json({ error: "Tag is not registered in authoritative database", code: "UNKNOWN_TAG" }, { status: 404 });
    }

    // Invariants check
    if (tag.status === "CLOSED") {
      return NextResponse.json({ error: "This tag has already completed its single-use collection lifecycle", code: "CLOSED_TAG" }, { status: 409 });
    }

    if (tag.status === "INVALIDATED" || tag.status === "SUSPENDED" || tag.status === "CREATED") {
      return NextResponse.json({ error: `Tag is in invalid state (${tag.status}) for pickup`, code: "INVALID_STATUS" }, { status: 400 });
    }

    // 2. Check Idempotency (prevent duplicate pickups)
    const { data: existingPickup } = await supabase
      .from("pickups")
      .select("id, status")
      .eq("idempotency_key", idempotencyKey)
      .single();

    if (existingPickup) {
      return NextResponse.json({ success: true, pickupId: existingPickup.id, status: existingPickup.status, idempotentRetry: true });
    }

    // 3. Create Pickup Event
    const { data: newPickup, error: pickupErr } = await supabase
      .from("pickups")
      .insert({
        tag_id: tag.id,
        collector_id: collectorId || "00000000-0000-0000-0000-000000000000",
        household_id: tag.current_assigned_household_id || "00000000-0000-0000-0000-000000000000",
        status: confidenceScore >= 0.85 ? "VERIFIED" : "REVIEW_REQUIRED",
        scan_timestamp: scanTimestamp || new Date().toISOString(),
        evidence_timestamp: scanTimestamp || new Date().toISOString(),
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    if (pickupErr || !newPickup) {
      return NextResponse.json({ error: pickupErr?.message || "Failed to log pickup event" }, { status: 500 });
    }

    // 4. Log AI Verification output
    await supabase.from("ai_verifications").insert({
      pickup_id: newPickup.id,
      status: confidenceScore >= 0.85 ? "VERIFIED" : "REVIEW_REQUIRED",
      confidence_score: confidenceScore || 0.94,
      model_version: modelVersion || "MobileNetV3-Quant-v1.0",
      inference_timestamp: new Date().toISOString()
    });

    // 5. Execute Atomic Finalization if verified
    if (confidenceScore >= 0.85) {
      await supabase.rpc("finalize_pickup_transaction", {
        p_pickup_id: newPickup.id,
        p_idempotency_key: idempotencyKey
      });
    }

    return NextResponse.json({
      success: true,
      pickupId: newPickup.id,
      status: newPickup.status,
      message: confidenceScore >= 0.85 ? "Pickup verified and single-use tag permanently CLOSED." : "Pickup marked REVIEW_REQUIRED."
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
