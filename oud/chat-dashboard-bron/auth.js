import { useCallback, useEffect, useState } from 'react';
import { clearVault } from './vault.js';

import { REAL, supabase } from './supabaseClient.js';

export { REAL, supabase };
export const DEMO_PASSWORD = 'demo';

async function isOwner() {
  const { data, error } = await supabase.rpc('kluis_is_owner');
  return !error && data === true;
}

export function useAuth() {
  const [status, setStatus] = useState(REAL ? 'checking' : 'out'); // checking | out | in
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!REAL) return;
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (data.session && (await isOwner())) setStatus('in');
      else {
        if (data.session) await supabase.auth.signOut();
        setStatus('out');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    setError('');
    setBusy(true);
    try {
      if (!REAL) {
        if (password === DEMO_PASSWORD) setStatus('in');
        else setError('Wachtwoord klopt niet.');
        return;
      }
      const { error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) {
        setError('E-mail of wachtwoord klopt niet.');
        return;
      }
      if (await isOwner()) setStatus('in');
      else {
        await supabase.auth.signOut();
        setError('Dit account heeft geen toegang tot de kluis.');
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(async (reason = '') => {
    clearVault();
    if (REAL) await supabase.auth.signOut();
    setError(reason);
    setStatus('out');
  }, []);

  return { status, error, busy, signIn, signOut };
}

// Na 15 minuten zonder muis, toets of aanraking wordt de kluis weer op slot gezet.
export function useIdleLock(active, onLock, minutes = 15) {
  useEffect(() => {
    if (!active) return;
    let t;
    const reset = () => {
      clearTimeout(t);
      t = setTimeout(onLock, minutes * 60 * 1000);
    };
    const ev = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    ev.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(t);
      ev.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [active, onLock, minutes]);
}
