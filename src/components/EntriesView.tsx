import { useMemo, useState } from "react";
import type { AppState } from "../types";
import { sortedEntries } from "../lib/store";
import { fmtDate, fmtInt, fmtMoney } from "../lib/utils";
import { TeamTag, TypeBadge, useToast } from "./ui";
import { IconCoins, IconTrash } from "./icons";

export default function EntriesView({ state, onDelete }: { state: AppState; onDelete: (id: string) => void }) {
  const [teamFilter, setTeamFilter] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const toast = useToast();

  const sellerById = useMemo(() => new Map(state.sellers.map((s) => [s.id, s])), [state.sellers]);
  const teamById = useMemo(() => new Map(state.teams.map((t) => [t.id, t])), [state.teams]);

  const entries = useMemo(
    () => sortedEntries(state).filter((e) => sellerById.has(e.sellerId)),
    [state, sellerById]
  );

  const filtered = useMemo(
    () =>
      entries.filter((e) => {
        if (teamFilter) {
          const seller = sellerById.get(e.sellerId);
          if (!seller || seller.teamId !== teamFilter) return false;
        }
        return true;
      }),
    [entries, teamFilter, sellerById]
  );

  const totals = useMemo(() => {
    let value = 0, sales = 0, pts = 0;
    for (const e of filtered) {
      pts += e.points;
      if (e.type === "venda") { sales += 1; value += e.value; }
    }
    return { value, sales, pts };
  }, [filtered]);

  const handleDelete = (id: string) => {
    onDelete(id);
    setConfirmId(null);
    toast.push("Lançamento removido do placar.", "coral");
  };

  return (
    <div className="space-y-6">
      {/* filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-[12px] font-black uppercase tracking-wider text-gold">
          <IconCoins size={14} /> Lançamentos de vendas
        </span>
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="rounded-md border border-line bg-ink-900/80 px-3 py-2 text-[13px] font-bold text-paper outline-none focus:border-gold/70"
        >
          <option value="">Todas as equipes</option>
          {state.teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <span className="ml-auto text-[12px] font-bold uppercase tracking-wider text-faint">
          {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
        </span>
      </div>

      {/* resumo do filtro */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Volume filtrado" value={fmtMoney(totals.value)} accent="#f6c453" />
        <SummaryCard label="Vendas" value={fmtInt(totals.sales)} accent="#ff6b4a" />
        <SummaryCard label="Pontos somados" value={fmtInt(totals.pts)} accent="#a8e34d" />
      </div>

      {/* lista */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-ink-900/60 px-6 py-14 text-center">
          {entries.length === 0 ? (
            <>
              <p className="font-display uppercase tracking-wide text-xl text-muted">Nenhum lançamento ainda</p>
              <p className="text-sm text-faint mt-2">Use o botão <strong className="text-gold">Lançar</strong> para registrar a primeira venda.</p>
            </>
          ) : (
            <p className="text-sm text-muted">Nenhum lançamento combina com os filtros escolhidos.</p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line-soft bg-ink-900/70">
          <div className="hidden sm:grid grid-cols-[7.5rem_1fr_9rem_7rem_6rem_3rem] gap-3 items-center border-b border-line-soft px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-faint">
            <span>Tipo</span>
            <span>Vendedor / equipe</span>
            <span className="text-right">Valor</span>
            <span className="text-right">Pontos</span>
            <span className="text-right">Data</span>
            <span />
          </div>
          <div className="divide-y divide-line-soft/70">
            {filtered.map((e) => {
              const seller = sellerById.get(e.sellerId);
              const team = seller ? teamById.get(seller.teamId) : undefined;
              const confirming = confirmId === e.id;
              return (
                <div key={e.id} className="group grid grid-cols-1 sm:grid-cols-[7.5rem_1fr_9rem_7rem_6rem_3rem] gap-x-3 gap-y-2 items-center px-4 py-3 transition-colors hover:bg-ink-800/60">
                  <TypeBadge type={e.type} small />
                  <div className="min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-paper truncate">{seller?.name ?? "Vendedor removido"}</span>
                    <TeamTag team={team} small />
                    {e.note && <span className="text-[11px] font-semibold text-faint truncate">· {e.note}</span>}
                  </div>
                  <span className="tnum text-sm font-bold text-right text-paper">
                    {fmtMoney(e.value)}
                  </span>
                  <span className="tnum text-sm font-extrabold text-right text-gold">+{fmtInt(e.points)}</span>
                  <span className="tnum text-[12px] font-bold text-right text-muted">{fmtDate(e.date)}</span>
                  <div className="flex justify-end">
                    {confirming ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="rounded-sm bg-coral px-2 py-1 text-[10px] font-black uppercase tracking-wider text-ink-950 hover:brightness-110 transition-all"
                        >
                          Sim
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="rounded-sm border border-line px-2 py-1 text-[10px] font-black uppercase tracking-wider text-muted hover:text-paper transition-colors"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(e.id)}
                        aria-label="Excluir lançamento"
                        className="shrink-0 rounded-md border border-transparent p-2 text-faint transition-all duration-200 hover:border-coral/50 hover:text-coral sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                      >
                        <IconTrash size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="flex items-center gap-2 text-[12px] font-semibold text-faint">
        <IconCoins size={14} className="text-gold/70" />
        Cada venda soma no volume e nos pontos da equipe e do vendedor.
      </p>
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-line-soft bg-ink-900/70 px-4 py-3.5 transition-colors hover:bg-ink-800/60">
      <div className="absolute left-0 top-0 h-full w-1" style={{ background: accent }} />
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-faint">{label}</p>
      <p className="font-display tnum text-2xl mt-1 text-paper">{value}</p>
    </div>
  );
}
