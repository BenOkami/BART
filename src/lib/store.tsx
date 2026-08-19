import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import type {
  AppState,
  Entry,
  EntryType,
  Seller,
  SellerStats,
  Settings,
  Team,
  TeamStats,
} from "../types";
import { uid } from "./utils";
import { COL, db, SETTINGS_DOC } from "./firebase";

/* ------------------------------------------------------------------ */
/* tipos                                                               */
/* ------------------------------------------------------------------ */

export type CloudStatus = "connecting" | "online" | "offline" | "error";

const DEFAULT_SETTINGS: Settings = { reaisPerPoint: 100, pointsPerIndicacao: 5 };

/** As 5 equipes da temporada (restauração padrão) */
function seedTeams(): Team[] {
  const defs = [
    { name: "Jacaré", color: "#a8e34d" },
    { name: "Tubarão", color: "#4cc9f0" },
    { name: "Capivara", color: "#ffc53d" },
    { name: "Águia", color: "#b78bff" },
    { name: "Lobo", color: "#c9d4e8" },
  ];
  const now = Date.now();
  return defs.map((t, i) => ({ id: uid(), name: t.name, color: t.color, createdAt: now + i * 1000 }));
}

function emptyState(): AppState {
  return { teams: [], sellers: [], entries: [], settings: DEFAULT_SETTINGS };
}

/* Ações públicas (mesma API de antes — os componentes não mudam) */
export type Action =
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

/** Ações internas do reducer (inclui hidratação vinda da nuvem) */
type InternalAction =
  | Action
  | { type: "@HYDRATE_TEAMS"; teams: Team[] }
  | { type: "@HYDRATE_SELLERS"; sellers: Seller[] }
  | { type: "@HYDRATE_ENTRIES"; entries: Entry[] }
  | { type: "@HYDRATE_SETTINGS"; settings: Settings }
  | { type: "@RESET_LOCAL"; teams: Team[] };

