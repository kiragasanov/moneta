import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { getDb, transaction } from './connection.js';

/**
 * Применяет SQL-миграции из папки migrations по порядку.
 * Уже примененные версии записываются в таблицу schema_migrations
 * и повторно не выполняются.
 */
export function migrate() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set(
    db
      .prepare('SELECT version FROM schema_migrations')
      .all()
      .map((row) => row.version),
  );

  const files = fs
    .readdirSync(config.migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const newlyApplied = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(config.migrationsDir, file), 'utf8');
    transaction((database) => {
      database.exec(sql);
      database.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(file);
    });
    newlyApplied.push(file);
  }
  return newlyApplied;
}

// Запуск из командной строки: npm run migrate
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const list = migrate();
  console.log(list.length ? `Применены миграции: ${list.join(', ')}` : 'Новых миграций нет');
}
