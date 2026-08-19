import confetti from "canvas-confetti";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { EntryType, Team } from "../types";
import { hexToRgba, initials, uid, usePrefersReducedMotion } from "../lib/utils";
import { IconClose, IconHandshake, IconCoins } from "./icons";

/* ------------------------------------------------------------------ */
/* confete                                                             */
/* ------------------------------------------------------------------ */

export function fireConfetti(colors: string[] = ["#f6c453", "#4cc9f0", "#ff6b4a", "#a8e34d"]) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const common = { colors, disableForReducedMotion: true, zIndex: 400 };
  confetti({ ...common, particleCount: 70, spread: 75, origin: { x: 0.2, y: 0.75 }, angle: 65, scalar: 0.9 });
  confetti({ ...common, particleCount: 70, spread: 75, origin: { x: 0.8, y: 0.75 }, angle: 115, scalar: 0.9 });
  setTimeout(() => {
    confetti({ ...common, particleCount: 50, spread: 110, origin: { x: 0.5, y: 0.4 }, scalar: 1.05 });
  }, 180);
}

/* ------------------------------------------------------------------ */
/* toasts                                                              */
/* ------------------------------------------------------------------ */

interface Toast {
  id: string;
  message: string;
  tone: "gold" | "lime" | "coral" | "sky";
}

interface ToastApi {
  push: (message: string, tone?: Toast["tone"]) => void;
}

const ToastContext = createContext<ToastApi>({ push: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: Toast["tone"] = "gold") => {
    const id = uid();
    setToasts((t) => [...t.slice(-3), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  const api = useMemo(() => ({ push }), [push]);

  const toneBar: Record<Toast["tone"], string> = {
    gold: "bg-gold",
    lime: "bg-lime",
    coral: "bg-coral",
    sky: "bg-sky",
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-5 right-5 z-[130] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-in flex items-center gap-3 rounded-lg border border-line bg-ink-850/95 backdrop-blur px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)] max-w-xs"
          >
            <span className={`h-8 w-1 rounded-full ${toneBar[t.tone]}`} />
            <p className="text-sm font-medium text-paper leading-snug">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label="Fechar"
        className="absolute inset-0 bg-ink-950/78 backdrop-blur-[3px] cursor-default"
        onClick={onClose}
      />
      <div
        className={`pop-in relative w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-xl border border-line bg-ink-900 shadow-[0_30px_80px_rgba(0,0,0,0.65)] overflow-hidden`}
      >
        <div className="diag-stripes border-b border-line-soft bg-ink-850 px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl uppercase tracking-wide text-paper">{title}</h2>
            {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md border border-line p-2 text-muted hover:text-paper hover:border-gold/60 hover:bg-ink-800 transition-colors"
            aria-label="Fechar janela"
          >
            <IconClose size={16} />
          </button>
        </div>
        <div className="p-6 max-h-[76vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* peças pequenas                                                      */
/* ------------------------------------------------------------------ */

export function Avatar({ name, color, size = 40, ring = true }: { name: string; color: string; size?: number; ring?: boolean }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-display uppercase select-none shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        color,
        background: hexToRgba(color, 0.13),
        border: ring ? `2px solid ${hexToRgba(color, 0.75)}` : "none",
        letterSpacing: "0.03em",
      }}
    >
      {initials(name)}
    </span>
  );
}

export function TeamTag({ team, small }: { team?: Team; small?: boolean }) {
  if (!team) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 -skew-x-6 border font-bold uppercase tracking-wider ${
        small ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-0.5"
      }`}
      style={{
        color: team.color,
        borderColor: hexToRgba(team.color, 0.45),
        background: hexToRgba(team.color, 0.1),
      }}
    >
      <span className="inline-block w-1.5 h-1.5 skew-x-6" style={{ background: team.color }} />
      <span className="skew-x-6">{team.name}</span>
    </span>
  );
}

export function TypeBadge({ type, small }: { type: EntryType; small?: boolean }) {
  const venda = type === "venda";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm font-extrabold uppercase tracking-widest ${
        small ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-1"
      } ${venda ? "bg-gold/15 text-gold border border-gold/35" : "bg-sky/12 text-sky border border-sky/35"}`}
    >
      {venda ? <IconCoins size={small ? 11 : 13} /> : <IconHandshake size={small ? 11 : 13} />}
      {venda ? "Venda" : "Indicação"}
    </span>
  );
}

const MEDAL_COLORS = ["#f6c453", "#c9d4e8", "#e0955f"];

export function RankBadge({ rank }: { rank: number }) {
  const podium = rank <= 3;
  const color = MEDAL_COLORS[rank - 1] ?? "#5c6c94";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-display tnum shrink-0 ${
        podium ? "w-9 h-9 text-base" : "w-8 h-8 text-sm"
      }`}
      style={
        podium
          ? { background: hexToRgba(color, 0.16), color, border: `2px solid ${color}`, boxShadow: `0 0 18px ${hexToRgba(color, 0.35)}` }
          : { border: "1.5px solid #24345e", color: "#8fa0c6" }
      }
    >
      {rank}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* fundo ambiente                                                      */
/* ------------------------------------------------------------------ */

export function AmbientBackground() {
  const reduced = usePrefersReducedMotion();
  return (
    <>
      <div className="fixed inset-0 arena-bg -z-10" />
      <div className="fixed inset-0 grid-layer -z-10" />
      {!reduced && (
        <>
          <div
            className="glow-a fixed -z-10 rounded-full blur-3xl opacity-40"
            style={{ width: 520, height: 520, left: "-8%", top: "-12%", background: "radial-gradient(circle, rgba(76,201,240,0.22), transparent 65%)" }}
          />
          <div
            className="glow-b fixed -z-10 rounded-full blur-3xl opacity-40"
            style={{ width: 560, height: 560, right: "-10%", top: "8%", background: "radial-gradient(circle, rgba(255,107,74,0.18), transparent 65%)" }}
          />
        </>
      )}
      <div className="noise-layer fixed inset-0 z-[140] pointer-events-none opacity-[0.035]" />
    </>
  );
}
