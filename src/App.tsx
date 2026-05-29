import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ChevronDown, LogOut, LayoutGrid, Store, Users, Target } from 'lucide-react';
import { getDashboard, getOperacional } from './api';
import { KrBar } from './components/KrBar';
import { KrRing } from './components/KrRing';
import { MetasDrawer } from './components/MetasDrawer';
import { BinniModal } from './components/BinniModal';
import { LuzterModal } from './components/LuzterModal';
import { LoginPage } from './pages/LoginPage';
import { AllStoresPage } from './pages/AllStoresPage';
import { UsersPage } from './pages/UsersPage';
import { useAuth } from './contexts/AuthContext';
import type { Loja } from './types';

// ── Helpers de trimestre ──────────────────────────────────────────────────────
function getCurrentTrimestre(): string {
  const d = new Date();
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `${q}T${String(d.getFullYear()).slice(-2)}`;
}

function getTrimestreOptions(): string[] {
  const d = new Date();
  const opts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const ref = new Date(d.getFullYear(), d.getMonth() - i * 3, 1);
    const q   = Math.ceil((ref.getMonth() + 1) / 3);
    opts.push(`${q}T${String(ref.getFullYear()).slice(-2)}`);
  }
  return opts; // mais recente primeiro
}

function fmtTrimestreLabel(t: string): string {
  const m = t.match(/^(\d)T(\d{2})$/);
  if (!m) return t;
  const ord = ['1º', '2º', '3º', '4º'][parseInt(m[1]) - 1] ?? `${m[1]}º`;
  return `${ord} Tri · 20${m[2]}`;
}

function fmtTrimestreHeader(t: string): string {
  const m = t.match(/^(\d)T(\d{2})$/);
  if (!m) return t;
  const ord = ['1º', '2º', '3º', '4º'][parseInt(m[1]) - 1] ?? `${m[1]}º`;
  return `${ord} Trimestre · 20${m[2]}`;
}

const STORES: Loja[] = [
  { sigla: 'SLS',   name: 'Bilharva São Lourenço',    cnpj: '04.720.838/0002-91' },
  { sigla: 'BPM',   name: 'Bilharva Pinheiro Machado', cnpj: '04.720.838/0004-53' },
  { sigla: 'STB',   name: 'Santa Clara Bagé',          cnpj: '04.720.838/0005-34' },
  { sigla: 'VBP',   name: 'Veja Bem Pelotas',          cnpj: '04.720.838/0007-04' },
  { sigla: 'STP',   name: 'Santa Clara Pelotas',       cnpj: '04.720.838/0008-87' },
  { sigla: 'BDP',   name: 'Bilharva Dom Pedrito',      cnpj: '04.720.838/0010-00' },
  { sigla: 'BiPel', name: 'Bilharva Pelotas',          cnpj: '04.720.838/0011-82' },
  { sigla: 'AR',    name: 'Bilharva Arroio Grande',    cnpj: '04.720.838/0012-63' },
  { sigla: 'VBB',   name: 'Veja Bem Bagé',             cnpj: '04.720.838/0013-44' },
  { sigla: 'FNX',   name: 'Fênix Pelotas',             cnpj: '04.720.838/0016-97' },
  { sigla: 'BC',    name: 'Bilharva Candiota',         cnpj: '04.720.838/0015-06' },
  { sigla: 'BBG',   name: 'Bilharva Bagé',             cnpj: '36.524.202/0001-80' },
  { sigla: 'KP',    name: 'Karisma Pelotas',           cnpj: '93.964.575/0001-05' },
  { sigla: 'JG',    name: 'Bilharva Jaguarão',         cnpj: '08.983.494/0001-83' },
  { sigla: 'SKN',   name: 'Skina Pelotas',             cnpj: '07.184.680/0001-90' },
  { sigla: 'VLT',   name: 'Voluntários Pelotas',       cnpj: '17.640.235/0002-21' },
];

