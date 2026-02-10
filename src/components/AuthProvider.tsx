"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabaseClient } from "@/lib/supabase-client";
import type { AuthSession } from "@/types/index";

interface AuthContextType {
  session: AuthSession | null;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  user: any | null;
}

export const AuthContext = React.createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check current session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabaseClient.auth.getSession();

        if (session?.user) {
          setSession({
            user: {
              ...session.user,
              email: session.user.email || "",
            },
            isLoading: false,
          });
        } else {
          setSession(null);
        }
      } catch (err) {
        console.error("Failed to check session:", err);
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setSession({
          user: {
            ...session.user,
            email: session.user.email || "",
          },
          isLoading: false,
        });
      } else {
        setSession(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabaseClient.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        signUp,
        signIn,
        signOut,
        user: session?.user || null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
