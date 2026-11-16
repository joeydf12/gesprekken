import Avatar from './Avatar.jsx';
import { IconChevron, IconClose } from './Icons.jsx';
import { agoText, ageOf, daysSince, daysToBirthday, fmtDate } from '../lib.js';

export default function ProfilePanel({ person, chats, fotos, onClose, onOpenChats, onOpenPhoto, onAddPhoto }) {
  if (!person) return null;
  const age = ageOf(person);
  const dsc = daysSince(person.lastChat);
  const dtb = daysToBirthday(person);
  const facts = [
    ['Leeftijd', age != null ? age + ' jaar' : ''],
    ['Geboren', fmtDate(person.geboortedatum)],
    ['Woont in', [person.woonplaats, person.land].filter(Boolean).join(', ')],
    ['Ken je sinds', fmtDate(person.kennis_sinds)],
    ['Laatst gesproken', person.lastChat ? fmtDate(person.lastChat) + ' (' + agoText(dsc) + ')' : ''],
    ['Jarig', dtb !== null ? (dtb === 0 ? 'vandaag' : 'over ' + dtb + ' dagen') : ''],
  ].filter((f) => f[1]);
  const mine = chats.filter((c) => c.persoon_id === person.id).sort((a, b) => (a.datum < b.datum ? 1 : -1));
  const photos = fotos.filter((f) => f.persoon_id === person.id);

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="profile panel" aria-label={'Profiel van ' + person.naam}>
        <div className="pf-head">
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Profiel sluiten"><IconClose /></button>
        </div>
        <div className="pf-scroll">
          <div className="pf-id">
            <Avatar person={person} size="xl" />
            <h2>{person.favoriet ? '★ ' : ''}{person.naam}</h2>
            <p className="muted">{[person.bijnaam ? '“' + person.bijnaam + '”' : '', person.relatie].filter(Boolean).join(' · ')}</p>
            <button type="button" className="btn primary" onClick={() => onOpenChats(person.id)}>Open chats</button>
          </div>

          <dl className="facts">
            {facts.map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>

          {(person.interesses || []).length > 0 && (
            <div className="tags">{person.interesses.map((i) => <span className="tag" key={i}>{i}</span>)}</div>
          )}

          {person.notities && (
            <section>
              <h3>Notities</h3>
              <p className="notes">{person.notities}</p>
            </section>
          )}

          <section>
            <h3>Accounts</h3>
            <ul className="rows">
              {person.accounts.map((a) => (
                <li className="acc" key={a.platform + a.gebruikersnaam}>
                  <span className="tag plat">{a.platform}</span>
                  <b>{a.gebruikersnaam}</b>
                  {a.notitie && <small>{a.notitie}</small>}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3>Foto's ({photos.length}) <button type="button" className="btn small" onClick={() => onAddPhoto(person.id)}>Toevoegen</button></h3>
            {photos.length ? (
              <div className="thumbs">
                {photos.map((f, i) => (
                  <button type="button" key={f.id} onClick={() => onOpenPhoto(photos.map((x) => x.id), i)} aria-label={'Foto ' + (f.bijschrift || i + 1)}>
                    <img src={f.src} alt="" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">Nog geen foto's.</p>
            )}
          </section>

          <section>
            <h3>Gesprekken ({mine.length})</h3>
            {mine.length ? (
              <ul className="rows">
                {mine.map((c) => (
                  <li key={c.id}>
                    <button type="button" className="row-btn" onClick={() => onOpenChats(person.id)}>
                      <span className="grow"><b>{c.titel || 'Gesprek'}</b><small>{c.platform} · {fmtDate(c.datum)} · {c.messages.length} berichten</small></span>
                      <IconChevron width={16} height={16} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nog geen gesprekken.</p>
            )}
          </section>
        </div>
      </aside>
    </>
  );
}
