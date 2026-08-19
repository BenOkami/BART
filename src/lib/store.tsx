import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type {
  AppState,
  Entry,
  EntryType,
  SellerStats,
  Settings,
  Team,
  TeamStats,
} from "../types";
import { daysAgoISO, uid } from "./utils";

const STORAGE_KEY = "arena-vendas-state-v2";

/* ------------------------------------------------------------------ */
/* seed: as 5 equipes da temporada                                     */
/* ------------------------------------------------------------------ */

/** RNG determinístico para a demonstração ser estável. */
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedState(): AppState {
  const settings: Settings = { reaisPerPoint: 100, pointsPerIndicacao: 5 };

  const teamDefs = [
    { name: "Jacaré", color: "#a8e34d", members: ["Marcos Ferreira", "Juliana Castro", "Pedro Almeida"] },
    { name: "Tubarão", color: "#4cc9f0", members: ["Renata Souza", "Carlos Eduardo Lima", "Fernanda Rocha"] },
    { name: "Capivara", color: "#ffc53d", members: ["Thiago Barbosa", "Larissa Mendes", "Gustavo Nunes"] },
    { name: "Águia", color: "#b78bff", members: ["Camila Duarte", "Rafael Teixeira", "Beatriz Carvalho"] },
    { name: "Lobo", color: "#c9d4e8", members: ["André Martins", "Paula Ribeiro", "Diego Santana"] },
  ];

  const teams: Team[] = teamDefs.map((t) => ({ id: uid(), name: t.name, color: t.color }));
  const sellers = teamDefs.flatMap((t, ti) =>
    t.members.map((name) => ({ id: uid(), name, teamId: teams[ti].id }))
  );

  const notes = ["plano anual", "upgrade de plano", "renovação antecipada", "fechamento relâmpago", ""];
  const rnd = mulberry32(20260212);
  const entries: Entry[] = [];
  let seq = 0;

  for (const seller of sellers) {
    const saleCount = 2 + Math.floor(rnd() * 2); // 2–3 vendas
    for (let i = 0; i < saleCount; i++) {
      const value = Math.round((900 + rnd() * 4300) / 10) * 10;
      entries.push({
        id: uid(),
        type: "venda",
        sellerId: seller.id,
        value,
        points: Math.max(1, Math.round(value / settings.reaisPerPoint)),
        note: notes[Math.floor(rnd() * notes.length)],
        date: daysAgoISO(Math.floor(rnd() * 12)),
        createdAt: Date.now() - seq++ * 60_000,
      });
    }
    const indCount = Math.floor(rnd() * 5); // 0–4 indicações
    for (let i = 0; i < indCount; i++) {
      entries.push({
        id: uid(),
        type: "indicacao",
        sellerId: seller.id,
        value: 0,
        points: settings.pointsPerIndicacao,
        note: "",
        date: daysAgoISO(Math.floor(rnd() * 12)),
        createdAt: Date.now() - seq++ * 60_000,
      });
    }
  }

  return { teams, sellers, entries, settings };
}

/* ------------------------------------------------------------------ */
/* persistência                                                        */
/* ------------------------------------------------------------------ */

