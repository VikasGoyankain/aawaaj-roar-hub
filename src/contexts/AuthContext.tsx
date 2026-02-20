import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<RoleName[]>([]);
  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProfileAndRoles = useCallback(async (userId: string) => {
    // Fetch profile
    const { data: p, error: pErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (pErr) {
      console.error('Error fetching profile:', pErr);
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
  }, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  }, []);

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

  // Initialize auth state
  useEffect(() => {
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s?.user) {
        setUser(s.user);
        setSession(s);
        const { profile: p, roles: r } = await fetchProfileAndRoles(s.user.id);
        setProfile(p);
        setRoles(r);
      }
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, ns) => {
      setSession(ns);
      setUser(ns?.user ?? null);
      if (event === 'SIGNED_IN' && ns?.user) {
        const { profile: p, roles: r } = await fetchProfileAndRoles(ns.user.id);
        setProfile(p);
        setRoles(r);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setRoles([]);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchProfileAndRoles]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin`,
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
