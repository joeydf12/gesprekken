// Extra privé foto's: versleuteling in de browser, vóór de upload.
// Sleutel afleiden: PBKDF2-SHA256 (600.000 rondes) uit je tweede wachtwoord + willekeurige salt.
// Versleutelen: AES-GCM 256-bit, nieuwe willekeurige IV per bestand.
// Bestandsformaat: [1 byte versie][12 bytes IV][AES-GCM versleutelde bytes].
// De versleutelde bytes bevatten zelf: [1 byte lengte][mime-type][foto-bytes].
// Het wachtwoord en de sleutel blijven alleen in het geheugen (zie vault.js).

export const ITERATIONS = 600000;
const VERSION = 1;
const CHECK_TEXT = 'kluis-ok';
const enc = new TextEncoder();
const dec = new TextDecoder();
const subtle = () => globalThis.crypto.subtle;

export const toB64 = (u8) => {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
};
export const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export async function deriveKey(password, salt, iterations = ITERATIONS) {
  const base = await subtle().importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false, // niet exporteerbaar
    ['encrypt', 'decrypt']
  );
}

export async function encryptBytes(key, bytes) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv }, key, bytes));
  const out = new Uint8Array(1 + 12 + ct.length);
  out[0] = VERSION;
  out.set(iv, 1);
  out.set(ct, 13);
  return out;
}

export async function decryptBytes(key, data) {
  if (data[0] !== VERSION) throw new Error('Onbekend bestandsformaat');
  return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: data.slice(1, 13) }, key, data.slice(13)));
}

// Eerste keer instellen: geeft de sleutel en het record dat in kluis_crypto komt.
export async function createVault(password) {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const controle = toB64(await encryptBytes(key, enc.encode(CHECK_TEXT)));
  return { key, record: { salt: toB64(salt), iterations: ITERATIONS, controle } };
}

// Ontgrendelen: geeft de sleutel, of null bij een fout wachtwoord.
export async function unlockVault(password, record) {
  try {
    const key = await deriveKey(password, fromB64(record.salt), record.iterations);
    const text = dec.decode(await decryptBytes(key, fromB64(record.controle)));
    return text === CHECK_TEXT ? key : null;
  } catch {
    return null;
  }
}

// Foto (File of Blob) -> versleuteld Blob
export async function encryptFile(key, file) {
  const mime = enc.encode(file.type || 'application/octet-stream');
  const body = new Uint8Array(await file.arrayBuffer());
  const plain = new Uint8Array(1 + mime.length + body.length);
  plain[0] = mime.length;
  plain.set(mime, 1);
  plain.set(body, 1 + mime.length);
  return new Blob([await encryptBytes(key, plain)], { type: 'application/octet-stream' });
}

// Versleutelde bytes -> foto-Blob met het oorspronkelijke type
export async function decryptToBlob(key, data) {
  const plain = await decryptBytes(key, data);
  const n = plain[0];
  return new Blob([plain.slice(1 + n)], { type: dec.decode(plain.slice(1, 1 + n)) });
}
