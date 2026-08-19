import { useState } from "react";
import type { AppState, Settings, Team } from "../types";
import { getSellerStats, getTeamStats } from "../lib/store";
import { fmtInt, useReveal } from "../lib/utils";
import { Avatar, Modal, useToast } from "./ui";
import { IconGear, IconPlus, IconTrash, IconUsers } from "./icons";

const inputCls =
  "w-full rounded-md border border-line bg-ink-950/70 px-3.5 py-2.5 text-[15px] text-paper placeholder:text-faint outline-none transition-colors focus:border-gold/70";

export default function TeamsView({
  state,
  onAddTeam,
  onRenameTeam,
  onSetTeamColor,
  onDeleteTeam,
  onAddSeller,
  onDeleteSeller,
  onSetSettings,
  onResetDemo,
  onClearEntries,
}: {
  state: AppState;
  onAddTeam: (name: string, color: string) => void;
  onRenameTeam: (id: string, name: string) => void;
  onSetTeamColor: (id: string, color: string) => void;
  onDeleteTeam: (id: string) => void;
  onAddSeller: (name: string, teamId: string) => void;
  onDeleteSeller: (id: string) => void;
  onSetSettings: (s: Settings) => void;
  onResetDemo: () => void;
  onClearEntries: () => void;
}) {
  const toast = useToast();
  const teamStats = getTeamStats(state);
  const sellerStats = getSellerStats(state);

  const [newTeamName, setNewTeamName] = useState("");
  const [addSellerFor, setAddSellerFor] = useState<Team | null>(null);
  const [sellerName, setSellerName] = useState("");
  const [confirm, setConfirm] = useState<{ kind: "team" | "seller"; id: string; name: string } | null>(null);
  const [dangerOpen, setDangerOpen] = useState(false);

  const palette = ["#ff6b4a", "#4cc9f0", "#ffc53d", "#a8e34d", "#ff5c8a", "#2dd4bf", "#b78bff", "#ff9f45"];
  const nextColor = () => {
    const used = new Set(state.teams.map((t) => t.color));
    return palette.find((c) => !used.has(c)) ?? palette[state.teams.length % palette.length];
  };

  const createTeam = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTeamName.trim();
    if (!name) {
      toast.push("Digite um nome para a nova equipe.", "coral");
      return;
    }
    onAddTeam(name, nextColor());
    setNewTeamName("");
    toast.push(`Equipe ${name} entrou na arena.`, "lime");
  };

  const createSeller = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSellerFor) return;
    const name = sellerName.trim();
    if (!name) return;
    onAddSeller(name, addSellerFor.id);
    toast.push(`${name} agora joga pela equipe ${addSellerFor.name}.`, "lime");
    setSellerName("");
  };

  const revA = useReveal<HTMLDivElement>(0);
  const revB = useReveal<HTMLDivElement>(80);
  const revC = useReveal<HTMLDivElement>(160);

  return (
    <div className="space-y-10">
      {/* equipes */}
      <section ref={revA.ref} className={revA.className} style={revA.style}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-gold">
              <IconUsers size={14} /> Elenco da temporada
            </p>
            <h2 className="font-display text-2xl sm:text-3xl uppercase tracking-wide text-paper mt-1">Equipes na arena</h2>
          </div>
        </div>

        <form onSubmit={createTeam} className="mb-5 flex gap-2 max-w-md">
          <input
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="Nome da nova equipe…"
            className={inputCls}
          />
          <button
            type="submit"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-gold px-4 py-2 text-[13px] font-black uppercase tracking-wider text-ink-950 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <IconPlus size={15} /> Criar
          </button>
        </form>

        {state.teams.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line bg-ink-900/60 px-6 py-10 text-center text-sm text-muted">
            Nenhuma equipe ainda. Crie a primeira acima.
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {state.teams.map((team) => {
              const st = teamStats.get(team.id)!;
              const members = state.sellers.filter((s) => s.teamId === team.id);
              return (
                <article
                  key={team.id}
                  className="group relative overflow-hidden rounded-lg border border-line-soft bg-ink-900/75 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(0,0,0,0.5)]"
                  style={{ borderColor: `${team.color}55` }}
                >
                  <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${team.color}, ${team.color}44)` }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="h-4 w-4 shrink-0 -skew-x-6" style={{ background: team.color }} />
                        <input
                          value={team.name}
                          onChange={(e) => onRenameTeam(team.id, e.target.value)}
                          onBlur={() => toast.push("Nome da equipe atualizado.", "sky")}
                          aria-label={`Nome da equipe ${team.name}`}
                          className="min-w-0 flex-1 rounded-sm bg-transparent font-display text-xl uppercase tracking-wide text-paper outline-none border-b border-transparent focus:border-gold/60 transition-colors"
                        />
                      </div>
                      <button
                        onClick={() => setConfirm({ kind: "team", id: team.id, name: team.name })}
                        aria-label={`Excluir equipe ${team.name}`}
                        className="rounded-md border border-transparent p-2 text-faint transition-all hover:border-coral/50 hover:text-coral"
                      >
                        <IconTrash size={15} />
                      </button>
                    </div>

                    {/* cores */}
                    <div className="mt-3 flex items-center gap-1.5">
                      {palette.map((c) => (
                        <button
                          key={c}
                          onClick={() => onSetTeamColor(team.id, c)}
                          aria-label={`Mudar cor para ${c}`}
                          className={`h-5 w-5 rounded-full transition-transform hover:scale-125 ${
                            team.color === c ? "ring-2 ring-paper ring-offset-2 ring-offset-ink-900 scale-110" : "opacity-70"
                          }`}
                          style={{ background: c }}
                        />
                      ))}
                    </div>

                    {/* números */}
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <MiniStat label="Vendas" value={fmtInt(st.sales)} color="#f6c453" />
                      <MiniStat label="Indicações" value={fmtInt(st.indications)} color="#4cc9f0" />
                      <MiniStat label="Vendedores" value={fmtInt(st.members)} color={team.color} />
                    </div>

                    {/* membros */}
                    <div className="mt-4 space-y-2">
                      {members.map((s) => {
                        const ss = sellerStats.get(s.id)!;
                        return (
                          <div key={s.id} className="flex items-center gap-2.5 rounded-md border border-line-soft/60 bg-ink-950/50 px-3 py-2 transition-colors hover:bg-ink-800/60">
                            <Avatar name={s.name} color={team.color} size={30} />
                            <span className="min-w-0 flex-1 truncate text-sm font-bold text-paper">{s.name}</span>
                            <span className="tnum text-[11px] font-bold text-gold">{fmtInt(ss.points)} pts</span>
                            <button
                              onClick={() => setConfirm({ kind: "seller", id: s.id, name: s.name })}
                              aria-label={`Remover ${s.name}`}
                              className="rounded p-1 text-faint transition-colors hover:text-coral"
                            >
                              <IconTrash size={13} />
                            </button>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => { setAddSellerFor(team); setSellerName(""); }}
                        className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-line px-3 py-2 text-[12px] font-black uppercase tracking-wider text-muted transition-colors hover:border-gold/60 hover:text-gold"
                      >
                        <IconPlus size={13} /> Adicionar vendedor
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* regras */}
      <section ref={revB.ref} className={revB.className} style={revB.style}>
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-gold">
          <IconGear size={14} /> Como o placar pontua
        </p>
        <h2 className="font-display text-2xl sm:text-3xl uppercase tracking-wide text-paper mt-1 mb-4">Regras de pontuação</h2>
        <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
          <div className="rounded-lg border border-line-soft bg-ink-900/75 p-5">
            <label htmlFor="reais" className="text-[11px] font-black uppercase tracking-[0.18em] text-muted">
              1 ponto de venda a cada
            </label>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-display text-lg text-gold">R$</span>
              <input
                id="reais"
                type="number"
                min={1}
                value={state.settings.reaisPerPoint}
                onChange={(e) => onSetSettings({ ...state.settings, reaisPerPoint: Math.max(1, Number(e.target.value) || 1) })}
                className="w-28 rounded-md border border-line bg-ink-950/70 px-3 py-2 font-display tnum text-xl text-paper outline-none focus:border-gold/70"
              />
            </div>
            <p className="mt-2 text-[12px] font-semibold text-faint">Ex.: venda de R$ 1.500 = {fmtInt(Math.max(1, Math.round(1500 / state.settings.reaisPerPoint)))} pontos.</p>
          </div>
          <div className="rounded-lg border border-line-soft bg-ink-900/75 p-5">
            <label htmlFor="ind" className="text-[11px] font-black uppercase tracking-[0.18em] text-muted">
              Pontos por indicação
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="ind"
                type="number"
                min={1}
                value={state.settings.pointsPerIndicacao}
                onChange={(e) => onSetSettings({ ...state.settings, pointsPerIndicacao: Math.max(1, Number(e.target.value) || 1) })}
                className="w-28 rounded-md border border-line bg-ink-950/70 px-3 py-2 font-display tnum text-xl text-paper outline-none focus:border-gold/70"
              />
              <span className="font-display text-lg text-sky">pts</span>
            </div>
            <p className="mt-2 text-[12px] font-semibold text-faint">Cada indicação registrada soma no vendedor e na equipe.</p>
          </div>
        </div>
        <p className="mt-3 text-[12px] font-semibold text-faint">As regras valem para os próximos lançamentos — o histórico mantém os pontos já creditados.</p>
      </section>

      {/* zona de perigo */}
      <section ref={revC.ref} className={revC.className} style={revC.style}>
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-coral">
          <IconTrash size={14} /> Zona de perigo
        </p>
        <h2 className="font-display text-2xl sm:text-3xl uppercase tracking-wide text-paper mt-1 mb-4">Recomeçar a temporada</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => { onResetDemo(); toast.push("Equipes restauradas: Jacaré, Tubarão, Capivara, Águia e Lobo — tudo zerado.", "sky"); }}
            className="rounded-md border border-sky/50 px-4 py-2.5 text-[13px] font-black uppercase tracking-wider text-sky transition-colors hover:bg-sky/10"
          >
            Restaurar equipes padrão
          </button>
          <button
            onClick={() => setDangerOpen(true)}
            className="rounded-md border border-coral/50 px-4 py-2.5 text-[13px] font-black uppercase tracking-wider text-coral transition-colors hover:bg-coral/10"
          >
            Zerar placar
          </button>
        </div>
      </section>

      {/* modal: adicionar vendedor */}
      <Modal
        open={!!addSellerFor}
        onClose={() => setAddSellerFor(null)}
        title="Novo vendedor"
        subtitle={addSellerFor ? `Vai jogar pela equipe ${addSellerFor.name}.` : undefined}
      >
        <form onSubmit={createSeller} className="space-y-4">
          <input
            autoFocus
            value={sellerName}
            onChange={(e) => setSellerName(e.target.value)}
            placeholder="Nome completo do vendedor…"
            className={inputCls}
          />
          <button
            type="submit"
            className="w-full rounded-md bg-gold px-6 py-3 font-display text-lg uppercase tracking-widest text-ink-950 transition-all hover:brightness-110 active:scale-[0.99]"
          >
            Entrar na equipe
          </button>
        </form>
      </Modal>

      {/* modal: confirmação */}
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Confirmar remoção"
        subtitle="Essa ação não pode ser desfeita."
      >
        {confirm && (
          <div className="space-y-5">
            <p className="text-[15px] text-paper leading-relaxed">
              {confirm.kind === "team" ? (
                <>Remover a equipe <strong className="text-coral">{confirm.name}</strong> também remove todos os vendedores dela do ranking.</>
              ) : (
                <>Remover <strong className="text-coral">{confirm.name}</strong> do elenco? Os lançamentos antigos deixam de contar no ranking.</>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (confirm.kind === "team") {
                    onDeleteTeam(confirm.id);
                    toast.push(`Equipe ${confirm.name} removida da arena.`, "coral");
                  } else {
                    onDeleteSeller(confirm.id);
                    toast.push(`${confirm.name} saiu do elenco.`, "coral");
                  }
                  setConfirm(null);
                }}
                className="flex-1 rounded-md bg-coral px-5 py-2.5 text-[13px] font-black uppercase tracking-wider text-ink-950 transition-all hover:brightness-110"
              >
                Remover
              </button>
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 rounded-md border border-line px-5 py-2.5 text-[13px] font-black uppercase tracking-wider text-muted transition-colors hover:text-paper hover:border-gold/60"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* modal: zerar placar */}
      <Modal
        open={dangerOpen}
        onClose={() => setDangerOpen(false)}
        title="Zerar o placar"
        subtitle="Apaga todos os lançamentos, mantendo equipes e vendedores."
      >
        <div className="space-y-5">
          <p className="text-[15px] text-paper leading-relaxed">
            Tem certeza? Todas as <strong className="text-coral">vendas e indicações lançadas</strong> serão apagadas e o placar volta do zero.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => { onClearEntries(); setDangerOpen(false); toast.push("Placar zerado. Boa nova temporada!", "coral"); }}
              className="flex-1 rounded-md bg-coral px-5 py-2.5 text-[13px] font-black uppercase tracking-wider text-ink-950 transition-all hover:brightness-110"
            >
              Zerar tudo
            </button>
            <button
              onClick={() => setDangerOpen(false)}
              className="flex-1 rounded-md border border-line px-5 py-2.5 text-[13px] font-black uppercase tracking-wider text-muted transition-colors hover:text-paper hover:border-gold/60"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-md border border-line-soft/60 bg-ink-950/50 px-2 py-2">
      <p className="font-display tnum text-xl leading-none" style={{ color }}>{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-faint">{label}</p>
    </div>
  );
}
