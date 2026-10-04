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
    const { subject, details, householdId } = body;

    if (!subject || !details) {
      return NextResponse.json({
        success: false,
        code: "INVALID_PARAMETERS",
        message: "subject and details parameters are required.",
      }, { status: 400 });
    }

    const { data: incident, error: dbError } = await supabaseUserClient
      .from("rwa_incidents")
      .insert({
        subject,
        details,
        household_id: householdId || null,
        status: "OPEN",
      })
      .select("id, created_at")
      .single();

    if (dbError) {
      return NextResponse.json({
        success: false,
        code: "INCIDENT_FAILED",
        message: `Failed to record RWA incident: ${dbError.message}`,
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      code: "INCIDENT_LOGGED",
      incident,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Failed to submit RWA incident due to server error.",
    }, { status: 500 });
  }
}
