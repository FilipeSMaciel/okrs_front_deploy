import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { Store, AlertTriangle, MapPin, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { getGeral, getRegioes } from '../api';
import type { GeralLoja } from '../types';

// ── Constantes ─────────────────────────────────────────────────────────────────
const METAS = {
  cartao:        { meta: 60,  invert: false, scale: 100, unit: '%'  as const },
  avista:        { meta: 40,  invert: false, scale: 100, unit: '%'  as const },
  ticket:        { meta: 350, invert: false, scale: 700, unit: 'R$' as const },
  inadimplencia: { meta: 5,   invert: true,  scale: 20,  unit: '%'  as const },
  luzter:        { meta: 85,  invert: false, scale: 100, unit: '%'  as const },
  binni:         { meta: 35,  invert: false, scale: 100, unit: '%'  as const },
  garantias:     { meta: 5,   invert: true,  scale: 20,  unit: '%'  as const },
};

type StatusCls = 'ok' | 'warn' | 'risk' | 'empty';

function getStatus(v: number | null | undefined, meta: number, invert: boolean): StatusCls {
  if (v == null) return 'empty';
  const reached = invert ? v <= meta : v >= meta;
  if (reached) return 'ok';
  const ratio = invert ? meta / Math.max(v, 0.0001) : v / Math.max(meta, 0.0001);
  return ratio >= 0.85 ? 'warn' : 'risk';
}

function fmtPct(v: number | null | undefined) {
  if (v == null) return '—';
  return `${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)}%`;
}

function fmtMoeda(v: number | null | undefined) {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const STATUS_COLOR: Record<StatusCls, string> = {
  ok:    '#138F4A',
  warn:  '#C97700',
  risk:  '#CB0C13',
  empty: '#D1D5DB',
};

// ── Score Gauge (SVG puro) ─────────────────────────────────────────────────────
function ScoreGauge({ score, total, ok }: { score: number; total: number; ok: number }) {
  const r = 44;
  const C = 2 * Math.PI * r;
  const dash = C * (score / 100);
  const color = score >= 70 ? '#138F4A' : score >= 40 ? '#C97700' : '#CB0C13';
  const bgRing = score >= 70 ? '#DCFCE7' : score >= 40 ? '#FEF3C7' : '#FEE2E2';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: 108, height: 108 }}>
        <svg width="108" height="108" viewBox="0 0 108 108">
          <circle cx="54" cy="54" r={r} fill="none" stroke={bgRing} strokeWidth="11" />
          <circle
            cx="54" cy="54" r={r}
            fill="none"
            stroke={color}
            strokeWidth="11"
            strokeDasharray={`${dash} ${C}`}
            strokeLinecap="round"
            transform="rotate(-90 54 54)"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[24px] font-extrabold leading-none" style={{ color }}>{score}%</span>
          <span className="text-[9px] text-gray-400 uppercase tracking-wide mt-0.5">no alvo</span>
        </div>
      </div>
      <div className="text-[11px] text-gray-500 font-medium">
        {ok}/{total} KRs
      </div>
    </div>
  );
}

