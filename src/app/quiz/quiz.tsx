"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  BLOCKS,
  QUESTIONS,
  SCALE_LABELS,
  type AnswerValue,
  type Answers,
  type BlockId,
  type Question,
} from "@/config/questions";
import { isAnswered } from "@/lib/quiz";
import { cn } from "@/lib/utils";
import { submitAnswers } from "./actions";

type Step = { kind: "intro"; block: BlockId } | { kind: "question"; question: Question; number: number };

const BLOCK_ORDER: BlockId[] = ["psychology", "lifestyle", "tastes"];

const STEPS: Step[] = BLOCK_ORDER.flatMap((block) => [
  { kind: "intro" as const, block },
  ...QUESTIONS.filter((q) => q.block === block).map((question) => ({
    kind: "question" as const,
    question,
    number: QUESTIONS.indexOf(question) + 1,
  })),
]);

const AUTO_ADVANCE_MS = 280;

function draftKey(userId: string) {
  return `twin:quiz-draft:${userId}`;
}

function loadDraft(userId: string): { answers: Answers; step: number } | null {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function Quiz({ userId }: { userId: string }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const restored = useRef(false);

  // Черновик в браузере: если страницу случайно перезагрузили, ответы не пропадут.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const draft = loadDraft(userId);
    if (draft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- восстановление из localStorage после гидратации
      setAnswers(draft.answers);
      setStep(Math.min(draft.step, STEPS.length - 1));
    }
  }, [userId]);

  useEffect(() => {
    if (!restored.current) return;
    try {
      localStorage.setItem(draftKey(userId), JSON.stringify({ answers, step }));
    } catch {
      // Приватный режим — просто без черновика.
    }
  }, [answers, step, userId]);

  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  const current = STEPS[step];
  const answeredCount = useMemo(
    () => QUESTIONS.filter((q) => isAnswered(q, answers[q.id])).length,
    [answers],
  );
  const progress = Math.round((answeredCount / QUESTIONS.length) * 100);
  const isLast = step === STEPS.length - 1;

  function go(delta: 1 | -1) {
    clearTimeout(advanceTimer.current);
    setError(undefined);
    setDirection(delta);
    setStep((s) => Math.min(Math.max(s + delta, 0), STEPS.length - 1));
  }

  function answer(q: Question, value: AnswerValue, autoAdvance = false) {
    setAnswers((a) => ({ ...a, [q.id]: value }));
    if (autoAdvance && !isLast) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => go(1), AUTO_ADVANCE_MS);
    }
  }

  function submit() {
    const missing = QUESTIONS.find((q) => !isAnswered(q, answers[q.id]));
    if (missing) {
      setDirection(-1);
      setStep(STEPS.findIndex((s) => s.kind === "question" && s.question.id === missing.id));
      setError("Этот вопрос пропущен — алгоритму без него никак.");
      return;
    }
    // При успехе action делает redirect и после await код не выполняется,
    // поэтому черновик убираем заранее и возвращаем, только если сервер ответил ошибкой.
    const key = draftKey(userId);
    let draft: string | null = null;
    try {
      draft = localStorage.getItem(key);
      localStorage.removeItem(key);
    } catch {}

    startTransition(async () => {
      const result = await submitAnswers(answers);
      if (result?.error) {
        setError(result.error);
        try {
          if (draft) localStorage.setItem(key, draft);
        } catch {}
      }
    });
  }

  const block = current.kind === "intro" ? current.block : current.question.block;
  const canContinue = current.kind === "intro" || isAnswered(current.question, answers[current.question.id]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4">
      {/* Прогресс-бар всегда на виду */}
      <div className="sticky top-0 z-10 -mx-4 bg-background/90 px-4 pt-2 pb-4 backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{BLOCKS[block].title}</span>
          <span>
            {current.kind === "question" ? `${current.number} из ${QUESTIONS.length}` : `${progress}%`}
          </span>
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Прогресс анкеты"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div
        key={step}
        className={cn(
          "flex flex-1 flex-col justify-center gap-8 py-8 duration-300 animate-in fade-in",
          direction === 1 ? "slide-in-from-right-8" : "slide-in-from-left-8",
        )}
      >
        {current.kind === "intro" ? (
          <BlockIntro block={current.block} />
        ) : (
          <QuestionView
            question={current.question}
            value={answers[current.question.id]}
            onAnswer={(value, auto) => answer(current.question, value, auto)}
          />
        )}

        {error && (
          <p role="alert" className="text-center text-sm font-medium text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 bg-background/90 px-4 py-4 backdrop-blur">
        <Button
          variant="ghost"
          size="lg"
          className="h-12 rounded-full"
          onClick={() => go(-1)}
          disabled={step === 0 || pending}
          aria-label="Назад"
        >
          <ArrowLeft className="size-5" />
          Назад
        </Button>
        {isLast ? (
          <Button
            size="lg"
            className="h-12 flex-1 rounded-full text-base"
            onClick={submit}
            disabled={!canContinue || pending}
          >
            {pending ? "Отправляем алгоритму…" : "Узнать, кто мне подходит"}
          </Button>
        ) : (
          <Button
            size="lg"
            className="h-12 flex-1 rounded-full text-base"
            onClick={() => go(1)}
            disabled={!canContinue}
          >
            {current.kind === "intro" ? "Поехали" : "Далее"}
          </Button>
        )}
      </div>
    </div>
  );
}

function BlockIntro({ block }: { block: BlockId }) {
  const { title, intro, banner } = BLOCKS[block];
  const index = BLOCK_ORDER.indexOf(block) + 1;
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm font-semibold tracking-widest text-primary uppercase">Блок {index} из 3</p>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      <p className="text-lg text-muted-foreground">{intro}</p>
      {banner && (
        <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-accent/60 p-4 text-base">
          🧬 {banner}
        </div>
      )}
    </div>
  );
}

