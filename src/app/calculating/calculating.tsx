"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { runMatching } from "./actions";

const MIN_MS = 4000; // ТЗ: анимация 3–5 секунд
const LINES = [
  "Сверяем биоритмы…",
  "Считаем коэффициент Жаккара…",
  "Взвешиваем психологию…",
  "Ищем красные флаги…",
  "Советуемся с искусственным интеллектом…",
  "Почти готово. Алгоритм волнуется…",
];

const RADIUS = 88;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function Calculating() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [line, setLine] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    // Одна попытка расчёта даже в StrictMode.
    if (started.current) return;
    started.current = true;

    const start = Date.now();
    let finished = false;
    // Быстро к ~92%, дальше ждём сервер: честнее, чем «застрявшие» 100%.
    const tick = setInterval(() => {
      if (finished) return;
      const t = (Date.now() - start) / MIN_MS;
      setProgress(Math.min(92, Math.round(100 * (1 - Math.exp(-2.6 * t)))));
    }, 60);
    const lines = setInterval(() => setLine((l) => Math.min(l + 1, LINES.length - 1)), 900);

    Promise.all([runMatching().catch(() => undefined), new Promise((r) => setTimeout(r, MIN_MS))]).then(() => {
      finished = true;
      setProgress(100);
      setTimeout(() => router.replace("/results"), 500);
    });

    return () => {
      clearInterval(tick);
      clearInterval(lines);
    };
  }, [router]);

  return (
    <div className="flex flex-col items-center gap-10 text-center" aria-live="polite">
      <div className="relative size-56 sm:size-64">
        <svg viewBox="0 0 200 200" className="size-full -rotate-90" aria-hidden>
          <circle cx="100" cy="100" r={RADIUS} fill="none" strokeWidth="10" className="stroke-muted" />
          <circle
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            className="stroke-primary transition-[stroke-dashoffset] duration-150 ease-out"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress / 100)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-6xl font-bold tabular-nums text-primary">{progress}%</span>
          <span className="mt-1 text-sm text-muted-foreground">анализ</span>
        </div>
        <div className="absolute inset-0 animate-ping rounded-full border-2 border-primary/20 [animation-duration:2.4s]" />
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Алгоритм анализирует…</h1>
        <p key={line} className="h-7 text-lg text-muted-foreground duration-300 animate-in fade-in slide-in-from-bottom-2">
          {LINES[line]}
        </p>
      </div>
    </div>
  );
}
