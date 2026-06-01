import { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DetailItem {
  label: string;
  valor: number;
  pct:   number; // % sobre o total da categoria (lentes ou armações)
}

export interface DetailPanelProps {
  open:         boolean;
  onClose:      () => void;
  tag:          string;
  name:         string;
  items:        DetailItem[];
  valorGrupo:   number;
  valorTotal:   number;
  pctGrupo:     number | null;
  labelGrupo:   string; // ex: "Total Luzter", "Total Binni/Volt"
  labelTotal:   string; // ex: "Total em lentes", "Total em armações"
  outrasPct?:   number | null;
  outrasValor?: number | null;
}

function fmtR$(v: number) {
  return v.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
}

export function DetailPanel({
  open, onClose,
  tag, name,
  items,
  valorGrupo, valorTotal, pctGrupo,
  labelGrupo, labelTotal,
  outrasPct, outrasValor,
}: DetailPanelProps) {

  // Fecha com ESC e trava scroll do body
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxValor = items[0]?.valor || 1;

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-[520px] max-h-[88vh] flex flex-col pointer-events-auto">

        {/* header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="text-[10.5px] font-bold tracking-widest uppercase text-brand">{tag}</div>
            <h2 className="text-[20px] font-bold text-ink mt-0.5 leading-tight">{name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-ink shrink-0 mt-0.5"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* cabeçalho da lista */}
        <div className="px-6 pt-4 pb-2 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">
          <span>Item</span>
          <div className="flex items-center gap-4">
            <span className="w-20 text-right">Faturamento</span>
            <span className="w-10 text-right">% total</span>
          </div>
        </div>

        {/* lista */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-3.5">
          {items.length === 0 ? (
            <div className="text-center text-gray-400 py-10 text-sm">Sem dados disponíveis</div>
          ) : items.map((item, i) => (
            <div key={item.label + i}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-[10px] text-gray-300 w-5 shrink-0 text-right">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className="text-[13px] font-medium text-ink flex-1 truncate"
                  title={item.label}
                >
                  {item.label}
                </span>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-mono text-[12px] text-gray-500 w-20 text-right">
                    {fmtR$(item.valor)}
                  </span>
                  <span className="text-[12px] font-semibold text-ink w-10 text-right">
                    {item.pct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden ml-7">
                <div
                  className="h-full bg-brand rounded-full"
                  style={{ width: `${(item.valor / maxValor) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* rodapé — totais */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 space-y-2.5">
          {/* grupo (Luzter / Binni+Volt) */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink">{labelGrupo}</span>
            <div className="flex items-center gap-4">
              <span className="font-mono text-[12px] text-gray-500 w-20 text-right">
                {fmtR$(valorGrupo)}
              </span>
              <span className="text-[13px] font-bold text-brand w-10 text-right">
                {pctGrupo != null ? `${pctGrupo.toFixed(1)}%` : '—'}
              </span>
            </div>
          </div>

          {/* outras */}
          {outrasPct != null && outrasValor != null && (
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-gray-500">Outras</span>
              <div className="flex items-center gap-4">
                <span className="font-mono text-[12px] text-gray-400 w-20 text-right">
                  {fmtR$(outrasValor)}
                </span>
                <span className="text-[13px] text-gray-500 w-10 text-right">
                  {outrasPct.toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          {/* total geral */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <span className="text-[13px] text-gray-600 font-medium">{labelTotal}</span>
            <span className="text-[14px] font-bold text-ink">{fmtR$(valorTotal)}</span>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
