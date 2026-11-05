import { getDb } from '../db/connection.js';
import { toRubles } from '../utils/money.js';

const BASE_SELECT = `
  SELECT t.id, t.amount, t.date, t.note, t.created_at,
         t.account_id, a.name AS account_name,
         t.category_id, c.name AS category_name, c.type, c.color
  FROM transactions t
  JOIN accounts   a ON a.id = t.account_id
  JOIN categories c ON c.id = t.category_id
`;

const map = (row) =>
  row && {
    id: row.id,
    amount: toRubles(row.amount),
    type: row.type,
    date: row.date,
    note: row.note,
    account: { id: row.account_id, name: row.account_name },
    category: { id: row.category_id, name: row.category_name, color: row.color },
    createdAt: row.created_at,
  };

/**
 * Собирает условие WHERE из фильтров. Значения передаются только
 * через параметры запроса, поэтому SQL-инъекция невозможна.
 */
function buildFilter({ from, to, type, categoryId, accountId, search }) {
  const conditions = [];
  const params = [];
  if (from) {
    conditions.push('t.date >= ?');
    params.push(from);
  }
  if (to) {
    conditions.push('t.date <= ?');
    params.push(to);
  }
  if (type) {
    conditions.push('c.type = ?');
    params.push(type);
  }
  if (categoryId) {
    conditions.push('t.category_id = ?');
    params.push(categoryId);
  }
  if (accountId) {
    conditions.push('t.account_id = ?');
    params.push(accountId);
  }
  if (search) {
    conditions.push('(t.note LIKE ? OR c.name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

export const transactionsRepository = {
  findMany(filter, { limit, offset }) {
    const db = getDb();
    const { where, params } = buildFilter(filter);
    const items = db
      .prepare(`${BASE_SELECT} ${where} ORDER BY t.date DESC, t.id DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset)
      .map(map);
    const { total } = db
      .prepare(`SELECT COUNT(*) AS total FROM transactions t JOIN categories c ON c.id = t.category_id ${where}`)
      .get(...params);
    return { items, total };
  },

  findById(id) {
    return map(getDb().prepare(`${BASE_SELECT} WHERE t.id = ?`).get(id));
  },

  create({ accountId, categoryId, amount, date, note }) {
    const { lastInsertRowid } = getDb()
      .prepare('INSERT INTO transactions (account_id, category_id, amount, date, note) VALUES (?, ?, ?, ?, ?)')
      .run(accountId, categoryId, amount, date, note);
    return this.findById(Number(lastInsertRowid));
  },

  update(id, { accountId, categoryId, amount, date, note }) {
    getDb()
      .prepare('UPDATE transactions SET account_id = ?, category_id = ?, amount = ?, date = ?, note = ? WHERE id = ?')
      .run(accountId, categoryId, amount, date, note, id);
    return this.findById(id);
  },

  remove(id) {
    return getDb().prepare('DELETE FROM transactions WHERE id = ?').run(id).changes > 0;
  },
};
