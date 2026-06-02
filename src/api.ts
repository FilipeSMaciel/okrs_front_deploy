import axios from 'axios';
import type { DashboardData, DadosOperacionais, GeralResponse } from './types';

const api = axios.create({
  baseURL:         import.meta.env.VITE_API_URL || 'https://okrsapideploy.vercel.app',
  withCredentials: true,
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
export async function getDashboard(cnpj: string, trimestre: string, force = false): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>(`/consulta/${trimestre}`, { params: { cnpj, ...(force ? { force: 'true' } : {}) } });
  return data;
}

export async function getOperacional(cnpj: string, trimestre: string, force = false): Promise<DadosOperacionais> {
  const { data } = await api.get<{ operacional: DadosOperacionais }>(`/operacional/${trimestre}`, { params: { cnpj, ...(force ? { force: 'true' } : {}) } });
  return data.operacional;
}

export async function getGeral(trimestre: string): Promise<GeralResponse> {
  const { data } = await api.get<GeralResponse>(`/geral/${trimestre}`);
  return data;
}

// ── Metas (ADMIN_2+) ──────────────────────────────────────────────────────────
export interface MetasFinanceiras {
  cartaoMeta:       number;
  avistaMeta:       number;
  ticketMeta:       number;
  inadimplenciaMeta: number;
}

export interface MetasOperacionais {
  garantiasMeta: number;
  luzterMeta:    number;
  binniMeta:     number;
}

export async function saveMetas(cnpj: string, trimestre: string, metas: MetasFinanceiras) {
  const { data } = await api.patch(`/consulta/${trimestre}`, metas, { params: { cnpj } });
  return data;
}

export async function saveMetasOp(cnpj: string, trimestre: string, metas: MetasOperacionais) {
  const { data } = await api.patch(`/operacional/${trimestre}`, metas, { params: { cnpj } });
  return data;
}

// ── Usuários (ADMIN_1) ────────────────────────────────────────────────────────
export interface LojaSimples {
  id:     string;
  name:   string;
  cnpj:   string;
  cidade: string | null;
  sigla:  string;
}

export interface RegiaoApi {
  id:    string;
  nome:  string;
  lojas: LojaSimples[];
}

export interface UserApi {
  id:     string;
  name:   string;
  email:  string;
  type:   'LOJA' | 'GERENTE' | 'DIRECAO' | 'ADMINISTRATIVO' | 'TI';
  loja:   LojaSimples | null;
  lojas:  LojaSimples[];
  regiao:            { id: string; nome: string } | null;
  showActivityPanel: boolean;
}

export interface CreateUserPayload {
  name:               string;
  email:              string;
  password:           string;
  type:               UserApi['type'];
  lojaId?:            string | null;
  lojaIds?:           string[];
  regiaoId?:          string | null;
  showActivityPanel?: boolean;
}

export interface UpdateUserPayload {
  name?:               string;
  password?:           string;
  type?:               UserApi['type'];
  lojaId?:             string | null;
  lojaIds?:            string[];
  regiaoId?:           string | null;
  showActivityPanel?:  boolean;
}

export async function getUsers(): Promise<UserApi[]> {
  const { data } = await api.get<UserApi[]>('/auth/users');
  return data;
}

export async function createUser(payload: CreateUserPayload): Promise<UserApi> {
  const { data } = await api.post<UserApi>('/auth/users', payload);
  return data;
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<UserApi> {
  const { data } = await api.patch<UserApi>(`/auth/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/auth/users/${id}`);
}

export async function getLojas(): Promise<LojaSimples[]> {
  const { data } = await api.get<LojaSimples[]>('/auth/lojas');
  return data;
}

export async function getRegioes(): Promise<RegiaoApi[]> {
  const { data } = await api.get<RegiaoApi[]>('/auth/regioes');
  return data;
}

export async function createRegiao(payload: { nome: string; lojaIds: string[] }): Promise<RegiaoApi> {
  const { data } = await api.post<RegiaoApi>('/auth/regioes', payload);
  return data;
}

export async function updateRegiao(id: string, payload: { nome?: string; lojaIds?: string[] }): Promise<RegiaoApi> {
  const { data } = await api.patch<RegiaoApi>(`/auth/regioes/${id}`, payload);
  return data;
}

export async function deleteRegiao(id: string): Promise<void> {
  await api.delete(`/auth/regioes/${id}`);
}

// ── Analytics (TI) ────────────────────────────────────────────────────────────
export interface AnalyticsData {
  loginsPorDia:  { data: string; total: number }[];
  rankingLojas:  { lojaNome: string; cnpj: string; cidade: string | null; acessos: number }[];
  recentesMetas: { id: string; userName: string; createdAt: string; payload: unknown }[];
  ativosHoje:    number;
  totalLogins7d: number;
  metaEdits7d:   number;
}

export async function getAnalytics(): Promise<AnalyticsData> {
  const { data } = await api.get<AnalyticsData>('/auth/analytics');
  return data;
}
