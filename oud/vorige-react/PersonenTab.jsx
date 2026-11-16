import { useMemo, useRef, useState } from 'react';
import { useVault } from '../vault/VaultContext.jsx';
import { DEFAULT_CONTACT_DAYS } from '../lib/constants.js';
import { ageOf, contactDue, daysSince, daysToBirthday, groupBy, initials } from '../lib/utils.js';

const NONE = [];

function makeSorter(sort) {
  return (a, b) => {
    if (a.favoriet !== b.favoriet) return a.favoriet ? -1 : 1;
    if (sort === 'contact') {
      const da = a.laatst_contact || '0000', db = b.laatst_contact || '0000';
      if (da !== db) return da < db ? -1 : 1;
    } else if (sort === 'nieuw') {
      if (a.created_at !== b.created_at) return (b.created_at || '') < (a.created_at || '') ? -1 : 1;
    } else if (sort === 'leeftijd') {
      const x = ageOf(a) ?? 999, y = ageOf(b) ?? 999;
      if (x !== y) return x - y;
    }
    return a.naam.localeCompare(b.naam, 'nl');
  };
}

function Banners({ personen, onOpen }) {
  const bdays = personen.map((p) => ({ p, d: daysToBirthday(p) }))
    .filter((x) => x.d !== null && x.d <= 14).sort((a, b) => a.d - b.d);
  const due = personen.map((p) => ({ p, c: contactDue(p) }))
    .filter((x) => x.c).sort((a, b) => b.c.over - a.c.over);
  return (
    <>
      {bdays.length > 0 && (
        <div className="banner"><b>Binnenkort jarig</b>
          {bdays.map(({ p, d }) => (
            <button key={p.id} type="button" onClick={() => onOpen(p.id)}>
              {p.naam} · {d === 0 ? 'vandaag 🎉' : d === 1 ? 'morgen' : `over ${d} dagen`}
            </button>
          ))}
        </div>
      )}
      {due.length > 0 && (
        <div className="banner alert"><b>Tijd om weer eens te praten</b>
          {due.slice(0, 8).map(({ p, c }) => (
            <button key={p.id} type="button" onClick={() => onOpen(p.id)}>
              {p.naam} · {c.never ? 'nog nooit' : `${c.days} dagen`}
            </button>
          ))}
          {due.length > 8 && <span className="psub">+{due.length - 8} meer</span>}
        </div>
      )}
    </>
  );
}

function PersonRow({ p, accs, fotos, lastLog, openTopics, urls, onOpen, onQuick }) {
  // Lang indrukken (0,5 s) opent snel vastleggen.
  const press = useRef({ t: null, fired: false });
  const startPress = () => {
    press.current.fired = false;
    clearTimeout(press.current.t);
    press.current.t = setTimeout(() => { press.current.fired = true; navigator.vibrate?.(15); onQuick(p.id); }, 500);
  };
  const endPress = () => clearTimeout(press.current.t);
  const prof = fotos.find((f) => f.is_profielfoto) || fotos[fotos.length - 1];
  const img = prof && urls[prof.pad]?.url;
  const age = ageOf(p), dsc = daysSince(p.laatst_contact);
  const spoke = dsc === null ? '' : dsc <= 0 ? 'vandaag gesproken' : dsc === 1 ? 'gisteren gesproken' : `${dsc} d geleden gesproken`;
  const sub = [age != null ? `${age} jaar` : '', [p.woonplaats, p.land].filter(Boolean).join(', '), p.relatie || '', spoke].filter(Boolean).join(' · ');
  const limit = p.contact_interval || DEFAULT_CONTACT_DAYS;
  const warn = dsc !== null && dsc > limit;
  const ints = [...(p.hobbys || []), ...(p.interesses || [])].slice(0, 4);
  return (
    <div className="prow">
    <button className="person" type="button"
      onClick={() => { if (press.current.fired) { press.current.fired = false; return; } onOpen(p.id); }}
      onTouchStart={startPress} onTouchEnd={endPress} onTouchMove={endPress} onTouchCancel={endPress}
      onContextMenu={(e) => {
        e.preventDefault();
        if (press.current.fired) return;   // al geopend via lang indrukken
        endPress(); onQuick(p.id);         // rechtsklik op desktop
      }}>
      <span className="avatar">{img ? <img src={img} alt="" loading="lazy" /> : initials(p.naam)}</span>
      <span className="pinfo">
        <span className="pname">
          {p.favoriet && '★ '}{p.naam}
          {p.bijnaam && <> <span className="psub">“{p.bijnaam}”</span></>}
        </span>
        {sub && <span className="psub">{sub}</span>}
        {lastLog && <span className="lastlog">{lastLog.samenvatting.split('\n')[0]}</span>}
        {(warn || openTopics > 0 || accs.length > 0 || ints.length > 0) && (
          <span className="tags">
            {warn && <span className="tag warn">{dsc} dagen geen contact</span>}
            {openTopics > 0 && <span className="tag topic">{openTopics} {openTopics === 1 ? 'onderwerp' : 'onderwerpen'}</span>}
            {accs.map((a) => <span key={a.id} className="tag plat">{a.platform}</span>)}
            {ints.map((i, n) => <span key={n} className="tag">{i}</span>)}
          </span>
        )}
      </span>
    </button>
    <button className="quick" type="button" onClick={() => onQuick(p.id)} aria-label={`Gesprek met ${p.naam} vastleggen`} title="Gesprek vastleggen">💬</button>
    </div>
  );
}

