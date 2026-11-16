import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_KEY;

// Echte modus zodra beide variabelen gezet zijn (zie .env.example). Anders demo.
export const REAL = !!(URL && KEY);
export const supabase = REAL ? createClient(URL, KEY) : null;
