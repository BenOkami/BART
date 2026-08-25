import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
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
import { uid } from "./utils";
import {
  DEFAULT_SETTINGS,
  deleteAllEntries,
  deleteAllTeamsAndSellers,
  deleteEntry,
  deleteSeller,
  deleteTeamRow,
  fetchInitialState,
  insertEntry,
  insertManyTeams,
  insertSeller,
  insertTeam,
  subscribeArena,
  updateSettings,
  updateTeam,
  type EntryRow,
  type SellerRow,
  type SettingsRow,
  type TeamRow,
} from "./sync";

/* ------------------------------------------------------------------ */
/* Estado inicial: as 5 equipes da temporada, zeradas                  */
/* ------------------------------------------------------------------ */

export function seedState(): AppState {
  const teams: Team[] = [
    { name: "Jacaré", color: "#a8e34d" },
    { name: "Tubarão", color: "#4cc9f0" },
    { name: "Capivara", color: "#ffc53d" },
    { name: "Águia", color: "#b78bff" },
    { name: "Lobo", color: "#c9d4e8" },
  ].map((t) => ({ id: uid(), name: t.name, color: t.color, createdAt: Date.now() }));

  return { teams, sellers: [], entries: [], settings: { ...DEFAULT_SETTINGS } };
}

/* ------------------------------------------------------------------ */
/* Ações                                                               */
/* ------------------------------------------------------------------ */

type Action =
  | { type: "ADD_TEAM"; team: Team }
  | { type: "RENAME_TEAM"; id: string; name: string }
  | { type: "SET_TEAM_COLOR"; id: string; color: string }
  | { type: "DELETE_TEAM"; id: string }
  | { type: "ADD_SELLER"; seller: { id: string; name: string; teamId: string; createdAt: number } }
  | { type: "DELETE_SELLER"; id: string }
  | { type: "ADD_ENTRY"; entry: Entry }
  | { type: "DELETE_ENTRY"; id: string }
  | { type: "SET_SETTINGS"; settings: Settings }
  | { type: "RESET_DEMO"; teams: Team[] }
  | { type: "CLEAR_ENTRIES" };

