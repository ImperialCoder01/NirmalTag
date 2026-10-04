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
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (dbError) {
      return NextResponse.json({
        success: false,
        code: "FETCH_FAILED",
        message: `Failed to fetch audit logs: ${dbError.message}`,
      }, { status: 422 });
    }

    const mappedLogs = (logs || []).map(l => ({
      id: l.id ? l.id.slice(0, 8) : "AUD-000",
      actor: l.actor_id ? l.actor_id.slice(0, 8) : "sys_admin",
      action: l.action || "SYSTEM_EVENT",
      target: l.target_entity || "SYSTEM",
      time: l.created_at ? new Date(l.created_at).toLocaleString() : "2026-10-04",
      scope: l.request_id || "SYSTEM",
    }));

    return NextResponse.json({
      success: true,
      code: "AUDIT_LOGS_FETCHED",
      logs: mappedLogs,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Failed to fetch audit logs due to server error.",
    }, { status: 500 });
  }
}
