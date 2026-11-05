import { fileURLToPath } from 'node:url';
import { getDb, transaction } from './connection.js';
import { migrate } from './migrate.js';

/**
 * Заполняет базу демонстрационными операциями за последние шесть месяцев.
 * Нужен для показа приложения на защите: графики сразу содержат данные.
 */

const MONTHS_BACK = 6;

// Шаблоны регулярных операций: категория, сумма в рублях, день месяца, примечание
const monthlyPlan = [
  { category: 'Зарплата', amount: 48000, day: 5, note: 'Аванс и зарплата' },
  { category: 'Подработка', amount: 9000, day: 18, note: 'Монтаж видео', cash: true },
  { category: 'Связь и интернет', amount: 850, day: 3, note: 'Мобильная связь и домашний интернет' },
  { category: 'Подписки', amount: 599, day: 10, note: 'Музыкальный сервис' },
  { category: 'Транспорт', amount: 2200, day: 1, note: 'Проездной' },
];

const randomPlan = [
  { category: 'Продукты', min: 600, max: 3200, times: 9, notes: ['Супермаркет', 'Рынок', 'Продукты на неделю'] },
  { category: 'Кафе', min: 250, max: 1400, times: 5, notes: ['Кофе', 'Обед', 'Пицца с друзьями'] },
  { category: 'Развлечения', min: 400, max: 2500, times: 2, notes: ['Кино', 'Игра в Steam', 'Боулинг'] },
  { category: 'Транспорт', min: 150, max: 600, times: 3, notes: ['Такси', 'Каршеринг'] },
  { category: 'Здоровье', min: 300, max: 1800, times: 1, notes: ['Аптека'] },
  { category: 'Одежда', min: 1500, max: 6000, times: 1, notes: ['Кроссовки', 'Худи', 'Куртка'] },
];

// Простой генератор псевдослучайных чисел, чтобы демо-данные были одинаковыми при каждом запуске
let seedValue = 42;
function random() {
  seedValue = (seedValue * 16807) % 2147483647;
  return (seedValue - 1) / 2147483646;
}
const pick = (list) => list[Math.floor(random() * list.length)];
const between = (min, max) => Math.round((min + random() * (max - min)) / 10) * 10;

function isoDate(year, month, day) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const d = Math.min(day, lastDay);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function seed() {
  migrate();
  const db = getDb();
  const categories = Object.fromEntries(
    db
      .prepare('SELECT id, name FROM categories')
      .all()
      .map((c) => [c.name, c.id]),
  );
  const accounts = db.prepare('SELECT id, type FROM accounts ORDER BY id').all();
  const card = accounts.find((a) => a.type === 'card')?.id ?? accounts[0].id;
  const cash = accounts.find((a) => a.type === 'cash')?.id ?? card;

  const insert = db.prepare(
    'INSERT INTO transactions (account_id, category_id, amount, date, note) VALUES (?, ?, ?, ?, ?)',
  );
  const today = new Date();
  let count = 0;

  transaction(() => {
    db.exec('DELETE FROM transactions; DELETE FROM budgets;');
    db.prepare('UPDATE accounts SET initial_balance = ? WHERE id = ?').run(1500000, card);
    db.prepare('UPDATE accounts SET initial_balance = ? WHERE id = ?').run(300000, cash);

    for (let back = MONTHS_BACK - 1; back >= 0; back -= 1) {
      const ref = new Date(today.getFullYear(), today.getMonth() - back, 1);
      const year = ref.getFullYear();
      const month = ref.getMonth();
      const maxDay = back === 0 ? today.getDate() : 28;

      for (const item of monthlyPlan) {
        if (item.day > maxDay) continue;
        const account = item.cash ? cash : card;
        insert.run(account, categories[item.category], item.amount * 100, isoDate(year, month, item.day), item.note);
        count += 1;
      }
      for (const item of randomPlan) {
        for (let i = 0; i < item.times; i += 1) {
          const day = 1 + Math.floor(random() * maxDay);
          const account = random() > 0.8 ? cash : card;
          insert.run(
            account,
            categories[item.category],
            between(item.min, item.max) * 100,
            isoDate(year, month, day),
            pick(item.notes),
          );
          count += 1;
        }
      }
    }

    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const budget = db.prepare('INSERT INTO budgets (category_id, month, limit_amount) VALUES (?, ?, ?)');
    budget.run(categories['Продукты'], currentMonth, 1500000);
    budget.run(categories['Кафе'], currentMonth, 400000);
    budget.run(categories['Развлечения'], currentMonth, 300000);
    budget.run(categories['Транспорт'], currentMonth, 350000);
  });

  return count;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`Добавлено демонстрационных операций: ${seed()}`);
}
