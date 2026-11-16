import { supabase } from './supabaseClient.js';
import { decryptToBlob, encryptFile } from './crypto.js';

const BUCKET = 'kluis-fotos';

// Foto uploaden. Met `key` (uit getKey()) wordt hij eerst in de browser versleuteld.
export async function uploadPhoto({ persoonId, file, key = null, bijschrift = null, profiel = false }) {
  const id = crypto.randomUUID();
  const versleuteld = !!key;
  const pad = `${persoonId}/${id}${versleuteld ? '.enc' : ''}`;
  const body = versleuteld ? await encryptFile(key, file) : file;
  const { error: e1 } = await supabase.storage.from(BUCKET).upload(pad, body, {
    contentType: versleuteld ? 'application/octet-stream' : file.type,
    upsert: false,
  });
  if (e1) throw e1;
  const { data, error: e2 } = await supabase
    .from('kluis_fotos')
    .insert({ persoon_id: persoonId, pad, bijschrift, is_profielfoto: profiel, versleuteld })
    .select()
    .single();
  if (e2) {
    await supabase.storage.from(BUCKET).remove([pad]); // geen losse bestanden achterlaten
    throw e2;
  }
  return data;
}

// Foto tonen: geeft een URL voor <img src>. Roep URL.revokeObjectURL aan bij blob:-URL's als de foto weg is.
export async function photoUrl(foto, key = null) {
  if (!foto.versleuteld) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(foto.pad, 300);
    if (error) throw error;
    return data.signedUrl;
  }
  if (!key) throw new Error('Vergrendeld: eerst het tweede wachtwoord invullen');
  const { data, error } = await supabase.storage.from(BUCKET).download(foto.pad);
  if (error) throw error;
  const blob = await decryptToBlob(key, new Uint8Array(await data.arrayBuffer()));
  return URL.createObjectURL(blob);
}
