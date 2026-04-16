export interface MonthTitle {
  place: 1 | 2 | 3;
  title: string;
  icon: string;
  description: string;
}

export interface MonthConfig {
  month: number;
  monthName: string;
  male: MonthTitle[];
  female: MonthTitle[];
}

export interface SpecialConfig {
  key: string;
  title: string;
  icon: string;
  description: string;
  condition: string;
}

export const MONTHLY_ACHIEVEMENTS: MonthConfig[] = [
  {
    month: 1,
    monthName: 'Январь',
    male: [
      { place: 1, title: 'Снежный Властелин', icon: '👑', description: '1-е место в январе' },
      { place: 2, title: 'Правая рука Властелина', icon: '🧊', description: '2-е место в январе' },
      { place: 3, title: 'Претендент на трон', icon: '❄️', description: '3-е место в январе' },
    ],
    female: [
      { place: 1, title: 'Снежная Королева', icon: '👑', description: '1-е место в январе' },
      { place: 2, title: 'Первая фрейлина', icon: '❄️', description: '2-е место в январе' },
      { place: 3, title: 'Претендентка на корону', icon: '🌨️', description: '3-е место в январе' },
    ],
  },
  {
    month: 2,
    monthName: 'Февраль',
    male: [
      { place: 1, title: 'Защитник Отечества', icon: '🎖️', description: '1-е место в феврале' },
      { place: 2, title: 'Верный соратник', icon: '🛡️', description: '2-е место в феврале' },
      { place: 3, title: 'Будущий защитник', icon: '⚔️', description: '3-е место в феврале' },
    ],
    female: [
      { place: 1, title: 'Весенняя Муза', icon: '🌹', description: '1-е место в феврале' },
      { place: 2, title: 'Правая рука Музы', icon: '🌸', description: '2-е место в феврале' },
      { place: 3, title: 'Первый бутон', icon: '🌷', description: '3-е место в феврале' },
    ],
  },
  {
    month: 3,
    monthName: 'Март',
    male: [
      { place: 1, title: 'Весенний Воин', icon: '⚔️', description: '1-е место в марте' },
      { place: 2, title: 'Второй клинок', icon: '🗡️', description: '2-е место в марте' },
      { place: 3, title: 'Восходящий боец', icon: '🌱', description: '3-е место в марте' },
    ],
    female: [
      { place: 1, title: 'Королева весны', icon: '👑', description: '1-е место в марте' },
      { place: 2, title: 'Принцесса весны', icon: '🌺', description: '2-е место в марте' },
      { place: 3, title: 'Юная наследница', icon: '🌱', description: '3-е место в марте' },
    ],
  },
  {
    month: 4,
    monthName: 'Апрель',
    male: [
      { place: 1, title: 'Повелитель апреля', icon: '⚡', description: '1-е место в апреле' },
      { place: 2, title: 'Гром без молнии', icon: '🌩️', description: '2-е место в апреле' },
      { place: 3, title: 'Первые капли', icon: '🌧️', description: '3-е место в апреле' },
    ],
    female: [
      { place: 1, title: 'Властительница апреля', icon: '🌈', description: '1-е место в апреле' },
      { place: 2, title: 'Хранительница радуги', icon: '🌦️', description: '2-е место в апреле' },
      { place: 3, title: 'После дождя придёт солнце', icon: '🌧️', description: '3-е место в апреле' },
    ],
  },
  {
    month: 5,
    monthName: 'Май',
    male: [
      { place: 1, title: 'Защитник Родины', icon: '🪖', description: '1-е место в мае' },
      { place: 2, title: 'Верный солдат', icon: '🎗️', description: '2-е место в мае' },
      { place: 3, title: 'Новобранец побед', icon: '🌿', description: '3-е место в мае' },
    ],
    female: [
      { place: 1, title: 'Цветок победы', icon: '🌺', description: '1-е место в мае' },
      { place: 2, title: 'Второй лепесток', icon: '🌻', description: '2-е место в мае' },
      { place: 3, title: 'Росток чемпионки', icon: '🌿', description: '3-е место в мае' },
    ],
  },
  {
    month: 6,
    monthName: 'Июнь',
    male: [
      { place: 1, title: 'Солнечный боец', icon: '🔥', description: '1-е место в июне' },
      { place: 2, title: 'Тень солнца', icon: '☀️', description: '2-е место в июне' },
      { place: 3, title: 'Первый луч', icon: '🌤️', description: '3-е место в июне' },
    ],
    female: [
      { place: 1, title: 'Летняя Королева', icon: '🌸', description: '1-е место в июне' },
      { place: 2, title: 'Принцесса лета', icon: '🌼', description: '2-е место в июне' },
      { place: 3, title: 'Первый зной', icon: '☀️', description: '3-е место в июне' },
    ],
  },
  {
    month: 7,
    monthName: 'Июль',
    male: [
      { place: 1, title: 'Солнечный Король', icon: '☀️', description: '1-е место в июле' },
      { place: 2, title: 'Второй под солнцем', icon: '🌞', description: '2-е место в июле' },
      { place: 3, title: 'Солнечный претендент', icon: '🌤️', description: '3-е место в июле' },
    ],
    female: [
      { place: 1, title: 'Королева лета', icon: '👑', description: '1-е место в июле' },
      { place: 2, title: 'Солнечная принцесса', icon: '🌻', description: '2-е место в июле' },
      { place: 3, title: 'Жемчужина лета', icon: '🌊', description: '3-е место в июле' },
    ],
  },
  {
    month: 8,
    monthName: 'Август',
    male: [
      { place: 1, title: 'Хозяин каникул', icon: '🏖️', description: '1-е место в августе' },
      { place: 2, title: 'Второй на пляже', icon: '🌊', description: '2-е место в августе' },
      { place: 3, title: 'Искатель приключений', icon: '🌅', description: '3-е место в августе' },
    ],
    female: [
      { place: 1, title: 'Принцесса каникул', icon: '🌺', description: '1-е место в августе' },
      { place: 2, title: 'Морская жемчужина', icon: '🐚', description: '2-е место в августе' },
      { place: 3, title: 'Летняя странница', icon: '🌈', description: '3-е место в августе' },
    ],
  },
  {
    month: 9,
    monthName: 'Сентябрь',
    male: [
      { place: 1, title: 'Осенний Властелин', icon: '🍂', description: '1-е место в сентябре' },
      { place: 2, title: 'Страж учебного года', icon: '🎒', description: '2-е место в сентябре' },
      { place: 3, title: 'Первый в классе', icon: '📚', description: '3-е место в сентябре' },
    ],
    female: [
      { place: 1, title: 'Осенняя Королева', icon: '👑', description: '1-е место в сентябре' },
      { place: 2, title: 'Принцесса знаний', icon: '📖', description: '2-е место в сентябре' },
      { place: 3, title: 'Первая в классе', icon: '✏️', description: '3-е место в сентябре' },
    ],
  },
  {
    month: 10,
    monthName: 'Октябрь',
    male: [
      { place: 1, title: 'Страж октября', icon: '🎃', description: '1-е место в октябре' },
      { place: 2, title: 'Хранитель осени', icon: '🍁', description: '2-е место в октябре' },
      { place: 3, title: 'Осенний охотник', icon: '🌿', description: '3-е место в октябре' },
    ],
    female: [
      { place: 1, title: 'Хозяйка октября', icon: '🌙', description: '1-е место в октябре' },
      { place: 2, title: 'Лунная принцесса', icon: '🌕', description: '2-е место в октябре' },
      { place: 3, title: 'Осенняя звезда', icon: '⭐', description: '3-е место в октябре' },
    ],
  },
  {
    month: 11,
    monthName: 'Ноябрь',
    male: [
      { place: 1, title: 'Ноябрьский чемпион', icon: '🏆', description: '1-е место в ноябре' },
      { place: 2, title: 'Верный боец', icon: '💪', description: '2-е место в ноябре' },
      { place: 3, title: 'Претендент ноября', icon: '⚡', description: '3-е место в ноябре' },
    ],
    female: [
      { place: 1, title: 'Ноябрьская звезда', icon: '🌟', description: '1-е место в ноябре' },
      { place: 2, title: 'Серебряная принцесса', icon: '✨', description: '2-е место в ноябре' },
      { place: 3, title: 'Восходящая осень', icon: '🍂', description: '3-е место в ноябре' },
    ],
  },
  {
    month: 12,
    monthName: 'Декабрь',
    male: [
      { place: 1, title: 'Зимний Король', icon: '👑', description: '1-е место в декабре' },
      { place: 2, title: 'Хранитель декабря', icon: '❄️', description: '2-е место в декабре' },
      { place: 3, title: 'Снежный воин', icon: '⛄', description: '3-е место в декабре' },
    ],
    female: [
      { place: 1, title: 'Зимняя Королева', icon: '👑', description: '1-е место в декабре' },
      { place: 2, title: 'Снежная принцесса', icon: '❄️', description: '2-е место в декабре' },
      { place: 3, title: 'Зимняя звезда', icon: '🌟', description: '3-е место в декабре' },
    ],
  },
];

