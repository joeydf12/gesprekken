import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
// Beide namen werken: VITE_SUPABASE_PUBLISHABLE_KEY (voorkeur) of VITE_SUPABASE_KEY.
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_KEY;

export const CONFIG_OK = !!(url && key);

const STORAGE_KEY = 'kluis-auth';

// De inlog staat alleen in sessionStorage: tabblad of browser dicht = uitgelogd.
// Zo kan niemand later op hetzelfde apparaat zonder wachtwoord je kluis openen.
// Oude inlog uit localStorage (eerdere versies van de app) direct opruimen.
try {
  Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_KEY)).forEach((k) => localStorage.removeItem(k));
} catch { /* opslag niet beschikbaar */ }

function sessionStore() {
  try {
    const s = window.sessionStorage;
    s.setItem('__t', '1'); s.removeItem('__t');
    return s;
  } catch {
    // Geen sessionStorage (bijv. strenge privacy-instellingen): alleen in het geheugen.
    const mem = new Map();
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  }
}

export const sb = CONFIG_OK
  ? createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: STORAGE_KEY, storage: sessionStore(), detectSessionInUrl: false }
  })
  : null;

export const BUCKET = 'kluis-fotos';
