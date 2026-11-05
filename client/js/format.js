/**
 * Форматирование денег, дат и периодов для интерфейса.
 */

const moneyFormat = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const monthFormat = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' });
const shortMonthFormat = new Intl.DateTimeFormat('ru-RU', { month: 'short' });
const dayFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });

export const money = (value) => moneyFormat.format(value);

/** Сумма со знаком: доход с плюсом, расход с минусом */
export const signedMoney = (value, type) => `${type === 'income' ? '+' : '-'}${money(value)}`;

const pad = (n) => String(n).padStart(2, '0');

export const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const isoMonth = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export const today = () => isoDate(new Date());

export const parseDate = (iso) => new Date(`${iso}T00:00:00`);

export const formatDay = (iso) => {
  const d = parseDate(iso);
  const label = dayFormat.format(d);
  if (iso === today()) return `Сегодня, ${label}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const formatMonth = (isoM) => monthFormat.format(parseDate(`${isoM}-01`)).replace(' г.', '');

export const formatShortMonth = (isoM) => shortMonthFormat.format(parseDate(`${isoM}-01`)).replace('.', '');

/** Период месяца: первый и последний день */
export function monthRange(isoM) {
  const start = parseDate(`${isoM}-01`);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  return { from: isoDate(start), to: isoDate(end) };
}

export function shiftMonth(isoM, delta) {
  const d = parseDate(`${isoM}-01`);
  return isoMonth(new Date(d.getFullYear(), d.getMonth() + delta, 1));
}

/** Экранирование пользовательского текста перед вставкой в HTML (защита от XSS) */
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export const ACCOUNT_TYPE_NAMES = {
  card: 'Карта',
  cash: 'Наличные',
  savings: 'Накопления',
};

export const TYPE_NAMES = {
  income: 'Доход',
  expense: 'Расход',
};
