import { useMemo, useState } from 'react';
import { dayMonth, num } from '../../lib/format';

/**
 * Grafik garis perkembangan ELO (FR-13). SVG murni, responsif via viewBox.
 * data: [{ date: 'YYYY-MM-DD', rating: number }]
 */
export default function LineChart({ data, height = 190 }) {
  const [hover, setHover] = useState(null);
  const W = 700;
  const H = height;
  const pad = { l: 44, r: 72, t: 18, b: 30 };

  const calc = useMemo(() => {
    if (!data?.length) return null;
    const vals = data.map((d) => d.rating);
    let lo = Math.floor((Math.min(...vals) - 20) / 100) * 100;
    let hi = Math.ceil((Math.max(...vals) + 20) / 100) * 100;
    if (hi - lo < 200) hi = lo + 200;
    const t0 = new Date(data[0].date).getTime();
    const t1 = new Date(data[data.length - 1].date).getTime() || t0 + 1;
    const x = (d) => pad.l + ((new Date(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r);
    const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
    const ticks = [];
    for (let v = lo + 100; v <= hi; v += 100) ticks.push(v);
    const pts = data.map((d) => ({ ...d, cx: x(d.date), cy: y(d.rating) }));
    return { pts, ticks, y, path: pts.map((p, i) => `${i ? 'L' : 'M'}${p.cx.toFixed(1)} ${p.cy.toFixed(1)}`).join(' ') };
  }, [data, H]);

  if (!calc) return null;
  const last = calc.pts[calc.pts.length - 1];
  const mid = calc.pts[Math.floor(calc.pts.length / 2)];
  const active = hover ?? last;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Grafik ELO, terakhir ${num(last.rating)}`} onMouseLeave={() => setHover(null)}>
        {calc.ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={calc.y(v)} y2={calc.y(v)} stroke="#2d323a" strokeWidth="1" />
            <text x="0" y={calc.y(v) + 4} fill="#9aa0aa" fontSize="12">
              {num(v)}
            </text>
          </g>
        ))}
        <path d={calc.path} fill="none" stroke="#ff762e" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {calc.pts.map((p) => (
          <rect key={p.date} x={p.cx - 14} y={pad.t} width="28" height={H - pad.t - pad.b} fill="transparent" onMouseEnter={() => setHover(p)} />
        ))}
        <circle cx={active.cx} cy={active.cy} r="5" fill="#ff762e" stroke="#191c21" strokeWidth="2" />
        <g transform={`translate(${Math.min(active.cx - 8, W - 64)}, ${active.cy - 34})`}>
          <rect width="56" height="24" rx="4" fill="#33251f" />
          <text x="28" y="16.5" textAnchor="middle" fill="#ff8a4c" fontSize="12.5" fontWeight="700">
            {num(active.rating)}
          </text>
        </g>
        <text x={pad.l - 44} y={H - 4} fill="#9aa0aa" fontSize="12">
          {dayMonth(calc.pts[0].date)}
        </text>
        <text x={mid.cx} y={H - 4} fill="#9aa0aa" fontSize="12" textAnchor="middle">
          {dayMonth(mid.date)}
        </text>
        <text x={W} y={H - 4} fill="#9aa0aa" fontSize="12" textAnchor="end">
          {dayMonth(last.date)}
        </text>
      </svg>
    </div>
  );
}
