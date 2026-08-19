import { useState } from "react";
import { StoreProvider, seedState, useStore } from "./lib/store";
import { uid } from "./lib/utils";
import { AmbientBackground, fireConfetti, ToastProvider, useToast } from "./components/ui";
import Scoreboard from "./components/Scoreboard";
import LaunchModal from "./components/LaunchModal";
import EntriesView from "./components/EntriesView";
import TeamsView from "./components/TeamsView";
import Presentation from "./components/Presentation";
import { IconBolt, IconCoins, IconFlag, IconPlus, IconScreen } from "./components/icons";

type Tab = "placar" | "lancamentos" | "equipes";

function Shell() {
  const { state, dispatch, loading, status } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("placar");
  const [launchOpen, setLaunchOpen] = useState(false);
  const [presenting, setPresenting] = useState(false);

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "placar", label: "Placar", icon: <IconBolt size={15} /> },
    { id: "lancamentos", label: "Lançamentos", icon: <IconCoins size={15} /> },
    { id: "equipes", label: "Equipes", icon: <IconFlag size={15} /> },
  ];

  const statusInfo: Record<string, { cls: string; dot: string; label: string; pulse?: boolean }> = {
    connecting: { cls: "text-amber border-amber/40", dot: "bg-amber", label: "Conectando…", pulse: true },
    online: { cls: "text-lime border-lime/40", dot: "bg-lime", label: "Nuvem ativa" },
    offline: { cls: "text-coral border-coral/40", dot: "bg-coral", label: "Offline" },
    error: { cls: "text-coral border-coral/40", dot: "bg-coral", label: "Modo local" },
  };
  const st = statusInfo[status];

  return (
    <div className="relative min-h-screen text-paper">
      <AmbientBackground />

      {/* cabeçalho */}
      <header className="sticky top-0 z-40 border-b border-line-soft bg-ink-950/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-gold text-ink-950 shadow-[0_0_22px_rgba(246,196,83,0.4)]">
                <IconBolt size={20} />
              </span>
              <div className="leading-tight">
                <p className="font-display text-lg uppercase tracking-[0.12em]">Arena de Vendas</p>
                <p className="hidden sm:block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                  placar de equipes & vendedores
                </p>
              </div>
            </div>

            <nav className="flex items-center gap-1 rounded-lg border border-line-soft bg-ink-900/80 p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-bold uppercase tracking-wider transition-all duration-200 ${
                    tab === t.id
                      ? "bg-gold text-ink-950 shadow-[0_2px_14px_rgba(246,196,83,0.35)]"
                      : "text-muted hover:text-paper hover:bg-ink-800"
                  }`}
                >
                  {t.icon}
                  <span className="hidden md:inline">{t.label}</span>
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <span
                title="Status da sincronização em tempo real"
                className={`hidden md:inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest ${st.cls}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${st.dot} ${st.pulse ? "animate-pulse" : ""}`} />
                {st.label}
              </span>
              <button
                onClick={() => setPresenting(true)}
                className="group hidden sm:inline-flex items-center gap-2 rounded-md border border-line px-3.5 py-2 text-[13px] font-bold uppercase tracking-wider text-muted transition-all duration-200 hover:border-gold/60 hover:text-gold"
                title="Modo apresentação"
              >
                <IconScreen size={16} />
                <span className="hidden lg:inline">Apresentar</span>
              </button>
              <button
                onClick={() => setLaunchOpen(true)}
                className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-[13px] font-black uppercase tracking-wider text-ink-950 shadow-[0_4px_20px_rgba(246,196,83,0.35)] transition-all duration-200 hover:brightness-110 hover:shadow-[0_4px_28px_rgba(246,196,83,0.5)] active:scale-[0.98]"
              >
                <IconPlus size={15} /> Lançar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* conteúdo */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
        {(status === "offline" || status === "error") && !loading && (
          <div className="mt-4 rounded-md border border-amber/40 bg-amber/10 px-4 py-2.5 text-[13px] font-bold text-amber">
            Sem conexão com a nuvem — as alterações ficam salvas apenas neste dispositivo até a conexão voltar.
          </div>
        )}

        {tab === "placar" && <Scoreboard state={state} onLaunch={() => setLaunchOpen(true)} />}

        {tab === "lancamentos" && (
          <div className="pt-8">
            <EntriesView state={state} onDelete={(id) => dispatch({ type: "DELETE_ENTRY", id })} />
          </div>
        )}

        {tab === "equipes" && (
          <div className="pt-8">
            <TeamsView
              state={state}
              onAddTeam={(name, color) =>
                dispatch({ type: "ADD_TEAM", team: { id: uid(), name, color, createdAt: Date.now() } })
              }
              onRenameTeam={(id, name) => dispatch({ type: "RENAME_TEAM", id, name })}
              onSetTeamColor={(id, color) => dispatch({ type: "SET_TEAM_COLOR", id, color })}
              onDeleteTeam={(id) => dispatch({ type: "DELETE_TEAM", id })}
              onAddSeller={(name, teamId) =>
                dispatch({ type: "ADD_SELLER", seller: { id: uid(), name, teamId, createdAt: Date.now() } })
              }
              onDeleteSeller={(id) => dispatch({ type: "DELETE_SELLER", id })}
              onSetSettings={(settings) => dispatch({ type: "SET_SETTINGS", settings })}
              onResetDemo={() => {
                dispatch({ type: "RESET_DEMO", teams: seedState().teams });
                fireConfetti();
              }}
              onClearEntries={() => dispatch({ type: "CLEAR_ENTRIES" })}
            />
          </div>
        )}
      </main>

      {/* rodapé */}
      <footer className="border-t border-line-soft py-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-wrap items-center justify-between gap-2 text-[12px] font-semibold text-faint">
          <span>Arena de Vendas · placar de equipes e vendedores</span>
          <span>Placar sincronizado em tempo real na nuvem (Firebase)</span>
        </div>
      </footer>

      {/* botões flutuantes (mobile) */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2 sm:hidden">
        <button
          onClick={() => setPresenting(true)}
          aria-label="Modo apresentação"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-ink-900/95 text-muted shadow-lg backdrop-blur transition-colors hover:text-gold"
        >
          <IconScreen size={20} />
        </button>
        <button
          onClick={() => setLaunchOpen(true)}
          aria-label="Lançar resultado"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gold text-ink-950 shadow-[0_8px_30px_rgba(246,196,83,0.45)] transition-transform active:scale-95"
        >
          <IconPlus size={24} />
        </button>
      </div>

      <LaunchModal open={launchOpen} onClose={() => setLaunchOpen(false)} />

      {presenting && (
        <Presentation
          state={state}
          onClose={() => {
            setPresenting(false);
            toast.push("Apresentação encerrada.", "sky");
          }}
        />
      )}

      {/* tela de conexão inicial */}
      {loading && (
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-ink-950">
          <div className="arena-bg absolute inset-0" />
          <div className="grid-layer absolute inset-0" />
          <span className="relative flex h-16 w-16 animate-pulse items-center justify-center rounded-xl bg-gold text-ink-950 shadow-[0_0_50px_rgba(246,196,83,0.5)]">
            <IconBolt size={34} />
          </span>
          <p className="relative font-display mt-6 text-2xl uppercase tracking-[0.18em] text-paper">
            Conectando à arena…
          </p>
          <p className="relative mt-2 text-sm font-semibold text-muted">
            Sincronizando o placar na nuvem
          </p>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </StoreProvider>
  );
}
