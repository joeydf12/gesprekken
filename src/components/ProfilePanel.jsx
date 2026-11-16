import Avatar from './Avatar.jsx';
import { IconChevron, IconClose, IconEdit } from './Icons.jsx';
import { useVault } from '../vault/VaultContext.jsx';
import { FAVORIET_CATS } from '../lib/constants.js';
import { errText } from '../lib/utils.js';
import { agoText, ageOf, daysSince, daysToBirthday, fmtDate } from '../lib.js';
import { useToast } from './Toast.jsx';

export default function ProfilePanel({ person, chats, fotos, onClose, onOpenChats, onOpenPhoto, onAddPhoto, onEdit, onQuickLog, onPaste }) {
  const vault = useVault();
  const toast = useToast();
  if (!person) return null;
  const { data, status } = vault;
  const age = ageOf(person);
  const dsc = daysSince(person.lastChat);
  const dtb = daysToBirthday(person);
  const facts = [
    ['Leeftijd', age != null ? age + ' jaar' : ''],
    ['Geboren', fmtDate(person.geboortedatum)],
    ['Woont in', [person.woonplaats, person.land].filter(Boolean).join(', ')],
    ['Werk', person.werk || ''],
    ['Studie', person.studie || ''],
    ['Ken je sinds', fmtDate(person.kennis_sinds)],
    ['Laatst gesproken', person.lastChat ? fmtDate(person.lastChat) + ' (' + agoText(dsc) + ')' : ''],
    ['Herinnering', person.contact_interval ? 'elke ' + person.contact_interval + ' dagen' + (person.due ? ' · nu aan de beurt' : '') : ''],
    ['Jarig', dtb !== null ? (dtb === 0 ? 'vandaag 🎉' : 'over ' + dtb + ' dagen') : ''],
  ].filter((f) => f[1]);
  const mine = chats.filter((c) => c.persoon_id === person.id).sort((a, b) => (a.datum < b.datum ? 1 : -1));
  const photos = fotos.filter((f) => f.persoon_id === person.id);
  const topics = data.onderwerpen.filter((t) => t.persoon_id === person.id && !t.gedaan);
  const logs = data.gesprekken.filter((g) => g.persoon_id === person.id).slice(0, 5);
  const favs = FAVORIET_CATS.map(([k, label]) => [label, (person.favorieten || {})[k] || []]).filter(([, v]) => v.length);
  const tags = [...(person.hobbys || []), ...(person.interesses || [])];

  const done = async (id) => {
    try { await vault.setTopicsDone([id], true); } catch (err) { if (!vault.authFailed(err)) toast(errText(err), true); }
  };

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="profile panel" aria-label={'Profiel van ' + person.naam}>
        <div className="pf-head">
          <button type="button" className="icon-btn" onClick={() => onEdit(person.id)} aria-label="Profiel bewerken" title="Bewerken"><IconEdit /></button>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Profiel sluiten"><IconClose /></button>
        </div>
        <div className="pf-scroll">
          <div className="pf-id">
            <Avatar person={person} size="xl" />
            <h2>{person.favoriet ? '★ ' : ''}{person.naam}</h2>
            <p className="muted">{[person.bijnaam ? '“' + person.bijnaam + '”' : '', person.relatie].filter(Boolean).join(' · ')}</p>
            <div className="pf-actions">
              {status.v2 && <button type="button" className="btn primary" onClick={() => onQuickLog(person.id)}>💬 Gesprek vastleggen</button>}
              <button type="button" className="btn" onClick={() => onOpenChats(person.id)}>Open chats</button>
            </div>
          </div>

          {facts.length > 0 && (
            <dl className="facts">
              {facts.map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          )}

          {tags.length > 0 && <div className="tags">{tags.map((i, n) => <span className="tag" key={n}>{i}</span>)}</div>}

          {(person.eigen_velden || []).length > 0 && (
            <section>
              <h3>Eigen velden</h3>
              <dl className="custom-facts">
                {person.eigen_velden.map((v, i) => (
                  <div key={i}><dt>{v.label}</dt><dd>{v.waarde || '—'}</dd></div>
                ))}
              </dl>
            </section>
          )}

          {(person.vermijden || []).length > 0 && <div className="flag no"><b>Liever niet over:</b> {person.vermijden.join(' · ')}</div>}
          {(person.werkt_altijd || []).length > 0 && <div className="flag yes"><b>Werkt altijd:</b> {person.werkt_altijd.join(' · ')}</div>}

          {status.v3 && (
            <section>
              <h3>Onderwerpen voor de volgende keer ({topics.length})</h3>
              {topics.length ? (
                <div className="topics">
                  {topics.map((t) => (
                    <label className="topic" key={t.id}>
                      <input type="checkbox" checked={false} onChange={() => done(t.id)} aria-label={'Afvinken: ' + t.tekst} />
                      <span>{t.tekst}</span>
                    </label>
                  ))}
                </div>
              ) : <p className="muted">Niets open. Voeg onderwerpen toe via Bewerken.</p>}
            </section>
          )}

          {favs.length > 0 && (
            <section>
              <h3>Favoriete dingen</h3>
              <dl className="facts">
                {favs.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v.join(', ')}</dd></div>)}
              </dl>
            </section>
          )}

          {person.notities && (
            <section>
              <h3>Notities</h3>
              <p className="notes">{person.notities}</p>
            </section>
          )}

          <section>
            <h3>Accounts</h3>
            {person.accounts.length ? (
              <ul className="rows">
                {person.accounts.map((a) => (
                  <li className="acc" key={a.id}>
                    <span className="tag plat">{a.platform}</span>
                    <b>{a.gebruikersnaam}</b>
                    {a.notitie && <small>{a.notitie}</small>}
                  </li>
                ))}
              </ul>
            ) : <p className="muted">Nog geen accounts.</p>}
          </section>

          {status.v2 && (
            <section>
              <h3>Gesprekslog</h3>
              {logs.length ? (
                <ul className="rows">
                  {logs.map((g) => (
                    <li key={g.id} className="logrow">
                      <small className="muted">{fmtDate(g.datum)}{g.platform ? ' · ' + g.platform : ''}</small>
                      <span>{g.samenvatting}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">Nog niets vastgelegd.</p>}
            </section>
          )}

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

          {status.chats && (
            <section>
              <h3>Chats ({mine.length}) <button type="button" className="btn small" onClick={() => onPaste(person.id)}>Plakken</button></h3>
              {mine.length ? (
                <ul className="rows">
                  {mine.map((c) => (
                    <li key={c.id}>
                      <button type="button" className="row-btn" onClick={() => onOpenChats(person.id)}>
                        <span className="grow"><b>{c.belangrijk ? '★ ' : ''}{c.titel || 'Chat'}</b><small>{[c.platform, fmtDate(c.datum), c.messages.length + ' berichten'].filter(Boolean).join(' · ')}</small></span>
                        <IconChevron width={16} height={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Nog geen chats.</p>
              )}
            </section>
          )}
        </div>
      </aside>
    </>
  );
}
