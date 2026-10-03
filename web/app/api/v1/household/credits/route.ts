import { NextResponse } from "next/server";
import { authenticateServerRequest } from "@/lib/supabase-auth";

export async function GET(request: Request) {
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

    // Fetch household credit account
    const { data: accounts, error: accErr } = await supabaseUserClient
      .from("credit_accounts")
      .select("id, household_id, balance, updated_at")
      .limit(1);

    if (accErr || !accounts || accounts.length === 0) {
      return NextResponse.json({
        success: true,
        code: "NO_CREDIT_ACCOUNT",
        balance: 0,
        transactions: [],
      });
    }

    const account = accounts[0];

    // Fetch transactions
    const { data: txs, error: txErr } = await supabaseUserClient
      .from("credit_transactions")
      .select("id, amount, tx_type, pickup_id, created_at")
      .eq("account_id", account.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const mappedTxs = (txs || []).map(t => ({
      id: t.id.slice(0, 8),
      date: t.created_at ? new Date(t.created_at).toLocaleString() : "2026-10-04",
      category: t.tx_type === "EARN" ? "Verified Waste Pickup Reward" : "Reward Redemption",
      points: `${t.amount > 0 ? "+" : ""}${t.amount} Pts`,
      status: "VERIFIED",
    }));

    return NextResponse.json({
      success: true,
      code: "CREDITS_FETCHED",
      balance: account.balance || 0,
      transactions: mappedTxs,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Failed to fetch credit balance due to server error.",
    }, { status: 500 });
  }
}
