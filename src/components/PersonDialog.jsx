import { useMemo, useState } from 'react';
import { useVault } from '../vault/VaultContext.jsx';
import { useToast } from './Toast.jsx';
import { ConfirmButton, Modal, Note } from './ui.jsx';
import { FAVORIET_CATS, LOG_VIA, PLATFORMS, RELATIES } from '../lib/constants.js';
import { errText, fmtDate, today } from '../lib/utils.js';

const splitComma = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
const splitLines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);

function initForm(p) {
  const fav = p?.favorieten || {};
  return {
    naam: p?.naam || '', bijnaam: p?.bijnaam || '', relatie: p?.relatie || '',
    geboortedatum: p?.geboortedatum || '', leeftijd: p?.leeftijd ?? '',
    kennis_sinds: p?.kennis_sinds || '', laatst_contact: p?.laatst_contact || '',
    contact_interval: p?.contact_interval ?? '',
    woonplaats: p?.woonplaats || '', land: p?.land || '',
    werk: p?.werk || '', studie: p?.studie || '',
    hobbys: (p?.hobbys || []).join(', '),
    interesses: (p?.interesses || []).join(', '),
    favorieten: Object.fromEntries(FAVORIET_CATS.map(([k]) => [k, (fav[k] || []).join(', ')])),
    vermijden: (p?.vermijden || []).join('\n'),
    werkt_altijd: (p?.werkt_altijd || []).join('\n'),
    notities: p?.notities || '', favoriet: !!p?.favoriet
  };
}
const newAcc = () => ({ platform: 'Discord', gebruikersnaam: '', chat_notitie: '' });
const STANDAARD_KOPJES = ['Vindt leuk', 'Vindt niet leuk', 'Huisdier', 'Lievelingseten', 'Lievelingsmuziek', 'Droom / doel', 'Cadeau-idee', 'Familie', 'Gewoontes'];

