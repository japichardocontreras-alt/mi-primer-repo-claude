import { mexicoParts } from "../format";

/** Lee "AAAA-MM" del parámetro o usa el mes actual (hora de México). */
export function monthParam(v?: string) {
  if (v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)) {
    const [y, m] = v.split("-").map(Number);
    return { y, m, key: v };
  }
  const p = mexicoParts();
  return { y: p.year, m: p.month, key: `${p.year}-${String(p.month).padStart(2, "0")}` };
}
