import { useState } from 'react';
import { X, Target, Save, CheckCircle } from 'lucide-react';
import { saveMetas, saveMetasOp } from '../api';
import type { DadosFinanceiros } from '../types';

interface Props {
  cnpj:       string;
  trimestre:  string;
  storeName:  string;
  financeiro: DadosFinanceiros | null;
  onClose:    () => void;
  onSaved?:   () => void;
}

function FieldNum({
  label,
  hint,
  value,
  onChange,
  unit,
  step = 1,
}: {
  label:    string;
  hint?:    string;
  value:    string;
  onChange: (v: string) => void;
  unit:     '%' | 'R$';
  step?:    number;
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-ink mb-1">{label}</label>
      {hint && <p className="text-[11px] text-gray-400 mb-1.5 leading-snug">{hint}</p>}
      <div className="relative">
        {unit === 'R$' && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 font-semibold pointer-events-none">
            R$
          </span>
        )}
        <input
          type="number"
          min={0}
          step={step}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full border border-gray-200 rounded-lg py-2.5 text-sm font-semibold focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-colors text-right ${
            unit === 'R$' ? 'pl-8 pr-3.5' : 'px-3.5'
          }`}
        />
        {unit === '%' && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 font-semibold pointer-events-none">
            %
          </span>
        )}
      </div>
    </div>
  );
}

export function MetasDrawer({ cnpj, trimestre, storeName, financeiro, onClose, onSaved }: Props) {
  // ── Estado: metas financeiras ────────────────────────────────────────────────
  const [cartaoMeta,       setCartaoMeta]       = useState(String(financeiro?.cartaoPct.meta     ?? 50));
  const [avistaMeta,       setAvistaMeta]       = useState(String(financeiro?.avistaPct.meta     ?? 30));
  const [ticketMeta,       setTicketMeta]       = useState(String(financeiro?.ticketMedio.meta   ?? 600));
  const [inadimplenciaMeta,setInadimplenciaMeta]= useState(String(financeiro?.inadimplencia.meta ?? 5));

  // ── Estado: metas operacionais ───────────────────────────────────────────────
  const [garantiasMeta, setGarantiasMeta] = useState('5');
  const [luzterMeta,    setLuzterMeta]    = useState('85');
  const [binniMeta,     setBinniMeta]     = useState('35');

  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState('');

  async function handleSave() {
    setError('');
    setSaving(true);
    setSaved(false);

    const fin = {
      cartaoMeta:        Number(cartaoMeta),
      avistaMeta:        Number(avistaMeta),
      ticketMeta:        Number(ticketMeta),
      inadimplenciaMeta: Number(inadimplenciaMeta),
    };
    const op = {
      garantiasMeta: Number(garantiasMeta),
      luzterMeta:    Number(luzterMeta),
      binniMeta:     Number(binniMeta),
    };

    console.log('[MetasDrawer] salvando →', { cnpj, trimestre, fin, op });

    try {
      const [resF, resOp] = await Promise.all([
        saveMetas(cnpj, trimestre, fin),
        saveMetasOp(cnpj, trimestre, op),
      ]);
      console.log('[MetasDrawer] ✓ financeiro:', resF);
      console.log('[MetasDrawer] ✓ operacional:', resOp);
      setSaved(true);
      onSaved?.();
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      const msg = err.response?.data?.error ?? err.message ?? 'Erro ao salvar metas.';
      console.error('[MetasDrawer] ERRO:', err.response?.status, err.response?.data ?? err.message);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-[400px] max-w-full bg-white shadow-2xl flex flex-col animate-slide-in">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-[10.5px] font-bold tracking-widest uppercase text-brand flex items-center gap-1.5">
              <Target size={10} />
              Configurar Metas
            </div>
            <h2 className="text-[18px] font-bold text-ink mt-0.5 leading-tight">{storeName}</h2>
            <div className="text-[11px] text-gray-400 mt-0.5">{trimestre} · CNPJ {cnpj}</div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scroll area */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Bloco financeiro */}
          <div>
            <div className="flex items-center gap-2 mb-3.5">
              <span className="font-mono text-[10px] font-bold text-brand bg-brand-tint px-2 py-0.5 rounded tracking-wider">1.3</span>
              <span className="text-[13px] font-bold text-ink">Prosperidade com Segurança</span>
            </div>
            <div className="space-y-3.5">
              <FieldNum
                label="Meta · Participação Cartão"
                hint="% mínimo de vendas pagas com cartão"
                value={cartaoMeta}
                onChange={setCartaoMeta}
                unit="%"
              />
              <FieldNum
                label="Meta · Participação À Vista"
                hint="% mínimo de vendas à vista"
                value={avistaMeta}
                onChange={setAvistaMeta}
                unit="%"
              />
              <FieldNum
                label="Meta · Ticket Médio"
                hint="Valor médio mínimo por venda"
                value={ticketMeta}
                onChange={setTicketMeta}
                unit="R$"
                step={10}
              />
              <FieldNum
                label="Meta · Inadimplência"
                hint="% máximo de inadimplência (inverso — menor é melhor)"
                value={inadimplenciaMeta}
                onChange={setInadimplenciaMeta}
                unit="%"
                step={0.5}
              />
            </div>
          </div>

          {/* Divisor */}
          <div className="border-t border-gray-100" />

          {/* Bloco operacional */}
          <div>
            <div className="flex items-center gap-2 mb-3.5">
              <span className="font-mono text-[10px] font-bold text-brand bg-brand-tint px-2 py-0.5 rounded tracking-wider">1.4</span>
              <span className="text-[13px] font-bold text-ink">Operar com Excelência</span>
            </div>
            <div className="space-y-3.5">
              <FieldNum
                label="Meta · Garantias e Cancelamentos"
                hint="% máximo de garantias (inverso — menor é melhor)"
                value={garantiasMeta}
                onChange={setGarantiasMeta}
                unit="%"
                step={0.5}
              />
              <FieldNum
                label="Meta · Adesão Luzter"
                hint="% mínimo de vendas com lentes Luzter"
                value={luzterMeta}
                onChange={setLuzterMeta}
                unit="%"
              />
              <FieldNum
                label="Meta · Adesão Binni / Volt"
                hint="% mínimo de vendas com armações Binni/Volt"
                value={binniMeta}
                onChange={setBinniMeta}
                unit="%"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-brand-tint border border-brand/20 rounded-lg px-3.5 py-2.5 text-[13px] text-brand font-medium">
              {error}
            </div>
          )}

          {/* Success */}
          {saved && (
            <div className="bg-ok-soft border border-ok/20 rounded-lg px-3.5 py-2.5 text-[13px] text-ok font-medium flex items-center gap-2">
              <CheckCircle size={14} />
              Metas salvas com sucesso!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg bg-brand text-white text-[13px] font-semibold hover:bg-brand-deep transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (
              'Salvando…'
            ) : (
              <>
                <Save size={14} />
                Salvar metas
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
