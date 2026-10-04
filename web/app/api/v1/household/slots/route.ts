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

    const { supabaseUserClient, user } = authResult;

    const { data: profile } = await supabaseUserClient
      .from("profiles")
      .select("id")
      .or(`firebase_uid.eq.${user.uid},id.eq.${user.uid}`)
      .single();

    const { data: household } = profile ? await supabaseUserClient
      .from("households")
      .select("ward_id")
      .eq("user_id", profile.id)
      .single() : { data: null };

    const wardId = household?.ward_id;

    // Standard service time windows
    const standardWindows = ["09:00–11:00", "11:00–13:00", "14:00–16:00", "16:00–18:00"];

    // Generate upcoming 7 dates starting tomorrow
    const dates: string[] = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }

    // Query existing slot configurations if wardId present
    let existingSlots: any[] = [];
    if (wardId) {
      const { data } = await supabaseUserClient
        .from("pickup_slot_configurations")
        .select("service_date, time_window, max_capacity, booked_count")
        .eq("ward_id", wardId)
        .in("service_date", dates);
      existingSlots = data || [];
    }

    // Map dates to windows with remaining capacity
    const slots = dates.map((dateStr) => {
      const windows = standardWindows.map((tw) => {
        const match = existingSlots.find(
          (s) => s.service_date === dateStr && s.time_window === tw
        );
        const maxCap = match ? match.max_capacity : 5;
        const booked = match ? match.booked_count : 0;
        const available = Math.max(0, maxCap - booked);

        return {
          timeWindow: tw,
          maxCapacity: maxCap,
          bookedCount: booked,
          availableCapacity: available,
          isFull: available === 0,
        };
      });

      return {
        date: dateStr,
        windows,
      };
    });

    return NextResponse.json({ success: true, slots });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message,
    }, { status: 500 });
  }
}
