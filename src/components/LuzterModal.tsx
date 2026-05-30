import { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import type { DetalheLente } from '../types';

const SLICE_COLORS = ['#CB0C13', '#E8545A', '#F4A04A', '#C97700', '#6366F1', '#0EA5E9', '#14B8A6', '#10B981', '#D1D5DB'];

function fmtR$(v: number) {
  return v.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
}

interface Props {
  open:             boolean;
  onClose:          () => void;
  tag:              string;
  name:             string;
  valorLuzter:      number;
  valorTotalLentes: number;
  outras:           { pct: number; valor: number } | null;
  detalhes:         DetalheLente[];
}

export function LuzterModal({
  open, onClose, tag, name,
  valorLuzter, valorTotalLentes, outras, detalhes,
}: Props) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const pct = valorTotalLentes > 0 ? +((valorLuzter / valorTotalLentes) * 100).toFixed(1) : 0;
  const outrasValor = outras?.valor ?? +(valorTotalLentes - valorLuzter).toFixed(2);
  const maxValor = detalhes[0]?.valor || 1;

  const pieData = useMemo(() => {
    const segs = detalhes.map((item, i) => ({
      name:  item.referencia,
      value: item.valor,
      pct:   item.pct,
      color: SLICE_COLORS[i % (SLICE_COLORS.length - 1)],
    }));
    if (outrasValor > 0.01) {
      segs.push({
        name:  'Outras',
        value: outrasValor,
        pct:   valorTotalLentes > 0 ? +((outrasValor / valorTotalLentes) * 100).toFixed(1) : 0,
        color: SLICE_COLORS[SLICE_COLORS.length - 1],
      });
    }
    return segs;
  }, [detalhes, outrasValor, valorTotalLentes]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-[820px] max-h-[88vh] flex flex-col pointer-events-auto">

          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4 shrink-0">
            <div>
              <div className="text-[10.5px] font-bold tracking-widest uppercase text-brand">{tag}</div>
              <h2 className="text-[20px] font-bold text-ink mt-0.5">{name}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-ink transition-colors shrink-0"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content
              Mobile : scroll único (tudo flui junto)
              Desktop: split — gráfico fixo | lista com scroll próprio */}
          <div className="flex-1 overflow-y-auto sm:overflow-hidden min-h-0">
            <div className="flex flex-col sm:flex-row sm:h-full">

              {/* ── Gráfico ── */}
              <div className="w-full sm:w-[260px] sm:shrink-0 flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-gray-100 py-4 gap-3">
                <div className="relative" style={{ width: 200, height: 200 }}>
                  <PieChart width={200} height={200}>
                    <Pie
                      data={pieData} cx={100} cy={100}
                      innerRadius={56} outerRadius={90}
                      paddingAngle={pieData.length > 1 ? 2 : 0}
                      dataKey="value" strokeWidth={0}
                      isAnimationActive animationBegin={0} animationDuration={400}
                    >
                      {pieData.map((_, i) => <Cell key={i} fill={pieData[i].color} />)}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any) => {
                        const seg = pieData.find(d => d.name === name);
                        return [`${fmtR$(Number(value))} · ${seg?.pct.toFixed(1) ?? 0}%`, name];
                      }}
                      contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
                      itemStyle={{ color: '#374151', fontWeight: 600 }}
                      labelStyle={{ display: 'none' }}
                    />
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                    <span className="text-[28px] font-bold text-ink leading-none">{pct}%</span>
                    <span className="text-[11px] text-gray-400 mt-1">Luzter</span>
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 px-3">
                  {pieData.map((seg, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="text-[10px] text-gray-500 whitespace-nowrap max-w-[90px] truncate" title={seg.name}>{seg.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Lista + totais ── */}
              <div className="flex-1 flex flex-col sm:min-h-0 min-w-0">
                {/* Cabeçalho */}
                <div className="px-4 pt-3 pb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-gray-400 sm:shrink-0">
                  <span>Referência</span>
                  <div className="flex gap-3">
                    <span className="w-20 text-right">Faturamento</span>
                    <span className="w-10 text-right">%</span>
                  </div>
                </div>

                {/* Linhas */}
                <div className="sm:flex-1 sm:overflow-y-auto px-4 pb-3 space-y-3">
                  {pieData.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-8">Sem dados</p>
                  ) : pieData.map((seg, i) => (
                    <div key={seg.name + i}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                        <span className="text-[12px] font-medium text-ink flex-1 truncate" title={seg.name}>{seg.name}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-[11px] text-gray-500 w-20 text-right">{fmtR$(seg.value)}</span>
                          <span className="text-[11px] font-semibold text-ink w-10 text-right">{seg.pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden ml-4">
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(seg.value / maxValor) * 100}%`, backgroundColor: seg.color }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rodapé */}
                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 space-y-2 sm:shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-ink">Total Luzter</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-gray-500 w-20 text-right">{fmtR$(valorLuzter)}</span>
                      <span className="text-[12px] font-bold text-brand w-10 text-right">{pct}%</span>
                    </div>
                  </div>
                  {outrasValor > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-gray-500">Outras</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-gray-400 w-20 text-right">{fmtR$(outrasValor)}</span>
                        <span className="text-[12px] text-gray-500 w-10 text-right">{valorTotalLentes > 0 ? (100 - pct).toFixed(1) : 0}%</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-[12px] text-gray-600 font-medium">Total em lentes</span>
                    <span className="text-[13px] font-bold text-ink">{fmtR$(valorTotalLentes)}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
