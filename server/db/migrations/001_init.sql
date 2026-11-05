-- Начальная схема базы данных приложения «Монета»
-- Денежные суммы хранятся в копейках (целые числа), чтобы избежать ошибок округления

CREATE TABLE accounts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL UNIQUE,
  type            TEXT    NOT NULL CHECK (type IN ('card', 'cash', 'savings')),
  initial_balance INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color      TEXT NOT NULL DEFAULT '#86868b',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (name, type)
);

CREATE TABLE transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id  INTEGER NOT NULL REFERENCES accounts (id) ON DELETE RESTRICT,
  category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  amount      INTEGER NOT NULL CHECK (amount > 0),
  date        TEXT    NOT NULL,
  note        TEXT    NOT NULL DEFAULT '',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_transactions_date ON transactions (date);
CREATE INDEX idx_transactions_category ON transactions (category_id);
CREATE INDEX idx_transactions_account ON transactions (account_id);

CREATE TABLE budgets (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id  INTEGER NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  month        TEXT    NOT NULL,
  limit_amount INTEGER NOT NULL CHECK (limit_amount > 0),
  UNIQUE (category_id, month)
);
