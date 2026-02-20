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
  loading: boolean;          // true while initial auth state is being determined
  profileLoading: boolean;   // true while profile is being fetched after auth
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  hasRole: (r: RoleName | RoleName[]) => boolean;
  canAccessRegion: (district: string | null) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const INIT_SAFETY_TIMEOUT = 15_000; // 15 seconds — force loading=false if init hangs

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<RoleName[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initDoneRef = useRef(false);
  const profileRef = useRef<Profile | null>(null);

  // Keep ref in sync with state so the onAuthStateChange closure always
  // has access to the latest profile without a stale-closure problem.
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const fetchProfileAndRoles = useCallback(async (userId: string) => {
    try {
      const { data: p, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (pErr) {
        console.error('[Auth] Error fetching profile:', pErr);
        return { profile: null, roles: [] as RoleName[] };
      }
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

  /**
   * Fetch profile with automatic retries.
   * The profile row may not exist yet if the DB trigger hasn't fired
   * (e.g. right after invite or createUser).
   */
  const fetchProfileWithRetry = useCallback(
    async (userId: string, retries = 3, delayMs = 1200) => {
      for (let i = 0; i < retries; i++) {
        const result = await fetchProfileAndRoles(userId);
        if (result.profile) return result;
        if (i < retries - 1) {
          console.warn(`[Auth] Profile not found, retrying (${i + 1}/${retries})…`);
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
      return { profile: null, roles: [] as RoleName[] };
    },
    [fetchProfileAndRoles]
  );

  const clearAuth = useCallback(() => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setProfileLoading(false);
    profileRef.current = null;
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
  useEffect(() => {
    let mounted = true;

    // Safety timeout — if init never completes, stop the spinner.
    // IMPORTANT: do NOT clear storage here — the session may be valid
    // but the network is just slow.  Just let the user see the login page
    // and try again.
    const safetyTimer = setTimeout(() => {
      if (mounted && !initDoneRef.current) {
        console.warn('[Auth] Safety timeout reached — forcing loading=false');
        initDoneRef.current = true;
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
          if (event === 'SIGNED_OUT') clearStorage();
          if (!initDoneRef.current) { initDoneRef.current = true; setLoading(false); }
          return;
        }

        // ── Session exists — update user/session immediately ──
        setUser(newSession.user);
        setSession(newSession);

        // Mark auth init as done RIGHT NOW — we have a definitive answer
        // about whether the user is authenticated.  Profile fetch is tracked
        // separately by `profileLoading` so ProtectedRoute can show the
        // correct spinner instead of the page hanging.
        if (!initDoneRef.current) {
          initDoneRef.current = true;
          if (mounted) setLoading(false);
        }

        // ── Fetch profile on initial load and sign-in (with retries) ──
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          setProfileLoading(true);
          const { profile: p, roles: r } = await fetchProfileWithRetry(newSession.user.id);
          if (!mounted) return;

          if (p) {
            setProfile(p);
            setRoles(r);
          } else {
            console.warn('[Auth] Profile not found after retries — keeping session alive');
          }
          setProfileLoading(false);
        }

        // ── Token refresh — only re-fetch profile if we don't have one ──
        if (event === 'TOKEN_REFRESHED') {
          if (!profileRef.current) {
            setProfileLoading(true);
            const { profile: p, roles: r } = await fetchProfileAndRoles(newSession.user.id);
            if (!mounted) return;
            if (p) { setProfile(p); setRoles(r); }
            setProfileLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [fetchProfileAndRoles, fetchProfileWithRetry, clearAuth, clearStorage]);

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
 * Only redirects when auth is fully initialized AND no profile fetch is in progress.
 */
export function useSessionGuard() {
  const { session, loading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't redirect while initial auth or profile is still loading
    if (loading || profileLoading) return;
    if (!session && location.pathname.startsWith('/admin')) {
      navigate('/login', { state: { from: location }, replace: true });
    }
  }, [session, loading, profileLoading, location, navigate]);
}
