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

interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
  setRole: (role: UserRole) => void;
  signOut: () => Promise<void>;
  getRedirectPath: (role: UserRole) => string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: "HOUSEHOLD",
  loading: true,
  setRole: () => {},
  signOut: async () => {},
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore selected role from local storage if set
    const savedRole = localStorage.getItem("nirmaltag_user_role") as UserRole;
    if (savedRole) {
      setRoleState(savedRole);
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("firebase_uid", currentUser.uid)
            .single();

          if (!existingProfile) {
            await supabase.from("profiles").upsert({
              id: currentUser.uid,
              firebase_uid: currentUser.uid,
              email: currentUser.email || "",
              full_name: currentUser.displayName || currentUser.email?.split("@")[0] || "NirmalTag User",
              is_active: true
            });
          }
        } catch (err) {
          console.error("Supabase profile sync:", err);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem("nirmaltag_user_role", newRole);
  };

  const handleSignOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, setRole, signOut: handleSignOut, getRedirectPath }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
