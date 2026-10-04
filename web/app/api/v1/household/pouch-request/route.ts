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
    const { categoryCode, quantity } = body;

    if (!categoryCode) {
      return NextResponse.json({
        success: false,
        code: "INVALID_PARAMETERS",
        message: "categoryCode is required (e.g. SANITARY, SPECIAL_CARE).",
      }, { status: 400 });
    }

    const { data, error } = await supabaseUserClient.rpc("request_household_pouch", {
      p_category_code: categoryCode,
      p_quantity: quantity || 1,
    });

    if (error) {
      return NextResponse.json({
        success: false,
        code: "POUCH_REQUEST_FAILED",
        message: error.message,
      }, { status: 422 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Pouch request failed.",
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
      return NextResponse.json({ success: true, requests: [] });
    }

    const { data: household } = await supabaseUserClient
      .from("households")
      .select("id")
      .eq("user_id", profile.id)
      .single();

    if (!household) {
      return NextResponse.json({ success: true, requests: [] });
    }

    const { data: requests, error } = await supabaseUserClient
      .from("pouch_requests")
      .select(`
        id,
        quantity,
        status,
        allocated_tag_ids,
        requested_at,
        waste_categories (
          code,
          display_name
        )
      `)
      .eq("household_id", household.id)
      .order("requested_at", { ascending: false });

    if (error) {
      return NextResponse.json({
        success: false,
        code: "FETCH_FAILED",
        message: error.message,
      }, { status: 422 });
    }

    return NextResponse.json({ success: true, requests: requests || [] });
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
    const { requestId, tagCode, status } = body;

    if (!requestId) {
      return NextResponse.json({
        success: false,
        code: "INVALID_PARAMETERS",
        message: "requestId is required.",
      }, { status: 400 });
    }

    // Invoke RPC or fallback to table update
    const { data: rpcData, error: rpcError } = await supabaseUserClient.rpc("fulfill_household_pouch_request", {
      p_request_id: requestId,
      p_tag_code: tagCode || null,
    });

    if (!rpcError && rpcData) {
      return NextResponse.json(rpcData);
    }

    // Direct table update fallback if RPC not yet deployed to target DB
    const { error: updateError } = await supabaseUserClient
      .from("pouch_requests")
      .update({
        status: status || "DELIVERED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) {
      return NextResponse.json({
        success: false,
        code: "FULFILLMENT_FAILED",
        message: updateError.message,
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      requestId,
      status: status || "DELIVERED",
      allocatedTagCode: tagCode || null,
      message: "Pouch request status updated successfully.",
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Pouch request fulfillment failed.",
    }, { status: 500 });
  }
}
