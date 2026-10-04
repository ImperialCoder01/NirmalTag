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

    const { data: logs, error: dbError } = await supabaseUserClient
      .from("bwg_daily_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (dbError) {
      return NextResponse.json({
        success: false,
        code: "FETCH_FAILED",
        message: `Failed to fetch BWG daily logs: ${dbError.message}`,
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      code: "BWG_LOGS_FETCHED",
      logs: logs || [],
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Failed to fetch BWG logs due to server error.",
    }, { status: 500 });
  }
}

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
    const { weightKg, category, sealCode } = body;

    if (!weightKg || weightKg <= 0 || !category) {
      return NextResponse.json({
        success: false,
        code: "INVALID_PARAMETERS",
        message: "weightKg (positive number) and category parameters are required.",
      }, { status: 400 });
    }

    const activeSealCode = sealCode || `SEAL-${Math.floor(1000 + Math.random() * 9000)}-X`;

    const { data: newLog, error: dbError } = await supabaseUserClient
      .from("bwg_daily_logs")
      .insert({
        weight_kg: weightKg,
        category,
        seal_code: activeSealCode,
        status: "VERIFIED",
      })
      .select("*")
      .single();

    if (dbError) {
      return NextResponse.json({
        success: false,
        code: "LOG_CREATION_FAILED",
        message: `Failed to create BWG volume log: ${dbError.message}`,
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      code: "BWG_LOG_CREATED",
      log: newLog,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Failed to submit BWG log due to server error.",
    }, { status: 500 });
  }
}
