import { useEffect, useRef, useState } from 'react';

const SHORT = /^([a-z0-9])\s*[:>]\s?(.*)$/i;

/**
 * Snel een gesprek intypen: kies wie er praat, typ, Enter = toevoegen.
 * Na Enter wisselt de spreker vanzelf naar de volgende; Tab wisselt zelf.
 * Begin je met een snelle letter ("l: hoi"), dan wordt meteen die persoon gekozen.
 */
export default function ChatComposer({ keys, onAdd }) {
  const [cur, setCur] = useState(0);
  const [line, setLine] = useState('');
  const input = useRef(null);
  useEffect(() => { if (cur >= keys.length) setCur(0); }, [keys.length, cur]);
  const speaker = keys[Math.min(cur, keys.length - 1)];

  const add = () => {
    let text = line.trim();
    if (!text) return;
    let idx = cur;
    const m = SHORT.exec(text);
    if (m) {
      const hit = keys.findIndex((k) => k.key === m[1].toLowerCase() || k.alias === m[1].toLowerCase());
      if (hit >= 0) { idx = hit; text = m[2].trim(); }
    }
    if (!text) return;
    onAdd(`${keys[idx].name}: ${text}`);
    setLine('');
    setCur((idx + 1) % keys.length);   // meestal praat daarna de ander
    input.current?.focus();
  };

  return (
    <div className="composer">
      <div className="composer-who" role="group" aria-label="Wie zegt het?">
        {keys.map((k, i) => (
          <button key={k.name + i} type="button" className="chip" aria-pressed={i === cur} onClick={() => { setCur(i); input.current?.focus(); }}>
            {k.me ? 'Ik' : k.name} <kbd>{k.key}</kbd>{k.alias && <kbd>{k.alias}</kbd>}
          </button>
        ))}
      </div>
      <div className="composer-line">
        <input ref={input} type="text" value={line} onChange={(e) => setLine(e.target.value)}
          aria-label={`Bericht van ${speaker?.name || ''}`}
          placeholder={speaker ? `${speaker.me ? 'Jij' : speaker.name} zegt…` : ''}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); add(); }
            else if (e.key === 'Tab' && !e.shiftKey && !line) { e.preventDefault(); setCur((c) => (c + 1) % keys.length); }
          }} />
        <button type="button" className="btn small primary" onClick={add} disabled={!line.trim()}>Toevoegen</button>
      </div>
      <p className="hint">Enter = toevoegen (daarna is de ander aan de beurt). Tab = wissel wie er praat. Of begin met een letter: <code>{keys[1]?.key || 'l'}: hoi</code>.</p>
    </div>
  );
}
