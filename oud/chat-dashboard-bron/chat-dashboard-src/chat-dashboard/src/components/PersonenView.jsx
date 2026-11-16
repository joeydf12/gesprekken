import { useMemo, useState } from 'react';
import Avatar from './Avatar.jsx';
import { IconSearch } from './Icons.jsx';
import { agoText, ageOf, daysSince } from '../lib.js';

export default function PersonenView({ people, onOpen }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('naam');

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out = people.filter((p) => {
      if (!s) return true;
      return [p.naam, p.bijnaam, p.woonplaats, p.land, p.relatie, (p.interesses || []).join(' '), p.accounts.map((a) => a.gebruikersnaam).join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(s);
    });
    const cmp = {
      naam: (a, b) => a.naam.localeCompare(b.naam, 'nl'),
      contact: (a, b) => (a.lastChat || '0000') < (b.lastChat || '0000') ? -1 : 1,
      jong: (a, b) => (ageOf(a) ?? 999) - (ageOf(b) ?? 999),
    }[sort];
    return out.sort((a, b) => (a.favoriet !== b.favoriet ? (a.favoriet ? -1 : 1) : cmp(a, b)));
  }, [people, q, sort]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Personen</h1>
          <p className="sub">{people.length} personen uit al je chats, met hun gegevens en foto's.</p>
        </div>
        <div className="head-tools">
          <label className="search" htmlFor="pv-q">
            <IconSearch width={18} height={18} />
            <input id="pv-q" type="search" placeholder="Zoek op naam, plaats, interesse" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className="select" htmlFor="pv-sort">
            <span className="sr">Sorteren</span>
            <select id="pv-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="naam">A–Z</option>
              <option value="contact">Langst geen contact</option>
              <option value="jong">Jongste eerst</option>
            </select>
          </label>
        </div>
      </header>

      <div className="pgrid">
        {list.map((p) => {
          const age = ageOf(p);
          const dsc = daysSince(p.lastChat);
          return (
            <button type="button" className="pcard" key={p.id} onClick={() => onOpen(p.id)}>
              <span className="pc-top">
                <Avatar person={p} size="lg" />
                <span className="grow">
                  <b>{p.favoriet ? '★ ' : ''}{p.naam}</b>
                  <small>{[age != null ? age + ' jaar' : '', p.woonplaats, p.relatie].filter(Boolean).join(' · ')}</small>
                </span>
              </span>
              <span className="tags">
                {p.accounts.map((a) => <span className="tag plat" key={a.platform + a.gebruikersnaam}>{a.platform}</span>)}
                {(p.interesses || []).slice(0, 3).map((i) => <span className="tag" key={i}>{i}</span>)}
              </span>
              <span className={'pc-foot' + (dsc != null && dsc > 60 ? ' warn' : '')}>
                {p.lastChat ? 'Laatst gesproken ' + agoText(dsc) : 'Nog geen gesprekken'}
              </span>
            </button>
          );
        })}
        {!list.length && <div className="empty"><b>Niemand gevonden</b>Pas je zoekopdracht aan.</div>}
      </div>
    </div>
  );
}
