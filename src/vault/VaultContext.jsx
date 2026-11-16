import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { sb, BUCKET } from '../lib/supabase.js';
import { errText, isAuthErr, isMissing, prepareImage, sortLog, today } from '../lib/utils.js';
import { decryptToBlob, encryptFile } from '../crypto.js';
import { useVaultKey } from '../vault.js';
import { useToast } from '../components/Toast.jsx';

export const VaultContext = createContext(null);
export const useVault = () => useContext(VaultContext);

const EMPTY = { personen: [], accounts: [], fotos: [], gesprekken: [], onderwerpen: [], chats: [] };
// Velden die pas bestaan na supabase-migratie-2.sql
const V3_FIELDS = ['hobbys', 'werk', 'studie', 'favorieten', 'vermijden', 'werkt_altijd', 'eigen_velden'];
const sortChats = (a, b) => (a.datum !== b.datum ? (a.datum < b.datum ? 1 : -1) : ((a.created_at || '') < (b.created_at || '') ? 1 : -1));
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic' };

/**
 * Alle kluisdata in het geheugen + alle Supabase-acties.
 * Wordt per ingelogde gebruiker opnieuw gemount (key = user.id): bij uitloggen verdwijnt alles uit het geheugen.
 */
export function VaultProvider({ user, onLock, children }) {
  const toast = useToast();
  const key = useVaultKey();
  const [data, setData] = useState(EMPTY);
  const dataRef = useRef(EMPTY);
  const [plain, setPlain] = useState({});           // pad -> blob:-URL van een gewone foto (alleen in dit tabblad)
  const plainRef = useRef({});
  const loadingRef = useRef(new Set());
  const [decrypted, setDecrypted] = useState({});   // foto-id -> blob:-URL (alleen zolang ontgrendeld)
  const decRef = useRef({});
  // v2 = gesprekkenlog, chats = kluis_chats, v3 = migratie 2 (onderwerpen, hobby's, favorieten…)
  const [status, setStatus] = useState({ loadedAt: null, error: '', v2: null, chats: null, v3: null });
  const flags = useRef({ v2: null, chats: null, v3: null });
  const lockRef = useRef(onLock);
  lockRef.current = onLock;

  const commit = useCallback((next) => { dataRef.current = next; setData(next); }, []);

  /** Sessie verlopen? Dan uitloggen. Geeft true als de fout zo is afgehandeld. */
  const authFailed = useCallback((err) => {
    if (!isAuthErr(err)) return false;
    lockRef.current('Je sessie is verlopen. Log opnieuw in.');
    return true;
  }, []);

  /* ---------- Gewone foto's tonen ----------
     Bewust GEEN signed URL's: zo'n link werkt voor iedereen die hem heeft, ook zonder inlog.
     Foto's worden met je inlog gedownload en alleen als blob:-adres in dit tabblad getoond.
     Bij uitloggen of vergrendelen wordt alles uit het geheugen gehaald. */
  const loadPhotos = useCallback(async (fotos) => {
    const todo = fotos.filter((f) => !f.versleuteld && !plainRef.current[f.pad] && !loadingRef.current.has(f.pad));
    todo.forEach((f) => loadingRef.current.add(f.pad));
    let i = 0;
    const worker = async () => {
      while (i < todo.length) {
        const f = todo[i++];
        try {
          const { data: blob, error } = await sb.storage.from(BUCKET).download(f.pad);
          if (error) throw error;
          plainRef.current = { ...plainRef.current, [f.pad]: URL.createObjectURL(blob) };
          setPlain(plainRef.current);
        } catch (e) {
          if (authFailed(e)) return;
        } finally {
          loadingRef.current.delete(f.pad);
        }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
  }, [authFailed]);

  /** Blob-adressen opruimen van foto's die niet meer bestaan. */
  const prunePhotos = useCallback((fotos) => {
    const keep = new Set(fotos.map((f) => f.pad));
    const next = {};
    for (const [pad, u] of Object.entries(plainRef.current)) {
      if (keep.has(pad)) next[pad] = u; else URL.revokeObjectURL(u);
    }
    plainRef.current = next;
    setPlain(next);
  }, []);
  useEffect(() => () => {
    Object.values(plainRef.current).forEach((u) => URL.revokeObjectURL(u));
    plainRef.current = {};
  }, []);

  /* ---------- Laden ---------- */
  const reload = useCallback(async () => {
    try {
      const [p, a, f, g, c, o] = await Promise.all([
        sb.from('kluis_personen').select('*').order('naam'),
        sb.from('kluis_accounts').select('*').order('created_at'),
        sb.from('kluis_fotos').select('*').order('created_at', { ascending: false }),
        sb.from('kluis_gesprekken').select('*').order('datum', { ascending: false }).order('created_at', { ascending: false }),
        sb.from('kluis_chats').select('*').order('datum', { ascending: false }).order('created_at', { ascending: false }),
        sb.from('kluis_onderwerpen').select('*').order('created_at')
      ]);
      for (const r of [p, a, f]) if (r.error) throw r.error;
      const opt = (r) => {
        if (!r.error) return r.data || [];
        if (!isMissing(r.error)) throw r.error;
        return null;   // tabel bestaat (nog) niet
      };
      const gesprekken = opt(g), chats = opt(c), onderwerpen = opt(o);
      const personen = p.data || [];
      // Migratie 2 = onderwerpen-tabel + nieuwe persoonsvelden
      const v3 = onderwerpen !== null && (personen.length === 0 || 'hobbys' in personen[0]);
      flags.current = { v2: gesprekken !== null, chats: chats !== null, v3 };
      const next = {
        personen, accounts: a.data || [], fotos: f.data || [],
        gesprekken: gesprekken || [], chats: chats || [], onderwerpen: onderwerpen || []
      };
      commit(next);
      prunePhotos(next.fotos);
      loadPhotos(next.fotos);   // op de achtergrond, foto's verschijnen zodra ze binnen zijn
      setStatus({ loadedAt: new Date(), error: '', ...flags.current });
      return true;
    } catch (err) {
      if (authFailed(err)) return false;
      setStatus((s) => ({ ...s, error: errText(err) }));
      toast('Laden mislukt: ' + errText(err), true);
      return false;
    }
  }, [authFailed, commit, loadPhotos, prunePhotos, toast]);

  useEffect(() => { reload(); }, [reload]);

  /* ---------- Extra privé foto's ontsleutelen (alleen in het geheugen) ---------- */
  useEffect(() => {
    if (!key) {
      Object.values(decRef.current).forEach((u) => URL.revokeObjectURL(u));
      decRef.current = {};
      setDecrypted({});
      return undefined;
    }
    let alive = true;
    (async () => {
      const todo = data.fotos.filter((f) => f.versleuteld && !decRef.current[f.id]);
      for (const f of todo) {
        try {
          const { data: blob, error } = await sb.storage.from(BUCKET).download(f.pad);
          if (error) throw error;
          const plain = await decryptToBlob(key, new Uint8Array(await blob.arrayBuffer()));
          if (!alive) return;
          decRef.current = { ...decRef.current, [f.id]: URL.createObjectURL(plain) };
          setDecrypted(decRef.current);
        } catch { /* niet te ontsleutelen met deze sleutel: blijft vergrendeld */ }
      }
    })();
    return () => { alive = false; };
  }, [key, data.fotos]);
  useEffect(() => () => Object.values(decRef.current).forEach((u) => URL.revokeObjectURL(u)), []);

  /** URL voor <img src>, of null als de foto (nog) niet te tonen is. */
  const srcOf = useCallback((f) => (f.versleuteld ? decrypted[f.id] || null : plain[f.pad] || null), [decrypted, plain]);

  /* ---------- Foto's ---------- */
  /** Uploadt foto's. Met `encryptKey` worden ze eerst in de browser versleuteld (extra privé). */
  const uploadPhotos = useCallback(async (files, personId, onProgress, { encryptKey = null, bijschrift = null } = {}) => {
    let made = 0, failed = 0, lastErr = '';
    let hasProfile = personId ? dataRef.current.fotos.some((f) => f.persoon_id === personId && f.is_profielfoto) : true;
    for (let i = 0; i < files.length; i++) {
      onProgress?.(`Uploaden ${i + 1} van ${files.length}…`);
      const img = await prepareImage(files[i]);
      const versleuteld = !!encryptKey;
      const body = versleuteld ? await encryptFile(encryptKey, img.blob) : img.blob;
      const path = `${user.id}/${crypto.randomUUID()}.${versleuteld ? 'enc' : img.ext}`;
      const up = await sb.storage.from(BUCKET).upload(path, body, { contentType: versleuteld ? 'application/octet-stream' : img.type, upsert: false });
      if (up.error) { failed++; lastErr = errText(up.error); continue; }
      // Een versleutelde foto wordt nooit automatisch profielfoto (die moet zichtbaar zijn zonder tweede wachtwoord).
      const makeProfile = !!personId && !hasProfile && !versleuteld;
      const ins = await sb.from('kluis_fotos')
        .insert({ persoon_id: personId || null, pad: path, is_profielfoto: makeProfile, versleuteld, bijschrift: bijschrift || null })
        .select().single();
      if (ins.error) { await sb.storage.from(BUCKET).remove([path]); failed++; lastErr = errText(ins.error); continue; }
      if (makeProfile) hasProfile = true;
      commit({ ...dataRef.current, fotos: [ins.data, ...dataRef.current.fotos] });
      made++;
    }
    loadPhotos(dataRef.current.fotos);
    return { made, failed, lastErr };
  }, [commit, loadPhotos, user.id]);

  const updatePhoto = useCallback(async (foto, { bijschrift, persoon_id }) => {
    const { error } = await sb.from('kluis_fotos').update({
      bijschrift: bijschrift || null,
      persoon_id: persoon_id || null,
      is_profielfoto: (persoon_id || null) === foto.persoon_id ? foto.is_profielfoto : false
    }).eq('id', foto.id);
    if (error) throw error;
    await reload();
  }, [reload]);

  const setProfilePhoto = useCallback(async (foto) => {
    const a = await sb.from('kluis_fotos').update({ is_profielfoto: false }).eq('persoon_id', foto.persoon_id).neq('id', foto.id);
    if (a.error) throw a.error;
    const b = await sb.from('kluis_fotos').update({ is_profielfoto: true }).eq('id', foto.id);
    if (b.error) throw b.error;
    await reload();
  }, [reload]);

  const deletePhoto = useCallback(async (foto) => {
    // Eerst de database, dan het bestand: nooit een rij die naar een ontbrekend bestand wijst.
    const { error } = await sb.from('kluis_fotos').delete().eq('id', foto.id);
    if (error) throw error;
    await sb.storage.from(BUCKET).remove([foto.pad]);
    await reload();
  }, [reload]);

  /* ---------- Personen ---------- */
  const savePersonRecord = useCallback(async (id, rec, accounts) => {
    const row = { ...rec };
    if (!flags.current.v3) V3_FIELDS.forEach((k) => delete row[k]);
    if (flags.current.v2) {
      // Persoon + accounts in één transactie.
      const { data: pid, error } = await sb.rpc('kluis_opslaan_persoon', { p_id: id, p_data: row, p_accounts: accounts });
      if (error) throw error;
      return pid;
    }
    // Zonder migratie 1: stap voor stap, zo dat er bij een fout niets verloren gaat.
    delete row.contact_interval;
    let pid = id;
    if (id) {
      const u = await sb.from('kluis_personen').update(row).eq('id', id);
      if (u.error) throw u.error;
    } else {
      const n = await sb.from('kluis_personen').insert(row).select().single();
      if (n.error) throw n.error;
      pid = n.data.id;
    }
    const oldIds = dataRef.current.accounts.filter((a) => a.persoon_id === pid).map((a) => a.id);
    if (accounts.length) {
      const ins = await sb.from('kluis_accounts').insert(accounts.map((a) => ({
        persoon_id: pid, platform: a.platform, gebruikersnaam: a.gebruikersnaam || null, chat_notitie: a.chat_notitie || null
      })));
      if (ins.error) throw ins.error;
    }
    if (oldIds.length) {
      const del = await sb.from('kluis_accounts').delete().in('id', oldIds);
      if (del.error) throw del.error;
    }
    return pid;
  }, []);

  /** Slaat persoon, accounts, wachtende gesprekken/onderwerpen en foto's op. Gooit alleen als de persoon zelf niet is opgeslagen. */
  const savePerson = useCallback(async ({ id, rec, accounts, pendingLog = [], pendingTopics = [], files = [], onProgress }) => {
    const pid = await savePersonRecord(id, rec, accounts);
    const problems = [];
    let logSaved = true, topicsSaved = true;
    if (pendingLog.length && flags.current.v2) {
      const { error } = await sb.from('kluis_gesprekken').insert(pendingLog.map((g) => ({ persoon_id: pid, ...g })));
      if (error) { logSaved = false; problems.push('gesprekken niet opgeslagen (' + errText(error) + ')'); }
    }
    if (pendingTopics.length && flags.current.v3) {
      const { error } = await sb.from('kluis_onderwerpen').insert(pendingTopics.map((tekst) => ({ persoon_id: pid, tekst })));
      if (error) { topicsSaved = false; problems.push('onderwerpen niet opgeslagen (' + errText(error) + ')'); }
    }
    const ok = await reload();
    if (!ok) problems.push('herladen mislukt');
    if (files.length) {
      const up = await uploadPhotos(files, pid, onProgress);
      if (up.failed) problems.push(`${up.failed} foto('s) niet geüpload (${up.lastErr})`);
    }
    return { pid, problems, logSaved, topicsSaved };
  }, [reload, savePersonRecord, uploadPhotos]);

  const deletePerson = useCallback(async (pid) => {
    const paths = dataRef.current.fotos.filter((f) => f.persoon_id === pid).map((f) => f.pad);
    // Eerst de database (foto's, accounts, chats, gesprekken en onderwerpen gaan mee via cascade), dan de bestanden.
    const { error } = await sb.from('kluis_personen').delete().eq('id', pid);
    if (error) throw error;
    if (paths.length) await sb.storage.from(BUCKET).remove(paths);
    await reload();
  }, [reload]);

  /* ---------- Gesprekkenlog ---------- */
  const addGesprek = useCallback(async (pid, g) => {
    const { data: row, error } = await sb.from('kluis_gesprekken').insert({ persoon_id: pid, ...g }).select().single();
    if (error) throw error;
    const d = dataRef.current;
    // De database-trigger werkt laatst_contact bij; spiegel dat lokaal.
    commit({
      ...d,
      gesprekken: [row, ...d.gesprekken].sort(sortLog),
      personen: d.personen.map((p) => (p.id === pid && (!p.laatst_contact || p.laatst_contact < g.datum) ? { ...p, laatst_contact: g.datum } : p))
    });
    return row;
  }, [commit]);

  const deleteGesprek = useCallback(async (id) => {
    const { error } = await sb.from('kluis_gesprekken').delete().eq('id', id);
    if (error) throw error;
    const d = dataRef.current;
    commit({ ...d, gesprekken: d.gesprekken.filter((g) => g.id !== id) });
  }, [commit]);

  /* ---------- Onderwerpen voor de volgende keer ---------- */
  const addTopic = useCallback(async (pid, tekst) => {
    const { data: row, error } = await sb.from('kluis_onderwerpen').insert({ persoon_id: pid, tekst }).select().single();
    if (error) throw error;
    const d = dataRef.current;
    commit({ ...d, onderwerpen: [...d.onderwerpen, row] });
  }, [commit]);

  const setTopicsDone = useCallback(async (ids, gedaan = true) => {
    if (!ids.length) return;
    const { data: rows, error } = await sb.from('kluis_onderwerpen')
      .update({ gedaan, gedaan_op: gedaan ? new Date().toISOString() : null }).in('id', ids).select();
    if (error) throw error;
    const byId = Object.fromEntries((rows || []).map((r) => [r.id, r]));
    const d = dataRef.current;
    commit({ ...d, onderwerpen: d.onderwerpen.map((t) => byId[t.id] || t) });
  }, [commit]);

  const deleteTopic = useCallback(async (id) => {
    const { error } = await sb.from('kluis_onderwerpen').delete().eq('id', id);
    if (error) throw error;
    const d = dataRef.current;
    commit({ ...d, onderwerpen: d.onderwerpen.filter((t) => t.id !== id) });
  }, [commit]);

  /** Snel vastleggen: gesprek opslaan en besproken onderwerpen afvinken. */
  const quickLog = useCallback(async (pid, g, topicIds = []) => {
    await addGesprek(pid, g);
    if (topicIds.length && flags.current.v3) await setTopicsDone(topicIds, true);
  }, [addGesprek, setTopicsDone]);

  /* ---------- Chats (letterlijk geplakte gesprekken, kolom `tekst`) ---------- */
  const saveChat = useCallback(async (chat) => {
    const row = {
      persoon_id: chat.persoon_id, platform: chat.platform || null, datum: chat.datum || today(),
      titel: chat.titel?.trim() || null, tekst: chat.tekst
    };
    if (flags.current.v3) row.belangrijk = !!chat.belangrijk;
    const q = chat.id
      ? sb.from('kluis_chats').update(row).eq('id', chat.id).select().single()
      : sb.from('kluis_chats').insert(row).select().single();
    const { data: saved, error } = await q;
    if (error) throw error;
    const d = dataRef.current;
    commit({ ...d, chats: [saved, ...d.chats.filter((c) => c.id !== saved.id)].sort(sortChats) });
    return saved;
  }, [commit]);

  const deleteChat = useCallback(async (id) => {
    const { error } = await sb.from('kluis_chats').delete().eq('id', id);
    if (error) throw error;
    const d = dataRef.current;
    commit({ ...d, chats: d.chats.filter((c) => c.id !== id) });
  }, [commit]);

  /* ---------- Export ---------- */
  const exportZip = useCallback(async (onProgress) => {
    onProgress('Gegevens verzamelen…');
    if (!(await reload())) throw new Error('kon de gegevens niet laden');
    const d = dataRef.current;
    // Bewust GEEN foto's in de export: die blijven alleen in de afgesloten fotomap,
    // zodat niemand ze zonder inlog kan bekijken, ook niet via een losgeraakt zipbestand.
    const zip = new JSZip();
    zip.file('data.json', JSON.stringify({
      versie: 5,
      geexporteerd_op: new Date().toISOString(),
      let_op: 'Foto\'s zitten bewust niet in deze export; ze blijven alleen in de app (achter je inlog).',
      personen: d.personen.map((p) => ({
        ...p,
        accounts: d.accounts.filter((a) => a.persoon_id === p.id).map(({ platform, gebruikersnaam, chat_notitie }) => ({ platform, gebruikersnaam, chat_notitie })),
        gesprekken: d.gesprekken.filter((g) => g.persoon_id === p.id).map(({ datum, platform, samenvatting }) => ({ datum, platform, samenvatting })),
        onderwerpen: d.onderwerpen.filter((t) => t.persoon_id === p.id).map(({ tekst, gedaan, gedaan_op }) => ({ tekst, gedaan, gedaan_op })),
        chats: d.chats.filter((c) => c.persoon_id === p.id).map(({ datum, platform, titel, tekst, belangrijk }) => ({ datum, platform, titel, tekst, belangrijk: !!belangrijk }))
      }))
    }, null, 2));
    onProgress('Zipbestand maken…');
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `personenkluis-${today()}.zip`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    return { missing: 0 };
  }, [reload]);

  /* ---------- Foto's los downloaden (alleen op jouw verzoek, als je bent ingelogd) ----------
     Gewone foto's gaan altijd mee. Extra privé foto's alleen als je ze hebt ontgrendeld;
     dan komen ze ontsleuteld in de zip. Anders worden ze overgeslagen. */
  const exportPhotosZip = useCallback(async (onProgress) => {
    onProgress('Foto\'s verzamelen…');
    if (!(await reload())) throw new Error('kon de gegevens niet laden');
    const d = dataRef.current;
    const names = Object.fromEntries(d.personen.map((p) => [p.id, p.naam]));
    const clean = (s) => String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic' };
    const zip = new JSZip();
    const used = new Set();
    let added = 0, skipped = 0, failed = 0;
    for (let i = 0; i < d.fotos.length; i++) {
      const f = d.fotos[i];
      onProgress(`Foto ${i + 1} van ${d.fotos.length}…`);
      if (f.versleuteld && !key) { skipped++; continue; }
      try {
        const { data: raw, error } = await sb.storage.from(BUCKET).download(f.pad);
        if (error) throw error;
        const blob = f.versleuteld ? await decryptToBlob(key, new Uint8Array(await raw.arrayBuffer())) : raw;
        const folder = clean(names[f.persoon_id]) || 'Los';
        const base = [String(f.created_at || '').slice(0, 10), clean(f.bijschrift)].filter(Boolean).join(' ') || 'foto';
        const ext = EXT[blob.type] || (f.pad.split('.').pop() || 'jpg').replace('enc', 'jpg');
        let name = `${folder}/${base}.${ext}`;
        for (let n = 2; used.has(name.toLowerCase()); n++) name = `${folder}/${base} (${n}).${ext}`;
        used.add(name.toLowerCase());
        zip.file(name, blob);
        added++;
      } catch (err) {
        if (authFailed(err)) throw err;
        failed++;
      }
    }
    if (!added) return { added, skipped, failed };
    onProgress('Zipbestand maken…');
    const out = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(out);
    a.download = `personenkluis-fotos-${today()}.zip`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    return { added, skipped, failed };
  }, [reload, key, authFailed]);

  /* ---------- Import ---------- */
  const storePhoto = useCallback(async (entry, personId, meta) => {
    const ext = (entry.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const versleuteld = !!meta.versleuteld || ext === 'enc';
    const type = versleuteld ? 'application/octet-stream' : MIME[ext] || 'image/jpeg';
    const blob = new Blob([await entry.async('arraybuffer')], { type });
    const path = `${user.id}/${crypto.randomUUID()}.${versleuteld ? 'enc' : ext}`;
    const up = await sb.storage.from(BUCKET).upload(path, blob, { contentType: type, upsert: false });
    if (up.error) return false;
    const ins = await sb.from('kluis_fotos').insert({
      persoon_id: personId || null, pad: path, bijschrift: meta.bijschrift || null,
      is_profielfoto: !!meta.is_profielfoto && !versleuteld, versleuteld
    });
    if (ins.error) { await sb.storage.from(BUCKET).remove([path]); return false; }
    return true;
  }, [user.id]);

  const importZip = useCallback(async (zipFile, onProgress) => {
    let made = 0, photos = 0, logs = 0, chats = 0, failed = 0;
    const F = flags.current;
    onProgress('Zipbestand lezen…');
    const zip = await JSZip.loadAsync(zipFile);
    const jf = zip.file('data.json');
    if (!jf) throw new Error('data.json ontbreekt in dit zipbestand');
    const data = JSON.parse(await jf.async('string'));
    const list = data.personen || [];
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      onProgress(`Persoon ${i + 1} van ${list.length} terugzetten…`);
      if (!p.naam) { failed++; continue; }
      const row = {
        naam: p.naam, bijnaam: p.bijnaam || null, geboortedatum: p.geboortedatum || null, leeftijd: p.leeftijd ?? null,
        woonplaats: p.woonplaats || null, land: p.land || null, interesses: p.interesses || [], notities: p.notities || null,
        favoriet: !!p.favoriet, relatie: p.relatie || null, kennis_sinds: p.kennis_sinds || null, laatst_contact: p.laatst_contact || null
      };
      if (F.v2) row.contact_interval = p.contact_interval || null;
      if (F.v3) {
        Object.assign(row, {
          hobbys: p.hobbys || [], werk: p.werk || null, studie: p.studie || null,
          favorieten: p.favorieten && typeof p.favorieten === 'object' && !Array.isArray(p.favorieten) ? p.favorieten : {},
          vermijden: p.vermijden || [], werkt_altijd: p.werkt_altijd || [],
          eigen_velden: Array.isArray(p.eigen_velden) ? p.eigen_velden.filter((v) => v && (v.label || v.waarde)) : []
        });
      }
      const ins = await sb.from('kluis_personen').insert(row).select().single();
      if (ins.error) { failed++; continue; }
      made++;
      const pid = ins.data.id;
      const accs = (p.accounts || []).map((a) => ({ persoon_id: pid, platform: a.platform || 'Anders', gebruikersnaam: a.gebruikersnaam || null, chat_notitie: a.chat_notitie || null }));
      if (accs.length) await sb.from('kluis_accounts').insert(accs);
      const gl = (p.gesprekken || []).filter((g) => g?.samenvatting)
        .map((g) => ({ persoon_id: pid, datum: g.datum || today(), platform: g.platform || null, samenvatting: g.samenvatting }));
      if (F.v2 && gl.length) { const r = await sb.from('kluis_gesprekken').insert(gl); if (!r.error) logs += gl.length; }
      if (F.v3) {
        const tl = (p.onderwerpen || []).filter((t) => t?.tekst)
          .map((t) => ({ persoon_id: pid, tekst: t.tekst, gedaan: !!t.gedaan, gedaan_op: t.gedaan_op || null }));
        if (tl.length) await sb.from('kluis_onderwerpen').insert(tl);
      }
      if (F.chats) {
        // Oudere exports gebruikten `inhoud` in plaats van `tekst`.
        const cl = (p.chats || []).filter((c) => c?.tekst || c?.inhoud).map((c) => {
          const r = { persoon_id: pid, datum: c.datum || today(), platform: c.platform || null, titel: c.titel || null, tekst: c.tekst || c.inhoud };
          if (F.v3) r.belangrijk = !!c.belangrijk;
          return r;
        });
        if (cl.length) { const r = await sb.from('kluis_chats').insert(cl); if (!r.error) chats += cl.length; }
      }
      for (const f of p.fotos || []) {
        const entry = zip.file(f.bestand);
        if (entry && await storePhoto(entry, pid, f)) photos++;
      }
    }
    const loose = data.losse_fotos || [];
    for (let k = 0; k < loose.length; k++) {
      onProgress(`Losse foto ${k + 1} van ${loose.length}…`);
      const entry = zip.file(loose[k].bestand);
      if (entry && await storePhoto(entry, null, { ...loose[k], is_profielfoto: false })) photos++;
    }
    await reload();
    return { made, photos, logs, chats, failed };
  }, [reload, storePhoto]);

  /* ---------- Alles wissen ---------- */
  const wipeAll = useCallback(async (onProgress) => {
    onProgress('Gegevens verwijderen…');
    const paths = new Set(dataRef.current.fotos.map((f) => f.pad));
    for (let offset = 0; ; offset += 100) {
      const r = await sb.storage.from(BUCKET).list(user.id, { limit: 100, offset });
      if (r.error || !r.data?.length) break;
      r.data.forEach((o) => { if (o.id) paths.add(`${user.id}/${o.name}`); });
      if (r.data.length < 100) break;
    }
    const w = await sb.rpc('kluis_wis_alles');
    if (w.error) throw w.error;
    onProgress("Foto's verwijderen…");
    const all = [...paths];
    for (let i = 0; i < all.length; i += 100) {
      const r = await sb.storage.from(BUCKET).remove(all.slice(i, i + 100));
      if (r.error) throw r.error;
    }
    await reload();
  }, [reload, user.id]);

  const value = useMemo(() => ({
    user, data, status, srcOf, reload, authFailed,
    uploadPhotos, updatePhoto, setProfilePhoto, deletePhoto,
    savePerson, deletePerson, addGesprek, deleteGesprek,
    addTopic, setTopicsDone, deleteTopic, quickLog, saveChat, deleteChat,
    exportZip, exportPhotosZip, importZip, wipeAll
  }), [user, data, status, srcOf, reload, authFailed, uploadPhotos, updatePhoto, setProfilePhoto, deletePhoto,
    savePerson, deletePerson, addGesprek, deleteGesprek, addTopic, setTopicsDone, deleteTopic, quickLog, saveChat, deleteChat,
    exportZip, exportPhotosZip, importZip, wipeAll]);

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}
