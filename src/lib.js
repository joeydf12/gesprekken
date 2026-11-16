// Hulpfuncties: datums, leeftijd, chat inlezen, zoeken en plaatshouder-foto's.

export const ME = 'Joey'; // naam waarmee jouw berichten rechts getoond worden
export const PLATFORMS = ['Discord', 'Telegram', 'Reddit', 'WhatsApp', 'Instagram', 'Snapchat', 'Anders'];

const pad = (n) => (n < 10 ? '0' : '') + n;
export const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const parseISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};
export const todayISO = () => iso(new Date());
export const daysAgo = (n) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return iso(d);
};
export const daysSince = (s) => (s ? Math.round((parseISO(todayISO()) - parseISO(s)) / 86400000) : null);

const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const WEEKDAYS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

export function fmtDate(s, withYear = true) {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  return d + ' ' + MONTHS[m - 1] + (withYear ? ' ' + y : '');
}

export function dayLabel(s) {
  const n = daysSince(s);
  if (n === 0) return 'Vandaag';
  if (n === 1) return 'Gisteren';
  const d = parseISO(s);
  return WEEKDAYS[d.getDay()] + ' ' + fmtDate(s, d.getFullYear() !== new Date().getFullYear());
}

export function agoText(n) {
  if (n == null) return 'nog geen contact';
  if (n <= 0) return 'vandaag';
  if (n === 1) return 'gisteren';
  if (n < 14) return n + ' dagen geleden';
  if (n < 60) return Math.round(n / 7) + ' weken geleden';
  if (n < 365) return Math.round(n / 30) + ' maanden geleden';
  return Math.round(n / 365) + ' jaar geleden';
}

export function ageOf(p) {
  if (p.geboortedatum) {
    const b = parseISO(p.geboortedatum);
    const n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
    return a;
  }
  return p.leeftijd ?? null;
}

export function daysToBirthday(p) {
  if (!p.geboortedatum) return null;
  const b = parseISO(p.geboortedatum);
  const n = new Date();
  n.setHours(12, 0, 0, 0);
  let next = new Date(n.getFullYear(), b.getMonth(), b.getDate(), 12);
  if (next < n) next = new Date(n.getFullYear() + 1, b.getMonth(), b.getDate(), 12);
  return Math.round((next - n) / 86400000);
}

export function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  return ((parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/* ---------- Chat inlezen ----------
   Herkent drie vormen:
   - WhatsApp-export:  12/03/2026, 21:14 - Naam: tekst
   - Met tijd:         [21:14] Naam: tekst
   - Eenvoudig:        Naam: tekst
   Regels die nergens op passen horen bij het bericht erboven. */
const WA = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4}),?\s+(\d{1,2}):(\d{2})\s+-\s+([^:]{1,40}):\s?(.*)$/;
const BR = /^\[(\d{1,2}):(\d{2})\]\s+([^:]{1,40}):\s?(.*)$/;
const PL = /^([^\s:][^:]{0,23}):\s(.*)$/;

export function parseChat(tekst, fallbackDate) {
  const out = [];
  let last = null;
  let n = 0;
  const push = (from, text, time, date) => {
    last = {
      id: n++,
      from,
      mine: !!from && from.trim().toLowerCase() === ME.toLowerCase(),
      text,
      time: time || null,
      date: date || fallbackDate,
    };
    out.push(last);
  };
  String(tekst || '')
    .split(/\r?\n/)
    .forEach((raw) => {
      const line = raw.replace(/\s+$/, '');
      if (!line.trim()) return;
      let m;
      if ((m = WA.exec(line))) {
        let y = +m[3];
        if (y < 100) y += 2000;
        push(m[6].trim(), m[7], pad(+m[4]) + ':' + m[5], y + '-' + pad(+m[2]) + '-' + pad(+m[1]));
      } else if ((m = BR.exec(line))) {
        push(m[3].trim(), m[4], pad(+m[1]) + ':' + m[2]);
      } else if ((m = PL.exec(line)) && m[1].split(/\s+/).length <= 3) {
        push(m[1].trim(), m[2]);
      } else if (last) {
        last.text += '\n' + line;
      } else {
        push(null, line);
      }
    });
  return out;
}

