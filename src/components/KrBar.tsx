import type { KrValue } from '../types';

interface Props {
  name:   string;
  data:   KrValue;
  unit:   '%' | 'R$';
  min:    number;
  max:    number;
  invert: boolean;
}

function fmt(v: number | null, unit: '%' | 'R$'): string {
  if (v === null || v === undefined) return '—';
  if (unit === 'R$') return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)) + '%';
}

function getStatus(data: KrValue, invert: boolean) {
  const { atual, meta } = data;
  if (atual === null) return { cls: 'pending', label: 'aguardando',  color: 'bg-gray-300' };
  if (meta  === null) return { cls: 'info',    label: '',            color: 'bg-gray-400'  };
  const reached = invert ? atual <= meta : atual >= meta;
  if (reached) return { cls: 'ok',   label: 'no alvo',      color: 'bg-ok' };
  const ratio = invert ? meta / Math.max(atual, 0.0001) : atual / Math.max(meta, 0.0001);
  if (ratio >= 0.85) return { cls: 'warn', label: 'em andamento', color: 'bg-warn' };
  return { cls: 'risk', label: 'atenção', color: 'bg-brand' };
}

function pct(v: number, lo: number, hi: number) {
  return Math.max(0, Math.min(1, (v - lo) / (hi - lo))) * 100;
}

export function KrBar({ name, data, unit, min, max, invert }: Props) {
  const st = getStatus(data, invert);
  const fillPct = pct(data.atual ?? 0, min, max);
  const goalPct = pct(data.meta ?? 0, min, max);
  const semMeta = data.meta === null;

  const pillBg = st.cls === 'ok'   ? 'bg-ok-soft text-ok'
               : st.cls === 'warn' ? 'bg-warn-soft text-warn'
               : st.cls === 'risk' ? 'bg-brand-tint text-brand'
               : 'bg-gray-100 text-gray-500';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[17px] font-semibold text-ink leading-tight">{name}</h3>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[30px] font-bold text-ink leading-none">{fmt(data.atual, unit)}</div>
          {!semMeta && (
            <div className="font-mono text-[11px] text-gray-400 mt-1">
              meta <span className="text-gray-700 font-semibold">{fmt(data.meta, unit)}</span>
            </div>
          )}
        </div>
      </div>

      {/* bar */}
      <div className="relative h-2.5 rounded-full bg-gray-100 mt-4">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${st.color}`}
          style={{ width: `${Math.min(fillPct, 100)}%` }}
        />
        {!semMeta && (
          <div
            className="absolute top-[-6px] bottom-[-6px] w-0 border-l-2 border-ink z-10"
            style={{ left: `${goalPct}%` }}
          >
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[9px] text-gray-500 uppercase tracking-wide whitespace-nowrap bg-white px-0.5">
              meta
            </span>
          </div>
        )}
      </div>

      {/* scale */}
      <div className="flex justify-between mt-2 font-mono text-[10.5px] text-gray-400">
        <span>{fmt(min, unit)}</span>
        <span>{fmt((min + max) / 2, unit)}</span>
        <span>{fmt(max, unit)}</span>
      </div>

      {!semMeta && (
        <div className="mt-3">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${pillBg}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {st.label}
          </span>
        </div>
      )}
    </div>
  );
}
