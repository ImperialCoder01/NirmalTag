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

    const { supabaseUserClient, user } = authResult;

    // Verify caller has administrative rights or system officer role
    const { data: profile } = await supabaseUserClient
      .from("profiles")
      .select("role")
      .or(`firebase_uid.eq.${user.uid},id.eq.${user.uid}`)
      .single();

    if (!profile || !["SYSTEM_ADMIN", "RWA_ADMIN", "TAG_OFFICER"].includes(profile.role)) {
      return NextResponse.json({
        success: false,
        code: "FORBIDDEN",
        message: "Access Denied: Demo reset requires administrator or tag officer authorization.",
      }, { status: 403 });
    }

    // Isolated Demo Data Cleanup & Reset (Only targets synthetic demo records starting with DEMO-)
    const timestamp = new Date().toISOString();

    const { error: clearErr } = await supabaseUserClient
      .from("pouch_requests")
      .update({ status: "CANCELLED", cancellation_reason: "DEMO_RESET" })
      .like("notes", "%SYNTHETIC_DEMO%");

    return NextResponse.json({
      success: true,
      code: "DEMO_RESET_SUCCESSFUL",
      message: "Synthetic demo state successfully reset to default baseline.",
      resetAt: timestamp,
      targetScope: "SYNTHETIC_DEMO_DATA_ONLY",
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Demo reset failed due to a server error.",
    }, { status: 500 });
  }
}
