"use client";

import { useActionState, useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteUser, recalculate, setVideoDate, type ActionState } from "./actions";

function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p role="alert" className="text-sm font-medium text-destructive">{state.error}</p>;
  if (state.message) return <p className="text-sm text-muted-foreground">{state.message}</p>;
  return null;
}

export function RecalculateButton() {
  const [state, action, pending] = useActionState<ActionState, FormData>(() => recalculate(), {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <Button type="submit" disabled={pending} className="rounded-full">
        {pending ? "Пересчитываем…" : "Пересчитать всё"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function VideoDateForm({ value }: { value: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setVideoDate, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input type="date" name="date" defaultValue={value ?? ""} className="h-10" aria-label="Дата публикации видео" />
        <Button type="submit" variant="outline" disabled={pending}>
          Сохранить
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function DeleteUserButton({ userId, nickname }: { userId: string; nickname: string }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<ActionState>({});

  return (
    <div className="flex flex-col items-end gap-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
            Удалить
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить «{nickname}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Профиль, ответы, пары и проверки пары этого участника сотрутся сразу и навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Оставить</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                startTransition(async () => setState(await deleteUser(userId)));
              }}
            >
              {pending ? "Удаляем…" : "Да, удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {state.error && <span className="text-xs text-destructive">{state.error}</span>}
    </div>
  );
}
