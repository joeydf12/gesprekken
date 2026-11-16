import { useMemo, useState } from 'react';

import { IconLock, IconPlus } from './Icons.jsx';

export default function FotosView({ people, fotos, onOpen, onAdd, unlocked, onUnlock, onLockNow }) {
  const [who, setWho] = useState('alle');
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));
  const list = useMemo(
    () => fotos.filter((f) => who === 'alle' || (who === 'los' ? !f.persoon_id : f.persoon_id === who)),
    [fotos, who]
  );
  const withPhotos = people.filter((p) => fotos.some((f) => f.persoon_id === p.id));
  const hasPrive = fotos.some((f) => f.versleuteld);
  const loose = fotos.some((f) => !f.persoon_id);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Foto's</h1>
          <p className="sub">{fotos.length} foto's in je privé fotomap{hasPrive ? (unlocked ? ". Extra privé foto's zijn ontgrendeld." : ". Extra privé foto's zijn vergrendeld.") : '.'}</p>
        </div>
        <div className="head-actions">
          {hasPrive && (unlocked
            ? <button type="button" className="btn" onClick={onLockNow}><IconLock width={15} height={15} /> Nu vergrendelen</button>
            : <button type="button" className="btn" onClick={onUnlock}><IconLock width={15} height={15} /> Extra privé ontgrendelen</button>)}
          <button type="button" className="btn primary" onClick={() => onAdd(null)}><IconPlus width={15} height={15} /> Foto toevoegen</button>
        </div>
      </header>
      <div className="chips" role="group" aria-label="Filter op persoon">
        <button type="button" className="chip" aria-pressed={who === 'alle'} onClick={() => setWho('alle')}>Alle</button>
        {withPhotos.map((p) => (
          <button type="button" key={p.id} className="chip" aria-pressed={who === p.id} onClick={() => setWho(p.id)}>{p.naam.split(' ')[0]}</button>
        ))}
        {loose && <button type="button" className="chip" aria-pressed={who === 'los'} onClick={() => setWho('los')}>Los</button>}
      </div>
      {!fotos.length && <div className="empty"><b>Nog geen foto's</b>Voeg er een toe, los of bij een persoon.</div>}
      <div className="photos">
        {list.map((f, i) => (
          <button type="button" className="ph" key={f.id} onClick={() => onOpen(list.map((x) => x.id), i)}>
            <img src={f.src} alt={f.vergrendeld ? 'Vergrendelde foto' : f.bijschrift || ''} loading="lazy" />
            {f.versleuteld && <i className="lockbadge" aria-label="Extra privé"><IconLock width={12} height={12} /></i>}
            <span>{f.persoon_id ? byId[f.persoon_id]?.naam.split(' ')[0] || '?' : 'Los'}{f.bijschrift && f.bijschrift !== byId[f.persoon_id]?.naam.split(' ')[0] ? ' · ' + f.bijschrift : ''}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
