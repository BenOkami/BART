export type EntryType = "venda" | "indicacao";

export interface Team {
  id: string;
  name: string;
  color: string;
}

export interface Seller {
  id: string;
  name: string;
  teamId: string;
}

export interface Entry {
  id: string;
  type: EntryType;
  sellerId: string;
  /** Valor em R$ (apenas para vendas; 0 para indicações) */
  value: number;
  /** Pontos creditados no momento do lançamento */
  points: number;
  note: string;
  /** yyyy-mm-dd */
  date: string;
  createdAt: number;
}

export interface Settings {
  /** 1 ponto a cada R$ X em vendas */
  reaisPerPoint: number;
  /** Pontos fixos por indicação registrada */
  pointsPerIndicacao: number;
}

export interface AppState {
  teams: Team[];
  sellers: Seller[];
  entries: Entry[];
  settings: Settings;
}

export interface SellerStats {
  sellerId: string;
  points: number;
  sales: number;
  saleValue: number;
  indications: number;
}

export interface TeamStats {
  teamId: string;
  points: number;
  sales: number;
  saleValue: number;
  indications: number;
  members: number;
}

export const TEAM_COLORS = [
  "#ff6b4a",
  "#4cc9f0",
  "#ffc53d",
  "#a8e34d",
  "#ff5c8a",
  "#2dd4bf",
  "#b78bff",
  "#ff9f45",
];
