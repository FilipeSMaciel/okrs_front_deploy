export interface KrValue {
  atual: number | null;
  meta: number | null;
}

export interface DadosFinanceiros {
  cartaoPct:     KrValue;
  avistaPct:     KrValue;
  ticketMedio:   KrValue;
  inadimplencia: KrValue;
  totalVendas:   number;
  valorTotal:    number;
}

export interface DetalheGrife {
  grife:  string;
  valor:  number;
  pct:    number;
}

export interface BinniGrupoDetalhe {
  valorTotal:  number;
  valorBinni:  number;
  outrasValor: number;
  items:       Array<{ grife: string; valor: number }>;
}

export interface DetalheLente {
  referencia: string;
  valor:      number;
  pct:        number;
}

export interface DadosOperacionais {
  garantiasCancelamentos: {
    pct:   number | null;
    qtd:   number;
    total: number;
  };
  luzter: {
    pct:             number | null;
    valorLuzter:     number;
    valorTotalLentes: number;
    outras:          { pct: number; valor: number } | null;
    detalhes:        DetalheLente[];
  };
  binni: {
    pct:               number | null;
    valorBinni:        number;
    valorTotalArmacoes: number;
    outras:            { pct: number; valor: number } | null;
    detalhes:          DetalheGrife[];
    porGrupo:          Record<string, BinniGrupoDetalhe> | null;
  };
}

export interface DashboardData {
  cnpj:        string;
  trimestre:   string;
  loja:        { id: string; name: string; cidade: string | null };
  periodo:     { inicio: string; fim: string };
  financeiro:  DadosFinanceiros;
  operacional: DadosOperacionais | null;
}

export interface Loja {
  sigla: string;
  name:  string;
  cnpj:  string;
}

// Resposta do GET /geral/:trimestre
export interface GeralFinanceiro {
  calculadoEm:  string | null;
  totalVendas:  number | null;
  valorTotal:   number | null;
  cartaoPct:    { atual: number | null; meta: number };
  avistaPct:    { atual: number | null; meta: number };
  ticketMedio:  { atual: number | null; meta: number };
  inadimplencia:{ atual: number | null; meta: number };
}

export interface GeralOperacional {
  calculadoEm:            string | null;
  garantiasCancelamentos: { atual: number | null; meta: number };
  luzter:                 { atual: number | null; meta: number };
  binni:                  { atual: number | null; meta: number };
}

export interface GeralLoja {
  id:          string;
  name:        string;
  cnpj:        string;
  cidade:      string | null;
  financeiro:  GeralFinanceiro  | null;
  operacional: GeralOperacional | null;
}

export interface GeralResponse {
  trimestre: string;
  total:     number;
  lojas:     GeralLoja[];
}
