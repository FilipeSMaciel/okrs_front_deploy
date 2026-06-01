import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, ShieldCheck, Eye, Users, MapPin, Store } from 'lucide-react';
import {
  getUsers, getLojas, createUser, updateUser, deleteUser,
  getRegioes, createRegiao, updateRegiao, deleteRegiao,
  type UserApi, type LojaSimples, type RegiaoApi,
  type CreateUserPayload, type UpdateUserPayload,
} from '../api';
import { useAuth } from '../contexts/AuthContext';

// ─── Labels ──────────────────────────────────────────────────────────────────
const LEVEL_LABEL: Record<string, string> = {
  LOJA:          'Loja',
  GERENTE:       'Gerente',
  DIRECAO:       'Direção',
  ADMINISTRATIVO:'Administrativo',
  TI:            'TI',
};

const LEVEL_COLOR: Record<string, string> = {
  LOJA:          'bg-gray-100 text-gray-600',
  GERENTE:       'bg-blue-50 text-blue-600',
  DIRECAO:       'bg-ok-soft text-ok',
  ADMINISTRATIVO:'bg-warn-soft text-warn',
  TI:            'bg-brand-tint text-brand',
};

// ─── Drawer de região ─────────────────────────────────────────────────────────
interface RegiaoDrawerProps {
  regiao:  RegiaoApi | null; // null = criar
  lojas:   LojaSimples[];
  onClose: () => void;
  onSaved: () => void;
}

