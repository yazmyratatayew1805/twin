"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/** Экран первого участника: крупный код и ожидание, страница сама обновится, когда код введут. */
export function Waiting({ code, expiresAt }: { code: string; expiresAt: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(id);
  }, [router]);

  const until = new Date(expiresAt).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <p className="text-sm font-semibold tracking-widest text-primary uppercase">Ваш код</p>
      <p className="font-heading text-5xl font-bold tracking-[0.12em] sm:text-7xl sm:tracking-[0.2em]">{code}</p>
      <Button
        variant="outline"
        className="rounded-full"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
          } catch {
            // Буфер обмена недоступен — код и так крупно на экране.
          }
        }}
      >
        {copied ? "Скопировано ✓" : "Скопировать код"}
      </Button>
      <p className="max-w-sm text-lg text-muted-foreground">
        Продиктуйте код второй половинке. Пусть пройдёт анкету на своём телефоне и введёт его в
        разделе «Проверка пары».
      </p>
      <p className="animate-pulse text-muted-foreground">Ждём вторую половинку…</p>
      <p className="text-sm text-muted-foreground" suppressHydrationWarning>
        Код действует до {until} и работает один раз.
      </p>
    </div>
  );
}
