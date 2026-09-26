"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendMagicLink, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, {
    status: "idle",
  });

  if (state.status === "sent") {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="text-5xl">📬</p>
        <h2 className="text-2xl font-bold">Проверьте почту</h2>
        <p className="text-muted-foreground">
          Отправили ссылку для входа на <span className="font-semibold text-foreground">{state.email}</span>.
          Если письма нет — загляните в «Спам», почтальоны тоже ошибаются.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-base">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nikita@zhuki.ru"
          required
          className="h-12 text-base"
        />
      </div>

      <div className="flex items-start gap-3">
        <Checkbox id="consent" name="consent" required className="mt-0.5 size-5" />
        <Label htmlFor="consent" className="block text-sm leading-relaxed font-normal text-muted-foreground">
          Я соглашаюсь на обработку моих данных и ответов анкеты.{" "}
          <Link href="/privacy" target="_blank" className="font-medium text-foreground underline underline-offset-4">
            Как мы используем данные
          </Link>
        </Label>
      </div>

      {state.status === "error" && (
        <p role="alert" className="text-sm font-medium text-destructive">{state.message}</p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="h-12 rounded-full text-base">
        {pending ? "Отправляем…" : "Получить ссылку для входа"}
      </Button>
    </form>
  );
}
