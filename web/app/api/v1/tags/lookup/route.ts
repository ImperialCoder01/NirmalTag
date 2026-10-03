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
    const { code, tagId } = body;

    if (!code && !tagId) {
      return NextResponse.json({
        success: false,
        code: "INVALID_PARAMETERS",
        message: "Tag code or tagId is required for lookup.",
      }, { status: 400 });
    }

    let query = supabaseUserClient.from("tags").select(`
      id,
      serial_code,
      canonical_code,
      status,
      batch_id,
      current_assigned_household_id,
      created_at,
      updated_at
    `);

    if (tagId) {
      query = query.eq("id", tagId);
    } else if (code) {
      // Search by serial_code or canonical_code
      query = query.or(`serial_code.eq.${code},canonical_code.eq.${code}`);
    }

    const { data: tags, error: dbError } = await query;

    if (dbError) {
      return NextResponse.json({
        success: false,
        code: "LOOKUP_FAILED",
        message: `Tag lookup query failed: ${dbError.message}`,
      }, { status: 422 });
    }

    if (!tags || tags.length === 0) {
      return NextResponse.json({
        success: false,
        code: "TAG_NOT_FOUND",
        message: `No tag found matching criteria.`,
      }, { status: 404 });
    }

    const tag = tags[0];

    return NextResponse.json({
      success: true,
      code: "TAG_FOUND",
      tag: {
        id: tag.id,
        code: tag.serial_code || tag.canonical_code || tag.id,
        status: tag.status,
        batchId: tag.batch_id,
        assignedHouseholdId: tag.current_assigned_household_id || "Unassigned",
        createdAt: tag.created_at,
        updatedAt: tag.updated_at,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message || "Tag lookup failed due to server error.",
    }, { status: 500 });
  }
}
