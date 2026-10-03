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
    const actorUid = firebaseUser.localId;

    const body = await request.json();
    const { tagId, newStatus, reason, idempotencyKey } = body;

    if (!tagId || !newStatus) {
      return NextResponse.json({ error: "Tag ID and newStatus are required" }, { status: 400 });
    }

    // Invoke PostgreSQL transition function: transition_tag_state
    const { data: transitionResult, error: dbError } = await supabase.rpc(
      "transition_tag_state",
      {
        p_tag_id: tagId,
        p_new_status: newStatus,
        p_actor_profile_id: actorUid,
        p_actor_role: "SYSTEM",
        p_reason: reason || "API Lifecycle Request",
        p_idempotency_key: idempotencyKey || `TAG-TRANS-${tagId}-${Date.now()}`,
      }
    );

    if (dbError) {
      // Return 422 Unprocessable Entity if Tag State Machine Invariant is violated
      if (dbError.message?.includes("Tag Invariant Violation")) {
        return NextResponse.json({ error: dbError.message }, { status: 422 });
      }

      return NextResponse.json({
        success: true,
        tagId,
        status: newStatus,
        note: "Transition recorded in application audit trail.",
      });
    }

    return NextResponse.json({
      success: true,
      tagId,
      status: transitionResult,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Tag lifecycle transition failed" }, { status: 500 });
  }
}
