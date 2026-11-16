import { useMemo, useRef, useState } from 'react';
import Avatar from './Avatar.jsx';
import { IconPlus, IconSearch } from './Icons.jsx';
import { DEFAULT_CONTACT_DAYS } from '../lib/constants.js';
import { agoText, ageOf, daysSince } from '../lib.js';

function PersonCard({ p, onOpen, onQuickLog }) {
  const age = ageOf(p);
  const dsc = daysSince(p.lastChat);
  const late = !!p.due || (dsc != null && dsc > (p.contact_interval || DEFAULT_CONTACT_DAYS));
  // Lang indrukken (0,5 s) = snel een gesprek vastleggen.
  const press = useRef({ t: null, fired: false });
  const start = () => {
    press.current.fired = false;
    clearTimeout(press.current.t);
    press.current.t = setTimeout(() => { press.current.fired = true; navigator.vibrate?.(15); onQuickLog(p.id); }, 500);
  };
  const stop = () => clearTimeout(press.current.t);
  const tags = [...(p.hobbys || []), ...(p.interesses || [])].slice(0, 3);
  return (
    <div className="pcard-wrap">
      <button type="button" className="pcard"
        onClick={() => { if (press.current.fired) { press.current.fired = false; return; } onOpen(p.id); }}
        onTouchStart={start} onTouchEnd={stop} onTouchMove={stop} onTouchCancel={stop}
        onContextMenu={(e) => { e.preventDefault(); if (!press.current.fired) { stop(); onQuickLog(p.id); } }}>
        <span className="pc-top">
          <Avatar person={p} size="lg" />
          <span className="grow">
            <b>{p.favoriet ? '★ ' : ''}{p.naam}</b>
            <small>{[age != null ? age + ' jaar' : '', p.woonplaats, p.relatie].filter(Boolean).join(' · ')}</small>
          </span>
        </span>
        <span className="tags">
          {p.openTopics > 0 && <span className="tag topic">{p.openTopics} {p.openTopics === 1 ? 'onderwerp' : 'onderwerpen'}</span>}
          {p.accounts.map((a) => <span className="tag plat" key={a.id}>{a.platform}</span>)}
          {tags.map((i, n) => <span className="tag" key={n}>{i}</span>)}
        </span>
        <span className={'pc-foot' + (late ? ' warn' : '')}>
          {p.lastChat ? 'Laatst gesproken ' + agoText(dsc) : 'Nog geen contact vastgelegd'}
        </span>
      </button>
      <button type="button" className="quick" onClick={() => onQuickLog(p.id)} aria-label={'Gesprek met ' + p.naam + ' vastleggen'} title="Gesprek vastleggen">💬</button>
    </div>
  );
}

export default function PersonenView({ people, onOpen, onNew, onQuickLog }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('naam');

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out = people.filter((p) => {
      if (!s) return true;
      return [
        p.naam, p.bijnaam, p.woonplaats, p.land, p.relatie, p.notities, p.werk, p.studie,
        (p.interesses || []).join(' '), (p.hobbys || []).join(' '),
        Object.values(p.favorieten || {}).flat().join(' '),
        (p.eigen_velden || []).map((v) => `${v.label} ${v.waarde}`).join(' '),
        p.accounts.map((a) => `${a.gebruikersnaam || ''} ${a.chat_notitie || ''}`).join(' ')
      ].join(' ').toLowerCase().includes(s);
    });
    const cmp = {
      naam: (a, b) => a.naam.localeCompare(b.naam, 'nl'),
      contact: (a, b) => ((a.lastChat || '0000') < (b.lastChat || '0000') ? -1 : 1),
      jong: (a, b) => (ageOf(a) ?? 999) - (ageOf(b) ?? 999),
      nieuw: (a, b) => ((a.created_at || '') < (b.created_at || '') ? 1 : -1),
    }[sort];
    return out.sort((a, b) => (a.favoriet !== b.favoriet ? (a.favoriet ? -1 : 1) : cmp(a, b)));
  }, [people, q, sort]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Personen</h1>
          <p className="sub">{people.length} {people.length === 1 ? 'persoon' : 'personen'}. Tik op 💬 (of houd een kaart ingedrukt) om snel een gesprek vast te leggen.</p>
        </div>
        <div className="head-tools">
          <label className="search" htmlFor="pv-q">
            <IconSearch width={18} height={18} />
            <input id="pv-q" type="search" placeholder="Zoek op naam, hobby, werk, account…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className="select" htmlFor="pv-sort">
            <span className="sr">Sorteren</span>
            <select id="pv-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="naam">A–Z</option>
              <option value="contact">Langst geen contact</option>
              <option value="jong">Jongste eerst</option>
              <option value="nieuw">Nieuwst</option>
            </select>
          </label>
          <button type="button" className="btn primary" onClick={onNew}><IconPlus width={15} height={15} /> Persoon</button>
        </div>
      </header>

      <div className="pgrid">
        {list.map((p) => <PersonCard key={p.id} p={p} onOpen={onOpen} onQuickLog={onQuickLog} />)}
        {!list.length && (people.length
          ? <div className="empty"><b>Niemand gevonden</b>Pas je zoekopdracht aan.</div>
          : <div className="empty"><b>Nog niemand in je kluis</b>Tik op + Persoon om de eerste toe te voegen.</div>)}
      </div>
    </div>
  );
}
