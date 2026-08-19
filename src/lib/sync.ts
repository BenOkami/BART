import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
  type CollectionReference,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import type { AppState, Entry, EntryType, Seller, Settings, Team } from "../types";

/* ------------------------------------------------------------------ */
/* Linhas do Firestore ↔ objetos do app                                */
/* ------------------------------------------------------------------ */

export interface TeamRow {
  id: string;
  name: string;
  color: string;
  createdAt?: number;
}

export interface SellerRow {
  id: string;
  name: string;
  teamId: string;
  createdAt?: number;
}

export interface EntryRow {
  id: string;
  type: EntryType;
  sellerId: string;
  value: number;
  points: number;
  note: string;
  date: string;
  createdAt: number;
}

export interface SettingsRow {
  reaisPerPoint: number;
  pointsPerIndicacao: number;
}

export const DEFAULT_SETTINGS: Settings = { reaisPerPoint: 100, pointsPerIndicacao: 5 };

const rowToTeam = (r: TeamRow): Team => ({
  id: r.id,
  name: r.name,
  color: r.color,
  createdAt: r.createdAt ?? Date.now(),
});

const rowToSeller = (r: SellerRow): Seller => ({
  id: r.id,
  name: r.name,
  teamId: r.teamId,
  createdAt: r.createdAt ?? Date.now(),
});

const rowToEntry = (r: EntryRow): Entry => ({
  id: r.id,
  type: r.type,
  sellerId: r.sellerId,
  value: r.value,
  points: r.points,
  note: r.note,
  date: r.date,
  createdAt: r.createdAt ?? Date.now(),
});

/* ------------------------------------------------------------------ */
/* Referências                                                         */
/* ------------------------------------------------------------------ */

const SETTINGS_DOC = doc(db, "settings", "app");
const teamsCol = collection(db, "teams");
const sellersCol = collection(db, "sellers");
const entriesCol = collection(db, "entries");

const warn = (err: unknown) => console.warn("Firestore:", err);

/* ------------------------------------------------------------------ */
/* Carga inicial                                                       */
/* ------------------------------------------------------------------ */

export async function fetchInitialState(): Promise<AppState> {
  const [teamsSnap, sellersSnap, entriesSnap, settingsSnap] = await Promise.all([
    getDocs(teamsCol),
    getDocs(sellersCol),
    getDocs(entriesCol),
    getDoc(SETTINGS_DOC),
  ]);

  let settings = DEFAULT_SETTINGS;
  if (settingsSnap.exists()) {
    settings = { ...DEFAULT_SETTINGS, ...(settingsSnap.data() as Partial<Settings>) };
  } else {
    // Primeira execução: cria as regras padrão na nuvem.
    await setDoc(SETTINGS_DOC, DEFAULT_SETTINGS);
  }

  const byCreated = (a: { createdAt?: number }, b: { createdAt?: number }) =>
    (a.createdAt ?? 0) - (b.createdAt ?? 0);

  return {
    teams: teamsSnap.docs
      .map((d) => rowToTeam({ ...(d.data() as Omit<TeamRow, "id">), id: d.id }))
      .sort(byCreated),
    sellers: sellersSnap.docs
      .map((d) => rowToSeller({ ...(d.data() as Omit<SellerRow, "id">), id: d.id }))
      .sort(byCreated),
    entries: entriesSnap.docs.map((d) =>
      rowToEntry({ ...(d.data() as Omit<EntryRow, "id">), id: d.id })
    ),
    settings,
  };
}

/* ------------------------------------------------------------------ */
/* Realtime (onSnapshot)                                               */
/* ------------------------------------------------------------------ */

export type ArenaTable = "teams" | "sellers" | "entries";
export type ChangeEvent = "INSERT" | "UPDATE" | "DELETE";

export function subscribeArena(
  onRow: (table: ArenaTable, event: ChangeEvent, row: TeamRow | SellerRow | EntryRow) => void,
  onSettings: (row: SettingsRow) => void
): () => void {
  const emit = (snap: QuerySnapshot<DocumentData>, table: ArenaTable) => {
    snap.docChanges().forEach((change) => {
      const event: ChangeEvent =
        change.type === "added" ? "INSERT" : change.type === "modified" ? "UPDATE" : "DELETE";
      onRow(table, event, { ...(change.doc.data() as object), id: change.doc.id } as never);
    });
  };

  const unsubs = [
    onSnapshot(teamsCol, (snap) => emit(snap, "teams"), warn),
    onSnapshot(sellersCol, (snap) => emit(snap, "sellers"), warn),
    onSnapshot(entriesCol, (snap) => emit(snap, "entries"), warn),
    onSnapshot(
      SETTINGS_DOC,
      (snap) => {
        if (snap.exists()) {
          onSettings({ ...DEFAULT_SETTINGS, ...(snap.data() as Partial<SettingsRow>) });
        }
      },
      warn
    ),
  ];

  return () => unsubs.forEach((u) => u());
}

/* ------------------------------------------------------------------ */
/* Gravações (todas retornam Promise<void> com log de erro interno)    */
/* ------------------------------------------------------------------ */

export const insertTeam = (t: Team) =>
  setDoc(doc(db, "teams", t.id), {
    name: t.name,
    color: t.color,
    createdAt: t.createdAt ?? Date.now(),
  }).catch(warn);

export const updateTeam = (id: string, patch: { name?: string; color?: string }) =>
  setDoc(doc(db, "teams", id), patch, { merge: true }).catch(warn);



export const insertSeller = (s: Seller) =>
  setDoc(doc(db, "sellers", s.id), {
    name: s.name,
    teamId: s.teamId,
    createdAt: s.createdAt ?? Date.now(),
  }).catch(warn);

export const insertEntry = (e: Entry) =>
  setDoc(doc(db, "entries", e.id), {
    type: e.type,
    sellerId: e.sellerId,
    value: e.value,
    points: e.points,
    note: e.note,
    date: e.date,
    createdAt: e.createdAt,
  }).catch(warn);

export const updateSettings = (s: Settings) =>
  setDoc(SETTINGS_DOC, { reaisPerPoint: s.reaisPerPoint, pointsPerIndicacao: s.pointsPerIndicacao }, { merge: true }).catch(warn);

async function deleteCollection(col: CollectionReference): Promise<void> {
  const snap = await getDocs(col);
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

export const deleteEntry = (id: string) => deleteById("entries", id);
export const deleteSeller = (id: string) => deleteById("sellers", id);
export const deleteTeamRow = (id: string) => deleteById("teams", id);

function deleteById(colName: "teams" | "sellers" | "entries", id: string) {
  return deleteDoc(doc(db, colName, id)).catch(warn);
}

export const deleteAllEntries = () => deleteCollection(entriesCol).catch(warn);

export async function deleteAllTeamsAndSellers(): Promise<void> {
  await deleteCollection(sellersCol).catch(warn);
  await deleteCollection(teamsCol).catch(warn);
}

export async function insertManyTeams(teams: Team[]): Promise<void> {
  const batch = writeBatch(db);
  teams.forEach((t) => {
    batch.set(doc(db, "teams", t.id), {
      name: t.name,
      color: t.color,
      createdAt: t.createdAt ?? Date.now(),
    });
  });
  await batch.commit().catch(warn);
}
