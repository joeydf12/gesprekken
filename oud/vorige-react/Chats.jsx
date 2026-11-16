import { useMemo, useState } from 'react';
import { useVault } from '../vault/VaultContext.jsx';
import { useToast } from './Toast.jsx';
import { ConfirmButton, Dialog, Msg } from './ui.jsx';
import { LOG_VIA } from '../lib/constants.js';
import { errText, fmtDate, today } from '../lib/utils.js';

// "Naam: tekst" of "[12-03 14:02] Naam: tekst" => naam vet weergeven.
const LINE = /^(?:\[[^\]]*\]\s*)?([^:\n]{1,32}):\s?(.*)$/;

/** Toont een opgeslagen chat leesbaar: sprekers vetgedrukt. */
export function ChatView({ text }) {
  return (
    <div className="chatview">
      {text.split('\n').map((line, i) => {
        const m = line.match(LINE);
        if (m && !/^https?$/i.test(m[1].trim())) return <p key={i}><b>{m[1].trim()}:</b> {m[2]}</p>;
        return <p key={i}>{line || ' '}</p>;
      })}
    </div>
  );
}

export function ChatCard({ chat, personName, onOpen }) {
  return (
    <button type="button" className="chatcard" onClick={() => onOpen(chat.id)}>
      <span className="meta">
        {chat.belangrijk && <span className="star-on" aria-label="Belangrijk">★</span>}
        {personName && <span>{personName}</span>}
        <span>{fmtDate(chat.datum)}</span>
        {chat.platform && <span className="tag plat">{chat.platform}</span>}
      </span>
      {chat.titel && <span className="ct">{chat.titel}</span>}
      <span className="preview">{chat.inhoud}</span>
    </button>
  );
}

