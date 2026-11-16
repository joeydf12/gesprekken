import { useEffect, useState } from 'react';
import { createVault, unlockVault } from './crypto.js';
import { sb } from './lib/supabase.js';

// Sleutel voor extra privé foto's. Staat alleen in het geheugen van deze pagina:
// herladen, uitloggen of vergrendelen (clearVault) wist hem.
// Het tweede wachtwoord en de sleutel komen nooit in localStorage, Supabase, logs of de URL.
let key = null;
const listeners = new Set();
const emit = () => listeners.forEach((f) => f(key));

export const getKey = () => key;
export function clearVault() {
  key = null;
  emit();
}
export function useVaultKey() {
  const [k, setK] = useState(key);
  useEffect(() => {
    listeners.add(setK);
    setK(key);
    return () => listeners.delete(setK);
  }, []);
  return k;
}

/** Het record uit kluis_crypto (salt, rondes, controlewaarde), of null als er nog geen tweede wachtwoord is. */
export async function fetchRecord() {
  const { data, error } = await sb.from('kluis_crypto').select('salt, iterations, controle').maybeSingle();
  if (error) throw error;
  return data;
}

/** Eenmalig instellen. */
export async function setupVault(password, userId) {
  const { key: k, record } = await createVault(password);
  const { error } = await sb.from('kluis_crypto').insert({ user_id: userId, ...record });
  if (error) throw error;
  key = k;
  emit();
}

/** Ontgrendelen; true bij gelukt, false bij een fout wachtwoord. */
export async function unlock(password) {
  const record = await fetchRecord();
  if (!record) throw new Error('Er is nog geen tweede wachtwoord ingesteld.');
  const k = await unlockVault(password, record);
  if (!k) return false;
  key = k;
  emit();
  return true;
}
