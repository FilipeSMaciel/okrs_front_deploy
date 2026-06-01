import { useState, useMemo } from 'react';
import {
  Routes, Route, NavLink, Navigate,
  useNavigate, useLocation, useOutletContext, Outlet,
} from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ChevronDown, LogOut, LayoutGrid, Store, Target, Map, Menu, X, Settings, Activity } from 'lucide-react';
import { getDashboard, getOperacional, getLojas } from './api';
import { KrBar } from './components/KrBar';
import { KrRing } from './components/KrRing';
import { MetasDrawer } from './components/MetasDrawer';
import { BinniModal } from './components/BinniModal';
import { LuzterModal } from './components/LuzterModal';
import { LoginPage } from './pages/LoginPage';
import { AllStoresPage } from './pages/AllStoresPage';
import { RegionalPage } from './pages/RegionalPage';
import { UsersPage } from './pages/UsersPage';
import { AdminDashboard } from './pages/AdminDashboard';
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
  return opts;
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

function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtTs() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const META_GARANTIAS = 5;
const META_LUZTER    = 85;
const META_BINNI     = 35;

// ── Outlet context ────────────────────────────────────────────────────────────
type DashboardCtx = {
  trimestre:               string;
  setTrimestre:            (t: string) => void;
  store:                   Loja;
  visibleStores:           Loja[];
  storeIdx:                number;
  setStoreIdx:             (i: number) => void;
  lastTs:                  string;
  setLastTs:               (s: string) => void;
  handleSelectStoreByCnpj: (cnpj: string) => void;
};

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />}>
        <Route index element={<DefaultRoute />} />
        <Route path="loja"     element={<LojaPage />} />
        <Route path="geral"    element={<GeralRoute />} />
        <Route path="regional" element={<RegionalRoute />} />
        <Route path="usuarios" element={<UsersPage />} />
        <Route path="admin"    element={<AdminDashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function DefaultRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user.type === 'TI') return <Navigate to="/admin" replace />;
  if (user.type === 'DIRECAO') return <Navigate to="/regional" replace />;
  return <Navigate to="/loja" replace />;
}

function GeralRoute() {
  const { trimestre, handleSelectStoreByCnpj } = useOutletContext<DashboardCtx>();
  return <AllStoresPage trimestre={trimestre} onSelectStore={handleSelectStoreByCnpj} />;
}

function RegionalRoute() {
  const { trimestre, handleSelectStoreByCnpj } = useOutletContext<DashboardCtx>();
  return <RegionalPage trimestre={trimestre} onSelectStore={handleSelectStoreByCnpj} />;
}