function loadInitial(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (
        parsed &&
        Array.isArray(parsed.teams) &&
        Array.isArray(parsed.sellers) &&
        Array.isArray(parsed.entries) &&
        parsed.settings
      ) {
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  return seedState();
}

/* ------------------------------------------------------------------ */
/* reducer                                                             */
/* ------------------------------------------------------------------ */

type Action =
  | { type: "ADD_TEAM"; name: string; color: string }
  | { type: "RENAME_TEAM"; id: string; name: string }
  | { type: "SET_TEAM_COLOR"; id: string; color: string }
  | { type: "DELETE_TEAM"; id: string }
  | { type: "ADD_SELLER"; name: string; teamId: string }
  | { type: "DELETE_SELLER"; id: string }
  | { type: "ADD_ENTRY"; entry: Entry }
  | { type: "DELETE_ENTRY"; id: string }
  | { type: "SET_SETTINGS"; settings: Settings }
  | { type: "RESET_DEMO" }
  | { type: "CLEAR_ENTRIES" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "ADD_TEAM":
      return { ...state, teams: [...state.teams, { id: uid(), name: action.name, color: action.color }] };
    case "RENAME_TEAM":
      return { ...state, teams: state.teams.map((t) => (t.id === action.id ? { ...t, name: action.name } : t)) };
    case "SET_TEAM_COLOR":
      return { ...state, teams: state.teams.map((t) => (t.id === action.id ? { ...t, color: action.color } : t)) };
    case "DELETE_TEAM":
      return {
        ...state,
        teams: state.teams.filter((t) => t.id !== action.id),
        sellers: state.sellers.filter((s) => s.teamId !== action.id),
      };
    case "ADD_SELLER":
      return { ...state, sellers: [...state.sellers, { id: uid(), name: action.name, teamId: action.teamId }] };
    case "DELETE_SELLER":
      return { ...state, sellers: state.sellers.filter((s) => s.id !== action.id) };
    case "ADD_ENTRY":
      return { ...state, entries: [action.entry, ...state.entries] };
    case "DELETE_ENTRY":
      return { ...state, entries: state.entries.filter((e) => e.id !== action.id) };
    case "SET_SETTINGS":
      return { ...state, settings: action.settings };
    case "RESET_DEMO":
      return seedState();
    case "CLEAR_ENTRIES":
      return { ...state, entries: [] };
    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/* contexto                                                            */
/* ------------------------------------------------------------------ */

interface StoreValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  addEntry: (data: { type: EntryType; sellerId: string; value: number; note: string; date: string }) => Entry;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage indisponível */
    }
  }, [state]);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      dispatch,
      addEntry: (data) => {
        const entry: Entry = {
          id: uid(),
          type: data.type,
          sellerId: data.sellerId,
          value: data.type === "venda" ? data.value : 0,
          points: computePoints(data.type, data.value, state.settings),
          note: data.note,
          date: data.date,
          createdAt: Date.now(),
        };
        dispatch({ type: "ADD_ENTRY", entry });
        return entry;
      },
    }),
    [state]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore deve ser usado dentro de StoreProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/* pontuação e seletores                                               */
/* ------------------------------------------------------------------ */

export function computePoints(type: EntryType, value: number, settings: Settings): number {
  if (type === "indicacao") return settings.pointsPerIndicacao;
  return Math.max(1, Math.round(value / Math.max(1, settings.reaisPerPoint)));
}

export function sortedEntries(state: AppState): Entry[] {
  return [...state.entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

export function getSellerStats(state: AppState): Map<string, SellerStats> {
  const map = new Map<string, SellerStats>();
  for (const s of state.sellers) {
    map.set(s.id, { sellerId: s.id, points: 0, sales: 0, saleValue: 0, indications: 0 });
  }
  const sellerById = new Map(state.sellers.map((s) => [s.id, s]));
  for (const e of state.entries) {
    if (!sellerById.has(e.sellerId)) continue;
    const st = map.get(e.sellerId)!;
    st.points += e.points;
    if (e.type === "venda") {
      st.sales += 1;
      st.saleValue += e.value;
    } else {
      st.indications += 1;
    }
  }
  return map;
}

export function getTeamStats(state: AppState): Map<string, TeamStats> {
  const map = new Map<string, TeamStats>();
  for (const t of state.teams) {
    map.set(t.id, { teamId: t.id, points: 0, sales: 0, saleValue: 0, indications: 0, members: 0 });
  }
  const teamBySeller = new Map(state.sellers.map((s) => [s.id, s.teamId]));
  for (const s of state.sellers) {
    const st = map.get(s.teamId);
    if (st) st.members += 1;
  }
  for (const e of state.entries) {
    const teamId = teamBySeller.get(e.sellerId);
    if (!teamId) continue;
    const st = map.get(teamId);
    if (!st) continue;
    st.points += e.points;
    if (e.type === "venda") {
      st.sales += 1;
      st.saleValue += e.value;
    } else {
      st.indications += 1;
    }
  }
  return map;
}
