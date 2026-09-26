import type { Bucket } from "@/lib/admin";

export function plural(n: number, [one, few, many]: [string, string, string]) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

const pairs = (n: number) => `${n} ${plural(n, ["пара", "пары", "пар"])}`;

/**
 * Распределение процентов: одна серия, поэтому без легенды — её называет заголовок.
 * Столбцы ≤24px со скруглённым верхом от общей базовой линии, значение на вершине
 * текстовым цветом; подсказка на hover и фокус с клавиатуры; таблица для доступности.
 */
export function Histogram({ buckets }: { buckets: Bucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const PLOT = 160;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-1 border-b border-border pt-6" style={{ height: PLOT + 24 }}>
        {buckets.map((b) => {
          const h = b.count ? Math.max(4, Math.round((b.count / max) * PLOT)) : 0;
          const label = `${b.from}–${b.to}%: ${pairs(b.count)}`;
          return (
            <div
              key={b.from}
              tabIndex={0}
              aria-label={label}
              className="group relative flex h-full flex-1 flex-col items-center justify-end outline-none"
            >
              <span className="mb-1 text-xs font-semibold tabular-nums text-muted-foreground">
                {b.count || ""}
              </span>
              <div
                className="w-full max-w-6 rounded-t-[4px] bg-chart-1 transition-opacity group-hover:opacity-80 group-focus-visible:opacity-80"
                style={{ height: h }}
              />
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-lg border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap text-popover-foreground shadow-md group-hover:block group-focus-visible:block"
              >
                <span className="font-bold tabular-nums">{pairs(b.count)}</span>{" "}
                <span className="text-muted-foreground">
                  {b.from}–{b.to}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 text-[11px] text-muted-foreground tabular-nums">
        {buckets.map((b) => (
          <span key={b.from} className="flex-1 text-center">
            {b.from}
          </span>
        ))}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Таблица</summary>
        <table className="mt-2 w-full max-w-xs text-left tabular-nums">
          <thead>
            <tr className="text-muted-foreground">
              <th className="py-1 font-medium">Процент</th>
              <th className="py-1 text-right font-medium">Пар</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.from} className="border-t">
                <td className="py-1">
                  {b.from}–{b.to}%
                </td>
                <td className="py-1 text-right">{b.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