/** Nieuwe chat opslaan of bestaande bekijken/bewerken. */
export function ChatDialog({ chatId, personId, onClose }) {
  const vault = useVault();
  const { data } = vault;
  const toast = useToast();
  const existing = chatId ? data.chats.find((c) => c.id === chatId) : null;
  const [editing, setEditing] = useState(!existing);
  const [form, setForm] = useState(() => ({
    persoon_id: existing?.persoon_id || personId || '',
    platform: existing?.platform || '',
    datum: existing?.datum || today(),
    titel: existing?.titel || '',
    inhoud: existing?.inhoud || '',
    belangrijk: !!existing?.belangrijk
  }));
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const personen = useMemo(() => [...data.personen].sort((a, b) => a.naam.localeCompare(b.naam, 'nl')), [data.personen]);
  const own = [...new Set(data.accounts.filter((a) => a.persoon_id === form.persoon_id).map((a) => a.platform).filter((p) => p !== 'Anders'))];
  const options = [...own, ...LOG_VIA.filter((p) => !own.includes(p))];
  const person = data.personen.find((p) => p.id === form.persoon_id);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function save(e) {
    e.preventDefault();
    if (!form.persoon_id) { setMsg({ text: 'Kies bij wie deze chat hoort.', err: true }); return; }
    if (!form.inhoud.trim()) { setMsg({ text: 'Plak of typ de chat.', err: true }); return; }
    setBusy(true);
    try {
      await vault.saveChat({ ...form, id: existing?.id, inhoud: form.inhoud.replace(/\s+$/, '') });
      toast('Chat opgeslagen.');
      onClose();
    } catch (err) {
      setBusy(false);
      if (!vault.authFailed(err)) setMsg({ text: 'Opslaan mislukt: ' + errText(err), err: true });
    }
  }

  async function remove() {
    setBusy(true);
    try { await vault.deleteChat(existing.id); toast('Chat verwijderd.'); onClose(); } catch (err) {
      setBusy(false);
      if (!vault.authFailed(err)) setMsg({ text: 'Verwijderen mislukt: ' + errText(err), err: true });
    }
  }

  async function toggleStar() {
    try { await vault.saveChat({ ...existing, belangrijk: !existing.belangrijk }); } catch (err) {
      if (!vault.authFailed(err)) setMsg({ text: errText(err), err: true });
    }
  }

  return (
    <Dialog onClose={onClose} labelledBy="chatDlgTitle">
      <form className="dlg" onSubmit={save} noValidate>
        <div className="dlg-h">
          <h2 id="chatDlgTitle">{existing ? existing.titel || 'Chat' : 'Chat opslaan'}</h2>
          <button className="btn small ghost" type="button" onClick={onClose}>Sluiten</button>
        </div>
        <div className="dlg-b">
          {!editing && existing ? (
            <>
              <div className="meta" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', color: 'var(--muted)', fontSize: '.9rem', fontWeight: 600 }}>
                <span>{person?.naam || 'Onbekend'}</span><span>·</span><span>{fmtDate(existing.datum)}</span>
                {existing.platform && <span className="tag plat">{existing.platform}</span>}
              </div>
              <ChatView text={existing.inhoud} />
              <div className="row">
                <button className="btn small" type="button" onClick={toggleStar}>{existing.belangrijk ? '★ Belangrijk' : '☆ Markeer als belangrijk'}</button>
                <button className="btn small" type="button" onClick={() => { navigator.clipboard?.writeText(existing.inhoud); toast('Gekopieerd.'); }}>Kopiëren</button>
              </div>
            </>
          ) : (
            <>
              <label className="f">Met wie
                <select value={form.persoon_id} onChange={set('persoon_id')} autoFocus={!personId}>
                  <option value="">Kies een persoon…</option>
                  {personen.map((p) => <option key={p.id} value={p.id}>{p.naam}</option>)}
                </select>
              </label>
              <div className="row">
                <label className="f">Datum<input type="date" value={form.datum} onChange={set('datum')} /></label>
                <label className="f">Via
                  <select value={form.platform} onChange={set('platform')}>
                    <option value="">—</option>
                    {options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </label>
              </div>
              <label className="f">Titel (optioneel)<input type="text" value={form.titel} onChange={set('titel')} placeholder="bijv. Plannen voor de LAN-party" /></label>
              <label className="f">Chat
                <textarea className="chatin" value={form.inhoud} onChange={set('inhoud')} autoFocus={!!personId}
                  placeholder={'Plak hier de chat, bijvoorbeeld:\nSam: zin om vanavond te gamen?\nIk: ja, na 8 uur!'} />
              </label>
              <p className="hint">Tip: regels als <code>Naam: bericht</code> worden netjes weergegeven.</p>
              <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={form.belangrijk} onChange={set('belangrijk')} /> Belangrijk</label>
            </>
          )}
          <Msg msg={msg} role="alert" />
        </div>
        <div className="dlg-f">
          {existing && <ConfirmButton label="Verwijderen" onConfirm={remove} disabled={busy} />}
          {!editing && existing
            ? <button className="btn primary" type="button" onClick={() => setEditing(true)}>Bewerken</button>
            : <button className="btn primary" type="submit" disabled={busy}>Opslaan</button>}
        </div>
      </form>
    </Dialog>
  );
}

export default function ChatsTab({ onOpenChat }) {
  const { data, status } = useVault();
  const [q, setQ] = useState('');
  const [pid, setPid] = useState('');
  const [onlyStar, setOnlyStar] = useState(false);

  const names = useMemo(() => Object.fromEntries(data.personen.map((p) => [p.id, p.naam])), [data.personen]);
  const withChats = useMemo(() => {
    const ids = new Set(data.chats.map((c) => c.persoon_id));
    return data.personen.filter((p) => ids.has(p.id)).sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));
  }, [data.chats, data.personen]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.chats.filter((c) => (!pid || c.persoon_id === pid) && (!onlyStar || c.belangrijk) &&
      (!needle || `${c.titel || ''} ${c.inhoud} ${names[c.persoon_id] || ''} ${c.platform || ''}`.toLowerCase().includes(needle)));
  }, [data.chats, q, pid, onlyStar, names]);

  if (status.v3 === false) {
    return (
      <div className="card">
        <h2>Chats nog niet beschikbaar</h2>
        <p>Voer <code>supabase-migratie-2.sql</code> uit in de SQL Editor van Supabase om chats, onderwerpen, hobby's, favorieten en do's &amp; don'ts aan te zetten.</p>
      </div>
    );
  }

  return (
    <section>
      <div className="toolbar">
        <input type="search" placeholder="Zoek in chats" aria-label="Zoek in chats" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filter op persoon" value={pid} onChange={(e) => setPid(e.target.value)}>
          <option value="">Iedereen</option>
          {withChats.map((p) => <option key={p.id} value={p.id}>{p.naam}</option>)}
        </select>
      </div>
      <div className="chips">
        <button className="chip" type="button" aria-pressed={onlyStar} onClick={() => setOnlyStar((s) => !s)}>★ Alleen belangrijk</button>
      </div>
      <div className="list">
        {!status.loadedAt ? <div className="empty">Laden…</div>
          : !data.personen.length ? <div className="empty"><b>Nog niemand in je kluis</b>Voeg eerst een persoon toe; daarna kun je chats bewaren.</div>
            : !data.chats.length ? <div className="empty"><b>Nog geen chats bewaard</b>Tik op + Chat om een stuk chat op te slaan, bijvoorbeeld iets grappigs of een afspraak.</div>
              : !list.length ? <div className="empty"><b>Niets gevonden</b>Pas je zoekopdracht of filter aan.</div>
                : list.map((c) => <ChatCard key={c.id} chat={c} personName={names[c.persoon_id]} onOpen={onOpenChat} />)}
      </div>
    </section>
  );
}
