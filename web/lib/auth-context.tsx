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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: "HOUSEHOLD",
  loading: true,
  setRole: () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("HOUSEHOLD");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Sync user profile authoritatively with Supabase PostgreSQL
        try {
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("firebase_uid", currentUser.uid)
            .single();

          if (!existingProfile) {
            // Upsert profile in PostgreSQL
            await supabase.from("profiles").upsert({
              id: currentUser.uid,
              firebase_uid: currentUser.uid,
              email: currentUser.email || "",
              full_name: currentUser.displayName || currentUser.email?.split("@")[0] || "NirmalTag Resident",
              phone_number: currentUser.phoneNumber || null,
              is_active: true
            });

            // Fetch HOUSEHOLD role ID
            const { data: roleData } = await supabase
              .from("roles")
              .select("id")
              .eq("name", "HOUSEHOLD")
              .single();

            if (roleData) {
              await supabase.from("user_roles").upsert({
                user_id: currentUser.uid,
                role_id: roleData.id
              });
            }
          }
        } catch (err) {
          console.error("Supabase profile sync error:", err);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, setRole, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
