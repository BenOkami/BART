import { useEffect, useMemo, useState } from "react";
import type { AppState } from "../types";
import { getSellerStats, getTeamStats, sortedEntries } from "../lib/store";
import { fmtBRL, fmtDate, fmtInt, hexToRgba } from "../lib/utils";
import { Avatar, TeamTag, TypeBadge } from "./ui";
import {
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconCoins,
  IconCrown,
  IconHandshake,
  IconPause,
  IconPlay,
  IconSpark,
  IconTarget,
  IconTrophy,
} from "./icons";

const AUTO_MS = 8000;
const TEAMS_PER_SLIDE = 5;

function useMounted(resetKey: number, delay = 60) {
  const [m, setM] = useState(false);
  useEffect(() => {
    setM(false);
    const t = setTimeout(() => setM(true), delay);
    return () => clearTimeout(t);
  }, [resetKey, delay]);
  return m;
}

function SlideShell({ kicker, title, icon, children }: { kicker: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col justify-center px-6 sm:px-12 lg:px-20">
      <p className="flex items-center gap-2.5 text-[12px] sm:text-sm font-black uppercase tracking-[0.3em] text-gold">
        {icon} {kicker}
      </p>
      <h2 className="font-display text-5xl sm:text-7xl lg:text-8xl uppercase leading-[0.95] tracking-wide text-paper mt-3 mb-8 sm:mb-12">
        {title}
      </h2>
      <div className="min-h-0">{children}</div>
    </div>
  );
}

