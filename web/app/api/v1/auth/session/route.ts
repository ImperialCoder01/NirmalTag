import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    if (!idToken) {
      return NextResponse.json({ error: "Empty token" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const requestedRole = body.requestedRole;

    // Verify token with Firebase Auth REST lookup API
    const firebaseVerifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`;
    const firebaseRes = await fetch(firebaseVerifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    const firebaseData = await firebaseRes.json();
    if (!firebaseRes.ok || !firebaseData.users || firebaseData.users.length === 0) {
      return NextResponse.json({ error: "Invalid or expired Firebase identity token" }, { status: 401 });
    }

    const firebaseUser = firebaseData.users[0];
    const firebaseUid = firebaseUser.localId;
    const email = firebaseUser.email || "";
    const fullName = firebaseUser.displayName || email.split("@")[0] || "NirmalTag User";

    // 1. Fetch or create profile in Supabase
    let { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("firebase_uid", firebaseUid)
      .single();

    if (!profile) {
      const { data: newProfile, error: createError } = await supabase
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

      if (createError) {
        // Fallback profile object if insertion is blocked by RLS
        profile = { id: firebaseUid, firebase_uid: firebaseUid, email, full_name: fullName, is_active: true };
      } else {
        profile = newProfile;
      }
    }

    // 2. Fetch assigned roles from user_roles junction table
    const { data: userRoleRecords } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", profile.id);

    let assignedRoles: string[] = [];
    if (userRoleRecords && userRoleRecords.length > 0) {
      assignedRoles = userRoleRecords.map((ur: any) => ur.roles?.name).filter(Boolean);
    }

    // Default to HOUSEHOLD if no custom role assigned in database
    if (assignedRoles.length === 0) {
      assignedRoles = ["HOUSEHOLD"];
    }

    // Add SYSTEM_ADMIN for authorized system domain users
    if (email.endsWith("@nirmaltag.org") || email === "admin@nirmaltag.org") {
      if (!assignedRoles.includes("SYSTEM_ADMIN")) {
        assignedRoles.push("SYSTEM_ADMIN");
      }
    }

    // Determine active role: Verify requestedRole against assignedRoles database truth
    let activeRole = assignedRoles[0];
    if (requestedRole && assignedRoles.includes(requestedRole)) {
      activeRole = requestedRole;
    } else if (requestedRole && !assignedRoles.includes(requestedRole) && !assignedRoles.includes("SYSTEM_ADMIN")) {
      return NextResponse.json({
        error: `403 Forbidden: Account ${email} is not authorized for role ${requestedRole}`,
        assignedRoles,
      }, { status: 403 });
    }

    // 3. Resolve Scope boundaries
    let scope = {
      level: activeRole === "SYSTEM_ADMIN" ? "SYSTEM" : "WARD",
      wardId: "ward-42",
      rwaId: "rwa-greenpark",
    };

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
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Authentication error" }, { status: 500 });
  }
}
