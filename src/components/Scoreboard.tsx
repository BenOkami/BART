import { useEffect, useMemo, useState } from "react";
import type { AppState, Seller, SellerStats, Team } from "../types";
import { getSellerStats, getTeamStats, sortedEntries } from "../lib/store";
import { fmtBRL, fmtDate, fmtInt, hexToRgba, useCountUp, useReveal } from "../lib/utils";
import {
  Avatar,
  RankBadge,
  TeamTag,
  TypeBadge,
} from "./ui";
import {
  IconBolt,
  IconCoins,
  IconCrown,
  IconFlag,
  IconHandshake,
  IconPlus,
  IconSpark,
  IconTarget,
  IconTrophy,
} from "./icons";

/* ------------------------------------------------------------------ */
/* bloco de estatística                                                */
/* ------------------------------------------------------------------ */

function StatBlock({
  label,
  value,
  format,
  icon,
  accent,
  delay,
  hero,
}: {
  label: string;
  value: number;
  format: (v: number) => string;
  icon: React.ReactNode;
  accent: string;
  delay: number;
  hero?: boolean;
}) {
  const v = useCountUp(value, 1100 + delay);
  return (
    <div className="group relative overflow-hidden px-5 py-5 sm:px-7 sm:py-6 transition-colors hover:bg-ink-800/50">
      <div className="absolute left-0 top-0 h-full w-1" style={{ background: accent }} />
      <div className="flex items-center justify-between text-muted">
        <span className={`font-extrabold uppercase tracking-[0.18em] ${hero ? "text-[12px]" : "text-[11px]"}`}>{label}</span>
        <span style={{ color: accent }} className="opacity-80 transition-transform duration-300 group-hover:scale-115 group-hover:-rotate-6">
          {icon}
        </span>
      </div>
      <p className={`font-display tnum leading-none text-paper ${hero ? "mt-3 text-5xl sm:text-6xl" : "mt-2 text-3xl sm:text-4xl"}`}>
        {format(v)}
      </p>
      {hero && <p className="mt-2 text-[12px] font-bold text-faint">soma de todas as vendas lançadas na temporada</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ranking de equipes (por volume vendido; empate → indicações)        */
/* ------------------------------------------------------------------ */

interface TeamRow {
  team: Team;
  sales: number;
  saleValue: number;
  indications: number;
  members: number;
}

function TeamRanking({ rows, onLaunch }: { rows: TeamRow[]; onLaunch: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const leader = rows[0]?.saleValue ?? 0;

  if (rows.length === 0) {
    return (
      <EmptyCard
        title="Nenhuma equipe na disputa"
        text="Crie equipes e vendedores na aba Equipes para montar o placar."
      />
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r, i) => {
        const pct = leader > 0 ? (r.saleValue / leader) * 100 : 0;
        const isLeader = i === 0 && r.saleValue > 0;
        return (
          <div
            key={r.team.id}
            className={`group relative rounded-lg border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(0,0,0,0.45)] ${
              isLeader ? "border-gold/50 bg-gradient-to-r from-gold/10 to-ink-900" : "border-line-soft bg-ink-900/80 hover:border-line"
            }`}
          >
            <div className="flex items-center gap-4">
              <span className={`font-display text-4xl leading-none w-10 text-center ${isLeader ? "rank-ghost-gold" : "rank-ghost"}`}>
                {i + 1}
              </span>
              <div className="w-2 h-12 rounded-full shrink-0" style={{ background: r.team.color, boxShadow: `0 0 14px ${hexToRgba(r.team.color, 0.5)}` }} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg uppercase tracking-wide text-paper truncate">{r.team.name}</h3>
                  {isLeader && (
                    <span className="inline-flex items-center gap-1 rounded-sm bg-gold text-ink-950 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest">
                      <IconCrown size={11} /> Líder
                    </span>
                  )}
                  <span className="text-[11px] font-bold uppercase tracking-wider text-faint">
                    {r.members} {r.members === 1 ? "vendedor" : "vendedores"}
                  </span>
                </div>
                <div className="mt-2 h-3.5 w-full overflow-hidden rounded-sm bg-ink-950/80 border border-line-soft/60">
                  <div
                    className={`bar-fill h-full rounded-sm ${isLeader ? "bar-shine relative overflow-hidden" : ""}`}
                    style={{
                      width: mounted ? `${Math.max(pct, r.saleValue > 0 ? 4 : 0)}%` : "0%",
                      transitionDelay: `${i * 120}ms`,
                      background: `linear-gradient(90deg, ${hexToRgba(r.team.color, 0.55)}, ${r.team.color})`,
                    }}
                  />
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] font-semibold text-muted">
                  <span className="inline-flex items-center gap-1"><IconCoins size={12} className="text-gold" /> {r.sales} {r.sales === 1 ? "venda fechada" : "vendas fechadas"}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display tnum text-2xl sm:text-3xl leading-none" style={{ color: isLeader ? "#f6c453" : "#f2f5fc" }}>
                  {fmtBRL(r.saleValue)}
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-faint mt-1">volume vendido</p>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-sm border border-sky/35 bg-sky/10 px-2 py-0.5 text-[11px] font-extrabold text-sky">
                  <IconHandshake size={12} /> {r.indications} {r.indications === 1 ? "indicação" : "indicações"}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      <p className="pt-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
        Classificação pelo volume vendido de cada equipe — em caso de empate, decide o número de indicações.
      </p>
      <button
        onClick={onLaunch}
        className="mt-2 inline-flex items-center gap-2 rounded-md border border-dashed border-line px-4 py-2.5 text-sm font-bold text-muted transition-colors hover:border-gold/60 hover:text-gold"
      >
        <IconPlus size={15} /> Lançar resultado
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* vendedores: pódio + lista                                           */
/* ------------------------------------------------------------------ */

interface SellerRow extends SellerStats {
  seller: Seller;
  team?: Team;
}

function PodiumCard({ row, place }: { row: SellerRow; place: 1 | 2 | 3 }) {
  const heights = { 1: "md:pt-0", 2: "md:pt-10", 3: "md:pt-16" };
  const glow = { 1: "#f6c453", 2: "#c9d4e8", 3: "#e0955f" }[place];
  return (
    <div className={`${heights[place]} ${place === 1 ? "md:order-2" : place === 2 ? "md:order-1" : "md:order-3"}`}>
      <div
        className="relative overflow-hidden rounded-lg border bg-ink-900/85 p-5 text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        style={{ borderColor: hexToRgba(glow, 0.45), boxShadow: `0 0 30px ${hexToRgba(glow, 0.1)}` }}
      >
        <div className="diag-stripes absolute inset-x-0 top-0 h-10 opacity-60" />
        {place === 1 && (
          <span className="absolute right-3 top-2.5 text-gold">
            <IconCrown size={20} />
          </span>
        )}
        <div className="relative">
          <p className={`font-display text-5xl leading-none ${place === 1 ? "rank-ghost-gold" : "rank-ghost"}`}>{place}</p>
          <div className="mt-3 flex justify-center">
            <Avatar name={row.seller.name} color={row.team?.color ?? "#8fa0c6"} size={64} />
          </div>
          <p className="font-display mt-3 text-xl uppercase tracking-wide text-paper">{row.seller.name}</p>
          <div className="mt-1.5 flex justify-center">
            <TeamTag team={row.team} />
          </div>
          <p className="font-display tnum mt-4 text-4xl" style={{ color: glow }}>
            {fmtInt(row.points)}
            <span className="ml-1 font-body text-[11px] font-black uppercase tracking-widest text-faint">pts</span>
          </p>
          <div className="mt-3 flex items-center justify-center gap-4 text-[12px] font-semibold text-muted">
            <span className="inline-flex items-center gap-1"><IconCoins size={13} className="text-gold" />{row.sales} vendas</span>
            <span className="inline-flex items-center gap-1"><IconHandshake size={13} className="text-sky" />{row.indications} indicações</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SellerRanking({
  rows,
  teams,
  filterTeam,
  setFilterTeam,
  search,
  setSearch,
}: {
  rows: SellerRow[];
  teams: Team[];
  filterTeam: string;
  setFilterTeam: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
}) {
  const filtered = rows.filter(
    (r) =>
      (!filterTeam || r.seller.teamId === filterTeam) &&
      r.seller.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  if (rows.length === 0) {
    return (
      <EmptyCard
        title="Nenhum vendedor cadastrado"
        text="Adicione vendedores às equipes na aba Equipes para iniciar a corrida individual."
      />
    );
  }

  const top = rows.slice(0, 3);
  const showPodium = !filterTeam && !search.trim() && top.length >= 3;
  const list = showPodium ? filtered.slice(3) : filtered;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar vendedor…"
          className="w-full sm:w-64 rounded-md border border-line bg-ink-900/80 px-3.5 py-2 text-sm text-paper placeholder:text-faint outline-none transition-colors focus:border-gold/70"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip active={filterTeam === ""} color="#f2f5fc" onClick={() => setFilterTeam("")}>
            Todas
          </FilterChip>
          {teams.map((t) => (
            <FilterChip key={t.id} active={filterTeam === t.id} color={t.color} onClick={() => setFilterTeam(t.id)}>
              {t.name}
            </FilterChip>
          ))}
        </div>
      </div>

      {showPodium && (
        <div className="grid gap-4 md:grid-cols-3">
          {top.map((r, i) => (
            <PodiumCard key={r.seller.id} row={r} place={(i + 1) as 1 | 2 | 3} />
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-line-soft bg-ink-900/70">
        <div className="hidden grid-cols-[3rem_1fr_6.5rem_6.5rem_5.5rem] gap-3 items-center border-b border-line-soft px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-faint sm:grid">
          <span className="text-center">Pos</span>
          <span>Vendedor</span>
          <span className="text-right">Vendas</span>
          <span className="text-right">Indicações</span>
          <span className="text-right">Pontos</span>
        </div>
        <div className="divide-y divide-line-soft/70">
          {list.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted">Nenhum vendedor encontrado.</p>
          )}
          {list.map((r) => {
            const pos = rows.indexOf(r) + 1;
            return (
              <div
                key={r.seller.id}
                className="group grid grid-cols-[3rem_1fr_auto] sm:grid-cols-[3rem_1fr_6.5rem_6.5rem_5.5rem] gap-3 items-center px-4 py-3 transition-colors hover:bg-ink-800/60"
              >
                <span className="flex justify-center"><RankBadge rank={pos} /></span>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={r.seller.name} color={r.team?.color ?? "#8fa0c6"} size={36} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-paper truncate group-hover:text-gold transition-colors">{r.seller.name}</p>
                    <p className="text-[11px] font-semibold truncate" style={{ color: r.team?.color ?? "#8fa0c6" }}>
                      {r.team?.name ?? "sem equipe"} · {fmtBRL(r.saleValue)}
                    </p>
                  </div>
                </div>
                <span className="hidden sm:block text-right tnum text-sm font-bold text-gold">{fmtInt(r.sales)}</span>
                <span className="hidden sm:block text-right tnum text-sm font-bold text-sky">{fmtInt(r.indications)}</span>
                <span className="text-right font-display tnum text-xl text-paper">{fmtInt(r.points)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-skew-x-6 px-3 py-1 text-[12px] font-black uppercase tracking-wider transition-all duration-200 ${
        active ? "shadow-md" : "opacity-70 hover:opacity-100"
      }`}
      style={{
        color: active ? "#070b16" : color,
        background: active ? color : hexToRgba(color, 0.1),
        border: `1px solid ${active ? color : hexToRgba(color, 0.45)}`,
      }}
    >
      <span className="inline-block skew-x-6">{children}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* auxiliares                                                          */
/* ------------------------------------------------------------------ */

function EmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-ink-900/60 px-6 py-10 text-center">
      <IconTrophy size={34} className="mx-auto text-faint" />
      <p className="font-display uppercase tracking-wide text-lg text-muted mt-3">{title}</p>
      <p className="text-sm text-faint mt-1">{text}</p>
    </div>
  );
}

function SectionHead({
  kicker,
  title,
  icon,
  right,
}: {
  kicker: string;
  title: string;
  icon: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-gold">
          {icon} {kicker}
        </p>
        <h2 className="font-display text-2xl sm:text-3xl uppercase tracking-wide text-paper mt-1">{title}</h2>
      </div>
      {right}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* view principal                                                      */
/* ------------------------------------------------------------------ */

export default function Scoreboard({ state, onLaunch }: { state: AppState; onLaunch: () => void }) {
  const entries = useMemo(() => sortedEntries(state), [state]);
  const sellerStats = useMemo(() => getSellerStats(state), [state]);
  const teamStats = useMemo(() => getTeamStats(state), [state]);
  const teamById = useMemo(() => new Map(state.teams.map((t) => [t.id, t])), [state.teams]);

  const totals = useMemo(() => {
    let value = 0, sales = 0, inds = 0;
    for (const e of state.entries) {
      if (e.type === "venda") { sales += 1; value += e.value; }
      else inds += 1;
    }
    return { value, sales, inds };
  }, [state.entries]);

  const teamRows: TeamRow[] = useMemo(() => {
    return state.teams
      .map((team) => {
        const ts = teamStats.get(team.id);
        return {
          team,
          sales: ts?.sales ?? 0,
          saleValue: ts?.saleValue ?? 0,
          indications: ts?.indications ?? 0,
          members: ts?.members ?? 0,
        };
      })
      .sort((a, b) => b.saleValue - a.saleValue || b.indications - a.indications);
  }, [state.teams, teamStats]);

  const sellerRows: SellerRow[] = useMemo(() => {
    return state.sellers
      .map((seller) => ({
        seller,
        team: teamById.get(seller.teamId),
        ...(sellerStats.get(seller.id) ?? { sellerId: seller.id, points: 0, sales: 0, saleValue: 0, indications: 0 }),
      }))
      .sort((a, b) => b.points - a.points || b.saleValue - a.saleValue);
  }, [state.sellers, sellerStats, teamById]);

  const [filterTeam, setFilterTeam] = useState("");
  const [search, setSearch] = useState("");

  const revStats = useReveal<HTMLDivElement>(0);
  const revTeams = useReveal<HTMLDivElement>(80);
  const revSellers = useReveal<HTMLDivElement>(160);
  const revFeed = useReveal<HTMLDivElement>(220);

  return (
    <div className="space-y-8">
      {/* manchete do placar */}
      <header className="pt-6 sm:pt-8 px-1">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-gold">
              <IconSpark size={14} /> Temporada em andamento
            </p>
            <h1 className="font-display text-5xl sm:text-7xl uppercase leading-[0.95] tracking-wide text-paper mt-2">
              Placar <span className="text-transparent" style={{ WebkitTextStroke: "2px #f6c453" }}>geral</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-md border border-lime/40 bg-lime/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-lime">
              <span className="live-dot h-2 w-2 rounded-full bg-lime" /> Atualizado em tempo real
            </span>
          </div>
        </div>

        <div ref={revStats.ref} className={`${revStats.className} mt-6 grid grid-cols-1 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-line-soft rounded-lg border border-line-soft bg-ink-900/75 overflow-hidden`} style={revStats.style}>
          <div className="lg:col-span-2">
            <StatBlock label="Volume vendido" value={totals.value} format={(v) => fmtBRL(v)} icon={<IconCoins size={17} />} accent="#f6c453" delay={0} hero />
          </div>
          <StatBlock label="Vendas fechadas" value={totals.sales} format={(v) => fmtInt(Math.round(v))} icon={<IconBolt size={17} />} accent="#ff6b4a" delay={120} />
          <StatBlock label="Indicações" value={totals.inds} format={(v) => fmtInt(Math.round(v))} icon={<IconTarget size={17} />} accent="#4cc9f0" delay={240} />
        </div>
      </header>

      {/* equipes + feed */}
      <div className="grid gap-8 lg:grid-cols-5">
        <section ref={revTeams.ref} className={`${revTeams.className} lg:col-span-3`} style={revTeams.style}>
          <SectionHead kicker="Disputa por equipes" title="Ranking de equipes" icon={<IconFlag size={14} />} />
          <TeamRanking rows={teamRows} onLaunch={onLaunch} />
        </section>

        <section ref={revFeed.ref} className={`${revFeed.className} lg:col-span-2`} style={revFeed.style}>
          <SectionHead kicker="Ritmo da arena" title="Últimos lançamentos" icon={<IconBolt size={14} />} />
          <div className="overflow-hidden rounded-lg border border-line-soft bg-ink-900/70 divide-y divide-line-soft/70">
            {entries.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-muted">
                Nenhum lançamento ainda. Clique em <strong className="text-gold">Lançar resultado</strong> para abrir o placar.
              </p>
            )}
            {entries.slice(0, 7).map((e, i) => {
              const seller = state.sellers.find((s) => s.id === e.sellerId);
              const team = seller ? teamById.get(seller.teamId) : undefined;
              return (
                <div key={e.id} className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-800/60 ${i === 0 ? "flash-new" : ""}`}>
                  <TypeBadge type={e.type} small />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-paper truncate">{seller?.name ?? "Vendedor removido"}</p>
                    <p className="text-[11px] font-semibold text-faint truncate">
                      {team?.name ?? "—"} · {e.type === "venda" ? fmtBRL(e.value) : "nova indicação"}
                      {e.note ? ` · ${e.note}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display tnum text-lg leading-none text-gold">+{e.points}</p>
                    <p className="text-[10px] font-bold text-faint">{fmtDate(e.date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* vendedores */}
      <section ref={revSellers.ref} className={`${revSellers.className}`} style={revSellers.style}>
        <SectionHead kicker="Corrida individual" title="Ranking de vendedores" icon={<IconTrophy size={14} />} />
        <SellerRanking
          rows={sellerRows}
          teams={state.teams}
          filterTeam={filterTeam}
          setFilterTeam={setFilterTeam}
          search={search}
          setSearch={setSearch}
        />
      </section>
    </div>
  );
}
