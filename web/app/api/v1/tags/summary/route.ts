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

    const { data: summary, error: dbError } = await supabaseUserClient.rpc("get_tag_inventory_summary");

    if (dbError) {
      return NextResponse.json({
        success: false,
        code: "SUMMARY_FAILED",
        message: `Inventory summary calculation failed: ${dbError.message}`,
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      code: "INVENTORY_SUMMARY_FETCHED",
      summary,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Inventory summary calculation failed due to server error.",
    }, { status: 500 });
  }
}
