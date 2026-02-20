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
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  hasRole: (r: RoleName | RoleName[]) => boolean;
  canAccessRegion: (district: string | null) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const INIT_SAFETY_TIMEOUT = 12_000; // 12 seconds — force loading=false if init hangs

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<RoleName[]>([]);
  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initDoneRef = useRef(false);

  const fetchProfileAndRoles = useCallback(async (userId: string) => {
    try {
      // Fetch profile
      const { data: p, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (pErr) {
        console.error('[Auth] Error fetching profile:', pErr);
        return { profile: null, roles: [] as RoleName[] };
      }
      // Fetch roles via bridge + roles table
      const { data: ur } = await supabase
        .from('user_roles')
        .select('role_id, roles(name)')
        .eq('user_id', userId);

      const roleNames: RoleName[] = (ur || []).map(
        (r: { role_id: number; roles: { name: string } | { name: string }[] | null }) => {
          const rolesData = r.roles;
          if (!rolesData) return 'Volunteer' as RoleName;
          const name = Array.isArray(rolesData) ? rolesData[0]?.name : rolesData.name;
          return (name || 'Volunteer') as RoleName;
        }
      );

      return { profile: p as Profile, roles: roleNames };
    } catch (err) {
      console.error('[Auth] fetchProfileAndRoles threw:', err);
      return { profile: null, roles: [] as RoleName[] };
    }
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  }, []);

  /** Wipe all supabase-js auth keys from localStorage so stale tokens never re-hydrate. */
  const clearStorage = useCallback(() => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-'))
        .forEach((k) => localStorage.removeItem(k));
    } catch { /* private browsing mode may throw */ }
  }, []);

  const handleSignOut = useCallback(async () => {
    clearStorage();
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    clearAuth();
  }, [clearAuth, clearStorage]);

  // Inactivity auto-logout
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

  // ── Single source of truth: onAuthStateChange ──
  // Handles INITIAL_SESSION (replaces getSession), SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT.
  useEffect(() => {
    let mounted = true;

    // Safety timeout: if init never completes, stop the loading spinner
    // so the user can at least see the login page instead of an infinite spinner.
    const safetyTimer = setTimeout(() => {
      if (mounted && !initDoneRef.current) {
        console.warn('[Auth] Safety timeout reached — forcing loading=false');
        initDoneRef.current = true;
        // Also wipe storage in case stale data is causing the hang
        clearStorage();
        clearAuth();
        setLoading(false);
      }
    }, INIT_SAFETY_TIMEOUT);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        console.log('[Auth] event:', event, 'session:', !!newSession);

        // ── No session (signed out, or expired with no refresh) ──
        if (!newSession) {
          clearAuth();
          if (event === 'SIGNED_OUT') clearStorage(); // belt + suspenders
          if (!initDoneRef.current) { initDoneRef.current = true; setLoading(false); }
          return;
        }

        // ── Session exists — update user/session immediately ──
        setUser(newSession.user);
        setSession(newSession);

        // ── Fetch profile for initial load, sign-in, and token refresh ──
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const { profile: p, roles: r } = await fetchProfileAndRoles(newSession.user.id);
          if (!mounted) return;

          if (p) {
            setProfile(p);
            setRoles(r);
          } else if (event === 'INITIAL_SESSION') {
            // Profile fetch failed on initial load — the session is likely stale.
            // Clear state AND localStorage so the stale token never re-hydrates.
            console.warn('[Auth] Profile fetch failed on init — clearing stale session');
            clearAuth();
            clearStorage();
            try { await supabase.auth.signOut(); } catch { /* ignore */ }
          }
          // For TOKEN_REFRESHED/SIGNED_IN: keep existing profile if fetch failed
          // (transient network blip), don't blow away the session.
        }

        // Mark init done after the first event is fully processed
        if (!initDoneRef.current) {
          initDoneRef.current = true;
          if (mounted) setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [fetchProfileAndRoles, clearAuth, clearStorage]);

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
    const { profile: p, roles: r } = await fetchProfileAndRoles(user.id);
    setProfile(p);
    setRoles(r);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, roles, loading, signIn, signOut: handleSignOut, resetPassword, hasRole, canAccessRegion, refreshProfile }}
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
 * Put this inside components rendered within <BrowserRouter>.
 */
export function useSessionGuard() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !session && location.pathname.startsWith('/admin')) {
      navigate('/login', { state: { from: location }, replace: true });
    }
  }, [session, loading, location, navigate]);
}