/* ---------- Zoeken ---------- */
export function splitMatch(text, q) {
  if (!q) return [{ t: text, hit: false }];
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
  return text.split(re).map((t, i) => ({ t, hit: i % 2 === 1 }));
}

export function snippet(text, q, len = 64) {
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return '';
  const s = Math.max(0, i - 18);
  return (s > 0 ? '…' : '') + text.slice(s, s + len).replace(/\s+/g, ' ');
}

/* ---------- Activiteit per maand ---------- */
export function monthBuckets(chats, n = 12) {
  const now = new Date();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: d.getFullYear() + '-' + pad(d.getMonth() + 1),
      label: MONTHS[d.getMonth()],
      year: d.getFullYear(),
      messages: 0,
      chats: 0,
      current: i === 0,
    });
  }
  const idx = Object.fromEntries(out.map((b, i) => [b.key, i]));
  chats.forEach((c) => {
    const seen = new Set();
    c.messages.forEach((m) => {
      const k = (m.date || c.datum).slice(0, 7);
      if (k in idx) {
        out[idx[k]].messages++;
        seen.add(k);
      }
    });
    seen.forEach((k) => out[idx[k]].chats++);
  });
  return out;
}

/* ---------- Plaatshouder-foto's (vervang later door echte foto's uit Supabase Storage) ---------- */
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
export const hueOf = (s) => hash(String(s)) % 360;

export function placeholderPhoto(seed, kind = 'portret') {
  const h = hueOf(seed);
  const h2 = (h + 50) % 360;
  const g = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${h} 45% 70%)"/><stop offset="1" stop-color="hsl(${h2} 45% 42%)"/></linearGradient></defs><rect width="240" height="240" fill="url(#g)"/>`;
  let body = '';
  if (kind === 'portret') {
    body = `<ellipse cx="120" cy="236" rx="86" ry="74" fill="hsl(${h} 30% 28%)"/><circle cx="120" cy="104" r="42" fill="hsl(${(h + 20) % 360} 35% 78%)"/><path d="M76 98a44 44 0 0 1 88 0c-14-16-62-18-88 0z" fill="hsl(${h2} 30% 24%)"/>`;
  } else if (kind === 'berg') {
    body = `<circle cx="178" cy="64" r="22" fill="hsl(48 90% 82%)"/><path d="M0 190 70 96l52 62 40-48 78 80v50H0z" fill="hsl(${h} 25% 30%)"/><path d="M0 222 60 170l60 36 56-30 64 46v22H0z" fill="hsl(${h2} 30% 20%)"/>`;
  } else if (kind === 'stad') {
    let r = '';
    for (let i = 0; i < 7; i++) {
      const w = 22 + ((hash(seed + i) % 14));
      const ht = 70 + (hash(seed + 'h' + i) % 90);
      r += `<rect x="${i * 34 - 4}" y="${240 - ht}" width="${w}" height="${ht}" fill="hsl(${h} 28% ${18 + (i % 3) * 6}%)"/>`;
      for (let k = 0; k < 4; k++) r += `<rect x="${i * 34 + 2}" y="${240 - ht + 10 + k * 18}" width="5" height="6" fill="hsl(48 90% 78%)" opacity=".8"/>`;
    }
    body = r;
  } else if (kind === 'eten') {
    body = `<circle cx="120" cy="124" r="78" fill="hsl(${h} 20% 94%)"/><circle cx="120" cy="124" r="58" fill="hsl(${(h + 15) % 360} 55% 58%)"/><circle cx="100" cy="108" r="12" fill="hsl(${(h + 150) % 360} 45% 38%)"/><circle cx="138" cy="130" r="10" fill="hsl(48 85% 70%)"/><circle cx="112" cy="146" r="9" fill="hsl(${(h + 150) % 360} 45% 38%)"/>`;
  } else {
    body = `<rect x="38" y="82" width="164" height="84" rx="38" fill="hsl(${h} 20% 14%)"/><circle cx="82" cy="124" r="14" fill="hsl(${h2} 40% 62%)"/><circle cx="158" cy="112" r="7" fill="hsl(${h} 60% 70%)"/><circle cx="172" cy="130" r="7" fill="hsl(${h2} 60% 70%)"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">${g}${body}</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