// ── Mini barra de KR ───────────────────────────────────────────────────────────
function KrMiniBar({
  label, value, meta, unit, scale, invert,
}: {
  label:  string;
  value:  number | null | undefined;
  meta:   number;
  unit:   '%' | 'R$';
  scale:  number;
  invert: boolean;
}) {
  const status = getStatus(value, meta, invert);
  const color  = STATUS_COLOR[status];
  const fillPct = value != null ? Math.min(100, (value / scale) * 100) : 0;
  const fmtVal  = unit === '%' ? fmtPct(value) : fmtMoeda(value);
  const fmtMeta = unit === '%' ? `${meta}%` : fmtMoeda(meta);

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[10px] text-gray-500 w-16 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-0">
        {value != null && (
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${fillPct}%`, backgroundColor: color }}
          />
        )}
      </div>
      <span className="text-[11px] font-semibold w-14 text-right shrink-0" style={{ color: value != null ? color : '#D1D5DB' }}>
        {fmtVal}
      </span>
      <span className="text-[10px] text-gray-300 w-12 text-right shrink-0 hidden sm:block">
        /{fmtMeta}
      </span>
    </div>
  );
}

// ── Métricas consolidadas ──────────────────────────────────────────────────────
interface RegionMetrics {
  faturamento: number; vendas: number;
  cartao: number | null; avista: number | null; ticket: number | null;
  inadimplencia: number | null; luzter: number | null; binni: number | null; garantias: number | null;
  score: number; okCount: number; krCount: number;
  lojasCriticas: number; semDados: number;
}

function calcMetrics(lojas: GeralLoja[]): RegionMetrics {
  let fat = 0, vendas = 0;
  let sumC = 0, cC = 0, sumA = 0, cA = 0, sumT = 0, cT = 0;
  let sumI = 0, cI = 0, sumL = 0, cL = 0, sumB = 0, cB = 0, sumG = 0, cG = 0;
  let okTotal = 0, krTotal = 0, criticas = 0, semDados = 0;

  for (const l of lojas) {
    const fin = l.financeiro, op = l.operacional;
    if (!fin && !op) { semDados++; continue; }
    if (fin) {
      fat += fin.valorTotal ?? 0; vendas += fin.totalVendas ?? 0;
      if (fin.cartaoPct.atual    != null) { sumC += fin.cartaoPct.atual;    cC++; }
      if (fin.avistaPct.atual    != null) { sumA += fin.avistaPct.atual;    cA++; }
      if (fin.ticketMedio.atual  != null) { sumT += fin.ticketMedio.atual;  cT++; }
      if (fin.inadimplencia.atual!= null) { sumI += fin.inadimplencia.atual;cI++; }
    }
    if (op) {
      if (op.luzter.atual != null) { sumL += op.luzter.atual; cL++; }
      if (op.binni.atual  != null) { sumB += op.binni.atual;  cB++; }
      if (op.garantiasCancelamentos.atual != null) { sumG += op.garantiasCancelamentos.atual; cG++; }
    }
    const krs = [
      fin && fin.cartaoPct.atual    != null ? getStatus(fin.cartaoPct.atual,     METAS.cartao.meta,        false) : null,
      fin && fin.avistaPct.atual    != null ? getStatus(fin.avistaPct.atual,     METAS.avista.meta,        false) : null,
      fin && fin.ticketMedio.atual  != null ? getStatus(fin.ticketMedio.atual,   METAS.ticket.meta,        false) : null,
      fin && fin.inadimplencia.atual!= null ? getStatus(fin.inadimplencia.atual, METAS.inadimplencia.meta, true)  : null,
      op  && op.luzter.atual        != null ? getStatus(op.luzter.atual,         METAS.luzter.meta,        false) : null,
      op  && op.binni.atual         != null ? getStatus(op.binni.atual,          METAS.binni.meta,         false) : null,
      op  && op.garantiasCancelamentos.atual != null ? getStatus(op.garantiasCancelamentos.atual, METAS.garantias.meta, true) : null,
    ];
    for (const k of krs) {
      if (k === null) continue;
      krTotal++;
      if (k === 'ok')   okTotal++;
      if (k === 'risk') criticas++;
    }
  }

  const score = krTotal > 0 ? Math.round((okTotal / krTotal) * 100) : 0;
  return {
    faturamento: fat, vendas,
    cartao: cC ? sumC / cC : null, avista: cA ? sumA / cA : null,
    ticket: cT ? sumT / cT : null, inadimplencia: cI ? sumI / cI : null,
    luzter: cL ? sumL / cL : null, binni: cB ? sumB / cB : null,
    garantias: cG ? sumG / cG : null,
    score, okCount: okTotal, krCount: krTotal,
    lojasCriticas: criticas, semDados,
  };
}

// ── Linha de loja (tabela expandida) ──────────────────────────────────────────
function LojaRow({ loja, onSelect }: { loja: GeralLoja; onSelect: () => void }) {
  const fin = loja.financeiro, op = loja.operacional;
  const krs = [
    { v: fmtPct(fin?.cartaoPct?.atual),              s: getStatus(fin?.cartaoPct?.atual,              METAS.cartao.meta,        false) },
    { v: fmtPct(fin?.avistaPct?.atual),              s: getStatus(fin?.avistaPct?.atual,              METAS.avista.meta,        false) },
    { v: fin?.ticketMedio?.atual != null ? fmtMoeda(fin.ticketMedio.atual) : '—', s: getStatus(fin?.ticketMedio?.atual, METAS.ticket.meta, false) },
    { v: fmtPct(fin?.inadimplencia?.atual),          s: getStatus(fin?.inadimplencia?.atual,          METAS.inadimplencia.meta, true)  },
    { v: fmtPct(op?.luzter?.atual),                  s: getStatus(op?.luzter?.atual,                  METAS.luzter.meta,        false) },
    { v: fmtPct(op?.binni?.atual),                   s: getStatus(op?.binni?.atual,                   METAS.binni.meta,         false) },
    { v: fmtPct(op?.garantiasCancelamentos?.atual),  s: getStatus(op?.garantiasCancelamentos?.atual,  METAS.garantias.meta,     true)  },
  ];

  return (
    <tr onClick={onSelect} className="hover:bg-gray-50 cursor-pointer transition-colors group">
      <td className="px-4 py-2.5 sticky left-0 bg-white group-hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <Store size={12} className="text-brand shrink-0" />
          <div>
            <div className="text-[12px] font-semibold text-ink">{loja.name}</div>
            <div className="text-[10px] text-gray-400">{loja.cidade}</div>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-[12px] font-semibold text-ink whitespace-nowrap">
        {fin ? fmtMoeda(fin.valorTotal) : '—'}
        {fin?.totalVendas != null && <div className="text-[10px] text-gray-400 font-mono">{fin.totalVendas}v</div>}
      </td>
      {!fin && !op ? (
        <td colSpan={7} className="px-3 py-2.5 text-[11px] text-gray-300 italic">sem dados</td>
      ) : krs.map((kr, i) => (
        <td key={i} className="px-2 py-2.5">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{
              backgroundColor: kr.s === 'ok' ? '#DCFCE7' : kr.s === 'warn' ? '#FEF3C7' : kr.s === 'risk' ? '#FEE2E2' : '#F9FAFB',
              color: STATUS_COLOR[kr.s],
            }}
          >
            {kr.v}
          </span>
        </td>
      ))}
    </tr>
  );
}

// ── Card de região (score card visual) ────────────────────────────────────────
function RegionCard({ nome, lojas, onSelectStore }: {
  nome: string; lojas: GeralLoja[]; onSelectStore: (cnpj: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const m = useMemo(() => calcMetrics(lojas), [lojas]);

  const KR_BARS = [
    { label: 'Cartão',    ...METAS.cartao,        value: m.cartao        },
    { label: 'À Vista',   ...METAS.avista,         value: m.avista        },
    { label: 'Ticket',    ...METAS.ticket,         value: m.ticket        },
    { label: 'Inadimpl.', ...METAS.inadimplencia,  value: m.inadimplencia },
    { label: 'Luzter',    ...METAS.luzter,         value: m.luzter        },
    { label: 'Binni',     ...METAS.binni,          value: m.binni         },
    { label: 'Garantias', ...METAS.garantias,      value: m.garantias     },
  ];

  const scoreColor = m.score >= 70 ? '#138F4A' : m.score >= 40 ? '#C97700' : '#CB0C13';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* ── Cabeçalho clicável ── */}
      <div className="px-5 pt-5 pb-4">

        {/* Linha 1: nome + faturamento */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-brand/10 rounded-xl flex items-center justify-center shrink-0">
              <MapPin size={14} className="text-brand" />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-bold text-ink truncate">{nome}</div>
              <div className="text-[11px] text-gray-400">
                {lojas.length} {lojas.length === 1 ? 'loja' : 'lojas'}
                {m.semDados > 0 && <span className="ml-1.5 text-gray-300">· {m.semDados} sem dados</span>}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[15px] font-bold text-ink">{fmtMoeda(m.faturamento)}</div>
            <div className="text-[10px] text-gray-400 font-mono">{m.vendas} vendas</div>
          </div>
        </div>

        {/* Linha 2: gauge + KR bars */}
        <div className="flex gap-5 items-start">

          {/* Score gauge */}
          <div className="shrink-0">
            <ScoreGauge score={m.score} total={m.krCount} ok={m.okCount} />
          </div>

          {/* KR bars */}
          <div className="flex-1 flex flex-col gap-1.5 min-w-0 pt-1">
            {KR_BARS.map(kr => (
              <KrMiniBar key={kr.label} {...kr} />
            ))}
          </div>
        </div>

        {/* Linha 3: alerta + botão ver lojas */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3">
            {m.lojasCriticas > 0 && (
              <div className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#CB0C13' }}>
                <AlertTriangle size={11} />
                {m.lojasCriticas} KR{m.lojasCriticas !== 1 ? 's' : ''} em risco
              </div>
            )}
            {m.lojasCriticas === 0 && m.score > 0 && (
              <div className="text-[11px] font-semibold" style={{ color: scoreColor }}>
                {m.score >= 70 ? '✓ Região no alvo' : m.score >= 40 ? 'Em andamento' : 'Atenção necessária'}
              </div>
            )}
          </div>
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-brand hover:text-brand-deep transition-colors"
          >
            {open ? 'Ocultar lojas' : `Ver lojas (${lojas.length})`}
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        </div>
      </div>

      {/* ── Tabela de lojas expandida ── */}
      {open && (
        <div className="border-t border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Loja', 'Faturamento', 'Cartão', 'À Vista', 'Ticket', 'Inadimpl.', 'Luzter', 'Binni', 'Garantias'].map((h, i) => (
                    <th key={h} className={`${i === 0 ? 'px-4' : 'px-2'} py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lojas.map(l => (
                  <LojaRow key={l.cnpj} loja={l} onSelect={() => onSelectStore(l.cnpj)} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
interface Props {
  trimestre: string;
  onSelectStore: (cnpj: string) => void;
}

export function RegionalPage({ trimestre, onSelectStore }: Props) {
  const { data: geralData, isFetching: geralFetching, refetch } = useQuery({
    queryKey: ['geral', trimestre],
    queryFn:  () => getGeral(trimestre),
    staleTime: 5 * 60 * 1000,
  });

  const { data: regioes, isFetching: regioesFetching } = useQuery({
    queryKey: ['regioes'],
    queryFn:  getRegioes,
    staleTime: 10 * 60 * 1000,
  });

  const lojasPorCnpj = useMemo(() => {
    const map: Record<string, GeralLoja> = {};
    for (const l of geralData?.lojas ?? []) map[l.cnpj] = l;
    return map;
  }, [geralData]);

  const grupoMetrics = useMemo(() => calcMetrics(geralData?.lojas ?? []), [geralData]);

  const cnpjsComRegiao = useMemo(() => {
    const s = new Set<string>();
    for (const r of regioes ?? []) for (const l of r.lojas) s.add(l.cnpj);
    return s;
  }, [regioes]);

  const lojasOrfas = useMemo(
    () => (geralData?.lojas ?? []).filter(l => !cnpjsComRegiao.has(l.cnpj)),
    [geralData, cnpjsComRegiao]
  );

  const isLoading = geralFetching || regioesFetching;

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 mb-1.5">
            {trimestre} · Visão regional
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-bold text-ink leading-tight">Comparativo por Região</h1>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2 bg-brand text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-brand-deep transition-colors disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* KPI strip do grupo */}
      <div className="bg-brand text-white rounded-2xl grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 overflow-hidden shadow-md">
        {[
          { label: 'Faturamento',  value: fmtMoeda(grupoMetrics.faturamento),                               hide: false },
          { label: 'Inadimpl.',    value: fmtPct(grupoMetrics.inadimplencia),                                hide: false },
          { label: 'Cartão',       value: fmtPct(grupoMetrics.cartao),                                       hide: false },
          { label: 'Ticket Médio', value: grupoMetrics.ticket != null ? fmtMoeda(grupoMetrics.ticket) : '—', hide: false },
          { label: 'Total Vendas', value: grupoMetrics.vendas > 0 ? String(grupoMetrics.vendas) : '—',       hide: true  },
          { label: 'Luzter',       value: fmtPct(grupoMetrics.luzter),                                       hide: true  },
          { label: 'Binni',        value: fmtPct(grupoMetrics.binni),                                        hide: true  },
        ].map((item, i) => {
          const border =
            i === 0 ? 'border-r border-b sm:border-b-0 border-white/20' :
            i === 1 ? 'border-b sm:border-b-0 sm:border-r border-white/20' :
            i === 2 ? 'border-r sm:border-r border-white/20' :
            i < 6   ? 'sm:border-r border-white/20' : '';
          return (
            <div key={item.label} className={`px-4 py-4 text-center ${border} ${item.hide ? 'hidden lg:block' : ''}`}>
              <div className="text-[20px] sm:text-[22px] font-extrabold leading-none tracking-tight">{item.value}</div>
              <div className="text-[10px] uppercase tracking-[0.14em] opacity-80 mt-1.5 font-semibold">{item.label}</div>
            </div>
          );
        })}
      </div>

      {/* Score cards */}
      {isLoading && !regioes ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 h-64 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(regioes ?? []).map(r => {
            const lojasRegiao = r.lojas.map(l => lojasPorCnpj[l.cnpj]).filter(Boolean) as GeralLoja[];
            return (
              <RegionCard key={r.id} nome={r.nome} lojas={lojasRegiao} onSelectStore={onSelectStore} />
            );
          })}
          {lojasOrfas.length > 0 && (
            <RegionCard nome="Sem região definida" lojas={lojasOrfas} onSelectStore={onSelectStore} />
          )}
        </div>
      )}

      {(regioes ?? []).length === 0 && lojasOrfas.length === 0 && !isLoading && (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center text-gray-400">
          <MapPin size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma região cadastrada.</p>
          <p className="text-[12px] mt-1">Crie regiões na aba Configurações para usar esta visão.</p>
        </div>
      )}
    </div>
  );
}