export default function PersonenTab({ onOpenPerson, onQuickLog }) {
  const { data, urls, status } = useVault();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('naam');
  const [plat, setPlat] = useState('');

  const accBy = useMemo(() => groupBy(data.accounts, 'persoon_id'), [data.accounts]);
  const fotoBy = useMemo(() => groupBy(data.fotos, 'persoon_id'), [data.fotos]);
  const logBy = useMemo(() => groupBy(data.gesprekken, 'persoon_id'), [data.gesprekken]);
  const topicBy = useMemo(() => groupBy(data.onderwerpen.filter((t) => !t.gedaan), 'persoon_id'), [data.onderwerpen]);
  const chatBy = useMemo(() => groupBy(data.chats, 'persoon_id'), [data.chats]);
  const platforms = useMemo(() => [...new Set(data.accounts.map((a) => a.platform))].sort(), [data.accounts]);
  const activePlat = platforms.includes(plat) ? plat : '';

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.personen.filter((p) => {
      const accs = accBy[p.id] || NONE;
      if (activePlat && !accs.some((a) => a.platform === activePlat)) return false;
      if (!needle) return true;
      const hay = [p.naam, p.bijnaam, p.woonplaats, p.land, p.relatie, p.notities, p.werk, p.studie,
        (p.interesses || []).join(' '), (p.hobbys || []).join(' '),
        Object.values(p.favorieten || {}).flat().join(' '), (p.vermijden || []).join(' '), (p.werkt_altijd || []).join(' ')]
        .concat((topicBy[p.id] || NONE).map((t) => t.tekst))
        .concat((chatBy[p.id] || NONE).map((c) => `${c.titel || ''} ${c.inhoud}`))
        .concat(accs.map((a) => `${a.gebruikersnaam || ''} ${a.chat_notitie || ''}`))
        .concat((logBy[p.id] || NONE).map((g) => g.samenvatting))
        .join(' ').toLowerCase();
      return hay.includes(needle);
    }).sort(makeSorter(sort));
  }, [data.personen, accBy, logBy, topicBy, chatBy, activePlat, q, sort]);

  let body;
  if (!status.loadedAt) {
    body = <div className="empty">{status.error ? <><b>Kon de kluis niet laden</b>{status.error}</> : 'Laden…'}</div>;
  } else if (!data.personen.length) {
    body = <div className="empty"><b>Nog niemand in je kluis</b>Tik op + Nieuw om de eerste persoon toe te voegen.</div>;
  } else if (!list.length) {
    body = <div className="empty"><b>Niets gevonden</b>Pas je zoekopdracht of filter aan.</div>;
  } else {
    body = list.map((p) => (
      <PersonRow key={p.id} p={p} accs={accBy[p.id] || NONE} fotos={fotoBy[p.id] || NONE}
        lastLog={(logBy[p.id] || NONE)[0]} openTopics={(topicBy[p.id] || NONE).length}
        urls={urls} onOpen={onOpenPerson} onQuick={onQuickLog} />
    ));
  }

  return (
    <section>
      <div className="toolbar">
        <input type="search" placeholder="Zoek op naam, hobby, werk, chat, gesprek…" aria-label="Zoeken"
          value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Sorteren" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="naam">A–Z</option>
          <option value="contact">Langst geen contact</option>
          <option value="nieuw">Nieuwst</option>
          <option value="leeftijd">Jongst</option>
        </select>
      </div>
      <Banners personen={data.personen} onOpen={onOpenPerson} />
      {platforms.length > 0 && (
        <div className="chips" role="group" aria-label="Filter op platform">
          {['', ...platforms].map((n) => (
            <button key={n || 'alle'} className="chip" type="button" aria-pressed={activePlat === n} onClick={() => setPlat(n)}>
              {n || 'Alle'}
            </button>
          ))}
        </div>
      )}
      <div className="list">{body}</div>
    </section>
  );
}
