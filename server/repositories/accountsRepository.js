import { getDb } from '../db/connection.js';
import { toRubles } from '../utils/money.js';

// Текущий баланс счета = начальный остаток + доходы - расходы
const SELECT_WITH_BALANCE = `
  SELECT a.id, a.name, a.type, a.initial_balance, a.created_at,
         a.initial_balance
           + COALESCE(SUM(CASE WHEN c.type = 'income'  THEN t.amount END), 0)
           - COALESCE(SUM(CASE WHEN c.type = 'expense' THEN t.amount END), 0) AS balance,
         COUNT(t.id) AS transactions_count
  FROM accounts a
  LEFT JOIN transactions t ON t.account_id = a.id
  LEFT JOIN categories  c ON c.id = t.category_id
`;

const map = (row) =>
  row && {
    id: row.id,
    name: row.name,
    type: row.type,
    initialBalance: toRubles(row.initial_balance),
    balance: toRubles(row.balance),
    transactionsCount: row.transactions_count,
    createdAt: row.created_at,
  };

export const accountsRepository = {
  findAll() {
    return getDb().prepare(`${SELECT_WITH_BALANCE} GROUP BY a.id ORDER BY a.id`).all().map(map);
  },

  findById(id) {
    return map(getDb().prepare(`${SELECT_WITH_BALANCE} WHERE a.id = ? GROUP BY a.id`).get(id));
  },

  create({ name, type, initialBalance }) {
    const { lastInsertRowid } = getDb()
      .prepare('INSERT INTO accounts (name, type, initial_balance) VALUES (?, ?, ?)')
      .run(name, type, initialBalance);
    return this.findById(Number(lastInsertRowid));
  },

  update(id, { name, type, initialBalance }) {
    getDb()
      .prepare('UPDATE accounts SET name = ?, type = ?, initial_balance = ? WHERE id = ?')
      .run(name, type, initialBalance, id);
    return this.findById(id);
  },

  remove(id) {
    return getDb().prepare('DELETE FROM accounts WHERE id = ?').run(id).changes > 0;
  },

  countTransactions(id) {
    return getDb().prepare('SELECT COUNT(*) AS n FROM transactions WHERE account_id = ?').get(id).n;
  },
};
