// Анкета TWIN. Формулировки можно менять здесь без правки логики.
// id вопросов используются в алгоритме (lib/matching.ts) — их лучше не переименовывать.

export type BlockId = "psychology" | "lifestyle" | "tastes";

export type Option = { value: string; label: string };

type Base = {
  id: string;
  block: BlockId;
  text: string;
  hint?: string;
  /** Короткая тема для объяснений пары: «режим дня», «дети»… */
  topic?: string;
};

export type ScaleQuestion = Base & {
  type: "scale";
  /** Группа для алгоритма: черта «Большой пятёрки» или шкала привязанности. */
  trait: BigFiveTrait | AttachmentScale;
  /** Обратное утверждение: балл переворачивается (6 − ответ). */
  reverse?: boolean;
};

export type ChoiceQuestion = Base & { type: "choice"; options: Option[] };

export type MultiQuestion = Base & { type: "multi"; options: Option[]; max: number };

export type TextQuestion = Base & {
  type: "text";
  placeholder: string;
  minLength: number;
  maxLength: number;
};

export type Question = ScaleQuestion | ChoiceQuestion | MultiQuestion | TextQuestion;

export type BigFiveTrait =
  | "openness"
  | "conscientiousness"
  | "extraversion"
  | "agreeableness"
  | "stability";

export type AttachmentScale = "closeness" | "anxiety" | "space" | "conflict";

export const SCALE_LABELS = { min: "Совсем не про меня", max: "Точно про меня" } as const;

export const BLOCKS: Record<BlockId, { title: string; intro: string; banner?: string }> = {
  psychology: {
    title: "Психология",
    intro: "Характер, ценности и то, как вы ведёте себя в отношениях. Отвечайте честно — алгоритм не обидится.",
  },
  lifestyle: {
    title: "Биология",
    intro: "Биоритмы и образ жизни: когда вы спите, как едите и сколько тусуетесь.",
    banner:
      "В сериале был глубокий биологический анализ. У нас бюджет поскромнее, поэтому анализируем, когда вы ложитесь спать.",
  },
  tastes: {
    title: "Вкусы",
    intro: "Музыка, кино, выходные — и пара вопросов, где можно ответить своими словами.",
  },
};

