import { useState } from 'react';

// Staafgrafiek: berichten per maand. Eén reeks, één as, dus geen legenda nodig.
const W = 640, H = 240, PL = 34, PR = 8, PT = 20, PB = 30;
const IW = W - PL - PR, IH = H - PT - PB;

function niceStep(max) {
  for (const s of [1, 2, 5, 10, 20, 25, 50, 100, 200, 500]) if (max / s <= 4.5) return s;
  return 1000;
}

function barPath(x, y, w, h, r) {
  r = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

const labelOf = (b) => b.label + (b.label === 'jan' ? " '" + String(b.year).slice(2) : '');

export default function ActivityChart({ buckets }) {
  const [hover, setHover] = useState(null);
  const [table, setTable] = useState(false);

  const max = Math.max(1, ...buckets.map((b) => b.messages));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  const slot = IW / buckets.length;
  const bw = Math.min(28, slot * 0.52);
  const yOf = (v) => PT + IH - (v / top) * IH;
  const maxIdx = buckets.reduce((bi, b, i) => (b.messages > buckets[bi].messages ? i : bi), 0);
  const lastIdx = buckets.length - 1;
  const hb = hover != null ? buckets[hover] : null;

  return (
    <div className="chart">
      <div className="chart-bar">
        <button type="button" className="link-btn" onClick={() => setTable((t) => !t)} aria-pressed={table}>
          {table ? 'Grafiek' : 'Tabel'}
        </button>
      </div>
      {table ? (
        <div className="tablewrap">
          <table className="dtable">
            <thead>
              <tr><th>Maand</th><th>Berichten</th><th>Gesprekken</th></tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.key}><td>{labelOf(b)} {b.year}</td><td>{b.messages}</td><td>{b.chats}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart-frame">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Berichten per maand over de laatste twaalf maanden">
            {ticks.map((v) => (
              <g key={v}>
                <line x1={PL} x2={W - PR} y1={yOf(v)} y2={yOf(v)} className={v === 0 ? 'ax-base' : 'ax-grid'} />
                <text x={PL - 7} y={yOf(v) + 4} textAnchor="end" className="ax-text">{v}</text>
              </g>
            ))}
            {buckets.map((b, i) => {
              const x = PL + slot * i + (slot - bw) / 2;
              const h = (b.messages / top) * IH;
              const showVal = (i === maxIdx || i === lastIdx) && b.messages > 0;
              return (
                <g key={b.key} className={'col' + (hover === i ? ' on' : '')}>
                  {h > 0 && <path d={barPath(x, yOf(b.messages), bw, h, 4)} className={b.current ? 'bar cur' : 'bar'} />}
                  {showVal && (
                    <text x={x + bw / 2} y={yOf(b.messages) - 6} textAnchor="middle" className="val-text">{b.messages}</text>
                  )}
                  <text x={PL + slot * i + slot / 2} y={H - 9} textAnchor="middle" className={b.current ? 'ax-text strong' : 'ax-text'}>
                    {labelOf(b)}
                  </text>
                  <rect
                    x={PL + slot * i} y={PT} width={slot} height={IH + PB}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                    onClick={() => setHover(hover === i ? null : i)}
                  />
                </g>
              );
            })}
          </svg>
          {hb && (
            <div
              className="tip"
              style={{
                left: `clamp(64px, ${((PL + slot * (hover + 0.5)) / W) * 100}%, calc(100% - 64px))`,
                top: (yOf(hb.messages) / H) * 100 + '%',
              }}
            >
              <b>{hb.label} {hb.year}</b>
              <span>{hb.messages} berichten</span>
              <span>{hb.chats} {hb.chats === 1 ? 'gesprek' : 'gesprekken'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
