// 10 вымышленных участников для проверки алгоритма (этап 4).
// Типы подобраны так, чтобы были заведомо совместимые и заведомо несовместимые пары:
//   Аня ↔ Макс        — тусовщики-совы из большого города
//   Ольга ↔ Игорь     — деревенские жаворонки, хотят детей
//   Лена ↔ Катя       — творческие интроверты (обе ищут женщину)
//   Денис             — курящая сова, против детей, избегающий: плохая пара для Ольги и Вики
//   Вика              — тревожная привязанность: с избегающим Денисом — штраф
//   Саша              — «средний по больнице», ищет кого угодно
//   Тимур             — ищет мужчину: взаимно подходит только Саша
import type { Answers } from "../src/config/questions";
import type { Gender, LookingFor } from "../src/lib/profile";

export type SeedProfile = {
  key: string;
  nickname: string;
  age: number;
  gender: Gender;
  looking_for: LookingFor;
  answers: Answers;
};

/** Черты 1..5 → ответы на прямое и обратное утверждение. */
function big5(t: { o: number; c: number; e: number; a: number; s: number }): Answers {
  return {
    o1: t.o, o2: 6 - t.o,
    c1: t.c, c2: 6 - t.c,
    e1: t.e, e2: 6 - t.e,
    a1: t.a, a2: 6 - t.a,
    s1: t.s, s2: 6 - t.s,
  };
}

function attachment(closeness: number, anxiety: number, space: number, conflict: number): Answers {
  return { att_closeness: closeness, att_anxiety: anxiety, att_space: space, att_conflict: conflict };
}