export const SPECIAL_ACHIEVEMENTS: SpecialConfig[] = [
  {
    key: 'iron_attendance',
    title: 'Железная посещаемость',
    icon: '🔩',
    description: '100% посещаемость 3 месяца подряд',
    condition: 'Посещай все уроки 3 месяца подряд',
  },
  {
    key: 'perfect_score',
    title: 'Отличник',
    icon: '⭐',
    description: 'Средний балл ≥ 95 два месяца подряд',
    condition: 'Набирай средний балл от 95 два месяца подряд',
  },
  {
    key: 'three_months_streak',
    title: 'Трёхмесячный стрик',
    icon: '🔥',
    description: 'Топ-3 три месяца подряд',
    condition: 'Входи в топ-3 три месяца подряд',
  },
  {
    key: 'silent_hero',
    title: 'Тихий герой',
    icon: '🦸',
    description: 'Весь год без опозданий и пропусков',
    condition: 'Ни одного пропуска и опоздания за весь год',
  },
  {
    key: 'no_absences_year',
    title: 'Ни одного пропуска',
    icon: '🏅',
    description: '0 пропусков за весь год',
    condition: 'Не пропусти ни одного урока за весь год',
  },
];

export function getTitleForStudent(
  month: number,
  place: 1 | 2 | 3,
  gender: 'MALE' | 'FEMALE',
): MonthTitle | null {
  const config = MONTHLY_ACHIEVEMENTS.find((m) => m.month === month);
  if (!config) return null;
  const titles = gender === 'MALE' ? config.male : config.female;
  return titles.find((t) => t.place === place) ?? null;
}
