import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, getProfile, updateProfile } from '../lib/supabase';
import type { Profile } from '../types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isConfirmed?: boolean; isRateLimited?: boolean }>;
  signUp: (email: string, password: string, name: string, phone: string) => Promise<{ error: Error | null; user: User | null; requiresEmailConfirmation?: boolean; isRateLimited?: boolean }>;
  signInWithDirectSession: (email: string, name?: string, phone?: string) => Promise<void>;
  signInWithDemo: () => void;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateCustomerProfile: (data: Partial<Profile>) => Promise<Profile | null>;
  refreshProfile: () => Promise<void>;
}

const ACTIVE_SESSION_STORAGE_KEY = 'cafe_corner_active_user_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Generate stable deterministic UUID from string
function generateIdFromEmail(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash << 5) - hash + email.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `usr_${hex}_${Date.now().toString(36)}`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [configured, setConfigured] = useState<boolean>(isSupabaseConfigured);

  const fetchUserProfile = async (userId: string, authUser?: User) => {
    try {
      const data = await getProfile(userId);
      if (data) {
        setProfile(data);
      } else {
        const meta = authUser?.user_metadata || {};
        const fallbackProfile: Profile = {
          id: userId,
          name: meta.name || meta.full_name || authUser?.email?.split('@')[0] || 'Cafe Corner Guest',
          phone: meta.phone || '',
          email: authUser?.email,
        };
        setProfile(fallbackProfile);
      }
    } catch (err) {
      console.warn('Could not fetch profile:', err);
      setProfile({ id: userId });
    }
  };

  const setupAuth = () => {
    // Check if custom active session is stored in localStorage
    const savedSession = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY) : null;
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.user && parsed.profile) {
          setUser(parsed.user);
          setProfile(parsed.profile);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      }
    }

    if (!supabase) {
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    // Initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    }).catch((err) => {
      console.error('Error fetching auth session:', err);
      setIsLoading(false);
    });

    // Auth state subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserProfile(session.user.id, session.user);
      } else {
        if (!localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)) {
          setProfile(null);
        }
        if (event === 'SIGNED_OUT') {
          try {
            localStorage.removeItem('cafe_corner_cart_v1');
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('auth-signed-out'));
            }
          } catch (e) {
            console.warn('Error clearing cart storage on auth change:', e);
          }
        }
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  };

  useEffect(() => {
    const cleanup = setupAuth();

    const handleConfigChange = (e: any) => {
      setConfigured(Boolean(e.detail?.isConfigured));
      setupAuth();
    };

    window.addEventListener('supabase-config-updated', handleConfigChange);

    return () => {
      if (cleanup) cleanup();
      window.removeEventListener('supabase-config-updated', handleConfigChange);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!supabase) {
      return { error: new Error('Supabase client is not connected.') };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        const msg = (error.message || '').toLowerCase();
        const isRateLimited = msg.includes('rate limit') || msg.includes('over_email_send_rate_limit');
        const isEmailNotConfirmed = msg.includes('email not confirmed');

        return {
          error,
          isConfirmed: !isEmailNotConfirmed,
          isRateLimited,
        };
      }

      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchUserProfile(data.user.id, data.user);
      }

      return { error: null };
    } catch (err: any) {
      const isRateLimited = (err?.message || '').toLowerCase().includes('rate limit');
      return { error: err, isRateLimited };
    }
  };

  const signUp = async (email: string, password: string, name: string, phone: string) => {
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!supabase) {
      return { error: new Error('Supabase client is not connected.'), user: null };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name,
            full_name: name,
            phone,
          },
        },
      });

      if (error) {
        const msg = (error.message || '').toLowerCase();
        const isRateLimited = msg.includes('rate limit') || msg.includes('over_email_send_rate_limit');
        return { error, user: null, isRateLimited };
      }

      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);

      if (data.user) {
        try {
          await updateProfile(data.user.id, {
            name,
            full_name: name,
            phone,
            email: cleanEmail,
          });
          await fetchUserProfile(data.user.id, data.user);
        } catch (profileErr) {
          console.warn('Initial profile sync warning:', profileErr);
        }
      }

      const requiresEmailConfirmation = !data.session;

      return { error: null, user: data.user, requiresEmailConfirmation };
    } catch (err: any) {
      const isRateLimited = (err?.message || '').toLowerCase().includes('rate limit');
      return { error: err, user: null, isRateLimited };
    }
  };

  /**
   * Direct Session Sign In (Bypasses email rate limit cleanly)
   * Useful when Supabase SMTP email quota has been exhausted
   */
  const signInWithDirectSession = async (email: string, name?: string, phone?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const userId = generateIdFromEmail(cleanEmail);
    const displayName = name || cleanEmail.split('@')[0];

    const directUser = {
      id: userId,
      email: cleanEmail,
      app_metadata: { provider: 'email' },
      user_metadata: { name: displayName, phone: phone || '' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as unknown as User;

    const directProfile: Profile = {
      id: userId,
      name: displayName,
      full_name: displayName,
      phone: phone || '',
      delivery_address: '',
      email: cleanEmail,
    };

    // If Supabase client exists, attempt to register in profiles table as well
    if (supabase) {
      try {
        await updateProfile(userId, directProfile);
      } catch (e) {
        console.warn('Profile sync on direct session:', e);
      }
    }

    localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify({ user: directUser, profile: directProfile }));
    setUser(directUser);
    setProfile(directProfile);
    setIsLoading(false);
  };

  const signInWithDemo = () => {
    signInWithDirectSession(
      'customer@cafecorner.in',
      'Aarav Sharma',
      '8970428695'
    );
  };

  const resetPassword = async (email: string) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!supabase) {
      return { error: new Error('Supabase client is not connected.') };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
    return { error };
  };

  const signOut = async () => {
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    try {
      localStorage.removeItem('cafe_corner_cart_v1');
    } catch (e) {
      console.warn('Error removing cart storage on signOut:', e);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth-signed-out'));
    }
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const updateCustomerProfile = async (data: Partial<Profile>): Promise<Profile | null> => {
    if (!user) throw new Error('Customer is not signed in');

    // If local active session
    const saved = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (saved) {
      const updated: Profile = {
        id: user.id,
        name: data.name !== undefined ? data.name : profile?.name,
        full_name: data.full_name !== undefined ? data.full_name : profile?.full_name,
        phone: data.phone !== undefined ? data.phone : profile?.phone,
        delivery_address: data.delivery_address !== undefined ? data.delivery_address : profile?.delivery_address,
        address: data.address !== undefined ? data.address : profile?.address,
        email: data.email !== undefined ? data.email : profile?.email,
      };
      setProfile(updated);
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify({ user, profile: updated }));

      // Also persist to Supabase if connected
      if (supabase) {
        await updateProfile(user.id, updated).catch(() => {});
      }
      return updated;
    }

    const updated = await updateProfile(user.id, data);
    if (updated) {
      setProfile(updated);
    }
    return updated;
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id, user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isConfigured: configured,
        signIn,
        signUp,
        signInWithDirectSession,
        signInWithDemo,
        resetPassword,
        signOut,
        updateCustomerProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
