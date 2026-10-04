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

    const { data: collector } = await supabaseUserClient
      .from("collectors")
      .select("id")
      .eq("user_id", profileId)
      .single();

    if (!collector) {
      return NextResponse.json({
        success: true,
        jobs: { today: [], upcoming: [], completed: [], missed: [], cancelled: [] }
      });
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
      .eq("assigned_collector_id", collector.id)
      .order("pickup_date", { ascending: true });

    if (error) {
      return NextResponse.json({
        success: false,
        code: "FETCH_FAILED",
        message: error.message,
      }, { status: 422 });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    const todayJobs: any[] = [];
    const upcomingJobs: any[] = [];
    const completedJobs: any[] = [];
    const missedJobs: any[] = [];
    const cancelledJobs: any[] = [];

    (pickupRequests || []).forEach((job) => {
      if (job.status === "COMPLETED" || job.status === "VERIFIED") {
        completedJobs.push(job);
      } else if (job.status === "CANCELLED") {
        cancelledJobs.push(job);
      } else if (job.status === "MISSED") {
        missedJobs.push(job);
      } else if (job.pickup_date === todayStr) {
        todayJobs.push(job);
      } else if (job.pickup_date > todayStr) {
        upcomingJobs.push(job);
      } else {
        missedJobs.push(job);
      }
    });

    return NextResponse.json({
      success: true,
      jobs: {
        today: todayJobs,
        upcoming: upcomingJobs,
        completed: completedJobs,
        missed: missedJobs,
        cancelled: cancelledJobs,
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message,
    }, { status: 500 });
  }
}
