const pad = (n) => String(n).padStart(2, '0');

export const formatDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

/** Первый и последний день текущего месяца - период по умолчанию для аналитики */
export function currentMonthRange() {
  const d = new Date();
  return {
    from: formatDate(new Date(d.getFullYear(), d.getMonth(), 1)),
    to: formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  };
}
