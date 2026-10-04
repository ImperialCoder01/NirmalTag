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
    const { rewardItemName, creditsSpent, idempotencyKey } = body;

    if (!rewardItemName || !creditsSpent || creditsSpent <= 0) {
      return NextResponse.json({
        success: false,
        code: "INVALID_PARAMETERS",
        message: "rewardItemName and positive creditsSpent parameters are required.",
      }, { status: 400 });
    }

    const activeIdempotencyKey = idempotencyKey || `RED-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Call authoritative PostgreSQL RPC procedure
    const { data: dbResult, error: dbError } = await supabaseUserClient.rpc(
      "redeem_household_credits",
      {
        p_reward_item_name: rewardItemName,
        p_credits_spent: creditsSpent,
        p_idempotency_key: activeIdempotencyKey,
      }
    );

    if (dbError) {
      return NextResponse.json({
        success: false,
        code: "REDEMPTION_FAILED",
        message: `Reward redemption failed: ${dbError.message}`,
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      code: "REWARD_REDEEMED",
      result: dbResult,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Reward redemption failed due to server error.",
    }, { status: 500 });
  }
}
