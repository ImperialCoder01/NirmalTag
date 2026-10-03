"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: "HOUSEHOLD",
  loading: true,
  setRole: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("HOUSEHOLD");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, setRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
