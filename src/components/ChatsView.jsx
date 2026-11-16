import { useEffect, useMemo, useRef, useState } from 'react';
import Avatar from './Avatar.jsx';
import { IconBack, IconEdit, IconLock, IconPlus, IconSearch, IconUser } from './Icons.jsx';
import { agoText, dayLabel, daysSince, fmtDate, snippet, splitMatch } from '../lib.js';

function Hl({ text, q }) {
  return splitMatch(text, q).map((s, i) => (s.hit ? <mark key={i}>{s.t}</mark> : <span key={i}>{s.t}</span>));
}

const shortDate = (s) => {
  const n = daysSince(s);
  return n === 0 ? 'vandaag' : n === 1 ? 'gisteren' : fmtDate(s, n > 300);
};

export default function ChatsView({ people, chats, selectedId, onSelect, onPaste, profile, profileOpen, onToggleProfile, pane, onPane }) {
  const [q, setQ] = useState('');
  const [plat, setPlat] = useState('');
  const [cq, setCq] = useState('');
  const [cqOpen, setCqOpen] = useState(false);
  const setPane = onPane;
  const bodyRef = useRef(null);

  const query = q.trim().toLowerCase();
  const items = useMemo(() => {
    return people
      .filter((p) => p.chatCount > 0)
      .map((p) => {
        const cs = chats.filter((c) => c.persoon_id === p.id);
        const lastChat = cs.reduce((m, c) => (c.datum >= m.datum ? c : m), cs[0]);
        const lastMsg = lastChat.messages[lastChat.messages.length - 1];
        let hit = '';
        if (query) {
          for (const c of cs) {
            const m = c.messages.find((x) => x.text.toLowerCase().includes(query));
            if (m) { hit = snippet(m.text, query); break; }
          }
        }
        const nameHit = p.naam.toLowerCase().includes(query) || (p.bijnaam || '').toLowerCase().includes(query);
        const plats = [...new Set(cs.map((c) => c.platform))];
        return { p, cs, lastChat, lastMsg, hit, nameHit, plats };
      })
      .filter((x) => (!query || x.nameHit || x.hit) && (!plat || x.plats.includes(plat)))
      .sort((a, b) => (a.lastChat.datum < b.lastChat.datum ? 1 : a.lastChat.datum > b.lastChat.datum ? -1 : 0));
  }, [people, chats, query, plat]);

  const allPlats = useMemo(() => [...new Set(chats.map((c) => c.platform))].sort(), [chats]);
  const person = people.find((p) => p.id === selectedId);
  // Oudste chat bovenaan, nieuwste onderaan; op dezelfde dag in de volgorde waarin ze zijn geplakt.
  const sessions = person ? chats.filter((c) => c.persoon_id === person.id).sort((a, b) => (a.datum !== b.datum ? (a.datum < b.datum ? -1 : 1) : ((a.created_at || '') < (b.created_at || '') ? -1 : 1))) : [];
  const cqq = cq.trim().toLowerCase();
  const matchCount = cqq ? sessions.reduce((s, c) => s + c.messages.filter((m) => m.text.toLowerCase().includes(cqq)).length, 0) : 0;

  useEffect(() => {
    const el = bodyRef.current;
    // Zoals WhatsApp: oudste bovenaan, nieuwste onderaan, en openen bij het nieuwste bericht.
    if (el && !cqq) el.scrollTop = el.scrollHeight;
  }, [selectedId, sessions.length, cqq]);

  useEffect(() => {
    setCq('');
    setCqOpen(false);
  }, [selectedId]);

  const open = (id) => {
    onSelect(id);
    setPane('conv');
  };

  const platsOfPerson = person ? [...new Set(sessions.map((c) => c.platform))] : [];

  return (
    <div className={'chats' + (profileOpen ? ' with-profile' : '')} data-pane={pane}>
      <section className="convlist panel" aria-label="Gesprekken">
        <div className="cl-head">
          <h1>Chats</h1>
          <button type="button" className="icon-btn primary" onClick={() => onPaste(selectedId)} aria-label="Chat plakken" title="Chat plakken">
            <IconPlus />
          </button>
        </div>
        <label className="search" htmlFor="cl-q">
          <IconSearch width={18} height={18} />
          <input id="cl-q" type="search" placeholder="Zoek in namen en berichten" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="chips" role="group" aria-label="Filter op platform">
          <button type="button" className="chip" aria-pressed={!plat} onClick={() => setPlat('')}>Alle</button>
          {allPlats.map((n) => (
            <button type="button" key={n} className="chip" aria-pressed={plat === n} onClick={() => setPlat(plat === n ? '' : n)}>{n}</button>
          ))}
        </div>
        <ul className="cl-items">
          {items.map(({ p, cs, lastChat, lastMsg, hit, plats }) => (
            <li key={p.id}>
              <button type="button" className={'cl-item' + (p.id === selectedId ? ' active' : '')} onClick={() => open(p.id)}>
                <Avatar person={p} />
                <span className="cl-main">
                  <span className="cl-top"><b className="cl-name">{p.favoriet ? '★ ' : ''}{p.naam}</b><small>{shortDate(lastChat.datum)}</small></span>
                  <span className="cl-prev">
                    {hit ? <Hl text={hit} q={query} /> : lastMsg ? (lastMsg.mine ? 'Jij: ' : '') + lastMsg.text.replace(/\s+/g, ' ') : ''}
                  </span>
                  <span className="cl-badges">
                    {plats.map((n) => <span className="tag" key={n}>{n}</span>)}
                    <span className="count">{cs.length}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
          {!items.length && (chats.length
            ? <li className="empty small"><b>Niets gevonden</b>Pas je zoekopdracht of filter aan.</li>
            : <li className="empty small"><b>Nog geen chats</b>{people.length ? 'Tik op + om een chat te plakken.' : 'Voeg eerst een persoon toe.'}</li>)}
        </ul>
      </section>

      <section className="conv panel" aria-label="Gesprek">
        {person ? (
          <>
            <header className="conv-head">
              <button type="button" className="icon-btn back-btn" onClick={() => setPane('list')} aria-label="Terug naar gesprekken"><IconBack /></button>
              <button type="button" className="conv-title" onClick={onToggleProfile} aria-label={'Profiel van ' + person.naam}>
                <Avatar person={person} />
                <span>
                  <b>{person.naam}</b>
                  <small>{platsOfPerson.join(' · ')} · {sessions.length} {sessions.length === 1 ? 'gesprek' : 'gesprekken'} · laatst {agoText(daysSince(person.lastChat))}</small>
                </span>
              </button>
              <button type="button" className={'icon-btn' + (cqOpen ? ' on' : '')} onClick={() => { setCqOpen((o) => !o); if (cqOpen) setCq(''); }} aria-label="Zoeken in dit gesprek" aria-pressed={cqOpen}>
                <IconSearch />
              </button>
              <button type="button" className={'icon-btn' + (profileOpen ? ' on' : '')} onClick={onToggleProfile} aria-label="Profiel tonen of verbergen" aria-pressed={profileOpen}>
                <IconUser />
              </button>
            </header>
            {cqOpen && (
              <div className="conv-search">
                <input id="conv-q" type="search" autoFocus placeholder={'Zoek in gesprek met ' + person.naam.split(' ')[0]} value={cq} onChange={(e) => setCq(e.target.value)} />
                {cqq && <span className="muted">{matchCount} {matchCount === 1 ? 'bericht' : 'berichten'}</span>}
              </div>
            )}
            <div className="conv-body" ref={bodyRef}>
              {!sessions.length && (
                <div className="empty"><b>Nog geen chats met {person.naam.split(' ')[0]}</b>
                  <button type="button" className="btn primary" style={{ marginTop: 12 }} onClick={() => onPaste(person.id)}>+ Chat plakken</button>
                </div>
              )}
              {sessions.map((c) => (
                <div className="session" key={c.id}>
                  <div className="pill-day">
                    {c.belangrijk && <span className="star-on" aria-label="Belangrijk">★</span>}
                    {c.platform && <span className="plat">{c.platform}</span>}{fmtDate(c.datum)}{c.titel ? ' · ' + c.titel : ''}
                    <button type="button" className="pill-edit" onClick={() => onPaste(person.id, c.id)} aria-label="Deze chat bewerken" title="Bewerken"><IconEdit width={13} height={13} /></button>
                  </div>
                  {c.messages.map((m, i) => {
                    const prev = c.messages[i - 1];
                    const newDay = prev && prev.date !== m.date;
                    const cont = prev && prev.from === m.from && !newDay;
                    return (
                      <div key={m.id}>
                        {newDay && <div className="pill-day light">{dayLabel(m.date)}</div>}
                        <div className={'msg ' + (m.from === null ? 'sys' : m.mine ? 'me' : 'them') + (cont ? ' cont' : '')}>
                          <div className="bubble">
                            <span className="text"><Hl text={m.text} q={cqq} /></span>
                            {m.time && <span className="time">{m.time}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <footer className="readonly">
              <IconLock width={16} height={16} />
              <span>Alleen lezen. Dit is een archief, je kunt hier niet chatten.</span>
              <button type="button" className="btn small" onClick={() => onPaste(person.id)}>+ Chat plakken</button>
            </footer>
          </>
        ) : (
          <div className="empty"><b>Kies een gesprek</b>Selecteer links iemand om alle chats met die persoon te lezen.</div>
        )}
      </section>

      {profile}
    </div>
  );
}
