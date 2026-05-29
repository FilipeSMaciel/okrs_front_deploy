import { useQuery } from '@tanstack/react-query';
import { RefreshCw, TrendingUp, AlertTriangle, CheckCircle2, Clock, Store, Zap } from 'lucide-react';
import { getGeral } from '../api';
import { useState } from 'react';
import type { GeralLoja } from '../types';

// Metas (espelho das constantes da App)
const METAS = {
  cartao:       { meta: 60,  invert: false },
  avista:       { meta: 40,  invert: false },
  ticket:       { meta: 350, invert: false },
  inadimplencia:{ meta: 5,   invert: true  },
  luzter:       { meta: 85,  invert: false },
  binni:        { meta: 35,  invert: false },
  garantias:    { meta: 5,   invert: true  },
};

type StatusCls = 'ok' | 'warn' | 'risk' | 'empty';

function getStatus(atual: number | null | undefined, meta: number, invert: boolean): StatusCls {
  if (atual == null) return 'empty';
  const reached = invert ? atual <= meta : atual >= meta;
  if (reached) return 'ok';
  const ratio = invert ? meta / Math.max(atual, 0.0001) : atual / Math.max(meta, 0.0001);
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

function StatusCell({ value, status, label }: { value: string; status: StatusCls; label?: string }) {
  const bg =
    status === 'ok'    ? 'bg-ok-soft    text-ok'    :
    status === 'warn'  ? 'bg-warn-soft  text-warn'  :
    status === 'risk'  ? 'bg-brand-tint text-brand' :
    'bg-gray-50 text-gray-400';

  const dot =
    status === 'ok'   ? <CheckCircle2  size={11} className="shrink-0" /> :
    status === 'warn' ? <TrendingUp    size={11} className="shrink-0" /> :
    status === 'risk' ? <AlertTriangle size={11} className="shrink-0" /> :
    <Clock size={11} className="shrink-0 text-gray-300" />;

  return (
    <td className="px-3 py-2.5">
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-semibold ${bg}`}>
        {dot}
        <span>{label ?? value}</span>
      </div>
    </td>
  );
}

interface Props {
  trimestre:     string;
  onSelectStore: (cnpj: string) => void;
}

async function recalcularTodas(trimestre: string) {
  const token = localStorage.getItem('okrs_token');
  const base  = import.meta.env.VITE_API_URL || 'https://okrsapideploy.vercel.app';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  await Promise.all([
    fetch(`${base}/consulta/batch/${trimestre}`,    { method: 'POST', headers }),
    fetch(`${base}/operacional/batch/${trimestre}`, { method: 'POST', headers }),
  ]);
}

export function AllStoresPage({ trimestre, onSelectStore }: Props) {
  const [recalculating, setRecalculating] = useState(false);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['geral', trimestre],
    queryFn:  () => getGeral(trimestre),
    staleTime: 5 * 60 * 1000,
  });

  const lojas: GeralLoja[] = data?.lojas ?? [];

  const semDados = lojas.filter(l => !l.financeiro && !l.operacional).length;
  const comDados = lojas.length - semDados;

  async function handleRecalcularTodas() {
    setRecalculating(true);
    try {
      await recalcularTodas(trimestre);
      await refetch();
    } finally {
      setRecalculating(false);
    }
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-end justify-between gap-6 mb-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 mb-1.5">
            {trimestre} · Todas as lojas
          </div>
          <h1 className="text-[28px] font-bold text-ink leading-tight">Visão Consolidada</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-gray-400 font-mono">
            {comDados}/{lojas.length} lojas com dados
          </span>
          <button
            onClick={handleRecalcularTodas}
            disabled={recalculating || isFetching}
            className="flex items-center gap-2 bg-ink text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-ink/80 transition-colors disabled:opacity-60"
            title="Busca dados de todas as lojas via ssOtica e atualiza o cache"
          >
            <Zap size={14} className={recalculating ? 'animate-pulse' : ''} />
            {recalculating ? 'Calculando...' : 'Recalcular Todas'}
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 bg-brand text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-brand-deep transition-colors disabled:opacity-60"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap sticky left-0 bg-gray-50 min-w-[200px]">
                  Loja
                </th>
                <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                  Faturamento
                </th>
                <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                  Cartão
                </th>
                <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                  À Vista
                </th>
                <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                  Ticket
                </th>
                <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                  Inadimpl.
                </th>
                <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap border-l border-gray-200">
                  Luzter
                </th>
                <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                  Binni/Volt
                </th>
                <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                  Garantias
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isFetching && lojas.length === 0 ? (
                // Skeleton
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-5 bg-gray-100 rounded animate-pulse" style={{ width: j === 0 ? 160 : 70 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : lojas.map((loja) => {
                const fin = loja.financeiro;
                const op  = loja.operacional;
                const semInfo = !fin && !op;

                return (
                  <tr
                    key={loja.cnpj}
                    onClick={() => onSelectStore(loja.cnpj)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    {/* Loja */}
                    <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-brand/8 rounded-lg flex items-center justify-center shrink-0">
                          <Store size={13} className="text-brand" />
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-ink leading-tight">{loja.name}</div>
                          <div className="text-[11px] text-gray-400">{loja.cidade}</div>
                        </div>
                      </div>
                    </td>

                    {/* Faturamento */}
                    <td className="px-3 py-2.5">
                      <span className="text-[13px] font-semibold text-ink">
                        {fin ? fmtMoeda(fin.valorTotal) : '—'}
                      </span>
                      {fin?.totalVendas != null && (
                        <div className="text-[10px] text-gray-400 font-mono">{fin.totalVendas} vendas</div>
                      )}
                    </td>

                    {semInfo ? (
                      <td colSpan={7} className="px-3 py-2.5 text-[12px] text-gray-300 italic">
                        Sem dados em cache — visualize a loja para carregar
                      </td>
                    ) : (
                      <>
                        <StatusCell
                          value={fmtPct(fin?.cartaoPct?.atual)}
                          status={getStatus(fin?.cartaoPct?.atual, METAS.cartao.meta, METAS.cartao.invert)}
                        />
                        <StatusCell
                          value={fmtPct(fin?.avistaPct?.atual)}
                          status={getStatus(fin?.avistaPct?.atual, METAS.avista.meta, METAS.avista.invert)}
                        />
                        <StatusCell
                          value={fin?.ticketMedio?.atual != null ? fmtMoeda(fin.ticketMedio.atual) : '—'}
                          status={getStatus(fin?.ticketMedio?.atual, METAS.ticket.meta, METAS.ticket.invert)}
                        />
                        <StatusCell
                          value={fmtPct(fin?.inadimplencia?.atual)}
                          status={getStatus(fin?.inadimplencia?.atual, METAS.inadimplencia.meta, METAS.inadimplencia.invert)}
                        />
                        <td className="px-3 py-2.5 border-l border-gray-100">
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-semibold ${
                            getStatus(op?.luzter?.atual, METAS.luzter.meta, false) === 'ok'   ? 'bg-ok-soft text-ok' :
                            getStatus(op?.luzter?.atual, METAS.luzter.meta, false) === 'warn' ? 'bg-warn-soft text-warn' :
                            getStatus(op?.luzter?.atual, METAS.luzter.meta, false) === 'risk' ? 'bg-brand-tint text-brand' :
                            'bg-gray-50 text-gray-400'
                          }`}>
                            {getStatus(op?.luzter?.atual, METAS.luzter.meta, false) === 'ok'   ? <CheckCircle2 size={11} /> :
                             getStatus(op?.luzter?.atual, METAS.luzter.meta, false) === 'warn' ? <TrendingUp size={11} /> :
                             getStatus(op?.luzter?.atual, METAS.luzter.meta, false) === 'risk' ? <AlertTriangle size={11} /> :
                             <Clock size={11} className="text-gray-300" />}
                            {fmtPct(op?.luzter?.atual)}
                          </div>
                        </td>
                        <StatusCell
                          value={fmtPct(op?.binni?.atual)}
                          status={getStatus(op?.binni?.atual, METAS.binni.meta, false)}
                        />
                        <StatusCell
                          value={fmtPct(op?.garantiasCancelamentos?.atual)}
                          status={getStatus(op?.garantiasCancelamentos?.atual, METAS.garantias.meta, true)}
                        />
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {lojas.length === 0 && !isFetching && (
          <div className="py-16 text-center text-gray-400">
            <Store size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum dado disponível.</p>
          </div>
        )}
      </div>

      <p className="mt-4 text-[11px] text-gray-400">
        Dados exibidos a partir do cache do banco. Clique em uma loja para ver os detalhes e atualizar os dados.
      </p>
    </div>
  );
}