function RegiaoDrawer({ regiao, lojas, onClose, onSaved }: RegiaoDrawerProps) {
  const isEdit = !!regiao;
  const [nome,    setNome]    = useState(regiao?.nome ?? '');
  const [lojaIds, setLojaIds] = useState<string[]>(regiao?.lojas.map(l => l.id) ?? []);
  const [error,   setError]   = useState('');
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  function toggleLoja(id: string) {
    setLojaIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleSave() {
    setError('');
    if (!nome.trim())        return setError('Nome da região obrigatório.');
    if (lojaIds.length === 0) return setError('Selecione ao menos uma loja.');
    setSaving(true);
    try {
      if (isEdit) {
        await updateRegiao(regiao.id, { nome, lojaIds });
      } else {
        await createRegiao({ nome, lojaIds });
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.error ?? err.message ?? 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-[480px] max-h-[88vh] flex flex-col pointer-events-auto">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <div className="text-[10.5px] font-bold tracking-widest uppercase text-blue-500">
              {isEdit ? 'Editar região' : 'Nova região'}
            </div>
            <h2 className="text-[20px] font-bold text-ink mt-0.5">
              {isEdit ? regiao.nome : 'Criar grupo de lojas'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-ink transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-ink mb-1.5">Nome da região</label>
            <input
              value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Ex: Região Norte, Grupo Serra…"
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-ink mb-1.5">
              Lojas da região <span className="text-brand">*</span>
              <span className="ml-2 font-normal text-gray-400">
                ({lojaIds.length} selecionada{lojaIds.length !== 1 ? 's' : ''})
              </span>
            </label>
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-52 overflow-y-auto divide-y divide-gray-100">
              {lojas.map(l => {
                const checked = lojaIds.includes(l.id);
                return (
                  <label
                    key={l.id}
                    className={`flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors ${
                      checked ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleLoja(l.id)}
                      className="w-4 h-4 accent-blue-500 rounded"
                    />
                    <div>
                      <div className="text-[13px] font-semibold text-ink leading-tight">{l.name}</div>
                      <div className="text-[10.5px] text-gray-400">{l.cidade}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="bg-brand-tint border border-brand/20 rounded-lg px-3.5 py-2.5 text-[13px] text-brand font-medium">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg bg-blue-500 text-white text-[13px] font-semibold hover:bg-blue-600 transition-colors disabled:opacity-60">
            {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar região'}
          </button>
        </div>
      </div>
      </div>
    </>
  );
}

// ─── Drawer de usuário ─────────────────────────────────────────────────────────
interface DrawerProps {
  user:    UserApi | null;
  lojas:   LojaSimples[];
  regioes: RegiaoApi[];
  onClose: () => void;
  onSaved: () => void;
}

function UserDrawer({ user, lojas, regioes, onClose, onSaved }: DrawerProps) {
  const isEdit = !!user;

  const [name,      setName]      = useState(user?.name     ?? '');
  const [email,     setEmail]     = useState(user?.email    ?? '');
  const [password,  setPassword]  = useState('');
  const [type,      setType]      = useState<UserApi['type']>(user?.type ?? 'LOJA');
  const [lojaId,    setLojaId]    = useState<string>(user?.loja?.id ?? '');
  const [regiaoId,  setRegiaoId]  = useState<string>(user?.regiao?.id ?? '');
  const [error,     setError]     = useState('');
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const regiaoSelecionada = regioes.find(r => r.id === regiaoId) ?? null;

  async function handleSave() {
    setError('');
    if (!name.trim())                              return setError('Nome obrigatório.');
    if (!isEdit && !email.trim())                  return setError('E-mail obrigatório.');
    if (!isEdit && password.length < 6)            return setError('Senha mínima de 6 caracteres.');
    if (type === 'LOJA'    && !lojaId)   return setError('Selecione a loja para este usuário.');
    if (type === 'GERENTE' && !regiaoId) return setError('Selecione a região para este gerente.');

    setSaving(true);
    try {
      if (isEdit) {
        const payload: UpdateUserPayload = {
          name, type,
          lojaId:   type === 'LOJA'    ? (lojaId   || null) : null,
          regiaoId: type === 'GERENTE' ? (regiaoId || null) : null,
        };
        if (password) payload.password = password;
        await updateUser(user.id, payload);
      } else {
        const payload: CreateUserPayload = {
          name, email, password, type,
          lojaId:   type === 'LOJA'    ? (lojaId   || null) : null,
          regiaoId: type === 'GERENTE' ? (regiaoId || null) : null,
        };
        await createUser(payload);
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.error ?? err.message ?? 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-[520px] max-h-[88vh] flex flex-col pointer-events-auto">

        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <div className="text-[10.5px] font-bold tracking-widest uppercase text-brand">
              {isEdit ? 'Editar usuário' : 'Novo usuário'}
            </div>
            <h2 className="text-[20px] font-bold text-ink mt-0.5">
              {isEdit ? user.name : 'Cadastrar acesso'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-ink transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          <div>
            <label className="block text-[12px] font-semibold text-ink mb-1.5">Nome</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Nome completo"
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-colors"
            />
          </div>

          {!isEdit && (
            <div>
              <label className="block text-[12px] font-semibold text-ink mb-1.5">E-mail</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="email@bilharva.com.br"
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-ink mb-1.5">
              Senha {isEdit && <span className="text-gray-400 font-normal">(deixe em branco para manter)</span>}
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={isEdit ? '••••••••' : 'Mínimo 6 caracteres'}
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-ink mb-1.5">Nível de acesso</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'LOJA',          desc: 'Acessa somente a loja vinculada'              },
                { key: 'GERENTE',       desc: 'Visualiza as lojas da sua região'              },
                { key: 'DIRECAO',       desc: 'Todas as lojas + comparativo de regiões'       },
                { key: 'ADMINISTRATIVO',desc: 'Direção + configura metas por loja'            },
                { key: 'TI',            desc: 'Acesso total · gerencia usuários e regiões'    },
              ] as const).map(({ key, desc }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={`px-3 py-2.5 rounded-lg text-left border-2 transition-colors ${
                    key === 'TI' ? 'col-span-2' : ''
                  } ${
                    type === key
                      ? 'border-brand bg-brand-tint'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-[12px] font-bold text-ink">{LEVEL_LABEL[key]}</div>
                  <div className="text-[10.5px] text-gray-500 leading-tight mt-0.5">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg px-3.5 py-3 text-[11.5px] text-gray-500 leading-relaxed">
            {type === 'LOJA'          && 'Visualiza somente os KRs da loja vinculada. Sem acesso a outras lojas.'}
            {type === 'GERENTE'       && 'Visualiza os KRs das lojas da sua região. Acesso somente leitura.'}
            {type === 'DIRECAO'       && 'Visualiza todas as lojas, painel consolidado e comparativo de regiões. Somente leitura.'}
            {type === 'ADMINISTRATIVO'&& 'Tudo da Direção + pode configurar e atualizar metas por loja.'}
            {type === 'TI'            && 'Acesso completo: metas, visão geral, regiões e gerenciamento de usuários.'}
          </div>

          {/* Loja vinculada (LOJA) */}
          {type === 'LOJA' && (
            <div>
              <label className="block text-[12px] font-semibold text-ink mb-1.5">
                Loja vinculada <span className="text-brand">*</span>
              </label>
              <select
                value={lojaId} onChange={e => setLojaId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-colors bg-white"
              >
                <option value="">Selecione a loja…</option>
                {lojas.map(l => (
                  <option key={l.id} value={l.id}>{l.name} — {l.cidade}</option>
                ))}
              </select>
            </div>
          )}

          {/* Região vinculada (GERENTE) */}
          {type === 'GERENTE' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-ink mb-1.5">
                  Região vinculada <span className="text-brand">*</span>
                </label>
                {regioes.length === 0 ? (
                  <div className="border border-dashed border-gray-200 rounded-lg px-3.5 py-3 text-[12px] text-gray-400 text-center">
                    Nenhuma região cadastrada. Crie regiões na aba <strong>Regiões</strong>.
                  </div>
                ) : (
                  <select
                    value={regiaoId} onChange={e => setRegiaoId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-colors bg-white"
                  >
                    <option value="">Selecione a região…</option>
                    {regioes.map(r => (
                      <option key={r.id} value={r.id}>{r.nome} ({r.lojas.length} loja{r.lojas.length !== 1 ? 's' : ''})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Preview das lojas da região */}
              {regiaoSelecionada && regiaoSelecionada.lojas.length > 0 && (
                <div className="bg-blue-50 rounded-lg px-3.5 py-3">
                  <div className="text-[10.5px] font-semibold text-blue-500 uppercase tracking-wide mb-2">
                    Lojas desta região
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {regiaoSelecionada.lojas.map(l => (
                      <span key={l.id} className="inline-flex items-center gap-1 bg-white border border-blue-100 text-blue-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                        <Store size={9} />
                        {l.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-brand-tint border border-brand/20 rounded-lg px-3.5 py-2.5 text-[13px] text-brand font-medium">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg bg-brand text-white text-[13px] font-semibold hover:bg-brand-deep transition-colors disabled:opacity-60">
            {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar usuário'}
          </button>
        </div>
      </div>
      </div>
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export function UsersPage() {
  const { user: me } = useAuth();
  const qc = useQueryClient();

  const [tab,          setTab]          = useState<'usuarios' | 'regioes'>('usuarios');
  const [editingUser,  setEditingUser]  = useState<UserApi | null>(null);
  const [creatingNew,  setCreatingNew]  = useState(false);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);
  const [deleteError,  setDeleteError]  = useState('');

  // Regiões
  const [editingRegiao,  setEditingRegiao]  = useState<RegiaoApi | null>(null);
  const [creatingRegiao, setCreatingRegiao] = useState(false);
  const [deletingRegiao, setDeletingRegiao] = useState<RegiaoApi | null>(null);
  const [deleteRegiaoErr,setDeleteRegiaoErr]= useState('');

  const { data: users = [], isFetching } = useQuery({
    queryKey: ['users'],
    queryFn:  getUsers,
    staleTime: 30 * 1000,
  });

  const { data: lojas = [] } = useQuery({
    queryKey: ['lojas-admin'],
    queryFn:  getLojas,
    staleTime: 5 * 60 * 1000,
  });

  const { data: regioes = [], isFetching: fetchingRegioes } = useQuery({
    queryKey: ['regioes'],
    queryFn:  getRegioes,
    staleTime: 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['users'] }); setDeletingId(null); },
    onError:    (err: any) => setDeleteError(err.response?.data?.error ?? err.message),
  });

  const deleteRegiaoMutation = useMutation({
    mutationFn: deleteRegiao,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['regioes'] }); setDeletingRegiao(null); },
    onError:    (err: any) => setDeleteRegiaoErr(err.response?.data?.error ?? err.message),
  });

  function handleSaved() {
    qc.invalidateQueries({ queryKey: ['users'] });
    setEditingUser(null);
    setCreatingNew(false);
  }

  function handleRegiaoSaved() {
    qc.invalidateQueries({ queryKey: ['regioes'] });
    setEditingRegiao(null);
    setCreatingRegiao(false);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between gap-6 mb-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 mb-1.5">
            Configurações · Sistema
          </div>
          <h1 className="text-[28px] font-bold text-ink">Configurações</h1>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'regioes' && (
            <button
              onClick={() => setCreatingRegiao(true)}
              className="flex items-center gap-2 bg-blue-500 text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
            >
              <Plus size={15} />
              Nova região
            </button>
          )}
          {tab === 'usuarios' && (
            <button
              onClick={() => setCreatingNew(true)}
              className="flex items-center gap-2 bg-brand text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg hover:bg-brand-deep transition-colors shadow-sm"
            >
              <Plus size={15} />
              Novo usuário
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('usuarios')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
            tab === 'usuarios' ? 'bg-white text-ink shadow-sm' : 'text-gray-500 hover:text-ink'
          }`}
        >
          <Users size={14} />
          Usuários
        </button>
        <button
          onClick={() => setTab('regioes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
            tab === 'regioes' ? 'bg-white text-ink shadow-sm' : 'text-gray-500 hover:text-ink'
          }`}
        >
          <MapPin size={14} />
          Regiões
          {regioes.length > 0 && (
            <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {regioes.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Tab Usuários ── */}
      {tab === 'usuarios' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Usuário</th>
                <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">E-mail</th>
                <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Nível</th>
                <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Loja / Região</th>
                <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isFetching && users.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {[180, 200, 120, 140, 80].map((w, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                        <span className="text-[12px] font-bold text-brand">
                          {u.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-ink">{u.name}</div>
                        {u.id === me?.id && <div className="text-[10px] text-gray-400">você</div>}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-[13px] text-gray-600 font-mono">{u.email}</td>

                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${LEVEL_COLOR[u.type]}`}>
                      {u.type === 'TI'      ? <ShieldCheck size={10} /> :
                       u.type === 'LOJA'    ? <Eye size={10} />         :
                       u.type === 'GERENTE' ? <MapPin size={10} />      :
                                             <Users size={10} />}
                      {LEVEL_LABEL[u.type]}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 text-[13px] text-gray-600">
                    {u.type === 'GERENTE' ? (
                      u.regiao ? (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <MapPin size={11} className="text-blue-400 shrink-0" />
                            <span className="font-semibold text-ink">{u.regiao.nome}</span>
                          </div>
                          <div className="text-[10.5px] text-gray-400 mt-0.5">
                            {u.lojas.length} loja{u.lojas.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.lojas.map(l => (
                            <span key={l.id} className="inline-block bg-blue-50 text-blue-700 text-[10.5px] font-semibold px-2 py-0.5 rounded-full">
                              {l.name}
                            </span>
                          ))}
                        </div>
                      )
                    ) : u.loja ? (
                      <div>
                        <div className="font-medium text-ink">{u.loja.name}</div>
                        <div className="text-[11px] text-gray-400">{u.loja.cidade}</div>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingUser(u)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-ink transition-colors" title="Editar">
                        <Pencil size={14} />
                      </button>
                      {u.id !== me?.id && (
                        <button onClick={() => { setDeletingId(u.id); setDeleteError(''); }} className="p-2 rounded-lg hover:bg-brand-tint text-gray-400 hover:text-brand transition-colors" title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && !isFetching && (
            <div className="py-16 text-center text-gray-400">
              <Users size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum usuário encontrado.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab Regiões ── */}
      {tab === 'regioes' && (
        <div className="space-y-3">
          {fetchingRegioes && regioes.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="h-5 bg-gray-100 rounded animate-pulse w-48 mb-3" />
                <div className="flex gap-2">
                  {[80, 100, 70].map((w, j) => (
                    <div key={j} className="h-6 bg-gray-100 rounded-full animate-pulse" style={{ width: w }} />
                  ))}
                </div>
              </div>
            ))
          ) : regioes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center text-gray-400">
              <MapPin size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma região criada.</p>
              <p className="text-[12px] mt-1">Clique em "Nova região" para começar.</p>
            </div>
          ) : regioes.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-start justify-between gap-4 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={14} className="text-blue-500 shrink-0" />
                  <span className="text-[15px] font-bold text-ink">{r.nome}</span>
                  <span className="text-[11px] text-gray-400 font-mono">{r.lojas.length} loja{r.lojas.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {r.lojas.map(l => (
                    <span key={l.id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-blue-100">
                      <Store size={9} />
                      {l.name}
                    </span>
                  ))}
                </div>
                {/* Gerentes desta região */}
                {(() => {
                  const gerentes = users.filter(u => u.regiao?.id === r.id);
                  return gerentes.length > 0 ? (
                    <div className="mt-2.5 text-[11px] text-gray-400">
                      Gerente{gerentes.length !== 1 ? 's' : ''}: {gerentes.map(g => g.name).join(', ')}
                    </div>
                  ) : null;
                })()}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => setEditingRegiao(r)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-ink transition-colors" title="Editar região">
                  <Pencil size={14} />
                </button>
                <button onClick={() => { setDeletingRegiao(r); setDeleteRegiaoErr(''); }} className="p-2 rounded-lg hover:bg-brand-tint text-gray-400 hover:text-brand transition-colors" title="Excluir região">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm delete user */}
      {deletingId && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={() => setDeletingId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 w-full max-w-sm">
              <h3 className="text-[17px] font-bold text-ink mb-2">Confirmar exclusão</h3>
              <p className="text-[13px] text-gray-500 mb-4">Esta ação não pode ser desfeita. O usuário perderá o acesso imediatamente.</p>
              {deleteError && <div className="bg-brand-tint text-brand text-[12px] font-medium px-3 py-2 rounded-lg mb-3">{deleteError}</div>}
              <div className="flex gap-3">
                <button onClick={() => setDeletingId(null)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={() => deleteMutation.mutate(deletingId)} disabled={deleteMutation.isPending} className="flex-1 py-2.5 rounded-lg bg-brand text-white text-[13px] font-semibold hover:bg-brand-deep transition-colors disabled:opacity-60">
                  {deleteMutation.isPending ? 'Excluindo…' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Confirm delete região */}
      {deletingRegiao && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={() => setDeletingRegiao(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 w-full max-w-sm">
              <h3 className="text-[17px] font-bold text-ink mb-2">Excluir região</h3>
              <p className="text-[13px] text-gray-500 mb-1">
                Excluir <strong>{deletingRegiao.nome}</strong>?
              </p>
              <p className="text-[12px] text-gray-400 mb-4">Gerentes vinculados a ela perderão a associação com as lojas.</p>
              {deleteRegiaoErr && <div className="bg-brand-tint text-brand text-[12px] font-medium px-3 py-2 rounded-lg mb-3">{deleteRegiaoErr}</div>}
              <div className="flex gap-3">
                <button onClick={() => setDeletingRegiao(null)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={() => deleteRegiaoMutation.mutate(deletingRegiao.id)} disabled={deleteRegiaoMutation.isPending} className="flex-1 py-2.5 rounded-lg bg-brand text-white text-[13px] font-semibold hover:bg-brand-deep transition-colors disabled:opacity-60">
                  {deleteRegiaoMutation.isPending ? 'Excluindo…' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Drawers */}
      {creatingNew && (
        <UserDrawer user={null} lojas={lojas} regioes={regioes} onClose={() => setCreatingNew(false)} onSaved={handleSaved} />
      )}
      {editingUser && (
        <UserDrawer user={editingUser} lojas={lojas} regioes={regioes} onClose={() => setEditingUser(null)} onSaved={handleSaved} />
      )}
      {creatingRegiao && (
        <RegiaoDrawer regiao={null} lojas={lojas} onClose={() => setCreatingRegiao(false)} onSaved={handleRegiaoSaved} />
      )}
      {editingRegiao && (
        <RegiaoDrawer regiao={editingRegiao} lojas={lojas} onClose={() => setEditingRegiao(null)} onSaved={handleRegiaoSaved} />
      )}
    </div>
  );
}
