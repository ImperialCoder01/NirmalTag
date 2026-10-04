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
    const { tagId, pickupDate, timeWindow } = body;

    if (!tagId || !pickupDate || !timeWindow) {
      return NextResponse.json({
        success: false,
        code: "INVALID_PARAMETERS",
        message: "tagId, pickupDate (YYYY-MM-DD), and timeWindow are required.",
      }, { status: 400 });
    }

    const { data, error } = await supabaseUserClient.rpc("book_pickup_appointment", {
      p_tag_id: tagId,
      p_pickup_date: pickupDate,
      p_time_window: timeWindow,
    });

    if (error) {
      return NextResponse.json({
        success: false,
        code: error.message.includes("SLOT_FULL") ? "SLOT_FULL" : "BOOKING_FAILED",
        message: error.message,
      }, { status: error.message.includes("SLOT_FULL") ? 409 : 422 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Booking failed.",
    }, { status: 500 });
  }
}

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

    const { supabaseUserClient, user } = authResult;

    const { data: profile } = await supabaseUserClient
      .from("profiles")
      .select("id")
      .or(`firebase_uid.eq.${user.uid},id.eq.${user.uid}`)
      .single();

    if (!profile) {
      return NextResponse.json({ success: true, pickupRequests: [] });
    }

    const { data: household } = await supabaseUserClient
      .from("households")
      .select("id")
      .eq("user_id", profile.id)
      .single();

    if (!household) {
      return NextResponse.json({ success: true, pickupRequests: [] });
    }

    const { data: pickupRequests, error } = await supabaseUserClient
      .from("pickup_requests")
      .select(`
        id,
        pickup_date,
        time_window,
        pickup_address_ref,
        status,
        cancellation_reason,
        created_at,
        tags (
          id,
          canonical_code,
          status
        ),
        waste_categories (
          code,
          display_name
        )
      `)
      .eq("household_id", household.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({
        success: false,
        code: "FETCH_FAILED",
        message: error.message,
      }, { status: 422 });
    }

    return NextResponse.json({ success: true, pickupRequests: pickupRequests || [] });
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

    const { supabaseUserClient } = authResult;
    const body = await request.json().catch(() => ({}));
    const { requestId, action, reason } = body;

    if (!requestId || action !== "CANCEL") {
      return NextResponse.json({
        success: false,
        code: "INVALID_PARAMETERS",
        message: "requestId and action 'CANCEL' are required.",
      }, { status: 400 });
    }

    const { data, error } = await supabaseUserClient.rpc("cancel_pickup_appointment", {
      p_pickup_request_id: requestId,
      p_reason: reason || "Cancelled by user",
    });

    if (error) {
      return NextResponse.json({
        success: false,
        code: "CANCELLATION_FAILED",
        message: error.message,
      }, { status: 422 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message,
    }, { status: 500 });
  }
}
