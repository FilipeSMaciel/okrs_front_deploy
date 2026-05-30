import { useQuery } from '@tanstack/react-query';
import { LogIn, Users, Store, Edit3, TrendingUp, Clock } from 'lucide-react';
import { getAnalytics } from '../api';

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function fmtDatetime(dateStr: string) {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function fmtMeta(payload: unknown): string {
  const p = payload as any;
  if (!p?.metas) return '';
  const m = p.metas;
  const parts: string[] = [];
  if (m.cartaoMeta      !== undefined) parts.push(`Cartão ${m.cartaoMeta}%`);
  if (m.avistaMeta      !== undefined) parts.push(`À Vista ${m.avistaMeta}%`);
  if (m.ticketMeta      !== undefined) parts.push(`Ticket R$${m.ticketMeta}`);
  if (m.inadimplenciaMeta !== undefined) parts.push(`Inad. ${m.inadimplenciaMeta}%`);
  if (m.garantiasMeta   !== undefined) parts.push(`Garantias ${m.garantiasMeta}%`);
  if (m.luzterMeta      !== undefined) parts.push(`Luzter ${m.luzterMeta}%`);
  if (m.binniMeta       !== undefined) parts.push(`Binni ${m.binniMeta}%`);
  return parts.join(' · ');
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number | undefined; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className={`flex items-center gap-2 mb-3 ${color}`}>
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      {value === undefined ? (
        <div className="h-9 bg-gray-100 rounded animate-pulse w-16" />
      ) : (
        <div className="text-[36px] font-extrabold text-ink leading-none">{value}</div>
      )}
    </div>
  );
}

export function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey:       ['analytics'],
    queryFn:        getAnalytics,
    staleTime:      2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const maxLogins = Math.max(...(data?.loginsPorDia.map(d => d.total) ?? []), 1);
  const maxAcessos = data?.rankingLojas[0]?.acessos ?? 1;

  return (
    <div>
      <div className="mb-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 mb-1.5">
          Administração · Sistema
        </div>
        <h1 className="text-[28px] font-bold text-ink">Painel de Atividades</h1>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard
          icon={<LogIn size={15} />} label="Logins (7 dias)"
          value={isLoading ? undefined : data?.totalLogins7d} color="text-brand"
        />
        <StatCard
          icon={<Users size={15} />} label="Ativos hoje"
          value={isLoading ? undefined : data?.ativosHoje} color="text-ok"
        />
        <StatCard
          icon={<Store size={15} />} label="Lojas acessadas"
          value={isLoading ? undefined : data?.rankingLojas.length} color="text-blue-500"
        />
        <StatCard
          icon={<Edit3 size={15} />} label="Metas editadas (7d)"
          value={isLoading ? undefined : data?.metaEdits7d} color="text-warn"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* Gráfico de logins por dia */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={15} className="text-brand" />
            <h2 className="text-[14px] font-bold text-ink">Logins por dia</h2>
            <span className="text-[11px] text-gray-400 ml-auto">últimos 7 dias</span>
          </div>

          {isLoading ? (
            <div className="h-36 bg-gray-50 rounded-xl animate-pulse" />
          ) : !data?.loginsPorDia.length ? (
            <div className="h-36 flex items-center justify-center text-[13px] text-gray-400">
              Nenhum login registrado ainda
            </div>
          ) : (
            <div className="flex items-end gap-2 h-36">
              {data.loginsPorDia.map(d => (
                <div key={d.data} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-bold text-ink">{d.total}</span>
                  <div
                    className="w-full bg-brand rounded-t-lg transition-all"
                    style={{ height: `${Math.max(6, (d.total / maxLogins) * 96)}px` }}
                  />
                  <span className="text-[9px] text-gray-400 text-center leading-tight truncate w-full">
                    {fmtDate(d.data)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ranking de lojas */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <Store size={15} className="text-blue-500" />
            <h2 className="text-[14px] font-bold text-ink">Lojas com mais logins</h2>
            <span className="text-[11px] text-gray-400 ml-auto">últimos 7 dias</span>
          </div>

          {isLoading ? (
            <div className="space-y-2.5">
              {[0, 1, 2, 3].map(i => <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : !data?.rankingLojas.length ? (
            <div className="h-36 flex items-center justify-center text-[13px] text-gray-400">
              Nenhum login de loja registrado ainda
            </div>
          ) : (
            <div className="space-y-2">
              {data.rankingLojas.map((l, i) => (
                <div key={l.cnpj} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-gray-400 w-4 text-right shrink-0">{i + 1}</span>
                  <div className="flex-1 relative min-w-0">
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-50 rounded-lg"
                      style={{ width: `${(l.acessos / maxAcessos) * 100}%` }}
                    />
                    <div className="relative flex items-center justify-between px-2.5 py-2">
                      <span className="text-[12px] font-semibold text-ink truncate">{l.lojaNome}</span>
                      <span className="text-[11px] font-bold text-blue-500 ml-2 shrink-0">{l.acessos} login{l.acessos !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Feed de alterações de metas */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={15} className="text-warn" />
          <h2 className="text-[14px] font-bold text-ink">Últimas alterações de metas</h2>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : !data?.recentesMetas.length ? (
          <div className="py-10 text-center text-[13px] text-gray-400">
            Nenhuma alteração de meta registrada ainda
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.recentesMetas.map(e => {
              const p = e.payload as any;
              return (
                <div key={e.id} className="py-3.5 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-warn/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Edit3 size={12} className="text-warn" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap text-[13px]">
                      <span className="font-semibold text-ink">{e.userName}</span>
                      <span className="text-gray-400">editou metas de</span>
                      <span className="font-semibold text-blue-600">{p?.lojaNome ?? '—'}</span>
                      {p?.trimestre && (
                        <span className="text-[11px] bg-gray-100 text-gray-500 font-mono px-1.5 py-0.5 rounded">
                          {p.trimestre}
                        </span>
                      )}
                    </div>
                    {fmtMeta(e.payload) && (
                      <div className="text-[11px] text-gray-500 mt-0.5">{fmtMeta(e.payload)}</div>
                    )}
                  </div>
                  <span className="text-[10.5px] text-gray-400 shrink-0 font-mono whitespace-nowrap">
                    {fmtDatetime(e.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
