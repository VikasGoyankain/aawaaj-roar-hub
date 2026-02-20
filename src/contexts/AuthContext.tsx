import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Profile, RoleName } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: RoleName[];
  loading: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  hasRole: (r: RoleName | RoleName[]) => boolean;
  canAccessRegion: (district: string | null) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<RoleName[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Fetch profile + roles from DB ── */
  const fetchProfileAndRoles = useCallback(async (userId: string) => {
    try {
      const { data: p, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (pErr || !p) {
        console.error('[Auth] profile fetch error:', pErr);
        return { profile: null as Profile | null, roles: [] as RoleName[] };
      }
      const { data: ur } = await supabase
        .from('user_roles')
        .select('role_id, roles(name)')
        .eq('user_id', userId);
      const roleNames: RoleName[] = (ur || []).map(
        (r: { role_id: number; roles: { name: string } | { name: string }[] | null }) => {
          const d = r.roles;
          if (!d) return 'Volunteer' as RoleName;
          const name = Array.isArray(d) ? d[0]?.name : d.name;
          return (name || 'Volunteer') as RoleName;
        }
      );
      return { profile: p as Profile, roles: roleNames };
    } catch (err) {
      console.error('[Auth] fetchProfileAndRoles threw:', err);
      return { profile: null as Profile | null, roles: [] as RoleName[] };
    }
  }, []);

  /**
   * Load profile — always sets profileLoading back to false in `finally`,
   * so it can NEVER get stuck.
   */
  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    try {
      const { profile: p, roles: r } = await fetchProfileAndRoles(userId);
      if (p) { setProfile(p); setRoles(r); }
    } finally {
      setProfileLoading(false);
    }
  }, [fetchProfileAndRoles]);

  const clearAuth = useCallback(() => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setProfileLoading(false);
  }, []);

  const clearStorage = useCallback(() => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-'))
        .forEach((k) => localStorage.removeItem(k));
    } catch { /* private browsing */ }
  }, []);

  const handleSignOut = useCallback(async () => {
    clearStorage();
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    clearAuth();
  }, [clearAuth, clearStorage]);

  /* ── Inactivity auto-logout ── */
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (session) {
      inactivityTimerRef.current = setTimeout(() => handleSignOut(), INACTIVITY_TIMEOUT);
    }
  }, [session, handleSignOut]);

  useEffect(() => {
    if (!session) return;
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, resetInactivityTimer));
    resetInactivityTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetInactivityTimer));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [session, resetInactivityTimer]);

  /* ── Initialisation: getSession (fast, synchronous-ish) ── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s) {
        setUser(s.user);
        setSession(s);
        loadProfile(s.user.id); // non-blocking — tracked by profileLoading
      }
      setLoading(false); // always resolves, never hangs
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Subsequent events: sign-in, sign-out, token refresh ── */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('[Auth] event:', event, 'session:', !!newSession);

        if (event === 'SIGNED_OUT' || !newSession) {
          clearAuth();
          if (event === 'SIGNED_OUT') clearStorage();
          return;
        }

        setUser(newSession.user);
        setSession(newSession);

        // Fetch profile on sign-in (but NOT on INITIAL_SESSION — that's handled by getSession above)
        if (event === 'SIGNED_IN') {
          loadProfile(newSession.user.id);
        }

        // On token refresh, only re-fetch if we somehow lost the profile
        if (event === 'TOKEN_REFRESHED' && !profile) {
          loadProfile(newSession.user.id);
        }
      }
    );
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error ? new Error(error.message) : null };
  };

  const hasRole = (r: RoleName | RoleName[]) => {
    const arr = Array.isArray(r) ? r : [r];
    return arr.some((role) => roles.includes(role));
  };

  const canAccessRegion = (district: string | null) => {
    if (hasRole('President')) return true;
    if (!district) return true;
    return profile?.residence_district === district;
  };

  const refreshProfile = async () => {
    if (!user) return;
    await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, roles, loading, profileLoading, signIn, signOut: handleSignOut, resetPassword, hasRole, canAccessRegion, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/**
 * Hook: redirect to /login if session expires while on an /admin page.
 */
export function useSessionGuard() {
  const { session, loading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!session && location.pathname.startsWith('/admin')) {
      navigate('/login', { state: { from: location }, replace: true });
    }
  }, [session, loading, profileLoading, location, navigate]);
}