export const SEED_PROFILES: SeedProfile[] = [
  {
    key: "anya",
    nickname: "Аня",
    age: 26,
    gender: "female",
    looking_for: "male",
    answers: {
      ...big5({ o: 5, c: 2, e: 5, a: 4, s: 3 }),
      ...attachment(4, 3, 3, 4),
      kids: "maybe", money: "spend", priority: "career", place: "city", relocation: "yes", religion: "none",
      chronotype: "owl", sport: "sometimes", food: "omnivore", parties: "6+", habits: "drink", pets: "want",
      music: ["pop", "electronic", "hiphop", "rnb"],
      movies: ["comedy", "reality", "romance", "sitcom"],
      weekend: ["bar", "concert", "travel"],
      ideal_day:
        "Просыпаюсь к обеду, завтракаю в кафе с подругами, днём шопинг и прогулка по центру, а вечером клуб и танцы до утра.",
      dealbreaker: "Занудство и когда человек все выходные сидит дома.",
    },
  },
  {
    key: "max",
    nickname: "Макс",
    age: 28,
    gender: "male",
    looking_for: "female",
    answers: {
      ...big5({ o: 4, c: 2, e: 5, a: 4, s: 4 }),
      ...attachment(3, 2, 3, 4),
      kids: "maybe", money: "spend", priority: "career", place: "city", relocation: "yes", religion: "none",
      chronotype: "owl", sport: "sometimes", food: "omnivore", parties: "3-5", habits: "drink", pets: "want",
      music: ["electronic", "hiphop", "pop", "indie"],
      movies: ["comedy", "action", "sitcom", "scifi"],
      weekend: ["bar", "concert", "games"],
      ideal_day:
        "Сплю до полудня, потом бранч с друзьями в новом месте, вечером концерт или бар, домой возвращаюсь под утро.",
      dealbreaker: "Ревность и попытки меня контролировать.",
    },
  },
  {
    key: "olga",
    nickname: "Ольга",
    age: 31,
    gender: "female",
    looking_for: "male",
    answers: {
      ...big5({ o: 3, c: 5, e: 2, a: 5, s: 5 }),
      ...attachment(4, 1, 2, 5),
      kids: "yes", money: "save", priority: "family", place: "nature", relocation: "no", religion: "neutral",
      chronotype: "lark", sport: "regular", food: "omnivore", parties: "0", habits: "none", pets: "have",
      music: ["folk", "classical", "jazz", "soundtracks"],
      movies: ["drama", "documentary", "detective"],
      weekend: ["dacha", "hiking", "cooking"],
      ideal_day:
        "Встаю в шесть, пью чай на веранде, работаю в огороде, днём пеку пироги, а вечером читаю у печки под треск дров.",
      dealbreaker: "Курение и пьянство.",
    },
  },
  {
    key: "igor",
    nickname: "Игорь",
    age: 33,
    gender: "male",
    looking_for: "female",
    answers: {
      ...big5({ o: 3, c: 5, e: 2, a: 4, s: 5 }),
      ...attachment(4, 2, 2, 4),
      kids: "yes", money: "save", priority: "family", place: "nature", relocation: "no", religion: "neutral",
      chronotype: "lark", sport: "regular", food: "omnivore", parties: "1-2", habits: "none", pets: "have",
      music: ["folk", "russian_rock", "classical", "soundtracks"],
      movies: ["documentary", "drama", "detective", "comedy"],
      weekend: ["dacha", "hiking", "cooking"],
      ideal_day:
        "Подъём на рассвете, рыбалка на реке, потом баня и долгий ужин с семьёй на свежем воздухе.",
      dealbreaker: "Лень и равнодушие к семье.",
    },
  },
  {
    key: "denis",
    nickname: "Денис",
    age: 35,
    gender: "male",
    looking_for: "female",
    answers: {
      ...big5({ o: 2, c: 1, e: 4, a: 1, s: 2 }),
      ...attachment(1, 1, 5, 1),
      kids: "no", money: "spend", priority: "career", place: "city", relocation: "yes", religion: "none",
      chronotype: "owl", sport: "never", food: "omnivore", parties: "6+", habits: "smoke", pets: "against",
      music: ["metal", "rock", "russian_rock"],
      movies: ["horror", "thriller", "action"],
      weekend: ["bar", "games", "sleep"],
      ideal_day:
        "Сплю до вечера, потом играю в приставку, ночью бар с друзьями и сигарета на балконе.",
      dealbreaker: "Когда мне указывают, что делать.",
    },
  },
  {
    key: "vika",
    nickname: "Вика",
    age: 29,
    gender: "female",
    looking_for: "male",
    answers: {
      ...big5({ o: 3, c: 3, e: 3, a: 4, s: 1 }),
      ...attachment(5, 5, 1, 3),
      kids: "yes", money: "balance", priority: "family", place: "city", relocation: "maybe", religion: "neutral",
      chronotype: "flexible", sport: "sometimes", food: "omnivore", parties: "1-2", habits: "drink_sometimes", pets: "want",
      music: ["pop", "indie", "rnb", "soundtracks"],
      movies: ["romance", "drama", "comedy"],
      weekend: ["home_series", "museum", "travel"],
      ideal_day:
        "Долго завтракаем вдвоём, гуляем по городу, заходим в музей, а вечером смотрим сериал под пледом.",
      dealbreaker: "Холодность и когда человек пропадает без объяснений.",
    },
  },
  {
    key: "lena",
    nickname: "Лена",
    age: 24,
    gender: "female",
    looking_for: "female",
    answers: {
      ...big5({ o: 5, c: 3, e: 2, a: 4, s: 3 }),
      ...attachment(3, 3, 4, 4),
      kids: "maybe", money: "balance", priority: "career", place: "city", relocation: "yes", religion: "none",
      chronotype: "owl", sport: "sometimes", food: "vegetarian", parties: "1-2", habits: "drink_sometimes", pets: "have",
      music: ["indie", "electronic", "kpop", "soundtracks"],
      movies: ["anime", "fantasy", "scifi"],
      weekend: ["museum", "games", "concert"],
      ideal_day:
        "Рисую до обеда, потом иду в антикафе играть в настолки, вечером смотрим аниме и заказываем пиццу.",
      dealbreaker: "Высокомерие и насмешки над чужими увлечениями.",
    },
  },
  {
    key: "katya",
    nickname: "Катя",
    age: 27,
    gender: "female",
    looking_for: "female",
    answers: {
      ...big5({ o: 5, c: 3, e: 2, a: 5, s: 3 }),
      ...attachment(3, 2, 4, 4),
      kids: "maybe", money: "balance", priority: "career", place: "city", relocation: "yes", religion: "none",
      chronotype: "owl", sport: "sometimes", food: "vegetarian", parties: "1-2", habits: "drink_sometimes", pets: "want",
      music: ["indie", "electronic", "jazz", "soundtracks"],
      movies: ["anime", "fantasy", "documentary"],
      weekend: ["museum", "games", "cooking"],
      ideal_day:
        "Утром пишу рассказ в кофейне, днём выставка современного искусства, а вечером настолки с друзьями и аниме.",
      dealbreaker: "Грубость.",
    },
  },
  {
    key: "sasha",
    nickname: "Саша",
    age: 30,
    gender: "male",
    looking_for: "any",
    answers: {
      ...big5({ o: 3, c: 3, e: 3, a: 3, s: 3 }),
      ...attachment(3, 3, 3, 3),
      kids: "maybe", money: "balance", priority: "balance", place: "suburb", relocation: "maybe", religion: "neutral",
      chronotype: "flexible", sport: "sometimes", food: "omnivore", parties: "1-2", habits: "drink_sometimes", pets: "want",
      music: ["pop", "rock", "soundtracks"],
      movies: ["comedy", "action", "scifi"],
      weekend: ["home_series", "travel", "cooking"],
      ideal_day:
        "Выспаться, приготовить хороший завтрак, съездить куда-нибудь недалеко, а вечером посмотреть фильм.",
      dealbreaker: "Враньё.",
    },
  },
  {
    key: "timur",
    nickname: "Тимур",
    age: 25,
    gender: "male",
    looking_for: "male",
    answers: {
      ...big5({ o: 4, c: 5, e: 4, a: 3, s: 4 }),
      ...attachment(3, 2, 3, 5),
      kids: "no", money: "save", priority: "career", place: "city", relocation: "yes", religion: "none",
      chronotype: "lark", sport: "life", food: "other", parties: "3-5", habits: "none", pets: "against",
      music: ["hiphop", "electronic", "rock"],
      movies: ["action", "documentary", "scifi"],
      weekend: ["sport", "hiking", "travel"],
      ideal_day:
        "Пробежка в шесть утра, тренировка в зале, работа над своим стартапом, а вечером скалодром с друзьями.",
      dealbreaker: "Курение и лень.",
    },
  },
];
