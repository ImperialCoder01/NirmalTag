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

    const { supabaseUserClient, profileId } = authResult;

    const { data: notifications, error } = await supabaseUserClient
      .from("in_app_notifications")
      .select("*")
      .eq("user_id", profileId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({
        success: false,
        code: "FETCH_FAILED",
        message: error.message,
      }, { status: 422 });
    }

    const unreadCount = (notifications || []).filter((n) => !n.is_read).length;

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      unreadCount,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message,
    }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
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

    const { supabaseUserClient, profileId } = authResult;
    const body = await request.json().catch(() => ({}));
    const { notificationId } = body;

    if (notificationId) {
      await supabaseUserClient
        .from("in_app_notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", profileId);
    } else {
      await supabaseUserClient
        .from("in_app_notifications")
        .update({ is_read: true })
        .eq("user_id", profileId)
        .eq("is_read", false);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message,
    }, { status: 500 });
  }
}
