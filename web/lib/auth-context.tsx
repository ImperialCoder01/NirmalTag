"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "./firebase";
import { supabase } from "./supabase";

export type UserRole = 
  | "HOUSEHOLD" 
  | "COLLECTOR" 
  | "TAG_OFFICER" 
  | "RWA_ADMIN" 
  | "BWG_ADMIN" 
  | "MCD_OFFICER" 
  | "SYSTEM_ADMIN";

export interface UserScope {
  level: string;
  wardId?: string;
  rwaId?: string;
  bwgId?: string;
}

interface AuthContextType {
  user: User | null;
  role: UserRole;
  assignedRoles: UserRole[];
  scope: UserScope;
  loading: boolean;
  setRole: (role: UserRole) => Promise<boolean>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  getRedirectPath: (role: UserRole) => string;
}

const defaultScope: UserScope = { level: "WARD", wardId: "ward-42" };

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: "HOUSEHOLD",
  assignedRoles: ["HOUSEHOLD"],
  scope: defaultScope,
  loading: true,
  setRole: async () => false,
  signOut: async () => {},
  getIdToken: async () => null,
  getRedirectPath: () => "/household",
});

export const getRedirectPath = (role: UserRole): string => {
  switch (role) {
    case "COLLECTOR": return "/collector";
    case "TAG_OFFICER": return "/tag-officer";
    case "RWA_ADMIN": return "/rwa";
    case "BWG_ADMIN": return "/bwg";
    case "MCD_OFFICER": return "/mcd";
    case "SYSTEM_ADMIN": return "/admin";
    case "HOUSEHOLD":
    default:
      return "/household";
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<UserRole>("HOUSEHOLD");
  const [assignedRoles, setAssignedRoles] = useState<UserRole[]>(["HOUSEHOLD"]);
  const [scope, setScope] = useState<UserScope>(defaultScope);
  const [loading, setLoading] = useState(true);

  const getIdToken = async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      return null;
    }
  };

  const resolveServerSession = async (currentUser: User, requestedRole?: UserRole) => {
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch("/api/v1/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({ requestedRole: requestedRole || role }),
      });

      if (res.ok) {
        const sessionData = await res.json();
        if (sessionData.assignedRoles && sessionData.assignedRoles.length > 0) {
          setAssignedRoles(sessionData.assignedRoles as UserRole[]);
        }
        if (sessionData.activeRole) {
          setRoleState(sessionData.activeRole as UserRole);
        }
        if (sessionData.scope) {
          setScope(sessionData.scope);
        }
        return true;
      }
    } catch (err) {
      console.error("Server session resolution failed:", err);
    }
    return false;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Sync Profile & Fetch Authoritative Server Roles
        await resolveServerSession(currentUser);
      } else {
        setRoleState("HOUSEHOLD");
        setAssignedRoles(["HOUSEHOLD"]);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setRole = async (newRole: UserRole): Promise<boolean> => {
    if (!user) {
      setRoleState(newRole);
      return true;
    }

    // Server-side verification: Check if newRole is assigned to account in database
    if (assignedRoles.includes(newRole) || assignedRoles.includes("SYSTEM_ADMIN")) {
      setRoleState(newRole);
      await resolveServerSession(user, newRole);
      return true;
    } else {
      console.warn(`Role ${newRole} rejected: Account is assigned [${assignedRoles.join(", ")}]`);
      return false;
    }
  };

  const handleSignOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setRoleState("HOUSEHOLD");
    setAssignedRoles(["HOUSEHOLD"]);
  };

  return (
    <AuthContext.Provider value={{
      user,
      role,
      assignedRoles,
      scope,
      loading,
      setRole,
      signOut: handleSignOut,
      getIdToken,
      getRedirectPath
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
