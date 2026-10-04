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
    const { disputeId, action, reviewNotes } = body;

    if (!disputeId || !action || (action !== "APPROVE" && action !== "REJECT")) {
      return NextResponse.json({
        success: false,
        code: "INVALID_PARAMETERS",
        message: "disputeId and valid action (APPROVE/REJECT) parameters are required.",
      }, { status: 400 });
    }

    // Insert verification review record in PostgreSQL
    const { data: review, error: dbError } = await supabaseUserClient
      .from("verification_reviews")
      .insert({
        pickup_id: disputeId,
        previous_status: "PENDING",
        final_status: action === "APPROVE" ? "VERIFIED" : "REJECTED",
        review_notes: reviewNotes || `Dispute ${action.toLowerCase()}d by MCD Officer.`,
      })
      .select("*")
      .single();

    if (dbError) {
      return NextResponse.json({
        success: false,
        code: "REVIEW_FAILED",
        message: `Failed to record dispute review: ${dbError.message}`,
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      code: "DISPUTE_RESOLVED",
      review,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Failed to resolve dispute due to server error.",
    }, { status: 500 });
  }
}
