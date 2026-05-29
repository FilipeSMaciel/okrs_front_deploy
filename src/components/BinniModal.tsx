import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import type { BinniGrupoDetalhe, DetalheGrife } from '../types';

const GRUPOS_ARMACAO = ['Armação Acetato', 'Armação Metal', 'Solar Acetato', 'Solar Metal'] as const;
type GrupoKey = typeof GRUPOS_ARMACAO[number];

// Últimas cor = "Outras" (cinza)
const SLICE_COLORS = ['#CB0C13', '#E8545A', '#F4A04A', '#C97700', '#6366F1', '#0EA5E9', '#14B8A6', '#10B981', '#D1D5DB'];

function fmtR$(v: number) {
  return v.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
}

interface Props {
  open:               boolean;
  onClose:            () => void;
  tag:                string;
  name:               string;
  valorBinni:         number;
  valorTotalArmacoes: number;
  outras:             { pct: number; valor: number } | null;
  detalhes:           DetalheGrife[];
  porGrupo:           Record<string, BinniGrupoDetalhe> | null;
}

export function BinniModal({
  open, onClose, tag, name,
  valorBinni, valorTotalArmacoes, detalhes, porGrupo,
}: Props) {
  const [activeGroups, setActiveGroups] = useState<GrupoKey[]>([...GRUPOS_ARMACAO]);

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

  const hasPerGroup = porGrupo != null && Object.keys(porGrupo).length > 0;

  function toggleGroup(g: GrupoKey) {
    setActiveGroups(prev =>
      prev.includes(g)
        ? prev.length > 1 ? prev.filter(x => x !== g) : prev   // mínimo 1
        : [...prev, g]
    );
  }

  const { filteredTotal, filteredBinni, filteredItems } = useMemo(() => {
    if (!hasPerGroup || !porGrupo) {
      return {
        filteredTotal: valorTotalArmacoes,
        filteredBinni: valorBinni,
        filteredItems: detalhes.map(d => ({ grife: d.grife, valor: d.valor })),
      };
    }
    let fTotal = 0, fBinni = 0;
    const map = new Map<string, number>();
    for (const g of activeGroups) {
      const d = porGrupo[g];
      if (!d) continue;
      fTotal += d.valorTotal;
      fBinni += d.valorBinni;
      for (const item of d.items) {
        map.set(item.grife, (map.get(item.grife) ?? 0) + item.valor);
      }
    }
    return {
      filteredTotal: +fTotal.toFixed(2),
      filteredBinni: +fBinni.toFixed(2),
      filteredItems: [...map.entries()]
        .map(([grife, valor]) => ({ grife, valor: +valor.toFixed(2) }))
        .sort((a, b) => b.valor - a.valor),
    };
  }, [activeGroups, porGrupo, hasPerGroup, valorBinni, valorTotalArmacoes, detalhes]);

  const filteredOutras = +(filteredTotal - filteredBinni).toFixed(2);
  const filteredPct    = filteredTotal > 0 ? +((filteredBinni / filteredTotal) * 100).toFixed(1) : 0;
  const maxValor       = filteredItems[0]?.valor || 1;

  const pieData = useMemo(() => {
    const segs = filteredItems.map((item, i) => ({
      name:  item.grife,
      value: item.valor,
      pct:   filteredTotal > 0 ? +((item.valor / filteredTotal) * 100).toFixed(1) : 0,
      color: SLICE_COLORS[i % (SLICE_COLORS.length - 1)],
    }));
    if (filteredOutras > 0.01) {
      segs.push({
        name:  'Outras',
        value: filteredOutras,
        pct:   filteredTotal > 0 ? +((filteredOutras / filteredTotal) * 100).toFixed(1) : 0,
        color: SLICE_COLORS[SLICE_COLORS.length - 1],
      });
    }
    return segs;
  }, [filteredItems, filteredTotal, filteredOutras]);

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

          {/* Group filter chips */}
          <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap shrink-0">
            <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mr-1">Grupos</span>
            {GRUPOS_ARMACAO.map(g => {
              const active  = activeGroups.includes(g);
              const isSolar = g.startsWith('Solar');
              return (
                <button
                  key={g}
                  onClick={() => hasPerGroup && toggleGroup(g)}
                  disabled={!hasPerGroup}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-semibold border transition-all ${
                    !hasPerGroup
                      ? 'opacity-40 cursor-not-allowed bg-gray-50 text-gray-400 border-gray-200'
                      : active
                        ? isSolar
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-brand-tint text-brand border-brand/20'
                        : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    active ? (isSolar ? 'bg-amber-500' : 'bg-brand') : 'bg-gray-300'
                  }`} />
                  {g}
                </button>
              );
            })}
            {!hasPerGroup && (
              <span className="text-[11px] text-gray-400 ml-1 italic">recalcule para habilitar o filtro</span>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-1 min-h-0 overflow-hidden">

            {/* ── Esquerda: gráfico de pizza ── */}
            <div className="w-[300px] shrink-0 flex flex-col items-center justify-center border-r border-gray-100 py-6 gap-4">

              {/* Donut com overlay de texto */}
              <div className="relative" style={{ width: 260, height: 260 }}>
                <PieChart width={260} height={260}>
                  <Pie
                    data={pieData}
                    cx={130}
                    cy={130}
                    innerRadius={72}
                    outerRadius={118}
                    paddingAngle={pieData.length > 1 ? 2 : 0}
                    dataKey="value"
                    strokeWidth={0}
                    isAnimationActive={true}
                    animationBegin={0}
                    animationDuration={400}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={pieData[i].color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => {
                      if (value == null) return ['—', name];
                      const seg = pieData.find(d => d.name === name);
                      return [`${fmtR$(Number(value))} · ${seg?.pct.toFixed(1) ?? 0}%`, name];
                    }}
                    contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#374151', fontWeight: 600 }}
                    labelStyle={{ display: 'none' }}
                  />
                </PieChart>

                {/* Centro do donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                  <span className="text-[30px] font-bold text-ink leading-none">{filteredPct}%</span>
                  <span className="text-[11px] text-gray-400 mt-1.5">Binni / Volt</span>
                </div>
              </div>

              {/* Legenda */}
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 px-3">
                {pieData.map((seg, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className="text-[10.5px] text-gray-500 whitespace-nowrap max-w-[100px] truncate" title={seg.name}>
                      {seg.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Direita: lista + totais ── */}
            <div className="flex-1 flex flex-col min-w-0">

              {/* Cabeçalho da lista */}
              <div className="px-5 pt-4 pb-2 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider text-gray-400 shrink-0">
                <span>Item</span>
                <div className="flex gap-4">
                  <span className="w-20 text-right">Faturamento</span>
                  <span className="w-12 text-right">% total</span>
                </div>
              </div>

              {/* Linhas */}
              <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3.5">
                {pieData.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-10">Sem dados disponíveis</p>
                ) : pieData.map((seg, i) => (
                  <div key={seg.name + i}>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="text-[13px] font-medium text-ink flex-1 truncate" title={seg.name}>
                        {seg.name}
                      </span>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="font-mono text-[12px] text-gray-500 w-20 text-right">{fmtR$(seg.value)}</span>
                        <span className="text-[12px] font-semibold text-ink w-12 text-right">{seg.pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden ml-5">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${(seg.value / maxValor) * 100}%`, backgroundColor: seg.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Rodapé: totais */}
              <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 space-y-2.5 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-ink">Total Binni / Volt</span>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[12px] text-gray-500 w-20 text-right">{fmtR$(filteredBinni)}</span>
                    <span className="text-[13px] font-bold text-brand w-12 text-right">{filteredPct}%</span>
                  </div>
                </div>
                {filteredOutras > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-500">Outras</span>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-[12px] text-gray-400 w-20 text-right">{fmtR$(filteredOutras)}</span>
                      <span className="text-[13px] text-gray-500 w-12 text-right">
                        {filteredTotal > 0 ? (100 - filteredPct).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-[13px] text-gray-600 font-medium">Total em armações</span>
                  <span className="text-[14px] font-bold text-ink">{fmtR$(filteredTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
