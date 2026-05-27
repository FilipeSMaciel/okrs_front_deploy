import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-brand rounded-t-md rounded-b-3xl flex items-center justify-center shadow-lg mb-4">
            <span className="font-extrabold text-[14px] text-white leading-tight text-center">
              <small className="block font-medium text-[10px] tracking-widest lowercase opacity-85">ótica</small>
              Bilharva
            </span>
          </div>
          <h1 className="text-[22px] font-bold text-ink">Painel OKRs</h1>
          <p className="text-sm text-gray-500 mt-1">Acesso restrito — faça login para continuar</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-7 space-y-5"
        >
          {/* Email */}
          <div>
            <label className="block text-[13px] font-semibold text-ink mb-1.5">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com.br"
              required
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-colors"
            />
          </div>

          {/* Senha */}
          <div>
            <label className="block text-[13px] font-semibold text-ink mb-1.5">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Erro */}
          {error && (
            <div className="bg-brand-tint border border-brand/20 rounded-lg px-3.5 py-2.5 text-[13px] text-brand font-medium">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-brand text-white font-semibold text-[14px] py-2.5 rounded-lg hover:bg-brand-deep transition-colors disabled:opacity-60 shadow-sm"
          >
            <LogIn size={16} />
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-[11px] text-gray-400 mt-5">
          Sem conta? Solicite acesso ao administrador do sistema.
        </p>
      </div>
    </div>
  );
}