const META_GARANTIAS = 5;
const META_LUZTER    = 85;
const META_BINNI     = 35;

function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtTs() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

type Tab = 'loja' | 'geral' | 'usuarios';

export default function App() {
  const { user } = useAuth();

  // Se não autenticado, mostra login
  if (!user) return <LoginPage />;

  return <Dashboard />;
}

function Dashboard() {
  const { user, logout, isAdmin } = useAuth();

  const canSeeAllStores = isAdmin('ADMIN_3');
  const canEditMetas    = isAdmin('ADMIN_2');
  const canManageUsers  = isAdmin('ADMIN_1');
  const isRegional      = user?.type === 'REGIONAL';

  // Lojas visíveis: REGIONAL vê só as suas; demais veem todas
  const visibleStores = isRegional && user.lojas?.length
    ? STORES.filter(s => user.lojas.some(l => l.cnpj === s.cnpj))
    : STORES;

  // Loja inicial
  const getInitialStoreIdx = () => {
    if (user?.type === 'USER' && user.loja) {
      const idx = visibleStores.findIndex(s => s.cnpj === user.loja!.cnpj);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  };

  const [tab,            setTab]            = useState<Tab>('loja');
  const [storeIdx,       setStoreIdx]       = useState(getInitialStoreIdx);
  const [dropdownOpen,   setDropdownOpen]   = useState(false);
  const [trimDropOpen,   setTrimDropOpen]   = useState(false);
  const [lastTs,         setLastTs]         = useState(fmtTs());
  const [metasOpen,       setMetasOpen]       = useState(false);
  const [binniModalOpen,  setBinniModalOpen]  = useState(false);
  const [luzterModalOpen, setLuzterModalOpen] = useState(false);
  const [trimestre,      setTrimestre]      = useState(getCurrentTrimestre);
  const qc = useQueryClient();

  const store = visibleStores[storeIdx] ?? visibleStores[0];
  const trimOpts = getTrimestreOptions();

  const { data, isFetching } = useQuery({
    queryKey: ['dashboard', store.cnpj, trimestre],
    queryFn:  () => getDashboard(store.cnpj, trimestre),
    staleTime: 5 * 60 * 1000,
  });

  const { data: opData, isFetching: opFetching } = useQuery({
    queryKey: ['operacional', store.cnpj, trimestre],
    queryFn:  () => getOperacional(store.cnpj, trimestre),
    staleTime: 5 * 60 * 1000,
  });

  function handleRefresh() {
    Promise.all([
      qc.fetchQuery({ queryKey: ['dashboard',   store.cnpj, trimestre], queryFn: () => getDashboard(store.cnpj,   trimestre, true) }),
      qc.fetchQuery({ queryKey: ['operacional', store.cnpj, trimestre], queryFn: () => getOperacional(store.cnpj, trimestre, true) }),
    ]).then(() => setLastTs(fmtTs()));
  }

  function handleSelectStore(idx: number) {
    setStoreIdx(idx);
    setDropdownOpen(false);
    setLastTs(fmtTs());
  }

  // Quando clica numa loja na visão geral, vai direto para ela
  function handleSelectStoreByCnpj(cnpj: string) {
    const idx = visibleStores.findIndex(s => s.cnpj === cnpj);
    if (idx >= 0) { setStoreIdx(idx); setTab('loja'); }
  }

  const f = data?.financeiro;
  const isCurrent = trimestre === getCurrentTrimestre();
  const metaFin   = (v: number | null) => isCurrent ? v : null;

  const KRS_BAR = f ? [
    { name: 'Participação Cartão',  data: { atual: f.cartaoPct.atual,     meta: metaFin(f.cartaoPct.meta)     }, unit: '%'  as const, min: 0, max: 100, invert: false },
    { name: 'Participação À Vista', data: { atual: f.avistaPct.atual,     meta: metaFin(f.avistaPct.meta)     }, unit: '%'  as const, min: 0, max: 100, invert: false },
    { name: 'Ticket Médio',         data: { atual: f.ticketMedio.atual,   meta: metaFin(f.ticketMedio.meta)   }, unit: 'R$' as const, min: 0, max: 2000, invert: false },
    { name: 'Inadimplência',        data: { atual: f.inadimplencia.atual, meta: metaFin(f.inadimplencia.meta) }, unit: '%'  as const, min: 0, max: 20,  invert: true  },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-100 font-sans">

      {/* NAV */}
      <nav className="bg-ink text-white px-8 py-3.5 flex items-center gap-6 border-b border-black">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-brand rounded-t-sm rounded-b-2xl flex items-center justify-center shadow-inner">
            <span className="font-extrabold text-[10px] text-white leading-tight text-center">
              <small className="block font-medium text-[7px] tracking-widest lowercase opacity-85">ótica</small>
              Bilharva
            </span>
          </div>
          <span className="text-[13px] tracking-[0.18em] uppercase text-white/60 font-semibold">
            Painel · <b className="text-white font-bold">OKRs</b>
          </span>
        </div>

        {/* Tabs */}
        {(canSeeAllStores || canManageUsers) && (
          <div className="flex items-center gap-1 bg-white/[0.06] rounded-full p-1">
            <button
              onClick={() => setTab('loja')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                tab === 'loja' ? 'bg-white text-ink' : 'text-white/60 hover:text-white'
              }`}
            >
              <Store size={12} />
              Por loja
            </button>
            {canSeeAllStores && (
              <button
                onClick={() => setTab('geral')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                  tab === 'geral' ? 'bg-white text-ink' : 'text-white/60 hover:text-white'
                }`}
              >
                <LayoutGrid size={12} />
                Visão geral
              </button>
            )}
            {canManageUsers && (
              <button
                onClick={() => setTab('usuarios')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                  tab === 'usuarios' ? 'bg-white text-ink' : 'text-white/60 hover:text-white'
                }`}
              >
                <Users size={12} />
                Usuários
              </button>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Store picker (oculto para USER e nas tabs geral/usuários) */}
        {tab === 'loja' && (
          <div className="relative">
            {user?.type === 'USER' ? (
              // USER: mostra a loja fixamente, sem dropdown
              <div className="flex items-center gap-2.5 bg-white/[0.06] border border-white/10 px-3.5 py-2 rounded-full text-sm">
                <span className="text-[11px] text-white/55 uppercase tracking-wider font-medium">Loja</span>
                <span className="font-semibold">{store.name}</span>
              </div>
            ) : (
              // ADMIN: dropdown com todas as lojas
              <>
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  className="flex items-center gap-2.5 bg-white/[0.06] border border-white/10 px-3.5 py-2 rounded-full text-sm cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <span className="text-[11px] text-white/55 uppercase tracking-wider font-medium">Loja</span>
                  <span className="font-semibold">{store.name}</span>
                  <ChevronDown size={14} className="opacity-60" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                    {visibleStores.map((s, i) => (
                      <button
                        key={s.cnpj}
                        onClick={() => handleSelectStore(i)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${i === storeIdx ? 'font-semibold text-brand bg-brand-tint' : 'text-gray-700'}`}
                      >
                        <span className="font-mono text-[10px] text-gray-400 w-10 shrink-0">{s.sigla}</span>
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Seletor de trimestre */}
        <div className="relative">
          <button
            onClick={() => setTrimDropOpen(o => !o)}
            className="flex items-center gap-1.5 bg-brand text-white px-3 py-1.5 rounded-md text-xs font-bold tracking-wider hover:bg-brand-deep transition-colors"
          >
            {trimestre}
            <ChevronDown size={11} className="opacity-80" />
          </button>
          {trimDropOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
              {trimOpts.map(t => (
                <button
                  key={t}
                  onClick={() => { setTrimestre(t); setTrimDropOpen(false); setLastTs(fmtTs()); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                    t === trimestre
                      ? 'font-bold text-brand bg-brand-tint'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{fmtTrimestreLabel(t)}</span>
                  {t === getCurrentTrimestre() && (
                    <span className="text-[10px] text-gray-400 font-normal">atual</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Usuário + logout */}
        <div className="flex items-center gap-3 border-l border-white/10 pl-4 ml-2">
          <div className="text-right">
            <div className="text-[12px] font-semibold leading-tight">{user?.name}</div>
            <div className="text-[10px] text-white/50 uppercase tracking-wider">{user?.type?.replace('_', ' ')}</div>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            title="Sair"
          >
            <LogOut size={15} />
          </button>
        </div>
      </nav>

      {/* PAGE */}
      <main className="max-w-[1280px] mx-auto px-8 py-7 pb-16">

        {/* ── Tab: Usuários ── */}
        {tab === 'usuarios' && canManageUsers ? (
          <UsersPage />
        ) : tab === 'geral' && canSeeAllStores ? (
          /* ── Tab: Visão Geral ── */
          <AllStoresPage trimestre={trimestre} onSelectStore={handleSelectStoreByCnpj} />
        ) : (

          /* ── Tab: Por loja ── */
          <>
            {/* HEADER */}
            <div className="flex items-end justify-between gap-6 mb-6">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 mb-1.5">
                  {fmtTrimestreHeader(trimestre)}
                </div>
                <h1 className="text-[28px] font-bold text-ink leading-tight">Resultados-chave por loja</h1>
              </div>
              <div className="flex items-end gap-4">
                {canEditMetas && trimestre === getCurrentTrimestre() && (
                  <button
                    onClick={() => setMetasOpen(true)}
                    className="flex items-center gap-2 border border-brand/30 text-brand bg-brand-tint text-[13px] font-semibold px-4 py-2.5 rounded-lg hover:bg-brand/10 transition-colors"
                  >
                    <Target size={14} />
                    Configurar Metas
                  </button>
                )}
                <div className="font-mono text-[12px] text-gray-500 text-right leading-relaxed">
                  última atualização<br />
                  <b className="text-gray-900 font-semibold">{lastTs}</b>
                </div>
              </div>
            </div>

            {/* KPI STRIP */}
            <section className="bg-brand text-white rounded-2xl grid grid-cols-4 overflow-hidden shadow-md mb-7">
              {[
                { v: f ? `${f.totalVendas}` : '—',                           k: 'Total de Vendas' },
                { v: f ? fmtMoeda(f.valorTotal) : '—',                       k: 'Faturamento' },
                { v: f ? `${f.cartaoPct.atual ?? '—'}%` : '—',               k: 'Participação Cartão' },
                { v: f ? `${f.inadimplencia.atual ?? '—'}%` : '—',           k: 'Inadimplência (ref −3m)' },
              ].map((item, i) => (
                <div key={i} className={`px-6 py-5 text-center ${i < 3 ? 'border-r border-white/20' : ''}`}>
                  <div className="text-[32px] font-extrabold leading-none tracking-tight">{item.v}</div>
                  <div className="text-[11px] uppercase tracking-[0.16em] opacity-85 mt-1.5 font-semibold">{item.k}</div>
                </div>
              ))}
            </section>

            {/* BLOCK 1.3 — FINANCEIRO */}
            <section className="mt-7">
              <div className="flex items-baseline gap-3.5 mb-3.5">
                <h2 className="text-[20px] font-bold text-ink">Prosperidade com Segurança</h2>
              </div>

              {isFetching && !data ? (
                <div className="grid grid-cols-2 gap-4">
                  {[0,1,2,3].map(i => <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 h-48 animate-pulse" />)}
                </div>
              ) : data ? (
                <div className="grid grid-cols-2 gap-4">
                  {KRS_BAR.map(kr => <KrBar key={kr.name} {...kr} />)}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
                  Carregando dados...
                </div>
              )}
            </section>

            {/* BLOCK 1.4 — OPERACIONAL */}
            <section className="mt-7">
              <div className="flex items-baseline gap-3.5 mb-3.5">
                <h2 className="text-[20px] font-bold text-ink">Operar com Excelência</h2>
              </div>

              {opFetching && !opData ? (
                <div className="grid grid-cols-3 gap-4">
                  {[0,1,2].map(i => <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 h-64 animate-pulse" />)}
                </div>
              ) : opData ? (
                <div className="grid grid-cols-3 gap-4">
                  <KrRing
                    tag="KR · Garantias"
                    name="Garantias e Cancelamentos"
                    data={{ atual: opData.garantiasCancelamentos.pct, meta: isCurrent ? META_GARANTIAS : null }}
                    unit="%" min={0} max={20} invert={true}
                    warnThreshold={1 / 1.3}
                  />
                  <KrRing
                    tag="KR · Luzter"
                    name="Adesão Luzter"
                    data={{ atual: opData.luzter.pct, meta: isCurrent ? META_LUZTER : null }}
                    unit="%" min={0} max={100} invert={false}
                    onDetailOpen={() => setLuzterModalOpen(true)}
                  />
                  <KrRing
                    tag="KR · Binni"
                    name="Adesão Binni / Volt"
                    data={{ atual: opData.binni.pct, meta: isCurrent ? META_BINNI : null }}
                    unit="%" min={0} max={100} invert={false}
                    onDetailOpen={() => setBinniModalOpen(true)}
                  />
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
                  Carregando dados operacionais...
                </div>
              )}
            </section>

            {/* FOOTER */}
            <footer className="mt-9 pt-5 border-t border-gray-200 flex justify-between items-center gap-3 flex-wrap">
              <span className="text-[12px] text-gray-500">
                Dados calculados em tempo real via API ssOtica
              </span>
              <button
                onClick={handleRefresh}
                disabled={isFetching}
                className="flex items-center gap-2 bg-brand text-white text-[13px] font-semibold tracking-wider uppercase px-5 py-3 rounded-lg hover:bg-brand-deep transition-colors disabled:opacity-60 shadow-sm"
              >
                <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
                Atualizar dados
              </button>
            </footer>
          </>
        )}
      </main>

      {/* Fechar dropdowns ao clicar fora */}
      {dropdownOpen  && <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />}
      {trimDropOpen  && <div className="fixed inset-0 z-40" onClick={() => setTrimDropOpen(false)} />}

      {/* Modal Luzter */}
      {luzterModalOpen && opData && (
        <LuzterModal
          open={luzterModalOpen}
          onClose={() => setLuzterModalOpen(false)}
          tag="KR · Luzter"
          name="Adesão Luzter"
          valorLuzter={opData.luzter.valorLuzter}
          valorTotalLentes={opData.luzter.valorTotalLentes}
          outras={opData.luzter.outras}
          detalhes={opData.luzter.detalhes}
        />
      )}

      {/* Modal Binni */}
      {binniModalOpen && opData && (
        <BinniModal
          open={binniModalOpen}
          onClose={() => setBinniModalOpen(false)}
          tag="KR · Binni"
          name="Adesão Binni / Volt"
          valorBinni={opData.binni.valorBinni}
          valorTotalArmacoes={opData.binni.valorTotalArmacoes}
          outras={opData.binni.outras}
          detalhes={opData.binni.detalhes}
          porGrupo={opData.binni.porGrupo}
        />
      )}

      {/* Drawer de metas */}
      {metasOpen && canEditMetas && (
        <MetasDrawer
          cnpj={store.cnpj}
          trimestre={trimestre}
          storeName={store.name}
          financeiro={data?.financeiro ?? null}
          onClose={() => setMetasOpen(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['dashboard', store.cnpj, trimestre] });
            qc.invalidateQueries({ queryKey: ['operacional', store.cnpj, trimestre] });
          }}
        />
      )}
    </div>
  );
}
