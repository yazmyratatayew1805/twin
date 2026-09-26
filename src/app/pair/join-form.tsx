"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinPairCode, type JoinState } from "./actions";

export function JoinForm({ initialCode }: { initialCode?: string }) {
  const [state, action, pending] = useActionState<JoinState, FormData>(joinPairCode, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <Input
        name="code"
        defaultValue={initialCode}
        placeholder="K7M2QX"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={8}
        required
        aria-label="Код партнёра"
        className="h-14 text-center font-heading text-2xl tracking-[0.3em] uppercase"
      />
      {state.error && (
        <p role="alert" className="text-sm font-medium text-destructive">{state.error}</p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="h-12 rounded-full text-base">
        {pending ? "Алгоритм сравнивает вас…" : "Проверить совместимость"}
      </Button>
    </form>
  );
}