/* ---------- Eigen velden: zelf bedachte kopjes met een antwoord eronder ---------- */
function CustomFields({ fields, setFields, suggestions }) {
  const setField = (i, k, v) => setFields((l) => l.map((f, j) => (j === i ? { ...f, [k]: v } : f)));
  const move = (i, d) => setFields((l) => {
    const j = i + d;
    if (j < 0 || j >= l.length) return l;
    const n = [...l]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const filled = fields.filter((f) => f.label.trim() || f.waarde.trim()).length;
  return (
    <Section title="Eigen velden" count={filled || ''} open={filled > 0}>
      <p className="hint">Bedenk zelf een kopje (bijv. "Vindt ze leuk") en schrijf eronder het antwoord. Zoveel als je wilt.</p>
      <datalist id="veldKopjes">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
      {fields.map((f, i) => (
        <div className="cf-row" key={i}>
          <div className="cf-head">
            <input type="text" list="veldKopjes" autoComplete="off" aria-label="Kopje" placeholder="Kopje, bijv. Vindt ze leuk"
              value={f.label} onChange={(e) => setField(i, 'label', e.target.value)} />
            <button className="btn small ghost" type="button" aria-label="Omhoog" title="Omhoog" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
            <button className="btn small ghost" type="button" aria-label="Omlaag" title="Omlaag" disabled={i === fields.length - 1} onClick={() => move(i, 1)}>↓</button>
            <button className="btn small ghost" type="button" aria-label="Veld verwijderen" title="Verwijderen" onClick={() => setFields((l) => l.filter((_, j) => j !== i))}>✕</button>
          </div>
          <textarea rows={2} aria-label={'Antwoord bij ' + (f.label || 'dit kopje')} placeholder="Jouw antwoord"
            value={f.waarde} onChange={(e) => setField(i, 'waarde', e.target.value)} />
        </div>
      ))}
      <button className="btn small" type="button" style={{ justifySelf: 'start' }} onClick={() => setFields((l) => [...l, { label: '', waarde: '' }])}>+ Veld toevoegen</button>
    </Section>
  );
}

function Section({ title, count, open = false, children }) {
  return (
    <details className="sec" open={open}>
      <summary>{title}{count ? <span className="sec-count">{count}</span> : null}</summary>
      <div className="sec-b">{children}</div>
    </details>
  );
}

/* ---------- Onderwerpen voor de volgende keer ---------- */
function TopicsSection({ pid, pending, setPending }) {
  const vault = useVault();
  const [tekst, setTekst] = useState('');
  const [msg, setMsg] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const all = pid ? vault.data.onderwerpen.filter((t) => t.persoon_id === pid) : [];
  const open = all.filter((t) => !t.gedaan);
  const done = all.filter((t) => t.gedaan).sort((a, b) => ((a.gedaan_op || '') < (b.gedaan_op || '') ? 1 : -1));

  const guard = async (fn) => {
    try { await fn(); setMsg(null); } catch (err) {
      if (!vault.authFailed(err)) setMsg({ text: 'Mislukt: ' + errText(err), err: true });
    }
  };
  async function add() {
    const t = tekst.trim();
    if (!t) return;
    if (!pid) { setPending((l) => [...l, t]); setTekst(''); return; }
    await guard(() => vault.addTopic(pid, t));
    setTekst('');
  }

  return (
    <Section title="Onderwerpen voor de volgende keer" count={open.length + pending.length || ''} open={open.length + pending.length > 0}>
      <p className="hint">Dingen die je wilt vragen of vertellen. Vink af als het besproken is.</p>
      <div className="addline">
        <input type="text" value={tekst} placeholder="bijv. Vragen hoe het examen ging" onChange={(e) => setTekst(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} aria-label="Nieuw onderwerp" />
        <button className="btn small primary" type="button" onClick={add}>Toevoegen</button>
      </div>
      <div className="topics">
        {pending.map((t, i) => (
          <div className="topic" key={'p' + i}>
            <span>{t} <em className="muted">(wordt opgeslagen)</em></span>
            <button className="btn small ghost" type="button" aria-label="Onderwerp verwijderen" onClick={() => setPending((l) => l.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        {open.map((t) => (
          <label className="topic" key={t.id}>
            <input type="checkbox" checked={false} onChange={() => guard(() => vault.setTopicsDone([t.id], true))} />
            <span>{t.tekst}</span>
            <ConfirmButton className="btn small ghost" label="✕" aria-label="Onderwerp verwijderen" onConfirm={() => guard(() => vault.deleteTopic(t.id))} />
          </label>
        ))}
        {!open.length && !pending.length && <p className="muted" style={{ margin: 0 }}>Geen open onderwerpen.</p>}
      </div>
      {done.length > 0 && (
        <>
          <button className="btn small ghost" type="button" style={{ justifySelf: 'start' }} onClick={() => setShowDone((s) => !s)}>
            {showDone ? 'Verberg afgerond' : `Afgerond (${done.length})`}
          </button>
          {showDone && (
            <div className="topics">
              {done.map((t) => (
                <label className="topic done" key={t.id}>
                  <input type="checkbox" checked onChange={() => guard(() => vault.setTopicsDone([t.id], false))} />
                  <span>{t.tekst}</span>
                  <ConfirmButton className="btn small ghost" label="✕" aria-label="Onderwerp verwijderen" onConfirm={() => guard(() => vault.deleteTopic(t.id))} />
                </label>
              ))}
            </div>
          )}
        </>
      )}
      <Note msg={msg} />
    </Section>
  );
}

/* ---------- Gesprekkenlog ---------- */
function LogSection({ pid, accs, pendingLog, setPendingLog, onContact }) {
  const vault = useVault();
  const own = useMemo(() => [...new Set(accs.map((a) => a.platform).filter((p) => p && p !== 'Anders'))], [accs]);
  const options = [...own, ...LOG_VIA.filter((p) => !own.includes(p))];
  const [datum, setDatum] = useState(today());
  const [via, setVia] = useState(own[0] || '');
  const [tekst, setTekst] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const saved = pid ? vault.data.gesprekken.filter((g) => g.persoon_id === pid) : [];

  async function add() {
    const samenvatting = tekst.trim(), d = datum || today();
    if (!samenvatting) { setMsg({ text: 'Schrijf kort op waar het over ging.', err: true }); return; }
    if (d > today()) { setMsg({ text: 'Die datum ligt in de toekomst.', err: true }); return; }
    const g = { datum: d, platform: via || null, samenvatting };
    if (!pid) {
      setPendingLog((l) => [g, ...l]);
      setMsg({ text: 'Wordt opgeslagen samen met deze persoon.' });
    } else {
      setBusy(true);
      try {
        await vault.addGesprek(pid, g);
        setMsg({ text: 'Gesprek opgeslagen.' });
      } catch (err) {
        setBusy(false);
        if (!vault.authFailed(err)) setMsg({ text: 'Opslaan mislukt: ' + errText(err), err: true });
        return;
      }
      setBusy(false);
    }
    onContact(d);
    setTekst('');
  }

  async function remove(id) {
    try { await vault.deleteGesprek(id); } catch (err) {
      if (!vault.authFailed(err)) setMsg({ text: 'Verwijderen mislukt: ' + errText(err), err: true });
    }
  }

  return (
    <Section title="Gesprekken" count={saved.length + pendingLog.length || ''}>
      <div className="logadd">
        <div className="two">
          <label className="field">Datum<input type="date" value={datum} max={today()} onChange={(e) => setDatum(e.target.value)} /></label>
          <label className="field">Via
            <select value={via} onChange={(e) => setVia(e.target.value)}>
              <option value="">—</option>
              {options.map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
        </div>
        <label className="field">Waar ging het over?
          <textarea value={tekst} onChange={(e) => setTekst(e.target.value)} placeholder="Onderwerpen, afspraken, dingen om te onthouden" />
        </label>
        <button className="btn small primary" type="button" style={{ justifySelf: 'start' }} onClick={add} disabled={busy}>+ Gesprek vastleggen</button>
        <Note msg={msg} />
      </div>
      <div className="log">
        {pendingLog.map((g, i) => (
          <div className="entry pending" key={'p' + i}>
            <div className="meta">{fmtDate(g.datum)}{g.platform && <span className="tag plat">{g.platform}</span>}<span>wordt opgeslagen</span></div>
            <button className="btn small ghost" type="button" aria-label="Gesprek verwijderen"
              onClick={() => setPendingLog((l) => l.filter((_, j) => j !== i))}>✕</button>
            <div className="txt">{g.samenvatting}</div>
          </div>
        ))}
        {saved.map((g) => (
          <div className="entry" key={g.id}>
            <div className="meta">{fmtDate(g.datum)}{g.platform && <span className="tag plat">{g.platform}</span>}</div>
            <ConfirmButton className="btn small ghost" label="✕" aria-label="Gesprek verwijderen" onConfirm={() => remove(g.id)} />
            <div className="txt">{g.samenvatting}</div>
          </div>
        ))}
        {!pendingLog.length && !saved.length && <p className="muted" style={{ margin: 0 }}>Nog geen gesprekken vastgelegd.</p>}
      </div>
    </Section>
  );
}

/* ---------- Persoonvenster ---------- */
export default function PersonDialog({ personId, onClose, onSaved, onDeleted }) {
  const vault = useVault();
  const { data, status } = vault;
  const toast = useToast();
  const [pid, setPid] = useState(personId);
  const person = pid ? data.personen.find((p) => p.id === pid) : null;
  const isNew = !personId;

  const [form, setForm] = useState(() => initForm(person));
  const [accs, setAccs] = useState(() => (person
    ? data.accounts.filter((a) => a.persoon_id === pid).map((a) => ({ platform: a.platform, gebruikersnaam: a.gebruikersnaam || '', chat_notitie: a.chat_notitie || '' }))
    : [newAcc()]));
  const [velden, setVelden] = useState(() => (person?.eigen_velden || []).map((v) => ({ label: v?.label || '', waarde: v?.waarde || '' })));
  const kopjes = useMemo(() => {
    const used = data.personen.flatMap((p) => (p.eigen_velden || []).map((v) => v?.label)).filter(Boolean);
    return [...new Set([...used, ...STANDAARD_KOPJES])];
  }, [data.personen]);
  const [files, setFiles] = useState([]);
  const [pendingLog, setPendingLog] = useState([]);
  const [pendingTopics, setPendingTopics] = useState([]);
  const [msg, setMsg] = useState(null);
  const [dupOk, setDupOk] = useState(false);
  const [saving, setSaving] = useState(false);

  const fotos = pid ? data.fotos.filter((f) => f.persoon_id === pid) : [];
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setFav = (k) => (e) => setForm((f) => ({ ...f, favorieten: { ...f.favorieten, [k]: e.target.value } }));
  const setAcc = (i, k, v) => { setAccs((l) => l.map((a, j) => (j === i ? { ...a, [k]: v } : a))); setDupOk(false); };
  const onContact = (d) => setForm((f) => (!f.laatst_contact || f.laatst_contact < d ? { ...f, laatst_contact: d } : f));
  const favCount = FAVORIET_CATS.filter(([k]) => form.favorieten[k].trim()).length;
  const ddCount = splitLines(form.vermijden).length + splitLines(form.werkt_altijd).length;

  function findDuplicate() {
    for (const d of accs) {
      const name = d.gebruikersnaam.trim().toLowerCase();
      if (!name) continue;
      const hit = data.accounts.find((a) => a.persoon_id !== pid && a.platform === d.platform && (a.gebruikersnaam || '').trim().toLowerCase() === name);
      if (hit) {
        const who = data.personen.find((p) => p.id === hit.persoon_id);
        return `Deze gebruikersnaam (${d.platform}: ${d.gebruikersnaam.trim()}) staat al bij ${who ? who.naam : 'iemand anders'}.`;
      }
    }
    return '';
  }

  async function save(e) {
    e.preventDefault();
    const naam = form.naam.trim();
    const lt = String(form.leeftijd).trim(), iv = String(form.contact_interval).trim();
    if (!naam) { setMsg({ text: 'Vul een naam in.', err: true }); return; }
    if (lt !== '' && !form.geboortedatum && !(+lt >= 0 && +lt <= 120)) { setMsg({ text: 'Leeftijd moet tussen 0 en 120 liggen.', err: true }); return; }
    if (iv !== '' && !(+iv >= 1 && +iv <= 365)) { setMsg({ text: 'Herinnering moet tussen 1 en 365 dagen liggen.', err: true }); return; }
    const dup = findDuplicate();
    if (dup && !dupOk) { setDupOk(true); setMsg({ text: dup + ' Tik nogmaals op Opslaan als dat klopt.', err: true }); return; }
    setDupOk(false);
    setSaving(true);
    setMsg({ text: 'Opslaan…' });

    const favorieten = {};
    for (const [k] of FAVORIET_CATS) {
      const items = splitComma(form.favorieten[k]);
      if (items.length) favorieten[k] = items;
    }
    const rec = {
      naam, bijnaam: form.bijnaam.trim() || null,
      geboortedatum: form.geboortedatum || null,
      leeftijd: form.geboortedatum || lt === '' ? null : parseInt(lt, 10),
      relatie: form.relatie.trim() || null, kennis_sinds: form.kennis_sinds || null, laatst_contact: form.laatst_contact || null,
      woonplaats: form.woonplaats.trim() || null, land: form.land.trim() || null,
      interesses: splitComma(form.interesses),
      notities: form.notities.trim() || null, favoriet: form.favoriet,
      contact_interval: iv === '' ? null : parseInt(iv, 10),
      hobbys: splitComma(form.hobbys), werk: form.werk.trim() || null, studie: form.studie.trim() || null,
      favorieten, vermijden: splitLines(form.vermijden), werkt_altijd: splitLines(form.werkt_altijd),
      eigen_velden: velden
        .map((v) => ({ label: v.label.trim(), waarde: v.waarde.trim() }))
        .filter((v) => v.label || v.waarde)
        .map((v) => ({ label: v.label || 'Overig', waarde: v.waarde }))
    };
    const accounts = accs
      .map((a) => ({ platform: a.platform, gebruikersnaam: a.gebruikersnaam.trim(), chat_notitie: a.chat_notitie.trim() }))
      .filter((a) => a.gebruikersnaam || a.chat_notitie);

    try {
      const r = await vault.savePerson({ id: pid, rec, accounts, pendingLog, pendingTopics, files, onProgress: (text) => setMsg({ text }) });
      // Verder werken op de opgeslagen persoon, zodat nogmaals opslaan geen dubbele maakt.
      setPid(r.pid);
      setFiles([]);
      if (r.logSaved) setPendingLog([]);
      if (r.topicsSaved) setPendingTopics([]);
      setSaving(false);
      if (r.problems.length) { setMsg({ text: 'Persoon opgeslagen, maar: ' + r.problems.join('; ') + '.', err: true }); return; }
      toast(naam + ' opgeslagen.');
      onSaved(r.pid);
    } catch (err) {
      setSaving(false);
      if (!vault.authFailed(err)) setMsg({ text: 'Opslaan mislukt: ' + errText(err), err: true });
    }
  }

  async function remove() {
    setSaving(true);
    try {
      await vault.deletePerson(pid);
      toast(`${person?.naam || 'Persoon'} verwijderd.`);
      onDeleted();
    } catch (err) {
      setSaving(false);
      if (!vault.authFailed(err)) setMsg({ text: 'Verwijderen mislukt: ' + errText(err), err: true });
    }
  }

  return (
    <Modal title={person?.naam || 'Nieuwe persoon'} size="wide" onClose={onClose} onSubmit={save} dismissable={false}
      footer={<>
        {pid && <ConfirmButton label="Verwijderen" className="btn danger" onConfirm={remove} disabled={saving} />}
        <span className="grow" />
        <button className="btn" type="button" onClick={onClose}>Annuleren</button>
        <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Bezig…' : 'Opslaan'}</button>
      </>}>
          <Section title="Basis" open>
            <label className="field">Naam *<input type="text" autoComplete="off" value={form.naam} onChange={set('naam')} autoFocus={isNew} /></label>
            <div className="two">
              <label className="field">Bijnaam<input type="text" autoComplete="off" value={form.bijnaam} onChange={set('bijnaam')} /></label>
              <label className="field">Relatie<input type="text" list="relatieList" autoComplete="off" placeholder="gamemaatje" value={form.relatie} onChange={set('relatie')} /></label>
              <datalist id="relatieList">{RELATIES.map((r) => <option key={r} value={r} />)}</datalist>
            </div>
            <div className="two">
              <label className="field">Geboortedatum<input type="date" value={form.geboortedatum} onChange={set('geboortedatum')} /></label>
              <label className="field">Leeftijd (als je de datum niet weet)
                <input type="number" inputMode="numeric" min="0" max="120" value={form.leeftijd} onChange={set('leeftijd')} disabled={!!form.geboortedatum} />
              </label>
            </div>
            <div className="two">
              <label className="field">Woonplaats<input type="text" autoComplete="off" value={form.woonplaats} onChange={set('woonplaats')} /></label>
              <label className="field">Land<input type="text" autoComplete="off" value={form.land} onChange={set('land')} /></label>
            </div>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={form.favoriet} onChange={set('favoriet')} /> Favoriet</label>
          </Section>

          <Section title="Contact" open={isNew}>
            <div className="two">
              <label className="field">Ken je sinds<input type="date" value={form.kennis_sinds} onChange={set('kennis_sinds')} /></label>
              <label className="field">Laatst gesproken<input type="date" value={form.laatst_contact} onChange={set('laatst_contact')} /></label>
            </div>
            <div className="two" style={{ alignItems: 'end' }}>
              <button className="btn small" type="button" style={{ flex: 'none' }} onClick={() => setForm((f) => ({ ...f, laatst_contact: today() }))}>Vandaag gesproken</button>
              {status.v2 && (
                <label className="field">Herinner me na … dagen zonder contact
                  <input type="number" inputMode="numeric" min="1" max="365" placeholder="bijv. 30" value={form.contact_interval} onChange={set('contact_interval')} />
                </label>
              )}
            </div>
          </Section>

          {status.v3 && (
            <Section title="Werk & studie" count={[form.werk, form.studie].filter((x) => x.trim()).length || ''}>
              <label className="field">Werk<input type="text" autoComplete="off" placeholder="bijv. Monteur bij een garage" value={form.werk} onChange={set('werk')} /></label>
              <label className="field">Studie / school<input type="text" autoComplete="off" placeholder="bijv. HBO Informatica, 2e jaar" value={form.studie} onChange={set('studie')} /></label>
            </Section>
          )}

          <Section title="Hobby's & interesses" count={splitComma(form.hobbys).length + splitComma(form.interesses).length || ''}>
            {status.v3 && (
              <label className="field">Hobby's (met komma's)<input type="text" autoComplete="off" placeholder="darten, vissen, gitaar spelen" value={form.hobbys} onChange={set('hobbys')} /></label>
            )}
            <label className="field">Interesses (met komma's)<input type="text" autoComplete="off" placeholder="F1, techniek, geschiedenis" value={form.interesses} onChange={set('interesses')} /></label>
          </Section>

          {status.v3 && (
            <Section title="Favoriete dingen" count={favCount || ''}>
              <p className="hint">Handig voor cadeaus en gespreksstof. Meerdere dingen scheiden met komma's.</p>
              {FAVORIET_CATS.map(([k, label]) => (
                <label className="field" key={k}>{label}<input type="text" autoComplete="off" value={form.favorieten[k]} onChange={setFav(k)} /></label>
              ))}
            </Section>
          )}

          {status.v3 && (
            <Section title="Do's & don'ts" count={ddCount || ''}>
              <div className="dd">
                <label className="field no">Liever niet over (gevoelig)
                  <textarea value={form.vermijden} onChange={set('vermijden')} placeholder={'Eén per regel, bijv.\nzijn ex\nwerk van zijn vader'} />
                </label>
                <label className="field yes">Werkt altijd (grapjes, onderwerpen)
                  <textarea value={form.werkt_altijd} onChange={set('werkt_altijd')} placeholder={'Eén per regel, bijv.\ngrap over de 180 die mislukte\npraten over Ajax'} />
                </label>
              </div>
            </Section>
          )}

          {status.v3 && <CustomFields fields={velden} setFields={setVelden} suggestions={kopjes} />}

          <Section title="Notities" count={form.notities.trim() ? '•' : ''}>
            <textarea value={form.notities} onChange={set('notities')} aria-label="Notities" />
          </Section>

          <Section title="Accounts" count={accs.filter((a) => a.gebruikersnaam.trim()).length || ''} open={isNew}>
            <div style={{ display: 'grid', gap: 12 }}>
              {accs.map((a, i) => (
                <div className="acc-edit" key={i}>
                  <select aria-label="Platform" value={a.platform} onChange={(e) => setAcc(i, 'platform', e.target.value)}>
                    {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                  <input type="text" aria-label="Gebruikersnaam" placeholder="gebruikersnaam" value={a.gebruikersnaam} onChange={(e) => setAcc(i, 'gebruikersnaam', e.target.value)} />
                  <button className="btn small" type="button" aria-label="Account verwijderen" onClick={() => { setAccs((l) => l.filter((_, j) => j !== i)); setDupOk(false); }}>✕</button>
                  <input className="full" type="text" aria-label="Notitie over de chat" placeholder="waar ging de chat over?" value={a.chat_notitie} onChange={(e) => setAcc(i, 'chat_notitie', e.target.value)} />
                </div>
              ))}
            </div>
            <button className="btn small" type="button" style={{ justifySelf: 'start' }} onClick={() => setAccs((l) => [...l, newAcc()])}>+ Account</button>
          </Section>

          {status.v3 && <TopicsSection pid={pid} pending={pendingTopics} setPending={setPendingTopics} />}

          {status.v2 && <LogSection pid={pid} accs={accs} pendingLog={pendingLog} setPendingLog={setPendingLog} onContact={onContact} />}

          <Section title="Foto's" count={fotos.length + files.length || ''}>
            {fotos.length > 0 && (
              <div className="thumbs">
                {fotos.map((f) => <span key={f.id}>{vault.srcOf(f) ? <img src={vault.srcOf(f)} alt={f.bijschrift || ''} /> : <i className="thumb-lock">🔒</i>}</span>)}
              </div>
            )}
            <label className="btn small" htmlFor="pUpload" style={{ justifySelf: 'start' }}>Foto's kiezen</label>
            <input id="pUpload" type="file" accept="image/*" multiple hidden
              onChange={(e) => { const fl = Array.from(e.target.files); e.target.value = ''; setFiles((f) => [...f, ...fl]); }} />
            {files.length > 0 && <p className="hint">{files.length} foto's klaar om te uploaden bij opslaan.</p>}
          </Section>
          <Note msg={msg} role="alert" />
    </Modal>
  );
}
