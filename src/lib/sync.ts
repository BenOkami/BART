import { supabase } from "./supabase";
import type { AppState, Entry, EntryType, Seller, Settings, Team } from "../types";

/* ------------------------------------------------------------------ */
/* Linhas do banco (snake_case) ↔ objetos do app (camelCase)           */
/* ------------------------------------------------------------------ */

export interface TeamRow {
  id: string;
  name: string;
  color: string;
  created_at: number;
}

export interface SellerRow {
  id: string;
  name: string;
  team_id: string;
  created_at: number;
}

export interface EntryRow {
  id: string;
  type: EntryType;
  seller_id: string;
  value: number;
  points: number;
  note: string;
  date: string;
  created_at: number;
}

export interface SettingsRow {
  id: string;
  reais_per_point: number;
  points_per_indicacao: number;
}

export const teamToRow = (t: Team): TeamRow => ({
  id: t.id,
  name: t.name,
  color: t.color,
  created_at: t.createdAt ?? Date.now(),
});
export const rowToTeam = (r: TeamRow): Team => ({
  id: r.id,
  name: r.name,
  color: r.color,
  createdAt: r.created_at,
});

export const sellerToRow = (s: Seller): SellerRow => ({
  id: s.id,
  name: s.name,
  team_id: s.teamId,
  created_at: s.createdAt ?? Date.now(),
});
export const rowToSeller = (r: SellerRow): Seller => ({
  id: r.id,
  name: r.name,
  teamId: r.team_id,
  createdAt: r.created_at,
});

export const entryToRow = (e: Entry): EntryRow => ({
  id: e.id,
  type: e.type,
  seller_id: e.sellerId,
  value: e.value,
  points: e.points,
  note: e.note,
  date: e.date,
  created_at: e.createdAt,
});
export const rowToEntry = (r: EntryRow): Entry => ({
  id: r.id,
  type: r.type,
  sellerId: r.seller_id,
  value: Number(r.value),
  points: r.points,
  note: r.note,
  date: r.date,
  createdAt: r.created_at,
});

export const settingsToRow = (s: Settings) => ({
  reais_per_point: s.reaisPerPoint,
  points_per_indicacao: s.pointsPerIndicacao,
});
export const rowToSettings = (r: SettingsRow): Settings => ({
  reaisPerPoint: r.reais_per_point,
  pointsPerIndicacao: r.points_per_indicacao,
});

export const DEFAULT_SETTINGS: Settings = { reaisPerPoint: 100, pointsPerIndicacao: 5 };

/* ------------------------------------------------------------------ */
/* Carga inicial                                                       */
/* ------------------------------------------------------------------ */

export async function fetchInitialState(): Promise<AppState> {
  const [teamsRes, sellersRes, entriesRes, settingsRes] = await Promise.all([
    supabase!.from("teams").select("*").order("created_at"),
    supabase!.from("sellers").select("*").order("created_at"),
    supabase!.from("entries").select("*"),
    supabase!.from("settings").select("*").limit(1),
  ]);

  const firstError =
    teamsRes.error ?? sellersRes.error ?? entriesRes.error ?? settingsRes.error;
  if (firstError) throw new Error(firstError.message);

  let settings = DEFAULT_SETTINGS;
  const srow = (settingsRes.data as SettingsRow[])[0];
  if (srow) {
    settings = rowToSettings(srow);
  } else {
    // Primeira execução: cria a linha de regras padrão.
    await supabase!
      .from("settings")
      .insert({ id: "app", ...settingsToRow(DEFAULT_SETTINGS) });
  }

  return {
    teams: (teamsRes.data as TeamRow[]).map(rowToTeam),
    sellers: (sellersRes.data as SellerRow[]).map(rowToSeller),
    entries: (entriesRes.data as EntryRow[]).map(rowToEntry),
    settings,
  };
}

/* ------------------------------------------------------------------ */
/* Realtime (postgres_changes)                                         */
/* ------------------------------------------------------------------ */

export type ArenaTable = "teams" | "sellers" | "entries";
export type ChangeEvent = "INSERT" | "UPDATE" | "DELETE";

export function subscribeArena(
  onRow: (table: ArenaTable, event: ChangeEvent, row: TeamRow | SellerRow | EntryRow) => void,
  onSettings: (row: SettingsRow) => void,
  onStatus: (status: "online" | "offline") => void
): () => void {
  const channel = supabase!.channel("arena-sync");

  const bind = (table: ArenaTable) =>
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      (payload: any) => {
        const row = payload.eventType === "DELETE" ? payload.old : payload.new;
        if (row) onRow(table, payload.eventType as ChangeEvent, row);
      }
    );

  bind("teams");
  bind("sellers");
  bind("entries");

  channel.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "settings" },
    (payload: any) => {
      if (payload.new) onSettings(payload.new as SettingsRow);
    }
  );

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") onStatus("online");
    if (status === "TIMED_OUT" || status === "CHANNEL_ERROR" || status === "CLOSED") {
      onStatus("offline");
    }
  });

  return () => {
    supabase!.removeChannel(channel);
  };
}

/* ------------------------------------------------------------------ */
/* Gravações                                                           */
/* ------------------------------------------------------------------ */

export const insertTeam = (t: Team) => supabase!.from("teams").insert([teamToRow(t)]);

export const updateTeam = (id: string, patch: { name?: string; color?: string }) =>
  supabase!.from("teams").update(patch).eq("id", id);

export const deleteTeam = (id: string) => supabase!.from("teams").delete().eq("id", id);

export const insertSeller = (s: Seller) => supabase!.from("sellers").insert([sellerToRow(s)]);

export const deleteSeller = (id: string) => supabase!.from("sellers").delete().eq("id", id);

export const insertEntry = (e: Entry) => supabase!.from("entries").insert([entryToRow(e)]);

export const deleteEntry = (id: string) => supabase!.from("entries").delete().eq("id", id);

export const updateSettings = (s: Settings) =>
  supabase!.from("settings").update(settingsToRow(s)).eq("id", "app");

export const deleteAllEntries = () => supabase!.from("entries").delete().neq("id", "");

export async function deleteAllTeamsAndSellers() {
  await supabase!.from("sellers").delete().neq("id", "");
  await supabase!.from("teams").delete().neq("id", "");
}

export const insertManyTeams = (teams: Team[]) =>
  supabase!.from("teams").insert(teams.map(teamToRow));