export const QUESTIONS: Question[] = [
  // ── Блок 1. Психология: «Большая пятёрка», по 2 утверждения на черту ──────────
  {
    id: "o1",
    block: "psychology",
    type: "scale",
    trait: "openness",
    text: "Если в меню есть блюдо с непонятным названием — я закажу именно его.",
  },
  {
    id: "c1",
    block: "psychology",
    type: "scale",
    trait: "conscientiousness",
    text: "Мои дедлайны живут в календаре, а не в панике накануне.",
  },
  {
    id: "e1",
    block: "psychology",
    type: "scale",
    trait: "extraversion",
    text: "После шумной вечеринки я заряжен(а), а не выжат(а).",
  },
  {
    id: "a1",
    block: "psychology",
    type: "scale",
    trait: "agreeableness",
    text: "Отдам последний кусок пиццы и даже не буду тяжело вздыхать.",
  },
  {
    id: "s1",
    block: "psychology",
    type: "scale",
    trait: "stability",
    text: "Когда всё идёт не по плану, я сохраняю спокойствие. Ну, почти всегда.",
  },
  {
    id: "o2",
    block: "psychology",
    type: "scale",
    trait: "openness",
    reverse: true,
    text: "Проверенный маршрут лучше нового, даже если новый красивее.",
  },
  {
    id: "c2",
    block: "psychology",
    type: "scale",
    trait: "conscientiousness",
    reverse: true,
    text: "Вещи лежат там, где я их бросил(а). Это тоже система.",
  },
  {
    id: "e2",
    block: "psychology",
    type: "scale",
    trait: "extraversion",
    reverse: true,
    text: "Идеальная пятница — когда никто не звонит и никуда не зовёт.",
  },
  {
    id: "a2",
    block: "psychology",
    type: "scale",
    trait: "agreeableness",
    reverse: true,
    text: "В споре мне важнее оказаться правым(ой), чем сохранить мир.",
  },
  {
    id: "s2",
    block: "psychology",
    type: "scale",
    trait: "stability",
    reverse: true,
    text: "Сообщение «нам надо поговорить» выбивает меня из колеи на весь день.",
  },

  // ── Блок 1. Психология: ценности ──────────────────────────────────────────────
  {
    id: "kids",
    topic: "дети",
    block: "psychology",
    type: "choice",
    text: "Дети?",
    options: [
      { value: "yes", label: "Точно хочу" },
      { value: "maybe", label: "Может быть, когда-нибудь" },
      { value: "no", label: "Точно нет" },
    ],
  },
  {
    id: "money",
    topic: "деньги",
    block: "psychology",
    type: "choice",
    text: "Пришла премия. Что с ней будет?",
    options: [
      { value: "save", label: "В копилку — на будущее" },
      { value: "balance", label: "Половину отложу, половину потрачу" },
      { value: "spend", label: "Потрачу — живём один раз" },
    ],
  },
  {
    id: "priority",
    topic: "карьера или семья",
    block: "psychology",
    type: "choice",
    text: "Что сейчас в приоритете?",
    options: [
      { value: "career", label: "Карьера и свои проекты" },
      { value: "balance", label: "Поровну, если получится" },
      { value: "family", label: "Семья и близкие" },
    ],
  },
  {
    id: "place",
    topic: "где жить",
    block: "psychology",
    type: "choice",
    text: "Где вы видите себя через десять лет?",
    options: [
      { value: "city", label: "В большом городе, где всё рядом" },
      { value: "suburb", label: "В пригороде — и город, и воздух" },
      { value: "nature", label: "В деревне, у реки, с огородом" },
    ],
  },
  {
    id: "relocation",
    topic: "переезды",
    block: "psychology",
    type: "choice",
    text: "Переехать в другой город или страну ради новой жизни?",
    options: [
      { value: "yes", label: "Хоть завтра, чемодан собран" },
      { value: "maybe", label: "Если будет веская причина" },
      { value: "no", label: "Я корнями врос(ла) в свой район" },
    ],
  },
  {
    id: "religion",
    topic: "религия",
    block: "psychology",
    type: "choice",
    text: "Какое место в вашей жизни занимает религия?",
    options: [
      { value: "important", label: "Важное" },
      { value: "neutral", label: "Уважаю, но без фанатизма" },
      { value: "none", label: "Никакого" },
    ],
  },

  // ── Блок 1. Психология: стиль привязанности ──────────────────────────────────
  {
    id: "att_closeness",
    block: "psychology",
    type: "scale",
    trait: "closeness",
    text: "Мне важно проводить с партнёром много времени вместе — чем больше, тем лучше.",
  },
  {
    id: "att_anxiety",
    block: "psychology",
    type: "scale",
    trait: "anxiety",
    text: "Если партнёр долго не отвечает, я начинаю себя накручивать.",
  },
  {
    id: "att_space",
    block: "psychology",
    type: "scale",
    trait: "space",
    text: "Даже в самых близких отношениях мне нужна своя территория и время для себя.",
  },
  {
    id: "att_conflict",
    block: "psychology",
    type: "scale",
    trait: "conflict",
    text: "В ссоре я предпочитаю сразу всё обсудить, а не уходить в себя.",
  },

  // ── Блок 2. Биоритмы и образ жизни ───────────────────────────────────────────
  {
    id: "chronotype",
    topic: "режим дня",
    block: "lifestyle",
    type: "choice",
    text: "Вы сова или жаворонок?",
    options: [
      { value: "lark", label: "Жаворонок: встаю с петухами" },
      { value: "owl", label: "Сова: оживаю после полуночи" },
      { value: "flexible", label: "Как получится" },
    ],
  },
  {
    id: "sport",
    topic: "спорт",
    block: "lifestyle",
    type: "choice",
    text: "Спорт в вашей жизни — это…",
    options: [
      { value: "never", label: "Никогда. Дойти до холодильника — уже кардио" },
      { value: "sometimes", label: "Иногда, под настроение" },
      { value: "regular", label: "Регулярно" },
      { value: "life", label: "Это моя жизнь" },
    ],
  },
  {
    id: "food",
    topic: "еда",
    block: "lifestyle",
    type: "choice",
    text: "Как вы едите?",
    options: [
      { value: "omnivore", label: "Всеядный(ая)" },
      { value: "vegetarian", label: "Вегетарианец(ка)" },
      { value: "vegan", label: "Веган" },
      { value: "other", label: "Другое" },
    ],
  },
  {
    id: "parties",
    topic: "вечеринки",
    block: "lifestyle",
    type: "choice",
    text: "Сколько вечеринок в месяц — идеально?",
    hint: "Ваша социальная батарейка",
    options: [
      { value: "0", label: "Ноль. Батарейка на экономии" },
      { value: "1-2", label: "Одна-две" },
      { value: "3-5", label: "Три-пять" },
      { value: "6+", label: "Каждые выходные, и не по разу" },
    ],
  },
  {
    id: "habits",
    topic: "алкоголь и курение",
    block: "lifestyle",
    type: "choice",
    text: "Алкоголь и курение?",
    options: [
      { value: "none", label: "Ни то, ни другое" },
      { value: "drink_sometimes", label: "Бокал по праздникам, не курю" },
      { value: "drink", label: "Выпиваю в компании, не курю" },
      { value: "smoke", label: "Курю" },
    ],
  },
  {
    id: "pets",
    topic: "животные",
    block: "lifestyle",
    type: "choice",
    text: "Животные?",
    options: [
      { value: "have", label: "Есть, и они главные в доме" },
      { value: "want", label: "Пока нет, но очень хочу" },
      { value: "against", label: "Я против" },
    ],
  },

  // ── Блок 3. Вкусы ────────────────────────────────────────────────────────────
  {
    id: "music",
    topic: "музыка",
    block: "tastes",
    type: "multi",
    max: 5,
    text: "Что играет у вас в наушниках?",
    hint: "До 5 жанров",
    options: [
      { value: "pop", label: "Поп" },
      { value: "rock", label: "Рок" },
      { value: "hiphop", label: "Хип-хоп и рэп" },
      { value: "electronic", label: "Электроника" },
      { value: "indie", label: "Инди" },
      { value: "jazz", label: "Джаз и блюз" },
      { value: "classical", label: "Классика" },
      { value: "metal", label: "Метал" },
      { value: "folk", label: "Фолк и народное" },
      { value: "russian_rock", label: "Русский рок" },
      { value: "chanson", label: "Шансон" },
      { value: "soundtracks", label: "Саундтреки" },
      { value: "rnb", label: "R&B и соул" },
      { value: "kpop", label: "K-pop" },
    ],
  },
  {
    id: "movies",
    topic: "кино и сериалы",
    block: "tastes",
    type: "multi",
    max: 5,
    text: "Что вы смотрите вечером?",
    hint: "До 5 жанров",
    options: [
      { value: "comedy", label: "Комедии" },
      { value: "drama", label: "Драмы" },
      { value: "thriller", label: "Триллеры" },
      { value: "horror", label: "Ужасы" },
      { value: "scifi", label: "Фантастика" },
      { value: "fantasy", label: "Фэнтези" },
      { value: "romance", label: "Мелодрамы" },
      { value: "action", label: "Боевики" },
      { value: "detective", label: "Детективы" },
      { value: "documentary", label: "Документалки" },
      { value: "anime", label: "Аниме" },
      { value: "sitcom", label: "Ситкомы" },
      { value: "reality", label: "Реалити-шоу" },
    ],
  },
  {
    id: "weekend",
    topic: "идеальные выходные",
    block: "tastes",
    type: "multi",
    max: 3,
    text: "Идеальные выходные — это…",
    hint: "До 3 вариантов",
    options: [
      { value: "home_series", label: "Дома с сериалом" },
      { value: "hiking", label: "Поход" },
      { value: "bar", label: "Бар с друзьями" },
      { value: "museum", label: "Музей или выставка" },
      { value: "sport", label: "Спорт" },
      { value: "travel", label: "Поездка куда-нибудь" },
      { value: "dacha", label: "Дача" },
      { value: "cooking", label: "Готовить что-то новое" },
      { value: "games", label: "Игры: настолки или приставка" },
      { value: "concert", label: "Концерт" },
      { value: "sleep", label: "Отоспаться за всю неделю" },
    ],
  },
  {
    id: "ideal_day",
    block: "tastes",
    type: "text",
    text: "Опишите свой идеальный день в 2–3 предложениях.",
    hint: "Здесь алгоритм читает между строк",
    placeholder: "Просыпаюсь без будильника, завтракаю на веранде…",
    minLength: 20,
    maxLength: 600,
  },
  {
    id: "dealbreaker",
    block: "tastes",
    type: "text",
    text: "Что для вас абсолютно неприемлемо в партнёре?",
    hint: "Красный флаг, после которого — сразу нет",
    placeholder: "Например: курение, грубость с официантами…",
    minLength: 3,
    maxLength: 300,
  },
];

export type AnswerValue = number | string | string[];
export type Answers = Record<string, AnswerValue>;
