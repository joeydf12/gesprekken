import { useMemo } from 'react';
import Avatar from './Avatar.jsx';
import ActivityChart from './Chart.jsx';
import { IconChat, IconPlus } from './Icons.jsx';
import { DEFAULT_CONTACT_DAYS } from '../lib/constants.js';
import { agoText, daysSince, daysToBirthday, fmtDate, monthBuckets } from '../lib.js';

const tally = (arr) => {
  const c = {};
  arr.forEach((k) => {
    if (k) c[k] = (c[k] || 0) + 1;
  });
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
};

function HBars({ rows }) {
  const max = rows.length ? rows[0][1] : 1;
  return (
    <ul className="hbars">
      {rows.map(([name, v]) => (
        <li key={name}>
          <span className="hb-name">{name}</span>
          <span className="hb-track"><i style={{ width: Math.max(4, (v / max) * 100) + '%' }} /></span>
          <b>{v}</b>
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard({ people, chats, fotos, onOpenPerson, onOpenChats, onQuickLog, onNewPerson, onPaste }) {
  const buckets = useMemo(() => monthBuckets(chats), [chats]);
  const messages = chats.reduce((s, c) => s + c.messages.length, 0);
  const platforms = tally(chats.map((c) => c.platform));
  // Eigen herinnering (contact_interval) gaat voor; anders na DEFAULT_CONTACT_DAYS dagen zonder contact.
  const quiet = people
    .filter((p) => p.due || (p.lastChat && daysSince(p.lastChat) > DEFAULT_CONTACT_DAYS))
    .sort((a, b) => (daysSince(b.lastChat) ?? 1e6) - (daysSince(a.lastChat) ?? 1e6))
    .slice(0, 6);
  const topics = people.filter((p) => p.openTopics > 0).sort((a, b) => b.openTopics - a.openTopics).slice(0, 6);
  const birthdays = people
    .map((p) => ({ p, d: daysToBirthday(p) }))
    .filter((x) => x.d !== null && x.d <= 30)
    .sort((a, b) => a.d - b.d)
    .slice(0, 5);
  const interests = tally(people.flatMap((p) => [...(p.hobbys || []), ...(p.interesses || [])]).map((s) => s.toLowerCase())).slice(0, 12);
  const recent = [...chats].sort((a, b) => (a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : 0)).slice(0, 5);
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Overzicht</h1>
          <p className="sub">{people.length ? 'Alles uit je kluis in één oogopslag.' : 'Je kluis is nog leeg. Begin met een persoon of plak een chat.'}</p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn" onClick={onPaste} disabled={!people.length}><IconChat width={15} height={15} /> Chat plakken</button>
          <button type="button" className="btn primary" onClick={onNewPerson}><IconPlus width={15} height={15} /> Persoon</button>
        </div>
      </header>

      <dl className="kpis">
        <div><dt>Personen</dt><dd>{people.length}</dd></div>
        <div><dt>Chats</dt><dd>{chats.length}</dd></div>
        <div><dt>Berichten</dt><dd>{messages}</dd></div>
        <div><dt>Foto's</dt><dd>{fotos.length}</dd></div>
      </dl>

      <div className="dgrid">
        <section className="card c8">
          <h2>Berichten per maand</h2>
          <ActivityChart buckets={buckets} />
        </section>

        <section className="card c4">
          <h2>Chats per platform</h2>
          {!platforms.length && <p className="muted">Nog geen chats.</p>}
          <HBars rows={platforms} />
        </section>

        <section className="card c4">
          <h2>Weer eens contact opnemen</h2>
          {quiet.length ? (
            <ul className="rows">
              {quiet.map((p) => (
                <li key={p.id}>
                  <button type="button" className="row-btn" onClick={() => onQuickLog(p.id)} title="Gesprek vastleggen">
                    <Avatar person={p} size="sm" />
                    <span className="grow"><b>{p.naam}</b><small>{agoText(daysSince(p.lastChat))}{p.contact_interval ? ' · herinnering elke ' + p.contact_interval + ' d' : ''}</small></span>
                    <span className="pill warn">{p.lastChat ? daysSince(p.lastChat) + ' d' : 'nooit'}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{people.length ? 'Niemand is over tijd. Goed bezig!' : 'Nog niemand in je kluis.'}</p>
          )}
        </section>

        <section className="card c4">
          <h2>Binnenkort jarig</h2>
          {birthdays.length ? (
            <ul className="rows">
              {birthdays.map(({ p, d }) => (
                <li key={p.id}>
                  <button type="button" className="row-btn" onClick={() => onOpenPerson(p.id)}>
                    <Avatar person={p} size="sm" />
                    <span className="grow"><b>{p.naam}</b><small>{fmtDate(p.geboortedatum, false)}</small></span>
                    <span className="pill">{d === 0 ? 'vandaag' : d === 1 ? 'morgen' : 'over ' + d + ' d'}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Niemand is de komende 30 dagen jarig.</p>
          )}
        </section>

        {topics.length > 0 && (
          <section className="card c4">
            <h2>Open onderwerpen</h2>
            <ul className="rows">
              {topics.map((p) => (
                <li key={p.id}>
                  <button type="button" className="row-btn" onClick={() => onQuickLog(p.id)}>
                    <Avatar person={p} size="sm" />
                    <span className="grow"><b>{p.naam}</b><small>dingen om te vragen of te vertellen</small></span>
                    <span className="pill">{p.openTopics}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card c4">
          <h2>Waar ze mee bezig zijn</h2>
          {!interests.length && <p className="muted">Vul hobby's of interesses in bij je personen.</p>}
          <div className="tags">
            {interests.map(([name, v]) => (
              <span className="tag" key={name}>{name}{v > 1 && <i>{v}</i>}</span>
            ))}
          </div>
        </section>

        <section className="card c12">
          <h2>Laatste chats</h2>
          {!recent.length && <p className="muted">Nog geen chats. Plak er een via de knop rechtsboven.</p>}
          <ul className="rows">
            {recent.map((c) => {
              const p = byId[c.persoon_id];
              if (!p) return null;
              const last = c.messages[c.messages.length - 1];
              return (
                <li key={c.id}>
                  <button type="button" className="row-btn" onClick={() => onOpenChats(p.id)}>
                    <Avatar person={p} size="sm" />
                    <span className="grow">
                      <b>{p.naam}{c.titel ? ' · ' + c.titel : ''}</b>
                      <small>{last ? (last.mine ? 'Jij: ' : '') + last.text.replace(/\s+/g, ' ') : ''}</small>
                    </span>
                    <span className="meta">{c.platform}<br />{fmtDate(c.datum, false)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
