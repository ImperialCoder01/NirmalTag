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

    // Fetch profiles
    const { data: profiles, error: dbError } = await supabaseUserClient
      .from("profiles")
      .select("id, full_name, email, phone_number, is_active, created_at")
      .limit(50);

    if (dbError) {
      return NextResponse.json({
        success: false,
        code: "FETCH_FAILED",
        message: `Failed to fetch users: ${dbError.message}`,
      }, { status: 422 });
    }

    // Fetch user roles
    const { data: userRoles } = await supabaseUserClient
      .from("user_roles")
      .select("user_id, role_id");

    const mappedUsers = (profiles || []).map(p => ({
      id: p.id.slice(0, 8),
      profileId: p.id,
      name: p.full_name || p.email?.split("@")[0] || "User Account",
      email: p.email || "user@nirmaltag.org",
      role: "COLLECTOR",
      scope: "Ward 42",
      status: p.is_active ? "ACTIVE" : "INACTIVE",
    }));

    return NextResponse.json({
      success: true,
      code: "USERS_FETCHED",
      users: mappedUsers,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Failed to fetch users due to server error.",
    }, { status: 500 });
  }
}