export default function Presentation({ state, onClose }: { state: AppState; onClose: () => void }) {
  const [slide, setSlide] = useState(0);
  const [auto, setAuto] = useState(true);
  const [prog, setProg] = useState(0);

  const teams = useMemo(() => {
    const ts = getTeamStats(state);
    return state.teams
      .map((team) => ({ team, st: ts.get(team.id)! }))
      .sort((a, b) => b.st.saleValue - a.st.saleValue || b.st.indications - a.st.indications);
  }, [state]);

  const sellers = useMemo(() => {
    const ss = getSellerStats(state);
    const teamById = new Map(state.teams.map((t) => [t.id, t]));
    return state.sellers
      .map((seller) => ({ seller, team: teamById.get(seller.teamId), st: ss.get(seller.id)! }))
      .sort((a, b) => b.st.points - a.st.points || b.st.saleValue - a.st.saleValue);
  }, [state]);

  const indRanking = useMemo(() => sellers.filter((s) => s.st.indications > 0).sort((a, b) => b.st.indications - a.st.indications || b.st.points - a.st.points), [sellers]);
  const entries = useMemo(() => sortedEntries(state), [state]);
  const sellerById = useMemo(() => new Map(state.sellers.map((s) => [s.id, s])), [state.sellers]);
  const teamById = useMemo(() => new Map(state.teams.map((t) => [t.id, t])), [state.teams]);

  const totals = useMemo(() => {
    let value = 0, sales = 0, inds = 0;
    for (const e of state.entries) {
      if (e.type === "venda") { sales += 1; value += e.value; } else inds += 1;
    }
    return { value, sales, inds };
  }, [state.entries]);

  /* paginação das equipes: todas aparecem, em páginas de até 5 */
  const teamPageCount = Math.max(1, Math.ceil(teams.length / TEAMS_PER_SLIDE));
  const teamPageIndex = teams.length > 0 ? Math.min(Math.floor(slide - 1), teamPageCount - 1) : -1;
  const pageTeams = teams.slice(
    Math.max(0, teamPageIndex) * TEAMS_PER_SLIDE,
    Math.max(0, teamPageIndex) * TEAMS_PER_SLIDE + TEAMS_PER_SLIDE
  );

  const slides = useMemo(() => {
    const labels = ["Abertura"];
    for (let p = 0; p < teamPageCount; p++) {
      labels.push(teamPageCount > 1 ? `Equipes ${p + 1}/${teamPageCount}` : "Equipes");
    }
    labels.push("Vendedores", "Indicações", "Últimos lances");
    return labels;
  }, [teamPageCount]);
  const N = slides.length;

  const sellersSlide = 1 + teamPageCount;
  const indSlide = sellersSlide + 1;
  const feedSlide = indSlide + 1;

  const next = () => setSlide((s) => (s + 1) % N);
  const prev = () => setSlide((s) => (s - 1 + N) % N);

  /* protege quando o número de slides diminui (ex.: equipe removida) */
  useEffect(() => {
    if (slide >= N) setSlide(0);
  }, [slide, N]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") { next(); setProg(0); }
      if (e.key === "ArrowLeft") { prev(); setProg(0); }
      if (e.key === " ") { e.preventDefault(); setAuto((a) => !a); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [N, onClose]);

  useEffect(() => {
    if (!auto) { setProg(0); return; }
    const iv = setInterval(() => {
      setProg((p) => {
        if (p >= 100) {
          setSlide((s) => (s + 1) % N);
          return 0;
        }
        return p + 100 / (AUTO_MS / 80);
      });
    }, 80);
    return () => clearInterval(iv);
  }, [auto, N, slide]);

  const mounted = useMounted(slide);
  const leaderValue = Math.max(1, teams[0]?.st.saleValue ?? 1);
  const topSellerPts = Math.max(1, sellers[0]?.st.points ?? 1);
  const topInd = Math.max(1, indRanking[0]?.st.indications ?? 1);

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-ink-950">
      {/* fundo de palco */}
      <div className="absolute inset-0 arena-bg" />
      <div className="absolute inset-0 grid-layer" />
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 h-[560px] w-[900px] rounded-full blur-3xl opacity-50 pointer-events-none"
        style={{ background: `radial-gradient(ellipse, ${hexToRgba(teams[0]?.team.color ?? "#f6c453", 0.16)}, transparent 65%)` }}
      />
      <div className="noise-layer absolute inset-0 pointer-events-none opacity-[0.04]" />

      {/* topo */}
      <div className="relative z-10 flex items-center justify-between px-6 sm:px-12 py-4">
        <span className="font-display uppercase tracking-[0.2em] text-sm text-muted">
          Arena <span className="text-gold">de Vendas</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-2 rounded-md border border-lime/40 bg-lime/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-lime">
            <span className="live-dot h-2 w-2 rounded-full bg-lime" /> Ao vivo
          </span>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[12px] font-black uppercase tracking-wider text-muted transition-colors hover:border-coral/60 hover:text-coral"
          >
            <IconClose size={13} /> Sair (Esc)
          </button>
        </div>
      </div>

      {/* slides */}
      <div className="relative z-10 min-h-0 flex-1">
        {slide === 0 && (
          <div key="s0" className="slide-enter flex h-full flex-col items-start justify-center px-6 sm:px-12 lg:px-20">
            <p className="flex items-center gap-2.5 text-[12px] sm:text-sm font-black uppercase tracking-[0.3em] text-gold">
              <IconSpark size={16} /> Apresentação do placar
            </p>
            <h1 className="font-display uppercase leading-[0.9] tracking-wide text-paper mt-4 text-[16vw] sm:text-[11vw] lg:text-[9rem]">
              Arena<br />
              <span className="text-transparent" style={{ WebkitTextStroke: "3px #f6c453" }}>de Vendas</span>
            </h1>
            <div className="mt-8 flex flex-wrap gap-x-12 gap-y-6">
              <div>
                <p className="font-display tnum text-4xl sm:text-6xl text-gold">{fmtBRL(totals.value)}</p>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-faint mt-2">volume vendido</p>
              </div>
              <div>
                <p className="font-display tnum text-4xl sm:text-6xl text-paper">{fmtInt(totals.sales)}</p>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-faint mt-2">vendas fechadas</p>
              </div>
              <div>
                <p className="font-display tnum text-4xl sm:text-6xl text-sky">{fmtInt(totals.inds)}</p>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-faint mt-2">indicações</p>
              </div>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-2">
              {state.teams.map((t) => (
                <span key={t.id} className="-skew-x-6 border px-3 py-1 text-[12px] font-black uppercase tracking-widest" style={{ color: t.color, borderColor: hexToRgba(t.color, 0.5), background: hexToRgba(t.color, 0.08) }}>
                  <span className="inline-block skew-x-6">{t.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {teamPageIndex >= 0 && (
          <div key={`teams-${teamPageIndex}`} className="slide-enter h-full">
            <SlideShell
              kicker={`Placar de equipes · volume vendido${teamPageCount > 1 ? ` · parte ${teamPageIndex + 1}/${teamPageCount}` : ""}`}
              title={teamPageCount > 1 && teamPageIndex > 0 ? "A disputa continua" : "Quem lidera a disputa?"}
              icon={<IconTrophy size={18} />}
            >
              <div className="space-y-5 max-w-5xl">
                {pageTeams.map(({ team, st }, i) => {
                  const globalRank = teamPageIndex * TEAMS_PER_SLIDE + i;
                  const isLeader = globalRank === 0 && st.saleValue > 0;
                  return (
                    <div key={team.id} className="flex items-center gap-5">
                      <span className={`font-display text-5xl sm:text-6xl w-14 text-center shrink-0 ${isLeader ? "rank-ghost-gold" : "rank-ghost"}`}>{globalRank + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-4">
                          <p className="font-display text-2xl sm:text-4xl uppercase tracking-wide truncate" style={{ color: isLeader ? "#f6c453" : "#f2f5fc" }}>
                            {team.name} {isLeader && <IconCrown size={22} className="inline -mt-2 ml-1 text-gold" />}
                          </p>
                          <p className="font-display tnum text-2xl sm:text-4xl shrink-0" style={{ color: isLeader ? "#f6c453" : "#f2f5fc" }}>{fmtBRL(st.saleValue)}</p>
                        </div>
                        <div className="mt-2 h-5 sm:h-6 w-full overflow-hidden rounded-sm bg-ink-900 border border-line-soft/60">
                          <div
                            className={`bar-fill relative h-full overflow-hidden rounded-sm ${isLeader ? "bar-shine" : ""}`}
                            style={{
                              width: mounted ? `${Math.max((st.saleValue / leaderValue) * 100, st.saleValue > 0 ? 3 : 0)}%` : "0%",
                              transitionDelay: `${i * 160}ms`,
                              background: `linear-gradient(90deg, ${hexToRgba(team.color, 0.55)}, ${team.color})`,
                            }}
                          />
                        </div>
                        <p className="mt-1.5 text-[12px] sm:text-sm font-bold text-muted">
                          {st.sales} {st.sales === 1 ? "venda fechada" : "vendas fechadas"} · {st.indications} {st.indications === 1 ? "indicação" : "indicações"} · {st.members} {st.members === 1 ? "vendedor" : "vendedores"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SlideShell>
          </div>
        )}

        {slide === sellersSlide && (
          <div key="s2" className="slide-enter h-full">
            <SlideShell kicker="Corrida individual" title="Top vendedores" icon={<IconCrown size={18} />}>
              <div className="grid gap-x-12 gap-y-3 lg:grid-cols-2 max-w-6xl">
                {sellers.slice(0, 8).map(({ seller, team, st }, i) => (
                  <div key={seller.id} className="flex items-center gap-4">
                    <span className={`font-display text-4xl w-10 text-center shrink-0 ${i === 0 ? "rank-ghost-gold" : "rank-ghost"}`}>{i + 1}</span>
                    <Avatar name={seller.name} color={team?.color ?? "#8fa0c6"} size={52} />
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-xl sm:text-2xl uppercase tracking-wide text-paper truncate">{seller.name}</p>
                      <div className="flex items-center gap-2.5 mt-0.5">
                        <TeamTag team={team} small />
                        <span className="text-[12px] font-bold text-muted inline-flex items-center gap-1"><IconCoins size={12} className="text-gold" />{st.sales}</span>
                        <span className="text-[12px] font-bold text-muted inline-flex items-center gap-1"><IconHandshake size={12} className="text-sky" />{st.indications}</span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-sm bg-ink-900 border border-line-soft/50">
                        <div
                          className="bar-fill h-full rounded-sm"
                          style={{
                            width: mounted ? `${Math.max((st.points / topSellerPts) * 100, st.points > 0 ? 3 : 0)}%` : "0%",
                            transitionDelay: `${i * 110}ms`,
                            background: team?.color ?? "#8fa0c6",
                          }}
                        />
                      </div>
                    </div>
                    <p className="font-display tnum text-3xl sm:text-4xl shrink-0" style={{ color: i === 0 ? "#f6c453" : "#f2f5fc" }}>{fmtInt(st.points)}</p>
                  </div>
                ))}
                {sellers.length === 0 && <p className="text-muted text-lg font-semibold">Cadastre vendedores para ver este slide.</p>}
              </div>
            </SlideShell>
          </div>
        )}

        {slide === indSlide && (
          <div key="s3" className="slide-enter h-full">
            <SlideShell kicker="Quem traz gente nova" title="Radar de indicações" icon={<IconTarget size={18} />}>
              <div className="max-w-5xl">
                <div className="flex flex-wrap gap-x-14 gap-y-4 mb-8">
                  <div>
                    <p className="font-display tnum text-5xl sm:text-7xl text-sky">{fmtInt(totals.inds)}</p>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-faint mt-2">indicações no total</p>
                  </div>
                  <div>
                    <p className="font-display tnum text-5xl sm:text-7xl text-paper">{fmtInt(totals.inds * state.settings.pointsPerIndicacao)}</p>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-faint mt-2">pontos gerados</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {indRanking.slice(0, 6).map(({ seller, team, st }, i) => (
                    <div key={seller.id} className="flex items-center gap-4">
                      <span className={`font-display text-3xl w-9 text-center shrink-0 ${i === 0 ? "rank-ghost-gold" : "rank-ghost"}`}>{i + 1}</span>
                      <Avatar name={seller.name} color={team?.color ?? "#8fa0c6"} size={44} />
                      <p className="font-display text-xl sm:text-2xl uppercase tracking-wide text-paper truncate w-56 sm:w-72">{seller.name}</p>
                      <TeamTag team={team} small />
                      <div className="ml-auto flex items-center gap-3 shrink-0">
                        <div className="h-3 w-28 sm:w-56 overflow-hidden rounded-sm bg-ink-900 border border-line-soft/50">
                          <div
                            className="bar-fill h-full rounded-sm bg-sky"
                            style={{ width: mounted ? `${(st.indications / topInd) * 100}%` : "0%", transitionDelay: `${i * 120}ms` }}
                          />
                        </div>
                        <p className="font-display tnum text-3xl text-sky w-12 text-right">{st.indications}</p>
                      </div>
                    </div>
                  ))}
                  {indRanking.length === 0 && <p className="text-muted text-lg font-semibold">Nenhuma indicação registrada ainda.</p>}
                </div>
              </div>
            </SlideShell>
          </div>
        )}

        {slide === feedSlide && (
          <div key="s4" className="slide-enter h-full">
            <SlideShell kicker="Saiu agora do forno" title="Últimos lances" icon={<IconSpark size={18} />}>
              <div className="max-w-4xl overflow-hidden rounded-lg border border-line bg-ink-900/80 divide-y divide-line-soft/70">
                {entries.slice(0, 6).map((e) => {
                  const seller = sellerById.get(e.sellerId);
                  const team = seller ? teamById.get(seller.teamId) : undefined;
                  return (
                    <div key={e.id} className="flex items-center gap-4 px-5 py-3.5">
                      <TypeBadge type={e.type} />
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-xl uppercase tracking-wide text-paper truncate">{seller?.name ?? "Vendedor"}</p>
                        <p className="text-[13px] font-semibold text-muted truncate">
                          {team?.name ?? "—"} · {e.type === "venda" ? fmtBRL(e.value) : "indicação registrada"} · {fmtDate(e.date)}
                        </p>
                      </div>
                      <p className="font-display tnum text-3xl text-gold shrink-0">+{e.points}</p>
                    </div>
                  );
                })}
                {entries.length === 0 && <p className="px-5 py-10 text-center text-muted font-semibold">Nenhum lançamento ainda.</p>}
              </div>
            </SlideShell>
          </div>
        )}
      </div>

      {/* controles */}
      <div className="relative z-10 border-t border-line-soft bg-ink-900/85 backdrop-blur px-6 sm:px-12 py-3.5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <button onClick={() => { prev(); setProg(0); }} className="rounded-md border border-line p-2 text-muted transition-colors hover:text-paper hover:border-gold/60" aria-label="Slide anterior">
              <IconChevronLeft size={16} />
            </button>
            <button onClick={() => { next(); setProg(0); }} className="rounded-md border border-line p-2 text-muted transition-colors hover:text-paper hover:border-gold/60" aria-label="Próximo slide">
              <IconChevronRight size={16} />
            </button>
            <button
              onClick={() => setAuto((a) => !a)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-[11px] font-black uppercase tracking-wider transition-colors ${
                auto ? "border-lime/50 bg-lime/10 text-lime" : "border-line text-muted hover:text-paper"
              }`}
            >
              {auto ? <IconPause size={13} /> : <IconPlay size={13} />}
              {auto ? "Pausar" : "Auto"}
            </button>
          </div>

          <div className="flex items-center gap-2 mx-auto overflow-x-auto max-w-[60%]">
            {slides.map((label, i) => (
              <button
                key={label}
                onClick={() => { setSlide(i); setProg(0); }}
                className="group flex flex-col items-center gap-1.5 px-1 py-0.5 shrink-0"
                aria-label={`Ir para ${label}`}
              >
                <span className={`hidden md:block text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${i === slide ? "text-gold" : "text-faint group-hover:text-muted"}`}>
                  {label}
                </span>
                <span className={`h-1.5 rounded-full transition-all duration-300 ${i === slide ? "w-10 bg-gold" : "w-4 bg-line group-hover:bg-muted"}`} />
              </button>
            ))}
          </div>

          <span className="text-[12px] font-bold uppercase tracking-widest text-faint shrink-0">
            {slide + 1} / {N}
          </span>
        </div>
        {auto && (
          <div className="mt-2.5 h-0.5 w-full overflow-hidden rounded-full bg-ink-800">
            <div className="h-full rounded-full bg-gold" style={{ width: `${prog}%`, transition: "width 80ms linear" }} />
          </div>
        )}
      </div>
    </div>
  );
}
