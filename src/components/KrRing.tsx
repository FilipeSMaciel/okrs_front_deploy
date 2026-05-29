import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { KrValue } from '../types';
import { DetailPanel } from './DetailPanel';
import type { DetailItem, DetailPanelProps } from './DetailPanel';

export type { DetailItem };

interface KrDetails extends Omit<DetailPanelProps, 'open' | 'onClose' | 'tag' | 'name'> {}

interface Props {
  tag:             string;
  name:            string;
  data:            KrValue;
  unit:            '%' | 'R$';
  min:             number;
  max:             number;
  invert:          boolean;
  warnThreshold?:  number; // ratio mínimo para amarelo (default 0.85)
  details?:        KrDetails;
  onDetailOpen?:   () => void;
}

function fmt(v: number | null, unit: '%' | 'R$'): string {
  if (v === null || v === undefined) return '—';
  if (unit === 'R$') return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)) + '%';
}

function getStatus(data: KrValue, invert: boolean, warnThreshold = 0.85) {
  const { atual, meta } = data;
  if (atual === null) return { cls: 'pending', label: 'aguardando', color: '#D1D5DB' };
  if (meta  === null) return { cls: 'info',    label: '',           color: '#9CA3AF'  };
  const reached = invert ? atual <= meta : atual >= meta;
  if (reached) return { cls: 'ok',   label: 'no alvo',      color: '#138F4A' };
  const ratio = invert ? meta / Math.max(atual, 0.0001) : atual / Math.max(meta, 0.0001);
  if (ratio >= warnThreshold) return { cls: 'warn', label: 'em andamento', color: '#C97700' };
  return { cls: 'risk', label: 'atenção', color: '#CB0C13' };
}

export function KrRing({ tag, name, data, unit, min, max, invert, warnThreshold, details, onDetailOpen }: Props) {
  const [panelOpen, setPanelOpen] = useState(false);

  const st = getStatus(data, invert, warnThreshold);
  const pct = (v: number) => Math.max(0, Math.min(1, (v - min) / (max - min)));

  const cx = 100, cy = 100, r = 80;
  const C = 2 * Math.PI * r;
  const nowPct  = pct(data.atual ?? 0);
  const goalPct = pct(data.meta  ?? 0);
  const dash    = C * nowPct;
  const gAng    = -Math.PI / 2 + 2 * Math.PI * goalPct;
  const gx1 = cx + Math.cos(gAng) * (r - 12);
  const gy1 = cy + Math.sin(gAng) * (r - 12);
  const gx2 = cx + Math.cos(gAng) * (r + 12);
  const gy2 = cy + Math.sin(gAng) * (r + 12);

  const pillBg = st.cls === 'ok'   ? 'bg-ok-soft text-ok'
               : st.cls === 'warn' ? 'bg-warn-soft text-warn'
               : st.cls === 'risk' ? 'bg-brand-tint text-brand'
               : 'bg-gray-100 text-gray-500';

  const clickable = !!details || !!onDetailOpen;

  return (
    <>
      <div
        className={`bg-white border border-gray-200 rounded-2xl p-5 shadow-sm transition-shadow flex flex-col
          ${clickable ? 'cursor-pointer hover:shadow-md hover:border-brand/30' : 'hover:shadow-md'}`}
        onClick={clickable ? () => { onDetailOpen ? onDetailOpen() : setPanelOpen(true); } : undefined}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { onDetailOpen ? onDetailOpen() : setPanelOpen(true); } } : undefined}
      >
        <div className="flex justify-between items-start gap-3">
          <div>
            <h3 className="text-[17px] font-semibold text-ink leading-tight">{name}</h3>
          </div>
          {data.meta !== null && (
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${pillBg}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {st.label}
            </span>
          )}
        </div>

        <div className="relative w-full max-w-[220px] mx-auto mt-4 aspect-square">
          <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
            {/* track */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ECEDEF" strokeWidth="14" />
            {/* progress */}
            <circle
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={st.color}
              strokeWidth="14"
              strokeDasharray={`${dash} ${C}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
            />
            {/* goal tick */}
            {data.meta !== null && (
              <line x1={gx1} y1={gy1} x2={gx2} y2={gy2} stroke="#0F0F10" strokeWidth="2.4" strokeLinecap="round" />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-[38px] font-bold text-ink leading-none tracking-tight">{fmt(data.atual, unit)}</div>
            {data.meta !== null && (
              <div className="font-mono text-[11px] text-gray-400 mt-1">
                meta <span className="text-gray-700 font-semibold">{fmt(data.meta, unit)}</span>
              </div>
            )}
          </div>
        </div>

        {/* link "ver detalhes" */}
        {clickable && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-center gap-1 text-[12px] text-brand font-semibold">
            Ver detalhes <ChevronRight size={13} />
          </div>
        )}
      </div>

      {/* painel de detalhes */}
      {clickable && details && (
        <DetailPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          tag={tag}
          name={name}
          {...details}
        />
      )}
    </>
  );
}
