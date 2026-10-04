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
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";

    if (!query) {
      return NextResponse.json({
        success: false,
        code: "INVALID_PARAMETERS",
        message: "query parameter is required.",
      }, { status: 400 });
    }

    const { data: tags, error: dbError } = await supabaseUserClient
      .from("tags")
      .select("id, serial_code, canonical_code, status, current_assigned_household_id, created_at, updated_at")
      .or(`serial_code.ilike.%${query}%,canonical_code.ilike.%${query}%`)
      .limit(10);

    if (dbError) {
      return NextResponse.json({
        success: false,
        code: "SEARCH_FAILED",
        message: `Tag search failed: ${dbError.message}`,
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      code: "TAGS_FOUND",
      tags: tags || [],
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Tag search failed due to server error.",
    }, { status: 500 });
  }
}
