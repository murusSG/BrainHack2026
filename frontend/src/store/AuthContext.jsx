import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, isAuthConfigured } from '../services/supabaseClient';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within <AuthProvider>');
  return context;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isAuthConfigured);

  useEffect(() => {
    if (!isAuthConfigured) return undefined;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  // Role is mirrored into app_metadata by the backend trigger / admin update.
  const role = session?.user?.app_metadata?.role ?? 'public';

  const value = useMemo(
    () => ({
      isAuthConfigured,
      loading,
      session,
      user: session?.user ?? null,
      role,
      signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      signUp: (email, password) => supabase.auth.signUp({ email, password }),
      signOut: () => supabase.auth.signOut(),
    }),
    [loading, session, role]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
