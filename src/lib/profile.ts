export const GENDERS = { male: "Мужчина", female: "Женщина" } as const;
export const LOOKING_FOR = { female: "Женщину", male: "Мужчину", any: "Неважно" } as const;

export type Gender = keyof typeof GENDERS;
export type LookingFor = keyof typeof LOOKING_FOR;

export type Profile = {
  id: string;
  nickname: string;
  age: number;
  gender: Gender;
  looking_for: LookingFor;
  is_admin: boolean;
  created_at: string;
};

export const MIN_AGE = 18;
export const UNDERAGE_COOKIE = "twin_underage";
