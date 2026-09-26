import type { Breakdown } from "@/lib/matching";
import { RED_FLAG_PENALTY } from "@/lib/matching";
import type { ResultCard } from "@/lib/results";
import { cn } from "@/lib/utils";

const BLOCKS: { key: keyof Breakdown; label: string }[] = [
  { key: "psychology", label: "Психология" },
  { key: "lifestyle", label: "Образ жизни" },
  { key: "tastes", label: "Вкусы" },
];

export function ageLabel(age: number) {
  const mod10 = age % 10;
  const mod100 = age % 100;
  if (mod10 === 1 && mod100 !== 11) return `${age} год`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${age} года`;
  return `${age} лет`;
}

export function BlockBars({ breakdown, large = false }: { breakdown: Breakdown; large?: boolean }) {
  return (
    <div className="flex flex-col gap-2.5">
      {BLOCKS.map(({ key, label }) => (
        <div key={key} className="flex items-center gap-3">
          <span className={cn("w-28 shrink-0 text-muted-foreground", large ? "text-base" : "text-sm")}>{label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${breakdown[key]}%` }} />
          </div>
          <span className={cn("w-10 text-right font-semibold tabular-nums", large ? "text-base" : "text-sm")}>
            {breakdown[key]}%
          </span>
        </div>
      ))}
    </div>
  );
}

function Details({ card }: { card: ResultCard }) {
  return (
    <details className="group rounded-2xl bg-muted/60 px-4 py-3 text-sm">
      <summary className="cursor-pointer list-none font-medium select-none marker:hidden">
        <span className="group-open:hidden">Подробнее ↓</span>
        <span className="hidden group-open:inline">Свернуть ↑</span>
      </summary>
      <div className="mt-3 flex flex-col gap-3 leading-relaxed">
        {card.strongest.length > 0 && (
          <div>
            <p className="mb-1 font-semibold">Что совпало</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {card.strongest.map((f) => (
                <li key={f.text} className="first-letter:uppercase">{f.phrase}</li>
              ))}
            </ul>
          </div>
        )}
        {card.difference && (
          <div>
            <p className="mb-1 font-semibold">Главное различие</p>
            <p className="text-muted-foreground first-letter:uppercase">{card.difference.phrase}</p>
          </div>
        )}
        {card.redFlags > 0 && (
          <p className="text-muted-foreground">
            🚩 Минус {card.redFlags * RED_FLAG_PENALTY} баллов: ответы задели чьё-то «абсолютно неприемлемо».
          </p>
        )}
      </div>
    </details>
  );
}

export function HeroMatch({ card }: { card: ResultCard }) {
  return (
    <article className="grid gap-6 rounded-3xl border-2 border-primary/30 bg-card p-6 shadow-sm sm:p-8 lg:grid-cols-[auto_1fr] lg:gap-10">
      <div className="flex flex-col justify-center">
        <p className="text-sm font-semibold tracking-widest text-primary uppercase">Лучшее совпадение</p>
        <p className="font-heading text-7xl leading-none font-bold tabular-nums text-primary sm:text-8xl">
          {card.score}%
        </p>
        <p className="mt-3 text-2xl font-bold">{card.nickname}</p>
        <p className="text-muted-foreground">{ageLabel(card.age)}</p>
      </div>
      <div className="flex flex-col justify-center gap-5">
        <p className="text-lg leading-relaxed sm:text-xl">{card.explanation}</p>
        <BlockBars breakdown={card.breakdown} large />
        <Details card={card} />
      </div>
    </article>
  );
}

export function MatchCard({ card, rank }: { card: ResultCard; rank: number }) {
  return (
    <article className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">#{rank}</p>
          <p className="text-xl font-bold">{card.nickname}</p>
          <p className="text-sm text-muted-foreground">{ageLabel(card.age)}</p>
        </div>
        <p className="font-heading text-4xl font-bold tabular-nums text-primary">{card.score}%</p>
      </div>
      <p className="leading-relaxed">{card.explanation}</p>
      <BlockBars breakdown={card.breakdown} />
      <Details card={card} />
    </article>
  );
}
