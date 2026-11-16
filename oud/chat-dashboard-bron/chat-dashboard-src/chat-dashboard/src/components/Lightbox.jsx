import { useEffect } from 'react';
import { IconBack, IconChevron, IconClose } from './Icons.jsx';

export default function Lightbox({ items, index, personOf, onClose, onIndex, onOpenProfile, onUnlock }) {
  const f = items[index];
  const n = items.length;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && n > 1) onIndex((index - 1 + n) % n);
      else if (e.key === 'ArrowRight' && n > 1) onIndex((index + 1) % n);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, n, onClose, onIndex]);

  if (!f) return null;
  const p = personOf(f.persoon_id);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Foto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <button type="button" className="lb-btn close" onClick={onClose} aria-label="Sluiten"><IconClose /></button>
      {n > 1 && <button type="button" className="lb-btn prev" onClick={() => onIndex((index - 1 + n) % n)} aria-label="Vorige foto"><IconBack /></button>}
      <figure>
        <img src={f.src} alt={f.bijschrift || ''} />
        <figcaption>
          <span>{p ? p.naam : 'Los in de bibliotheek'}{f.bijschrift ? ' · ' + f.bijschrift : ''} <small>({index + 1} van {n})</small></span>
          {p && <button type="button" className="btn small" onClick={() => onOpenProfile(p.id)}>Profiel</button>}
        </figcaption>
        {f.versleuteld && (
          <div className="cipher">
            {f.vergrendeld && <button type="button" className="btn small" onClick={onUnlock}>Ontgrendelen</button>}
            <details>
              <summary>Wat bewaart de server van deze foto?</summary>
              <p>{f.size ? Math.round(f.size / 1024) + ' KB' : ''} onleesbare bytes. De eerste 40:</p>
              <code>{f.cipherHex || 'alleen de versleutelde versie'}</code>
              <p>Zonder je tweede wachtwoord is dit niet terug te maken, ook niet door de server of de beheerder.</p>
            </details>
          </div>
        )}
      </figure>
      {n > 1 && <button type="button" className="lb-btn next" onClick={() => onIndex((index + 1) % n)} aria-label="Volgende foto"><IconChevron /></button>}
    </div>
  );
}
