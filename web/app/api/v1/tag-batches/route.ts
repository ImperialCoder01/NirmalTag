import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized access: Bearer token required" }, { status: 401 });
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
      return NextResponse.json({ error: "Invalid Firebase identity token" }, { status: 401 });
    }

    const firebaseUser = firebaseData.users[0];
    const officerUid = firebaseUser.localId;

    const body = await request.json();
    const { batchName, quantity, wardId, idempotencyKey } = body;

    const qty = quantity || 1000;
    const name = batchName || `BATCH-2026-${Math.floor(100 + Math.random() * 900)}`;
    const startSerial = `NT-SAN-2026-${Math.floor(1000 + Math.random() * 8000)}`;
    const endSerial = `NT-SAN-2026-${parseInt(startSerial.split("-")[3]) + qty - 1}`;

    const activeIdempotencyKey = idempotencyKey || `BATCH-GEN-${name}-${Date.now()}`;

    // Record Audit Log Entry in Supabase
    await supabase.from("audit_logs").insert({
      actor_id: officerUid,
      role: "TAG_OFFICER",
      action: "TAG_BATCH_CREATED",
      target_entity: "tag_batches",
      target_id: name,
      idempotency_key: activeIdempotencyKey,
      metadata: { quantity: qty, startSerial, endSerial, wardId: wardId || "ward-42" },
    });

    return NextResponse.json({
      success: true,
      batchName: name,
      quantity: qty,
      startSerial,
      endSerial,
      status: "IN_INVENTORY",
      idempotencyKey: activeIdempotencyKey,
      created_at: new Date().toISOString(),
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Batch creation failed" }, { status: 500 });
  }
}
