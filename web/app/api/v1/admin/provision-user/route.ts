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
    const { targetProfileId, roleName } = body;

    if (!targetProfileId || !roleName) {
      return NextResponse.json({
        success: false,
        code: "INVALID_PARAMETERS",
        message: "targetProfileId and roleName parameters are required.",
      }, { status: 400 });
    }

    // Call PostgreSQL assign_user_role procedure
    const { data: dbResult, error: dbError } = await supabaseUserClient.rpc(
      "assign_user_role",
      {
        p_target_profile_id: targetProfileId,
        p_role_name: roleName,
      }
    );

    if (dbError) {
      return NextResponse.json({
        success: false,
        code: "PROVISIONING_FAILED",
        message: `Role provisioning failed: ${dbError.message}`,
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      code: "ROLE_PROVISIONED",
      result: dbResult,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Role provisioning failed due to server error.",
    }, { status: 500 });
  }
}
