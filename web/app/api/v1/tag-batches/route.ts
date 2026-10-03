import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Tag batch creation failed: Missing or invalid Authorization header.",
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
        message: "Tag batch creation failed: Invalid or expired Firebase identity token.",
      }, { status: 401 });
    }

    const firebaseUser = firebaseData.users[0];
    const officerUid = firebaseUser.localId;

    const body = await request.json();
    const { batchName, quantity, wardId, idempotencyKey } = body;

    const qty = quantity || 100;
    const name = batchName || `BATCH-2026-${Math.floor(100 + Math.random() * 900)}`;
    const activeIdempotencyKey = idempotencyKey || `BATCH-GEN-${name}-${Date.now()}`;

    // Execute PostgreSQL procedure: create_tag_batch_and_records
    // Generates actual tag_batch and N actual tag records in PostgreSQL DB!
    const { data: dbResult, error: dbError } = await supabaseAdmin.rpc(
      "create_tag_batch_and_records",
      {
        p_batch_name: name,
        p_quantity: qty,
        p_ward_id: wardId || "123e4567-e89b-12d3-a456-426614174000",
        p_officer_profile_id: officerUid,
        p_idempotency_key: activeIdempotencyKey,
      }
    );

    if (dbError) {
      return NextResponse.json({
        success: false,
        code: "BATCH_CREATION_FAILED",
        message: `Tag batch creation failed: ${dbError.message}`,
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      code: "BATCH_CREATED",
      result: dbResult,
      idempotencyKey: activeIdempotencyKey,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Tag batch creation failed due to server error.",
    }, { status: 500 });
  }
}
