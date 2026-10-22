import { Input } from "./ui/form";
import { Button } from "./ui/button";

/** Selector de mes (GET) que conserva otros parámetros. */
export function MonthPicker({ value, extra = {} }: { value: string; extra?: Record<string, string | undefined> }) {
  return (
    <form className="flex items-center gap-2">
      {Object.entries(extra).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <Input type="month" name="mes" defaultValue={value} className="w-44" aria-label="Mes" />
      <Button type="submit" variant="outline" size="sm">Ver</Button>
    </form>
  );
}
