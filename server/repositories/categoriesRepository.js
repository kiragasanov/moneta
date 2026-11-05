import { getDb } from '../db/connection.js';

const SELECT = `
  SELECT c.id, c.name, c.type, c.color, COUNT(t.id) AS transactions_count
  FROM categories c
  LEFT JOIN transactions t ON t.category_id = c.id
`;

const map = (row) =>
  row && {
    id: row.id,
    name: row.name,
    type: row.type,
    color: row.color,
    transactionsCount: row.transactions_count,
  };

export const categoriesRepository = {
  findAll(type) {
    const db = getDb();
    if (type) {
      return db.prepare(`${SELECT} WHERE c.type = ? GROUP BY c.id ORDER BY c.name`).all(type).map(map);
    }
    return db.prepare(`${SELECT} GROUP BY c.id ORDER BY c.type DESC, c.name`).all().map(map);
  },

  findById(id) {
    return map(getDb().prepare(`${SELECT} WHERE c.id = ? GROUP BY c.id`).get(id));
  },

  create({ name, type, color }) {
    const { lastInsertRowid } = getDb()
      .prepare('INSERT INTO categories (name, type, color) VALUES (?, ?, ?)')
      .run(name, type, color);
    return this.findById(Number(lastInsertRowid));
  },

  update(id, { name, type, color }) {
    getDb().prepare('UPDATE categories SET name = ?, type = ?, color = ? WHERE id = ?').run(name, type, color, id);
    return this.findById(id);
  },

  remove(id) {
    return getDb().prepare('DELETE FROM categories WHERE id = ?').run(id).changes > 0;
  },
};
