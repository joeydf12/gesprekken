import { useEffect, useState } from 'react';
import { createVault, unlockVault } from './crypto.js';
import { REAL, supabase } from './supabaseClient.js';

// De sleutel staat alleen in het geheugen van deze pagina. Herladen, uitloggen of
// vergrendelen (auth.js roept clearVault aan) wist hem; daarna vraagt de app weer om het tweede wachtwoord.
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
    return () => listeners.delete(setK);
  }, []);
  return k;
}

// Is er al een tweede wachtwoord ingesteld? -> het record uit kluis_crypto of null
// Demo-modus: het record leeft alleen in het geheugen van deze pagina.
let demoRecord = null;

export async function fetchRecord() {
  if (!REAL) return demoRecord;
  const { data, error } = await supabase.from('kluis_crypto').select('salt, iterations, controle').maybeSingle();
  if (error) throw error;
  return data;
}

// Eenmalig instellen
export async function setupVault(password, userId) {
  const { key: k, record } = await createVault(password);
  if (REAL) {
    const { error } = await supabase.from('kluis_crypto').insert({ user_id: userId, ...record });
    if (error) throw error;
  } else demoRecord = record;
  key = k;
  emit();
}

// Ontgrendelen; geeft true bij gelukt, false bij fout wachtwoord
export async function unlock(password) {
  const record = await fetchRecord();
  if (!record) throw new Error('Nog geen tweede wachtwoord ingesteld');
  const k = await unlockVault(password, record);
  if (!k) return false;
  key = k;
  emit();
  return true;
}
