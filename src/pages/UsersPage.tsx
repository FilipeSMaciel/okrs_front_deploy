import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, ShieldCheck, Eye, Users } from 'lucide-react';
import {
  getUsers, getLojas, createUser, updateUser, deleteUser,
  type UserApi, type LojaSimples, type CreateUserPayload, type UpdateUserPayload,
} from '../api';
import { useAuth } from '../contexts/AuthContext';

// ─── Labels ──────────────────────────────────────────────────────────────────
const LEVEL_LABEL: Record<string, string> = {
  USER:    'Usuário',
  ADMIN_3: 'Admin · Visualizador',
  ADMIN_2: 'Admin · Metas',
  ADMIN_1: 'Admin · Master',
};

const LEVEL_COLOR: Record<string, string> = {
  USER:    'bg-gray-100 text-gray-600',
  ADMIN_3: 'bg-ok-soft text-ok',
  ADMIN_2: 'bg-warn-soft text-warn',
  ADMIN_1: 'bg-brand-tint text-brand',
};

// ─── Drawer de criação/edição ─────────────────────────────────────────────────
interface DrawerProps {
  user:    UserApi | null; // null = criar novo
  lojas:   LojaSimples[];
  onClose: () => void;
  onSaved: () => void;
}

function UserDrawer({ user, lojas, onClose, onSaved }: DrawerProps) {
  const isEdit = !!user;

  const [name,     setName]     = useState(user?.name     ?? '');
  const [email,    setEmail]    = useState(user?.email    ?? '');
  const [password, setPassword] = useState('');
  const [type,     setType]     = useState<UserApi['type']>(user?.type ?? 'USER');
  const [lojaId,   setLojaId]   = useState<string>(user?.loja?.id ?? '');
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);

  async function handleSave() {
    setError('');
    if (!name.trim()) return setError('Nome obrigatório.');
    if (!isEdit && !email.trim()) return setError('E-mail obrigatório.');
    if (!isEdit && password.length < 6) return setError('Senha mínima de 6 caracteres.');
    if (type === 'USER' && !lojaId) return setError('Selecione a loja para este usuário.');

    setSaving(true);
    try {
      if (isEdit) {
        const payload: UpdateUserPayload = { name, type, lojaId: lojaId || null };
        if (password) payload.password = password;
        await updateUser(user.id, payload);
      } else {
        const payload: CreateUserPayload = {
          name, email, password, type, lojaId: lojaId || null,
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
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-[420px] max-w-full bg-white shadow-2xl flex flex-col animate-slide-in">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
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

        {/* Form */}
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
              {(['USER', 'ADMIN_3', 'ADMIN_2', 'ADMIN_1'] as const).map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setType(lvl)}
                  className={`px-3 py-2.5 rounded-lg text-left border-2 transition-colors ${
                    type === lvl
                      ? 'border-brand bg-brand-tint'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-[12px] font-bold text-ink">{lvl.replace('_', ' ')}</div>
                  <div className="text-[10.5px] text-gray-500 leading-tight mt-0.5">{LEVEL_LABEL[lvl]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Descrição do nível selecionado */}
          <div className="bg-gray-50 rounded-lg px-3.5 py-3 text-[11.5px] text-gray-500 leading-relaxed">
            {type === 'USER'    && 'Visualiza somente os KRs da loja vinculada. Sem acesso a outras lojas.'}
            {type === 'ADMIN_3' && 'Visualiza todas as lojas e o painel consolidado. Somente leitura.'}
            {type === 'ADMIN_2' && 'Tudo do Visualizador + pode configurar e atualizar metas por loja.'}
            {type === 'ADMIN_1' && 'Acesso completo: metas, visão geral e gerenciamento de usuários.'}
          </div>

          {/* Loja vinculada (só para USER) */}
          {type === 'USER' && (
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
                  <option key={l.id} value={l.id}>
                    {l.name} — {l.cidade}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="bg-brand-tint border border-brand/20 rounded-lg px-3.5 py-2.5 text-[13px] text-brand font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg bg-brand text-white text-[13px] font-semibold hover:bg-brand-deep transition-colors disabled:opacity-60"
          >
            {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar usuário'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export function UsersPage() {
  const { user: me } = useAuth();
  const qc = useQueryClient();

  const [editingUser,  setEditingUser]  = useState<UserApi | null>(null);
  const [creatingNew,  setCreatingNew]  = useState(false);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);
  const [deleteError,  setDeleteError]  = useState('');

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

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['users'] }); setDeletingId(null); },
    onError:    (err: any) => setDeleteError(err.response?.data?.error ?? err.message),
  });

  function handleSaved() {
    qc.invalidateQueries({ queryKey: ['users'] });
    setEditingUser(null);
    setCreatingNew(false);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between gap-6 mb-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 mb-1.5">
            Administração · Sistema
          </div>
          <h1 className="text-[28px] font-bold text-ink">Gerenciar Usuários</h1>
        </div>
        <button
          onClick={() => setCreatingNew(true)}
          className="flex items-center gap-2 bg-brand text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg hover:bg-brand-deep transition-colors shadow-sm"
        >
          <Plus size={15} />
          Novo usuário
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Usuário</th>
              <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">E-mail</th>
              <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Nível</th>
              <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Loja vinculada</th>
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
                {/* Usuário */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                      <span className="text-[12px] font-bold text-brand">
                        {u.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-ink">{u.name}</div>
                      {u.id === me?.id && (
                        <div className="text-[10px] text-gray-400">você</div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Email */}
                <td className="px-4 py-3.5 text-[13px] text-gray-600 font-mono">{u.email}</td>

                {/* Nível */}
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${LEVEL_COLOR[u.type]}`}>
                    {u.type === 'ADMIN_1' ? <ShieldCheck size={10} /> :
                     u.type === 'USER'    ? <Eye size={10} />         :
                                           <Users size={10} />}
                    {LEVEL_LABEL[u.type]}
                  </span>
                </td>

                {/* Loja */}
                <td className="px-4 py-3.5 text-[13px] text-gray-600">
                  {u.loja ? (
                    <div>
                      <div className="font-medium text-ink">{u.loja.name}</div>
                      <div className="text-[11px] text-gray-400">{u.loja.cidade}</div>
                    </div>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>

                {/* Ações */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingUser(u)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-ink transition-colors"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    {u.id !== me?.id && (
                      <button
                        onClick={() => { setDeletingId(u.id); setDeleteError(''); }}
                        className="p-2 rounded-lg hover:bg-brand-tint text-gray-400 hover:text-brand transition-colors"
                        title="Excluir"
                      >
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

      {/* Confirm delete */}
      {deletingId && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={() => setDeletingId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 w-full max-w-sm">
              <h3 className="text-[17px] font-bold text-ink mb-2">Confirmar exclusão</h3>
              <p className="text-[13px] text-gray-500 mb-4">
                Esta ação não pode ser desfeita. O usuário perderá o acesso imediatamente.
              </p>
              {deleteError && (
                <div className="bg-brand-tint text-brand text-[12px] font-medium px-3 py-2 rounded-lg mb-3">
                  {deleteError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deletingId)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 py-2.5 rounded-lg bg-brand text-white text-[13px] font-semibold hover:bg-brand-deep transition-colors disabled:opacity-60"
                >
                  {deleteMutation.isPending ? 'Excluindo…' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Drawer criar */}
      {creatingNew && (
        <UserDrawer user={null} lojas={lojas} onClose={() => setCreatingNew(false)} onSaved={handleSaved} />
      )}

      {/* Drawer editar */}
      {editingUser && (
        <UserDrawer user={editingUser} lojas={lojas} onClose={() => setEditingUser(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}
