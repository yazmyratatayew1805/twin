"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GENDERS, LOOKING_FOR, type Profile } from "@/lib/profile";
import { saveProfile, type ProfileState } from "./actions";

function ChoiceGroup({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: Record<string, string>;
  defaultValue?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:auto-cols-fr sm:grid-flow-col">
      {Object.entries(options).map(([value, label]) => (
        <label
          key={value}
          className="flex h-12 cursor-pointer items-center justify-center rounded-full border text-base font-medium transition-colors hover:bg-accent has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring"
        >
          <input
            type="radio"
            name={name}
            value={value}
            defaultChecked={defaultValue === value}
            required
            className="sr-only"
          />
          {label}
        </label>
      ))}
    </div>
  );
}

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, {});

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="nickname" className="text-base">Имя или ник</Label>
        <Input
          id="nickname"
          name="nickname"
          defaultValue={profile?.nickname}
          placeholder="Например, Артемий"
          maxLength={30}
          required
          className="h-12 text-base"
        />
        <p className="text-xs text-muted-foreground">Его увидят ваши совпадения. Email — никто.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="age" className="text-base">Возраст</Label>
        <Input
          id="age"
          name="age"
          type="number"
          inputMode="numeric"
          min={1}
          max={120}
          defaultValue={profile?.age}
          placeholder="18+"
          required
          className="h-12 w-32 text-base"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-base font-medium">Пол</legend>
        <ChoiceGroup name="gender" options={GENDERS} defaultValue={profile?.gender} />
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-base font-medium">Кого ищете</legend>
        <ChoiceGroup name="looking_for" options={LOOKING_FOR} defaultValue={profile?.looking_for} />
      </fieldset>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-destructive">{state.error}</p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="h-12 rounded-full text-base">
        {pending ? "Сохраняем…" : profile ? "Сохранить" : "Сохранить и перейти к анкете"}
      </Button>
    </form>
  );
}
