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
import { supabase } from "./supabase";
import {
  DEFAULT_SETTINGS,
  deleteAllEntries,
  deleteAllTeamsAndSellers,
  deleteEntry,
  deleteSeller,
  deleteTeam,
  fetchInitialState,
  insertEntry,
  insertManyTeams,
  insertSeller,
  insertTeam,
  rowToEntry,
  rowToSeller,
  rowToSettings,
  rowToTeam,
  settingsToRow,
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
  | { type: "CLEAR_ENTRIES" }
  | { type: "REMOTE"; state: AppState };

/** Aplica as mudanças no estado local (usado como fallback sem nuvem). */
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

  /* carga inicial + assinatura em tempo real */
  useEffect(() => {
    if (!supabase) {
      // Sem configuração: o app continua usável em modo local.
      setState(seedState());
      setStatus("error");
      setLoading(false);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const initial = await fetchInitialState();
        if (cancelled) return;
        setState(initial);
        setLoading(false);

        unsubscribe = subscribeArena(
          (table, event, row) => {
            setState((prev) => {
              if (table === "teams") {
                const r = row as TeamRow;
                if (event === "DELETE") return { ...prev, teams: prev.teams.filter((t) => t.id !== r.id) };
                const t = rowToTeam(r);
                const exists = prev.teams.some((x) => x.id === t.id);
                return {
                  ...prev,
                  teams: exists ? prev.teams.map((x) => (x.id === t.id ? t : x)) : [...prev.teams, t],
                };
              }
              if (table === "sellers") {
                const r = row as SellerRow;
                if (event === "DELETE") return { ...prev, sellers: prev.sellers.filter((s) => s.id !== r.id) };
                const s = rowToSeller(r);
                const exists = prev.sellers.some((x) => x.id === s.id);
                return {
                  ...prev,
                  sellers: exists ? prev.sellers.map((x) => (x.id === s.id ? s : x)) : [...prev.sellers, s],
                };
              }
              const r = row as EntryRow;
              if (event === "DELETE") return { ...prev, entries: prev.entries.filter((e) => e.id !== r.id) };
              const e = rowToEntry(r);
              const exists = prev.entries.some((x) => x.id === e.id);
              return {
                ...prev,
                entries: exists ? prev.entries.map((x) => (x.id === e.id ? e : x)) : [e, ...prev.entries],
              };
            });
          },
          (row: SettingsRow) => setState((prev) => ({ ...prev, settings: rowToSettings(row) })),
          (s) => setStatus(s === "online" ? "online" : "offline")
        );
        setStatus("online");
      } catch (err) {
        console.warn("Falha ao carregar dados do Supabase:", err);
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

  /** Sem nuvem configurada/disponível → muta localmente para o app seguir usável. */
  const dispatchLocal = (action: Action) => setState((s) => applyLocal(s, action));

  const dispatch = useMemo<Dispatch<Action>>(() => {
    return (action: Action) => {
      // Com nuvem, a interface atualiza pelo eco do Realtime.
      if (supabase && status === "online") {
        switch (action.type) {
          case "ADD_TEAM":
            void insertTeam(action.team).then(logError);
            return;
          case "RENAME_TEAM":
            void updateTeam(action.id, { name: action.name }).then(logError);
            return;
          case "SET_TEAM_COLOR":
            void updateTeam(action.id, { color: action.color }).then(logError);
            return;
          case "DELETE_TEAM":
            void deleteTeam(action.id).then(logError);
            return;
          case "ADD_SELLER":
            void insertSeller(action.seller).then(logError);
            return;
          case "DELETE_SELLER":
            void deleteSeller(action.id).then(logError);
            return;
          case "ADD_ENTRY":
            void insertEntry(action.entry).then(logError);
            return;
          case "DELETE_ENTRY":
            void deleteEntry(action.id).then(logError);
            return;
          case "SET_SETTINGS":
            void updateSettings(action.settings).then(logError);
            return;
          case "RESET_DEMO":
            void (async () => {
              await deleteAllEntries();
              await deleteAllTeamsAndSellers();
              await insertManyTeams(action.teams);
            })().catch((err) => console.warn("Supabase:", err));
            return;
          case "CLEAR_ENTRIES":
            void deleteAllEntries().then(logError);
            return;
        }
      }
      // Fallback: sem conexão ou sem configuração → aplica local.
      dispatchLocal(action);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

function logError(res: { error: Error | null } | null) {
  if (res?.error) console.warn("Supabase:", res.error.message);
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
