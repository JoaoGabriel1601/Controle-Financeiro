import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { AppUser } from '../types';

/** Normaliza o usuário do Supabase Auth para o formato consumido pela UI. */
function mapUser(u: SupabaseUser | null | undefined): AppUser | null {
  if (!u) return null;
  const meta = (u.user_metadata ?? {}) as Record<string, string | undefined>;
  return {
    id: u.id,
    email: u.email ?? null,
    displayName: meta.full_name ?? meta.name ?? (u.email ? u.email.split('@')[0] : null),
    photoURL: meta.avatar_url ?? meta.picture ?? null,
  };
}

export const authService = {
  async loginWithGoogle() {
    // Fluxo por redirect: a sessão volta na URL e é capturada pelo onAuthStateChange.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  },

  async loginWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return mapUser(data.user);
  },

  async registerWithEmail(name: string, email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw error;
    return mapUser(data.user);
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  onAuthStateChanged(callback: (user: AppUser | null) => void) {
    // Em supabase-js, o evento INITIAL_SESSION dispara logo após o subscribe,
    // entregando a sessão atual (ou null) — cobre o bootstrap do app.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(mapUser(session?.user));
    });
    return () => data.subscription.unsubscribe();
  },

  async currentUser(): Promise<AppUser | null> {
    const { data } = await supabase.auth.getUser();
    return mapUser(data.user);
  },
};
