"use client";

import { Maximize2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Breakdown } from "@/lib/matching";
import { cn } from "@/lib/utils";

const REVEAL_MS = 5000; // ТЗ: анимация 5 секунд
const BLOCKS: { key: keyof Breakdown; label: string }[] = [
  { key: "psychology", label: "Психология" },
  { key: "lifestyle", label: "Образ жизни" },
  { key: "tastes", label: "Вкусы" },
];

type Phase = "idle" | "counting" | "done";

// Плавный разгон и медленный финиш: итог не угадывается в первую секунду, последние проценты
// тянутся, как в телешоу.
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function Reveal({
  names,
  score,
  breakdown,
  explanation,
}: {
  names: [string, string];
  score: number;
  breakdown: Breakdown;
  explanation: string;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [shown, setShown] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number>(0);

  const reveal = useCallback(() => {
    setPhase("counting");
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / REVEAL_MS);
      setShown(Math.round(score * easeInOutCubic(t)));
      if (t < 1) frame.current = requestAnimationFrame(step);
      else setPhase("done");
    };
    frame.current = requestAnimationFrame(step);
  }, [score]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // Выход из полноэкранного режима кнопкой Esc выключает и режим презентации.
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setPresenting(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresenting(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting]);

  async function startPresentation() {
    setPresenting(true);
    try {
      // На iPhone Fullscreen API нет — тогда остаётся полноэкранный слой поверх страницы.
      await stageRef.current?.requestFullscreen?.();
    } catch {}
  }

  async function stopPresentation() {
    setPresenting(false);
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
  }

  function replay() {
    cancelAnimationFrame(frame.current);
    setShown(0);
    setPhase("idle");
  }

  const big = presenting;

  return (
    // В презентации: слой на весь экран, а центрирование через m-auto у содержимого —
    // в отличие от justify-center, оно не обрезает верх, если экран низкий.
    <div ref={stageRef} className={cn("w-full", presenting && "fixed inset-0 z-50 flex overflow-y-auto bg-background")}>
      <div
        className={cn(
          "m-auto flex w-full flex-col items-center text-center",
          presenting ? "gap-[2.5vh] px-6 py-[3vh] sm:px-12" : "gap-8",
        )}
      >
      {presenting && (
        <button
          type="button"
          onClick={stopPresentation}
          aria-label="Выйти из режима презентации"
          className="absolute top-4 right-4 rounded-full p-2 text-muted-foreground opacity-40 transition-opacity hover:opacity-100"
        >
          <X className="size-6" />
        </button>
      )}

      <div className="flex flex-col gap-2">
        {presenting && (
          <p className="font-heading text-xl font-bold tracking-tight text-muted-foreground">TWIN</p>
        )}
        <p
          className={cn(
            "font-heading font-bold tracking-tight",
            big ? "text-[clamp(1.75rem,6vh,3.75rem)]" : "text-3xl sm:text-4xl",
          )}
        >
          {names[0]} <span className="text-primary">+</span> {names[1]}
        </p>
      </div>

      {phase === "idle" ? (
        <div className="flex flex-col items-center gap-4">
          <p className={cn("text-muted-foreground", big ? "text-2xl" : "text-lg")}>
            Алгоритм всё посчитал. Готовы узнать?
          </p>
          <Button
            size="lg"
            onClick={reveal}
            className={cn("rounded-full", big ? "h-20 px-14 text-3xl" : "h-16 px-10 text-xl")}
          >
            Раскрыть результат
          </Button>
        </div>
      ) : (
        <>
          <p
            className={cn(
              "font-heading leading-none font-bold tabular-nums text-primary",
              big ? "text-[clamp(5rem,21vh,16rem)]" : "text-[clamp(6rem,24vw,11rem)]",
              phase === "counting" && "animate-pulse",
            )}
            aria-live="polite"
          >
            {shown}%
          </p>

          {phase === "done" && (
            <div
              className={cn(
                "flex w-full flex-col gap-8 duration-700 animate-in fade-in slide-in-from-bottom-4",
                big ? "max-w-5xl gap-[3vh]" : "max-w-xl",
              )}
            >
              <div className="grid grid-cols-3 gap-3 sm:gap-6">
                {BLOCKS.map(({ key, label }) => (
                  <div key={key} className="flex flex-col items-center gap-2">
                    <span className={cn("font-heading font-bold tabular-nums", big ? "text-[clamp(1.5rem,5vh,3rem)]" : "text-3xl")}>
                      {breakdown[key]}%
                    </span>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${breakdown[key]}%` }} />
                    </div>
                    <span className={cn("text-muted-foreground", big ? "text-[clamp(0.875rem,2.2vh,1.25rem)]" : "text-sm")}>{label}</span>
                  </div>
                ))}
              </div>
              <p className={cn("leading-relaxed", big ? "text-[clamp(1.125rem,3.2vh,1.875rem)]" : "text-lg sm:text-xl")}>
                {explanation}
              </p>
              <p className={cn("text-muted-foreground", big ? "text-[clamp(0.75rem,1.6vh,1rem)]" : "text-xs")}>
                Развлекательный эксперимент. Результат не является научной или психологической оценкой.
              </p>
            </div>
          )}
        </>
      )}

      {!presenting && (
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="outline" className="rounded-full" onClick={startPresentation}>
            <Maximize2 className="size-4" />
            Режим презентации
          </Button>
          {phase === "done" && (
            <Button variant="ghost" className="rounded-full" onClick={replay}>
              Показать ещё раз
            </Button>
          )}
        </div>
      )}
      {presenting && phase === "done" && (
        <button
          type="button"
          onClick={replay}
          className="absolute right-4 bottom-4 text-sm text-muted-foreground opacity-40 hover:opacity-100"
        >
          Ещё раз
        </button>
      )}
      </div>
    </div>
  );
}
