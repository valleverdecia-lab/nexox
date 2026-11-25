import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { OWNER_EMAIL } from '../lib/config';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewAs, setViewAs] = useState(() => localStorage.getItem('pc_viewas') || 'owner'); // owner can toggle owner/user

  const isOwnerEmail = (session?.user?.email||'').toLowerCase() === OWNER_EMAIL.toLowerCase();
  const isOwner = isOwnerEmail && (profile?.role === 'owner' || isOwnerEmail);
  const effectiveOwner = isOwner && viewAs === 'owner';

  const fetchProfile = useCallback(async (uid) => {
    if(!uid) { setProfile(null); return null; }
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile(data || null);
    return data;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if(!mounted) return;
      setSession(data.session || null);
      if(data.session?.user) await fetchProfile(data.session.user.id);
      setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, sess) => {
      setSession(sess || null);
      if(sess?.user) await fetchProfile(sess.user.id);
      else setProfile(null);
      setLoading(false);
    });
    return () => { mounted=false; sub.subscription.unsubscribe(); };
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if(session?.user?.id) return fetchProfile(session.user.id);
  }, [session, fetchProfile]);

  const signOut = async () => { await supabase.auth.signOut(); setProfile(null); };

  const toggleViewAs = () => {
    if(!isOwner) return;
    const next = viewAs === 'owner' ? 'user' : 'owner';
    setViewAs(next); localStorage.setItem('pc_viewas', next);
  };

  const value = { session, user: session?.user||null, profile, loading, isOwner, effectiveOwner, viewAs, toggleViewAs, refreshProfile, signOut };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
