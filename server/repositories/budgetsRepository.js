import { getDb } from '../db/connection.js';
import { toRubles } from '../utils/money.js';

// Бюджет вместе с фактически потраченной суммой за указанный месяц
const SELECT = `
  SELECT b.id, b.month, b.limit_amount, b.category_id,
         c.name AS category_name, c.color,
         COALESCE((
           SELECT SUM(t.amount) FROM transactions t
           WHERE t.category_id = b.category_id AND substr(t.date, 1, 7) = b.month
         ), 0) AS spent
  FROM budgets b
  JOIN categories c ON c.id = b.category_id
`;

const PERCENT = 100;

const map = (row) => {
  if (!row) return row;
  const percent = Math.round((row.spent / row.limit_amount) * PERCENT);
  return {
    id: row.id,
    month: row.month,
    limit: toRubles(row.limit_amount),
    spent: toRubles(row.spent),
    left: toRubles(row.limit_amount - row.spent),
    percent,
    category: { id: row.category_id, name: row.category_name, color: row.color },
  };
};

export const budgetsRepository = {
  findByMonth(month) {
    return getDb().prepare(`${SELECT} WHERE b.month = ? ORDER BY c.name`).all(month).map(map);
  },

  findById(id) {
    return map(getDb().prepare(`${SELECT} WHERE b.id = ?`).get(id));
  },

  create({ categoryId, month, limit }) {
    const { lastInsertRowid } = getDb()
      .prepare('INSERT INTO budgets (category_id, month, limit_amount) VALUES (?, ?, ?)')
      .run(categoryId, month, limit);
    return this.findById(Number(lastInsertRowid));
  },

  update(id, { limit }) {
    getDb().prepare('UPDATE budgets SET limit_amount = ? WHERE id = ?').run(limit, id);
    return this.findById(id);
  },

  remove(id) {
    return getDb().prepare('DELETE FROM budgets WHERE id = ?').run(id).changes > 0;
  },
};
