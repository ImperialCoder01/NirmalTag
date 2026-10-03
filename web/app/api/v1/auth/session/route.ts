import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authenticateServerRequest } from "@/lib/supabase-auth";

export async function POST(request: Request) {
  try {
    let authResult;
    try {
      authResult = await authenticateServerRequest(request);
    } catch (authErr: any) {
      return NextResponse.json({ error: authErr.message || "Unauthorized" }, { status: 401 });
    }

    const { user: firebaseUser } = authResult;
    const firebaseUid = firebaseUser.uid;
    const email = firebaseUser.email;
    const fullName = firebaseUser.fullName;

    const body = await request.json().catch(() => ({}));
    const requestedRole = body.requestedRole;

    // 1. Fetch profile from Supabase
    let { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("firebase_uid", firebaseUid)
      .single();

    if (!profile) {
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: firebaseUid,
          firebase_uid: firebaseUid,
          email: email,
          full_name: fullName,
          is_active: true,
        })
        .select()
        .single();

      if (!createError && newProfile) {
        profile = newProfile;
      } else {
        profile = { id: firebaseUid, firebase_uid: firebaseUid, email, full_name: fullName, is_active: true };
      }
    }

    // 2. Fetch assigned roles from user_roles junction table (AUTHORITATIVE DB TRUTH)
    const { data: userRoleRecords } = await supabaseAdmin
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", profile.id);

    let assignedRoles: string[] = [];
    if (userRoleRecords && userRoleRecords.length > 0) {
      assignedRoles = userRoleRecords.map((ur: any) => ur.roles?.name).filter(Boolean);
    }

    // STRICT ROLE AUTHORIZATION: If account has no role in database, return PENDING_AUTHORIZATION!
    // (NO domain suffix auto-elevation, NO silent HOUSEHOLD fallback!)
    if (assignedRoles.length === 0) {
      return NextResponse.json({
        authenticated: true,
        user: { uid: firebaseUid, email, full_name: fullName },
        assignedRoles: [],
        activeRole: null,
        scope: null,
        isAuthorized: false,
        status: "PENDING_AUTHORIZATION",
        message: "Account authenticated successfully, but no operational user role is assigned in PostgreSQL database.",
      });
    }

    // Determine active role: Verify requestedRole against assignedRoles database truth
    let activeRole = assignedRoles[0];
    if (requestedRole && assignedRoles.includes(requestedRole)) {
      activeRole = requestedRole;
    } else if (requestedRole && !assignedRoles.includes(requestedRole) && !assignedRoles.includes("SYSTEM_ADMIN")) {
      return NextResponse.json({
        error: `403 Forbidden: Account ${email} is assigned [${assignedRoles.join(", ")}] and is NOT authorized for role ${requestedRole}`,
        assignedRoles,
        status: "UNAUTHORIZED_ROLE_REQUEST",
      }, { status: 403 });
    }

    // 3. Resolve Database Scope Boundaries
    let scope: any = { level: activeRole === "SYSTEM_ADMIN" ? "SYSTEM" : "UNBOUND" };

    if (activeRole === "HOUSEHOLD") {
      const { data: hh } = await supabaseAdmin.from("households").select("id, ward_id, rwa_id").eq("user_id", profile.id).single();
      if (hh) {
        scope = { level: "HOUSEHOLD", householdId: hh.id, wardId: hh.ward_id, rwaId: hh.rwa_id };
      }
    } else if (activeRole === "COLLECTOR") {
      const { data: col } = await supabaseAdmin.from("collectors").select("id, assigned_ward_id").eq("user_id", profile.id).single();
      if (col) {
        scope = { level: "WARD", collectorId: col.id, wardId: col.assigned_ward_id };
      }
    } else if (activeRole === "RWA_ADMIN" || activeRole === "BWG_ADMIN" || activeRole === "TAG_OFFICER" || activeRole === "MCD_OFFICER") {
      const { data: off } = await supabaseAdmin.from("officer_profiles").select("id, organization_id").eq("user_id", profile.id).single();
      if (off) {
        scope = { level: "ORGANIZATION", officerId: off.id, organizationId: off.organization_id };
      }
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        uid: firebaseUid,
        email: email,
        full_name: fullName,
      },
      assignedRoles,
      activeRole,
      scope,
      isAuthorized: true,
      status: "ACTIVE",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Authentication session resolution failed" }, { status: 500 });
  }
}