function QuestionView({
  question: q,
  value,
  onAnswer,
}: {
  question: Question;
  value: AnswerValue | undefined;
  onAnswer: (value: AnswerValue, autoAdvance?: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl leading-snug font-bold sm:text-3xl">{q.text}</h1>
        {q.hint && <p className="text-muted-foreground">{q.hint}</p>}
      </div>

      {q.type === "scale" && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onAnswer(n, true)}
                aria-pressed={value === n}
                aria-label={`${n} из 5`}
                className={cn(
                  "aspect-square rounded-2xl border-2 text-xl font-bold transition-all hover:border-primary/60 active:scale-95",
                  value === n && "scale-105 border-primary bg-primary text-primary-foreground",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{SCALE_LABELS.min}</span>
            <span className="text-right">{SCALE_LABELS.max}</span>
          </div>
        </div>
      )}

      {q.type === "choice" && (
        <div className="flex flex-col gap-3">
          {q.options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onAnswer(o.value, true)}
              aria-pressed={value === o.value}
              className={cn(
                "min-h-14 rounded-2xl border-2 px-5 py-3 text-left text-lg font-medium transition-all hover:border-primary/60 active:scale-[0.98]",
                value === o.value && "border-primary bg-primary text-primary-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {q.type === "multi" && <MultiChoice question={q} value={value} onAnswer={onAnswer} />}

      {q.type === "text" && (
        <div className="flex flex-col gap-2">
          <textarea
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder={q.placeholder}
            maxLength={q.maxLength}
            rows={5}
            autoFocus
            className="w-full resize-none rounded-2xl border-2 bg-card p-4 text-lg outline-none focus:border-primary"
          />
          <p className="text-right text-sm text-muted-foreground">
            {typeof value === "string" ? value.trim().length : 0} / {q.maxLength}
            {typeof value === "string" && value.trim().length < q.minLength && ` · минимум ${q.minLength}`}
          </p>
        </div>
      )}
    </div>
  );
}

function MultiChoice({
  question: q,
  value,
  onAnswer,
}: {
  question: Extract<Question, { type: "multi" }>;
  value: AnswerValue | undefined;
  onAnswer: (value: AnswerValue) => void;
}) {
  const selected = Array.isArray(value) ? value : [];
  const full = selected.length >= q.max;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {q.options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              disabled={!on && full}
              onClick={() => onAnswer(on ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
              aria-pressed={on}
              className={cn(
                "rounded-full border-2 px-4 py-2.5 text-base font-medium transition-all hover:border-primary/60 active:scale-95 disabled:opacity-40",
                on && "border-primary bg-primary text-primary-foreground",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">
        Выбрано {selected.length} из {q.max}
      </p>
    </div>
  );
}
