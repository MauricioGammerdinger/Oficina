/** Aceita "1,5" e "1.5" — no Brasil se digita com vírgula. */
export function parseNum(value: FormDataEntryValue | null, fallback = 0) {
  if (value === null) return fallback;
  const raw = String(value).trim();
  if (!raw) return fallback;
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : fallback;
}

export function parseStr(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const raw = String(value).trim();
  return raw.length ? raw : null;
}

export function parseId(value: FormDataEntryValue | null) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new Error("Registro inválido.");
  return n;
}

export const money = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const qty = (n: number) =>
  n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
