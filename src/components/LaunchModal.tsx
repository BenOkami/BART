import { useMemo, useState } from "react";
import { computePoints, useStore } from "../lib/store";
import { fmtBRL, fmtInt, todayISO } from "../lib/utils";
import { fireConfetti, Modal, useToast } from "./ui";
import { IconBolt, IconCoins } from "./icons";

const inputCls =
  "w-full rounded-md border border-line bg-ink-950/70 px-3.5 py-2.5 text-[15px] text-paper placeholder:text-faint outline-none transition-colors focus:border-gold/70";

export default function LaunchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, addEntry } = useStore();
  const toast = useToast();

  const [sellerId, setSellerId] = useState("");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState("");

  const parsedValue = useMemo(() => {
    const n = parseFloat(value.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [value]);

  const preview = computePoints("venda", parsedValue, state.settings);

  const seller = state.sellers.find((s) => s.id === sellerId);
  const team = seller ? state.teams.find((t) => t.id === seller.teamId) : undefined;

  const reset = () => {
    setSellerId("");
    setValue("");
    setNote("");
    setDate(todayISO());
    setError("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerId) {
      setError("Escolha o vendedor que fechou a venda.");
      return;
    }
    if (parsedValue <= 0) {
      setError("Informe um valor de venda maior que zero.");
      return;
    }
    const entry = addEntry({ type: "venda", sellerId, value: parsedValue, note: note.trim(), date });
    fireConfetti(team ? [team.color, "#f6c453", "#f2f5fc"] : undefined);
    toast.push(
      `Venda de ${fmtBRL(parsedValue)} para ${seller?.name} · +${fmtInt(entry.points)} pts`,
      "gold"
    );
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Lançar venda"
      subtitle="O placar da equipe e do vendedor é atualizado na hora."
    >
      <form onSubmit={submit} className="space-y-5">
        {/* vendedor */}
        <div>
          <label htmlFor="seller" className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-muted">
            <IconCoins size={13} className="text-gold" /> Vendedor
          </label>
          <select id="seller" value={sellerId} onChange={(e) => setSellerId(e.target.value)} className={inputCls}>
            <option value="">Selecione o vendedor…</option>
            {state.teams.map((t) => {
              const members = state.sellers.filter((s) => s.teamId === t.id);
              if (members.length === 0) return null;
              return (
                <optgroup key={t.id} label={`Equipe ${t.name}`}>
                  {members.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          {state.sellers.length === 0 && (
            <p className="mt-1.5 text-[12px] font-semibold text-coral">
              Nenhum vendedor cadastrado ainda — adicione os vendedores de cada equipe na aba "Equipes".
            </p>
          )}
        </div>

        {/* valor */}
        <div>
          <label htmlFor="value" className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-muted">
            Valor da venda (R$)
          </label>
          <input
            id="value"
            autoFocus
            inputMode="decimal"
            placeholder="Ex.: 1250,00"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={inputCls}
          />
          <p className="mt-1.5 text-[12px] text-faint font-semibold">
            Regra atual: 1 ponto a cada {fmtBRL(state.settings.reaisPerPoint)} vendidos.
          </p>
        </div>

        {/* data + observação */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-muted">
              Data
            </label>
            <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="note" className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-muted">
              Observação <span className="text-faint normal-case font-semibold">(opcional)</span>
            </label>
            <input id="note" placeholder="Ex.: plano anual" value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} maxLength={80} />
          </div>
        </div>

        {/* prévia de pontos */}
        <div className="flex items-center justify-between rounded-md border border-line bg-ink-950/60 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-bold text-muted">
            <IconBolt size={16} className="text-gold" />
            {seller ? (
              <span>
                Pontos para <span className="text-paper">{seller.name}</span>
                {team && <span className="text-faint"> · {team.name}</span>}
              </span>
            ) : (
              <span>Prévia de pontuação</span>
            )}
          </div>
          <span className="font-display tnum text-3xl text-gold">
            +{fmtInt(preview)}
          </span>
        </div>

        {error && (
          <p className="rounded-md border border-coral/40 bg-coral/10 px-4 py-2.5 text-sm font-bold text-coral" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="group relative w-full overflow-hidden rounded-md bg-gold px-6 py-3.5 font-display text-lg uppercase tracking-widest text-ink-950 transition-all duration-200 hover:brightness-110 active:scale-[0.99] shadow-[0_10px_30px_rgba(246,196,83,0.25)]"
        >
          <span className="relative z-10 inline-flex items-center justify-center gap-2">
            <IconBolt size={18} /> Confirmar no placar
          </span>
        </button>
      </form>
    </Modal>
  );
}
