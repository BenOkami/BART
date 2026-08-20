import { useEffect, useRef, useState } from "react";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const brlCents = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const int = new Intl.NumberFormat("pt-BR");

export const fmtBRL = (v: number) => brl.format(v);
export const fmtBRLFull = (v: number) => brlCents.format(v);
export const fmtInt = (v: number) => int.format(v);

/** Valor total exato: inteiro → sem centavos; com centavos → mostra os 2 dígitos. */
export function fmtMoney(v: number): string {
  return Number.isInteger(v) ? brl.format(v) : brlCents.format(v);
}

/**
 * Interpreta valores digitados no padrão brasileiro ou internacional:
 * "1.250,50" → 1250.5 · "1250,50" → 1250.5 · "1.500" → 1500 · "1250.50" → 1250.5
 * Sempre arredonda para centavos, para o total bater com a soma das linhas.
 */
export function parseMoney(raw: string): number {
  let s = raw.trim().replace(/r\$/gi, "").replace(/\s/g, "");
  if (!s) return 0;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    s = s.replace(",", ".");
  } else if (hasDot) {
    const decimals = s.split(".").pop() ?? "";
    if (decimals.length === 3) s = s.replace(/\./g, ""); // ponto de milhar
  }
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100) / 100;
}

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

export function todayISO(): string {
  const t = new Date();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${t.getFullYear()}-${m}-${d}`;
}

export function daysAgoISO(days: number): string {
  const t = new Date();
  t.setDate(t.getDate() - days);
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${t.getFullYear()}-${m}-${d}`;
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Anima um número até o alvo (respeita prefers-reduced-motion). */
export function useCountUp(target: number, duration = 1000): number {
  const [val, setVal] = useState(0);
  const reduced = usePrefersReducedMotion();
  const prev = useRef(0);

  useEffect(() => {
    if (reduced) {
      setVal(target);
      prev.current = target;
      return;
    }
    const from = prev.current === 0 ? 0 : prev.current;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      const v = from + (target - from) * e;
      setVal(v);
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);

  return val;
}

/** Revela o elemento quando entra na viewport. */
export function useReveal<T extends HTMLElement>(delay = 0) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, className: `reveal ${inView ? "is-in" : ""}`, style: { animationDelay: `${delay}ms` } };
}
