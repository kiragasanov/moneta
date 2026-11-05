import { getDb } from '../db/connection.js';
import { toRubles } from '../utils/money.js';

const PERCENT = 100;

/**
 * Аналитические запросы. Все вычисления (суммы, группировки)
 * выполняются средствами SQL на стороне базы данных.
 */
export const statsRepository = {
  /** Доходы, расходы и итог за период + общий баланс всех счетов */
  summary(from, to) {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN c.type = 'income'  THEN t.amount END), 0) AS income,
           COALESCE(SUM(CASE WHEN c.type = 'expense' THEN t.amount END), 0) AS expense,
           COUNT(t.id) AS count
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
         WHERE t.date BETWEEN ? AND ?`,
      )
      .get(from, to);

    const { balance } = db
      .prepare(
        `SELECT
           (SELECT COALESCE(SUM(initial_balance), 0) FROM accounts)
           + COALESCE(SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE -t.amount END), 0) AS balance
         FROM transactions t
         JOIN categories c ON c.id = t.category_id`,
      )
      .get();

    return {
      from,
      to,
      income: toRubles(row.income),
      expense: toRubles(row.expense),
      difference: toRubles(row.income - row.expense),
      count: row.count,
      balance: toRubles(balance),
    };
  },

  /** Распределение доходов или расходов по категориям с долей в процентах */
  byCategory(from, to, type) {
    const rows = getDb()
      .prepare(
        `SELECT c.id, c.name, c.color, SUM(t.amount) AS total, COUNT(t.id) AS count
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
         WHERE c.type = ? AND t.date BETWEEN ? AND ?
         GROUP BY c.id
         ORDER BY total DESC`,
      )
      .all(type, from, to);
    const sum = rows.reduce((acc, r) => acc + r.total, 0);
    return rows.map((r) => ({
      category: { id: r.id, name: r.name, color: r.color },
      total: toRubles(r.total),
      count: r.count,
      share: sum ? Math.round((r.total / sum) * PERCENT * 10) / 10 : 0,
    }));
  },

  /** Доходы и расходы по месяцам за последние N месяцев (включая месяцы без операций) */
  byMonth(months, until) {
    const end = new Date(`${until}-01T00:00:00`);
    const list = [];
    for (let i = months - 1; i >= 0; i -= 1) {
      const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
      list.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const rows = getDb()
      .prepare(
        `SELECT substr(t.date, 1, 7) AS month,
                COALESCE(SUM(CASE WHEN c.type = 'income'  THEN t.amount END), 0) AS income,
                COALESCE(SUM(CASE WHEN c.type = 'expense' THEN t.amount END), 0) AS expense
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
         WHERE substr(t.date, 1, 7) BETWEEN ? AND ?
         GROUP BY month`,
      )
      .all(list[0], list[list.length - 1]);
    const byKey = new Map(rows.map((r) => [r.month, r]));

    return list.map((month) => {
      const r = byKey.get(month) ?? { income: 0, expense: 0 };
      return {
        month,
        income: toRubles(r.income),
        expense: toRubles(r.expense),
        difference: toRubles(r.income - r.expense),
      };
    });
  },

  /** Средний расход в день и самая крупная трата за период */
  insights(from, to) {
    const db = getDb();
    const days = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1);
    const { expense } = db
      .prepare(
        `SELECT COALESCE(SUM(t.amount), 0) AS expense FROM transactions t
         JOIN categories c ON c.id = t.category_id
         WHERE c.type = 'expense' AND t.date BETWEEN ? AND ?`,
      )
      .get(from, to);
    const biggest = db
      .prepare(
        `SELECT t.amount, t.date, t.note, c.name AS category FROM transactions t
         JOIN categories c ON c.id = t.category_id
         WHERE c.type = 'expense' AND t.date BETWEEN ? AND ?
         ORDER BY t.amount DESC LIMIT 1`,
      )
      .get(from, to);
    return {
      days,
      averagePerDay: toRubles(Math.round(expense / days)),
      biggestExpense: biggest
        ? { amount: toRubles(biggest.amount), date: biggest.date, note: biggest.note, category: biggest.category }
        : null,
    };
  },
};
