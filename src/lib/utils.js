/* ---------- Fouten ---------- */
export function errText(err) {
  return (err && (err.message || err.error_description || err.error)) || String(err);
}
// Tabel/kolom/functie bestaat (nog) niet: migratie niet uitgevoerd.
export function isMissing(err) {
  return !!err && (['42P01', '42703', '42883', 'PGRST202', 'PGRST204', 'PGRST205'].includes(err.code) ||
    /does not exist|schema cache|could not find/i.test(err.message || ''));
}
export function isAuthErr(err) {
  return !!err && (err.status === 401 || err.code === 'PGRST301' || err.code === 'PGRST303' ||
    /jwt|not authenticated|refresh token/i.test(err.message || ''));
}

/* ---------- Datums ---------- */
const pad2 = (n) => (n < 10 ? '0' : '') + n;
export function today() {
  const d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
export function fmtDate(d) {
  return d ? new Date(d + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}
export function ageOf(p) {
  if (p.geboortedatum) {
    const b = new Date(p.geboortedatum + 'T00:00:00'), n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
    return a;
  }
  return p.leeftijd;
}
export function daysSince(d) {
  if (!d) return null;
  const n = new Date(); n.setHours(0, 0, 0, 0);
  return Math.round((n - new Date(d + 'T00:00:00')) / 86400000);
}
export function daysToBirthday(p) {
  if (!p.geboortedatum) return null;
  const b = new Date(p.geboortedatum + 'T00:00:00'), n = new Date(); n.setHours(0, 0, 0, 0);
  let next = new Date(n.getFullYear(), b.getMonth(), b.getDate());
  if (next < n) next = new Date(n.getFullYear() + 1, b.getMonth(), b.getDate());
  return Math.round((next - n) / 86400000);
}
export function contactDue(p) {
  if (!p.contact_interval) return null;
  const d = daysSince(p.laatst_contact);
  if (d === null) return { never: true, over: Infinity, days: null };
  return d >= p.contact_interval ? { never: false, over: d - p.contact_interval, days: d } : null;
}

/* ---------- Overig ---------- */
export function initials(n) {
  const p = String(n || '?').trim().split(/\s+/);
  return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
export function groupBy(list, key) {
  const m = {};
  for (const x of list) (m[x[key]] ||= []).push(x);
  return m;
}
export function tally(list) {
  const c = {};
  for (const k of list) if (k) c[k] = (c[k] || 0) + 1;
  return c;
}
export function sortLog(a, b) {
  if (a.datum !== b.datum) return a.datum < b.datum ? 1 : -1;
  return (a.created_at || '') < (b.created_at || '') ? 1 : -1;
}

/* ---------- Afbeeldingen ---------- */
// Verkleint naar max 1600px en zet om naar JPEG; valt terug op het origineel.
export async function prepareImage(file) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close?.();
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.85));
    if (blob) return { blob, type: 'image/jpeg', ext: 'jpg' };
  } catch { /* val terug op origineel */ }
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  return { blob: file, type: file.type || 'image/jpeg', ext };
}
