// src/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
// (Opcional) si vas a usar deep link para reset password:
// import * as Linking from "expo-linking";

type SessionUser = {
  id: string;
  email?: string;
} | null;

export type AuthContextType = {
  user: SessionUser;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthCtx = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) {
        console.warn("getSession error:", error);
      }
      setUser(
        data.session
          ? { id: data.session.user.id, email: data.session.user.email ?? undefined }
          : null
      );
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session ? { id: session.user.id, email: session.user.email ?? undefined } : null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // si querés: acá podrías navegar/emitir evento; normalmente
    // el Layout que observa `user` decide a dónde ir.
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async function resetPassword(email: string) {
    // Elegí una URL real donde completes el reset. Puede ser tu web
    // o un deep link de la app (p. ej. myapp://reset-password)
    // const redirectTo = Linking.createURL("/update-password");
    const redirectTo = process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL; // o hardcodeá una URL
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || undefined,
    });
    if (error) throw error;
  }

  const value: AuthContextType = { user, loading, signIn, signOut, resetPassword };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