/** Aplica as mudanças no estado local (fallback quando a nuvem não responde). */
function applyLocal(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "ADD_TEAM":
      return { ...state, teams: [...state.teams, action.team] };
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
      return { ...state, sellers: [...state.sellers, action.seller] };
    case "DELETE_SELLER":
      return { ...state, sellers: state.sellers.filter((s) => s.id !== action.id) };
    case "ADD_ENTRY":
      return { ...state, entries: [action.entry, ...state.entries] };
    case "DELETE_ENTRY":
      return { ...state, entries: state.entries.filter((e) => e.id !== action.id) };
    case "SET_SETTINGS":
      return { ...state, settings: action.settings };
    case "RESET_DEMO":
      return { ...state, teams: action.teams, sellers: [], entries: [] };
    case "CLEAR_ENTRIES":
      return { ...state, entries: [] };
    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/* Contexto                                                            */
/* ------------------------------------------------------------------ */

export type SyncStatus = "connecting" | "online" | "offline" | "error";

interface StoreValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  addEntry: (d: { type: EntryType; sellerId: string; value: number; note: string; date: string }) => Entry;
  /** true enquanto carrega os dados da nuvem pela primeira vez */
  loading: boolean;
  status: SyncStatus;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => seedState());
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SyncStatus>("connecting");

  /* conectividade do navegador (para o modo offline) */
  useEffect(() => {
    const goOffline = () => setStatus("offline");
    const goOnline = () => setStatus((s) => (s === "error" ? s : "online"));
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  /* carga inicial + assinatura em tempo real */
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const initial = await fetchInitialState();
        if (cancelled) return;
        setState(initial);
        setLoading(false);
        setStatus("online");

        unsubscribe = subscribeArena(
          (table, event, row) => {
            setState((prev) => {
              if (table === "teams") {
                const r = row as TeamRow;
                if (event === "DELETE") return { ...prev, teams: prev.teams.filter((t) => t.id !== r.id) };
                const t = {
                  id: r.id,
                  name: r.name,
                  color: r.color,
                  createdAt: r.createdAt ?? Date.now(),
                };
                const exists = prev.teams.some((x) => x.id === t.id);
                return {
                  ...prev,
                  teams: exists ? prev.teams.map((x) => (x.id === t.id ? t : x)) : [...prev.teams, t],
                };
              }
              if (table === "sellers") {
                const r = row as SellerRow;
                if (event === "DELETE") return { ...prev, sellers: prev.sellers.filter((s) => s.id !== r.id) };
                const s = {
                  id: r.id,
                  name: r.name,
                  teamId: r.teamId,
                  createdAt: r.createdAt ?? Date.now(),
                };
                const exists = prev.sellers.some((x) => x.id === s.id);
                return {
                  ...prev,
                  sellers: exists ? prev.sellers.map((x) => (x.id === s.id ? s : x)) : [...prev.sellers, s],
                };
              }
              const r = row as EntryRow;
              if (event === "DELETE") return { ...prev, entries: prev.entries.filter((e) => e.id !== r.id) };
              const e: Entry = {
                id: r.id,
                type: r.type,
                sellerId: r.sellerId,
                value: r.value,
                points: r.points,
                note: r.note,
                date: r.date,
                createdAt: r.createdAt ?? Date.now(),
              };
              const exists = prev.entries.some((x) => x.id === e.id);
              return {
                ...prev,
                entries: exists ? prev.entries.map((x) => (x.id === e.id ? e : x)) : [e, ...prev.entries],
              };
            });
          },
          (row: SettingsRow) =>
            setState((prev) => ({
              ...prev,
              settings: { reaisPerPoint: row.reaisPerPoint, pointsPerIndicacao: row.pointsPerIndicacao },
            }))
        );
      } catch (err) {
        console.warn("Falha ao carregar dados do Firestore:", err);
        if (!cancelled) {
          setStatus("error");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const dispatch = useMemo<Dispatch<Action>>(() => {
    return (action: Action) => {
      // Com nuvem conectada, a interface atualiza pelo eco do onSnapshot.
      if (status === "online") {
        switch (action.type) {
          case "ADD_TEAM":
            void insertTeam(action.team);
            return;
          case "RENAME_TEAM":
            void updateTeam(action.id, { name: action.name });
            return;
          case "SET_TEAM_COLOR":
            void updateTeam(action.id, { color: action.color });
            return;
          case "DELETE_TEAM":
            void deleteTeamRow(action.id);
            return;
          case "ADD_SELLER":
            void insertSeller(action.seller);
            return;
          case "DELETE_SELLER":
            void deleteSeller(action.id);
            return;
          case "ADD_ENTRY":
            void insertEntry(action.entry);
            return;
          case "DELETE_ENTRY":
            void deleteEntry(action.id);
            return;
          case "SET_SETTINGS":
            void updateSettings(action.settings);
            return;
          case "RESET_DEMO":
            void (async () => {
              await deleteAllEntries();
              await deleteAllTeamsAndSellers();
              await insertManyTeams(action.teams);
            })();
            return;
          case "CLEAR_ENTRIES":
            void deleteAllEntries();
            return;
        }
      }
      // Fallback: sem conexão ou erro de permissão → aplica localmente.
      setState((s) => applyLocal(s, action));
    };
  }, [status]);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      dispatch,
      loading,
      status,
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
    [state, dispatch, loading, status]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore deve ser usado dentro de StoreProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Pontuação e seletores                                               */
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
    map.set(s.id, { sellerId: s.id, points: 0, sales: 0, saleValue: 0 });
  }
  const sellerById = new Map(state.sellers.map((s) => [s.id, s]));
  for (const e of state.entries) {
    if (!sellerById.has(e.sellerId)) continue;
    const st = map.get(e.sellerId)!;
    st.points += e.points;
    st.sales += 1;
    st.saleValue += e.value;
  }
  return map;
}

export function getTeamStats(state: AppState): Map<string, TeamStats> {
  const map = new Map<string, TeamStats>();
  for (const t of state.teams) {
    map.set(t.id, { teamId: t.id, points: 0, sales: 0, saleValue: 0, members: 0 });
  }
  const teamBySeller = new Map(state.sellers.map((s) => [s.id, s.teamId]));
  for (const s of state.sellers) {
    const st = map.get(s.teamId);
    if (st) st.members += 1;
  }
  for (const e of state.entries) {
    const teamId = teamBySeller.get(e.sellerId);
    if (!teamId || e.type !== "venda") continue;
    const st = map.get(teamId);
    if (!st) continue;
    st.points += e.points;
    st.sales += 1;
    st.saleValue += e.value;
  }
  return map;
}