// ── Dashboard (layout) ────────────────────────────────────────────────────────
function Dashboard() {
  const { user, logout, isAdmin } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const canSeeAllStores = isAdmin('DIRECAO');
  const canManageUsers  = isAdmin('TI');
  const isLojaRoute     = location.pathname === '/loja';

  const { data: allLojas } = useQuery({
    queryKey: ['lojas'],
    queryFn:  getLojas,
    staleTime: Infinity,
    enabled:  canSeeAllStores,
  });

  const visibleStores = useMemo((): Loja[] => {
    if (user?.type === 'LOJA' && user.loja) {
      return [{ sigla: user.loja.sigla, name: user.loja.name, cnpj: user.loja.cnpj, cidade: user.loja.cidade }];
    }
    if (user?.type === 'GERENTE') {
      return user.lojas.map(l => ({ sigla: l.sigla, name: l.name, cnpj: l.cnpj, cidade: l.cidade }));
    }
    return (allLojas ?? []).map(l => ({ sigla: l.sigla, name: l.name, cnpj: l.cnpj, cidade: l.cidade }));
  }, [user, allLojas]);

  const getInitialStoreIdx = () => {
    if (user?.type === 'LOJA' && user.loja) {
      const idx = visibleStores.findIndex(s => s.cnpj === user.loja!.cnpj);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  };

  const [menuOpen,     setMenuOpen]     = useState(false);
  const [storeIdx,     setStoreIdx]     = useState(getInitialStoreIdx);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [trimDropOpen, setTrimDropOpen] = useState(false);
  const [lastTs,       setLastTs]       = useState(fmtTs());
  const [trimestre,    setTrimestre]    = useState(getCurrentTrimestre);
  const trimOpts = getTrimestreOptions();

  const store = visibleStores[storeIdx] ?? visibleStores[0];

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Carregando...</div>
      </div>
    );
  }

  function handleSelectStore(idx: number) {
    setStoreIdx(idx);
    setDropdownOpen(false);
    setLastTs(fmtTs());
  }

  function handleSelectStoreByCnpj(cnpj: string) {
    const idx = visibleStores.findIndex(s => s.cnpj === cnpj);
    if (idx >= 0) setStoreIdx(idx);
    navigate('/loja');
  }

  const tabCls = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
      active ? 'bg-white text-ink' : 'text-white/60 hover:text-white hover:bg-white/[0.08]'
    }`;

  const ctx: DashboardCtx = {
    trimestre, setTrimestre,
    store, visibleStores, storeIdx, setStoreIdx,
    lastTs, setLastTs,
    handleSelectStoreByCnpj,
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">

      {/* NAV */}
      <nav className="bg-ink text-white border-b border-black relative z-50">
        <div className="px-4 md:px-8 py-3.5 flex items-center gap-4">

          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
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

          <div className="flex-1" />

          {/* Tudo à direita — desktop */}
          <div className="hidden md:flex items-center gap-1">

            {/* Tabs de navegação */}
            {canManageUsers && (
              <NavLink to="/admin" className={({ isActive }) => tabCls(isActive)}>
                <Activity size={12} /> Atividades
              </NavLink>
            )}
            <NavLink to="/loja" className={({ isActive }) => tabCls(isActive)}>
              <Store size={12} /> Por loja
            </NavLink>
            {canSeeAllStores && (
              <NavLink to="/geral" className={({ isActive }) => tabCls(isActive)}>
                <LayoutGrid size={12} /> Visão geral
              </NavLink>
            )}
            {canSeeAllStores && (
              <NavLink to="/regional" className={({ isActive }) => tabCls(isActive)}>
                <Map size={12} /> Regiões
              </NavLink>
            )}
            {canManageUsers && (
              <NavLink to="/usuarios" className={({ isActive }) => tabCls(isActive)}>
                <Settings size={12} /> Configurações
              </NavLink>
            )}

            {/* Separador */}
            <div className="w-px h-5 bg-white/20 mx-2" />

            {/* Trimestre — só em rotas que não são /loja (lá fica no header da página) */}
            {!isLojaRoute && (
              <div className="relative">
                <button onClick={() => setTrimDropOpen(o => !o)} className="flex items-center gap-1.5 bg-brand text-white px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider hover:bg-brand-deep transition-colors">
                  {trimestre} <ChevronDown size={11} className="opacity-80" />
                </button>
                {trimDropOpen && (
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                    {trimOpts.map(t => (
                      <button key={t} onClick={() => { setTrimestre(t); setTrimDropOpen(false); setLastTs(fmtTs()); }} className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${t === trimestre ? 'font-bold text-brand bg-brand-tint' : 'text-gray-700 hover:bg-gray-50'}`}>
                        <span>{fmtTrimestreLabel(t)}</span>
                        {t === getCurrentTrimestre() && <span className="text-[10px] text-gray-400 font-normal">atual</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Usuário + logout */}
            <div className="flex items-center gap-2 border-l border-white/10 pl-3 ml-1">
              <div className="text-right">
                <div className="text-[12px] font-semibold leading-tight">{user?.name}</div>
                <div className="text-[10px] text-white/50 uppercase tracking-wider">{user?.type?.replace('_', ' ')}</div>
              </div>
              <button onClick={logout} className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white" title="Sair">
                <LogOut size={15} />
              </button>
            </div>
          </div>

          {/* Hamburger — mobile */}
          <div className="flex md:hidden items-center gap-2">
            <button onClick={() => setTrimDropOpen(o => !o)} className="flex items-center gap-1 bg-brand text-white px-2.5 py-1.5 rounded-md text-xs font-bold tracking-wider hover:bg-brand-deep transition-colors">
              {trimestre} <ChevronDown size={10} className="opacity-80" />
            </button>
            <button onClick={() => setMenuOpen(o => !o)} className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

        </div>

        {/* Dropdown trimestre mobile */}
        {trimDropOpen && (
          <div className="md:hidden absolute right-4 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
            {trimOpts.map(t => (
              <button key={t} onClick={() => { setTrimestre(t); setTrimDropOpen(false); setLastTs(fmtTs()); }} className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${t === trimestre ? 'font-bold text-brand bg-brand-tint' : 'text-gray-700 hover:bg-gray-50'}`}>
                <span>{fmtTrimestreLabel(t)}</span>
                {t === getCurrentTrimestre() && <span className="text-[10px] text-gray-400 font-normal">atual</span>}
              </button>
            ))}
          </div>
        )}

        {/* Menu mobile */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMenuOpen(false)} />
            <div className="md:hidden absolute top-full left-0 right-0 z-50 bg-ink border-t border-white/10 shadow-2xl">

              {/* Usuário */}
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-[14px] font-semibold">{user?.name}</div>
                  <div className="text-[11px] text-white/50 uppercase tracking-wider mt-0.5">{user?.type?.replace('_', ' ')}</div>
                </div>
                <button onClick={logout} className="flex items-center gap-1.5 text-[12px] text-white/50 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-white/10">
                  <LogOut size={14} /> Sair
                </button>
              </div>

              {/* Navegação */}
              {(canSeeAllStores || canManageUsers) && (
                <div className="px-3 py-3 border-b border-white/10 flex flex-col gap-1">
                  {[
                    { to: '/admin',    icon: <Activity size={15} />,   label: 'Atividades',    show: canManageUsers  },
                    { to: '/loja',     icon: <Store size={15} />,      label: 'Por loja',      show: true            },
                    { to: '/geral',    icon: <LayoutGrid size={15} />, label: 'Visão geral',   show: canSeeAllStores },
                    { to: '/regional', icon: <Map size={15} />,        label: 'Regiões',       show: canSeeAllStores },
                    { to: '/usuarios', icon: <Settings size={15} />,   label: 'Configurações', show: canManageUsers  },
                  ].filter(i => i.show).map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold transition-colors text-left ${isActive ? 'bg-white text-ink' : 'text-white/70 hover:bg-white/10 hover:text-white'}`
                      }
                    >
                      {item.icon} {item.label}
                    </NavLink>
                  ))}
                </div>
              )}

              {/* Store picker mobile */}
              {isLojaRoute && user?.type !== 'LOJA' && (
                <div className="px-5 py-4 border-b border-white/10">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">Loja selecionada</div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {visibleStores.map((s, i) => (
                      <button key={s.cnpj} onClick={() => { handleSelectStore(i); setMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-[13px] transition-colors flex items-center gap-2 ${i === storeIdx ? 'bg-brand text-white font-semibold' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                        <span className="font-mono text-[10px] opacity-60 w-8 shrink-0">{s.sigla}</span>
                        <span className="flex-1 truncate">{s.name}{s.cidade ? ` · ${s.cidade}` : ''}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </>
        )}
      </nav>

      {/* PAGE */}
      <main className="max-w-[1280px] mx-auto px-4 py-5 sm:px-8 sm:py-7 pb-16">
        <Outlet context={ctx} />
      </main>

      {/* Fechar dropdowns ao clicar fora (desktop) */}
      {dropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />}
      {trimDropOpen && <div className="fixed inset-0 z-40" onClick={() => setTrimDropOpen(false)} />}

    </div>
  );
}

// ── LojaPage ──────────────────────────────────────────────────────────────────
function LojaPage() {
  const {
    trimestre, setTrimestre,
    store, visibleStores, storeIdx, setStoreIdx,
    lastTs, setLastTs,
  } = useOutletContext<DashboardCtx>();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();

  const canEditMetas = isAdmin('ADMINISTRATIVO');
  const isCurrent    = trimestre === getCurrentTrimestre();
  const trimOpts     = getTrimestreOptions();

  const [metasOpen,       setMetasOpen]       = useState(false);
  const [binniModalOpen,  setBinniModalOpen]  = useState(false);
  const [luzterModalOpen, setLuzterModalOpen] = useState(false);
  const [storeDropOpen,   setStoreDropOpen]   = useState(false);
  const [trimDropOpen,    setTrimDropOpen]    = useState(false);

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

  const f       = data?.financeiro;
  const metaFin = (v: number | null) => isCurrent ? v : null;

  const KRS_BAR = f ? [
    { name: 'Participação Cartão',  data: { atual: f.cartaoPct.atual,     meta: metaFin(f.cartaoPct.meta)     }, unit: '%'  as const, min: 0, max: 100,  invert: false },
    { name: 'Participação À Vista', data: { atual: f.avistaPct.atual,     meta: metaFin(f.avistaPct.meta)     }, unit: '%'  as const, min: 0, max: 100,  invert: false },
    { name: 'Ticket Médio',         data: { atual: f.ticketMedio.atual,   meta: metaFin(f.ticketMedio.meta)   }, unit: 'R$' as const, min: 0, max: 2000, invert: false },
    { name: 'Inadimplência',        data: { atual: f.inadimplencia.atual, meta: metaFin(f.inadimplencia.meta) }, unit: '%'  as const, min: 0, max: 20,   invert: true  },
  ] : [];

  return (
    <>
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">

        {/* Esquerda: nome da loja (com picker se não for LOJA fixo) */}
        <div className="relative">
          {user?.type !== 'LOJA' ? (
            <>
              <button
                onClick={() => setStoreDropOpen(o => !o)}
                className="flex items-center gap-2 group text-left"
              >
                <h1 className="text-[26px] sm:text-[30px] font-bold text-ink leading-tight group-hover:text-brand transition-colors">
                  {store.name}{store.cidade ? ` · ${store.cidade}` : ''}
                </h1>
                <ChevronDown size={18} className="text-gray-400 group-hover:text-brand transition-colors shrink-0 mt-1" />
              </button>
              {storeDropOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setStoreDropOpen(false)} />
                  <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-40 overflow-hidden">
                    {visibleStores.map((s, i) => (
                      <button
                        key={s.cnpj}
                        onClick={() => { setStoreIdx(i); setStoreDropOpen(false); setLastTs(fmtTs()); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${i === storeIdx ? 'font-semibold text-brand bg-brand-tint' : 'text-gray-700'}`}
                      >
                        <span className="font-mono text-[10px] text-gray-400 w-10 shrink-0">{s.sigla}</span>
                        <span className="flex-1 truncate">{s.name}{s.cidade ? ` · ${s.cidade}` : ''}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <h1 className="text-[26px] sm:text-[30px] font-bold text-ink leading-tight">
              {store.name}{store.cidade ? ` · ${store.cidade}` : ''}
            </h1>
          )}
          <div className="text-[11px] text-gray-400 mt-1 font-medium uppercase tracking-wider">Por loja</div>
        </div>

        {/* Direita: trimestre + metas + timestamp */}
        <div className="flex items-center gap-3 flex-wrap">

          {/* Trimestre — proeminente */}
          <div className="relative">
            <button
              onClick={() => setTrimDropOpen(o => !o)}
              className="flex items-center gap-2 border-2 border-gray-200 hover:border-brand bg-white text-ink px-4 py-2 rounded-lg font-bold text-[14px] transition-colors"
            >
              {fmtTrimestreLabel(trimestre)}
              <ChevronDown size={14} className="text-gray-400" />
            </button>
            {trimDropOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setTrimDropOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-40 overflow-hidden">
                  {trimOpts.map(t => (
                    <button
                      key={t}
                      onClick={() => { setTrimestre(t); setTrimDropOpen(false); setLastTs(fmtTs()); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${t === trimestre ? 'font-bold text-brand bg-brand-tint' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      <span>{fmtTrimestreLabel(t)}</span>
                      {t === getCurrentTrimestre() && <span className="text-[10px] text-gray-400">atual</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {canEditMetas && isCurrent && (
            <button
              onClick={() => setMetasOpen(true)}
              className="flex items-center gap-2 border border-brand/30 text-brand bg-brand-tint text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-brand/10 transition-colors"
            >
              <Target size={14} />
              Metas
            </button>
          )}

          <div className="font-mono text-[11px] text-gray-400 leading-snug">
            atualizado<br />
            <b className="text-gray-700 font-semibold text-[12px]">{lastTs}</b>
          </div>
        </div>
      </div>

      {/* KPI STRIP */}
      <section className="bg-brand text-white rounded-2xl grid grid-cols-2 sm:grid-cols-4 overflow-hidden shadow-md mb-7">
        {[
          { v: f ? `${f.totalVendas}` : '—',                 k: 'Total de Vendas' },
          { v: f ? fmtMoeda(f.valorTotal) : '—',             k: 'Faturamento' },
          { v: f ? `${f.cartaoPct.atual ?? '—'}%` : '—',     k: 'Participação Cartão' },
          { v: f ? `${f.inadimplencia.atual ?? '—'}%` : '—', k: 'Inadimplência' },
        ].map((item, i) => {
          const border =
            i === 0 ? 'border-r border-b sm:border-b-0 border-white/20' :
            i === 1 ? 'border-b sm:border-b-0 sm:border-r border-white/20' :
            i === 2 ? 'border-r border-white/20' : '';
          return (
            <div key={i} className={`px-4 sm:px-6 py-4 sm:py-5 text-center ${border}`}>
              <div className="text-[24px] sm:text-[32px] font-extrabold leading-none tracking-tight">{item.v}</div>
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] opacity-85 mt-1.5 font-semibold">{item.k}</div>
            </div>
          );
        })}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            qc.invalidateQueries({ queryKey: ['dashboard',   store.cnpj, trimestre] });
            qc.invalidateQueries({ queryKey: ['operacional', store.cnpj, trimestre] });
          }}
        />
      )}
    </>
  );
}