function reducer(state: AppState, action: InternalAction): AppState {
  switch (action.type) {
    case "@HYDRATE_TEAMS":
      return { ...state, teams: action.teams };
    case "@HYDRATE_SELLERS":
      return { ...state, sellers: action.sellers };
    case "@HYDRATE_ENTRIES":
      return { ...state, entries: action.entries };
    case "@HYDRATE_SETTINGS":
      return { ...state, settings: action.settings };
    case "@RESET_LOCAL":
      return { teams: action.teams, sellers: [], entries: [], settings: state.settings };

    case "ADD_TEAM":
      // processado pelo provider (gera id antes de chegar aqui)
      return state;
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
      // processado pelo provider (gera id antes de chegar aqui)
      return state;
    case "DELETE_SELLER":
      return { ...state, sellers: state.sellers.filter((s) => s.id !== action.id) };
    case "ADD_ENTRY":
      return { ...state, entries: [action.entry, ...state.entries] };
    case "DELETE_ENTRY":
      return { ...state, entries: state.entries.filter((e) => e.id !== action.id) };
    case "SET_SETTINGS":
      return { ...state, settings: action.settings };
    case "RESET_DEMO":
      // processado pelo provider (gera equipes com id antes de chegar aqui)
      return state;
    case "CLEAR_ENTRIES":
      return { ...state, entries: [] };
    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/* escrita no Firestore (com lotes de no máx. 450 operações)           */
/* ------------------------------------------------------------------ */

async function batchDelete(paths: string[]) {
  for (let i = 0; i < paths.length; i += 450) {
    const batch = writeBatch(db);
    for (const p of paths.slice(i, i + 450)) {
      batch.delete(doc(db, p));
    }
    await batch.commit();
  }
}

/* ------------------------------------------------------------------ */
/* contexto                                                            */
/* ------------------------------------------------------------------ */

interface StoreValue {
  state: AppState;
  loading: boolean;
  status: CloudStatus;
  dispatch: (action: Action) => void;
  addEntry: (data: { type: EntryType; sellerId: string; value: number; note: string; date: string }) => Entry;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatchLocal] = useReducer(reducer, undefined, emptyState);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<CloudStatus>("connecting");

  const stateRef = useRef(state);
  stateRef.current = state;
  const everLoaded = useRef(false);
  const boot = useRef({ teams: false, sellers: false, entries: false, settings: false });

  const markOnline = useCallback(() => {
    if (navigator.onLine) setStatus((s) => (s === "offline" ? "online" : s));
  }, []);

  /* ---------- assinaturas em tempo real ---------- */
  useEffect(() => {
    const mark = (key: keyof typeof boot.current) => {
      boot.current[key] = true;
      if (Object.values(boot.current).every(Boolean) && !everLoaded.current) {
        everLoaded.current = true;
        setLoading(false);
        setStatus(navigator.onLine ? "online" : "offline");
      }
    };

    const onError = () => {
      if (!everLoaded.current) {
        everLoaded.current = true;
        setLoading(false);
      }
      setStatus("error");
    };

    const unsubTeams = onSnapshot(
      query(collection(db, COL.teams)),
      (snap) => {
        const teams = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Team, "id">) }))
          .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
        dispatchLocal({ type: "@HYDRATE_TEAMS", teams });
        mark("teams");
        markOnline();
      },
      onError
    );

    const unsubSellers = onSnapshot(
      query(collection(db, COL.sellers)),
      (snap) => {
        const sellers = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Seller, "id">) }))
          .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
        dispatchLocal({ type: "@HYDRATE_SELLERS", sellers });
        mark("sellers");
        markOnline();
      },
      onError
    );

    const unsubEntries = onSnapshot(
      query(collection(db, COL.entries)),
      (snap) => {
        const entries = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Entry, "id">) }));
        dispatchLocal({ type: "@HYDRATE_ENTRIES", entries });
        mark("entries");
        markOnline();
      },
      onError
    );

    const unsubSettings = onSnapshot(
      SETTINGS_DOC,
      (snap) => {
        if (snap.exists()) {
          dispatchLocal({ type: "@HYDRATE_SETTINGS", settings: { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<Settings>) } });
        } else {
          // garante que o documento exista com os padrões
          setDoc(SETTINGS_DOC, DEFAULT_SETTINGS).catch(() => {});
        }
        mark("settings");
        markOnline();
      },
      onError
    );

    const goOffline = () => setStatus("offline");
    const goOnline = () => setStatus(everLoaded.current ? "online" : "connecting");
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      unsubTeams();
      unsubSellers();
      unsubEntries();
      unsubSettings();
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [markOnline]);

  /* ---------- dispatch aprimorado: aplica local + grava na nuvem ---------- */
  const dispatch = useCallback((action: Action) => {
    const current = stateRef.current;

    const sync = async () => {
      switch (action.type) {
        case "ADD_TEAM": {
          const id = uid();
          dispatchLocal({ type: "@HYDRATE_TEAMS", teams: [...current.teams, { id, name: action.name, color: action.color, createdAt: Date.now() }] });
          await setDoc(doc(db, COL.teams, id), { name: action.name, color: action.color, createdAt: Date.now() });
          break;
        }
        case "RENAME_TEAM":
          dispatchLocal(action);
          await updateDoc(doc(db, COL.teams, action.id), { name: action.name });
          break;
        case "SET_TEAM_COLOR":
          dispatchLocal(action);
          await updateDoc(doc(db, COL.teams, action.id), { color: action.color });
          break;
        case "DELETE_TEAM": {
          dispatchLocal(action);
          const sellerIds = current.sellers.filter((s) => s.teamId === action.id).map((s) => `${COL.sellers}/${s.id}`);
          await batchDelete([`${COL.teams}/${action.id}`, ...sellerIds]);
          break;
        }
        case "ADD_SELLER": {
          const id = uid();
          dispatchLocal({
            type: "@HYDRATE_SELLERS",
            sellers: [...current.sellers, { id, name: action.name, teamId: action.teamId, createdAt: Date.now() }],
          });
          await setDoc(doc(db, COL.sellers, id), { name: action.name, teamId: action.teamId, createdAt: Date.now() });
          break;
        }
        case "DELETE_SELLER":
          dispatchLocal(action);
          await deleteDoc(doc(db, COL.sellers, action.id));
          break;
        case "ADD_ENTRY":
          dispatchLocal(action);
          await setDoc(doc(db, COL.entries, action.entry.id), {
            type: action.entry.type,
            sellerId: action.entry.sellerId,
            value: action.entry.value,
            points: action.entry.points,
            note: action.entry.note,
            date: action.entry.date,
            createdAt: action.entry.createdAt,
          });
          break;
        case "DELETE_ENTRY":
          dispatchLocal(action);
          await deleteDoc(doc(db, COL.entries, action.id));
          break;
        case "SET_SETTINGS":
          dispatchLocal(action);
          await setDoc(SETTINGS_DOC, action.settings, { merge: true });
          break;
        case "RESET_DEMO": {
          const teams = seedTeams();
          dispatchLocal({ type: "@RESET_LOCAL", teams });
          await batchDelete([
            ...current.teams.map((t) => `${COL.teams}/${t.id}`),
            ...current.sellers.map((s) => `${COL.sellers}/${s.id}`),
            ...current.entries.map((e) => `${COL.entries}/${e.id}`),
          ]);
          for (const t of teams) {
            await setDoc(doc(db, COL.teams, t.id), { name: t.name, color: t.color, createdAt: t.createdAt });
          }
          break;
        }
        case "CLEAR_ENTRIES":
          dispatchLocal(action);
          await batchDelete(current.entries.map((e) => `${COL.entries}/${e.id}`));
          break;
      }
    };

    sync().catch((err) => {
      console.error("[arena] falha ao sincronizar com a nuvem:", err);
      setStatus(navigator.onLine ? "error" : "offline");
    });
  }, []);

  /* ---------- addEntry mantém a mesma assinatura ---------- */
  const addEntry = useCallback(
    (data: { type: EntryType; sellerId: string; value: number; note: string; date: string }): Entry => {
      const entry: Entry = {
        id: uid(),
        type: data.type,
        sellerId: data.sellerId,
        value: data.type === "venda" ? data.value : 0,
        points: computePoints(data.type, data.value, stateRef.current.settings),
        note: data.note,
        date: data.date,
        createdAt: Date.now(),
      };
      dispatch({ type: "ADD_ENTRY", entry });
      return entry;
    },
    [dispatch]
  );

  const value = useMemo<StoreValue>(
    () => ({ state, loading, status, dispatch, addEntry }),
    [state, loading, status, dispatch, addEntry]
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
