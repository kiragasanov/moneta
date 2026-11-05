import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

// Тесты работают с отдельной базой в оперативной памяти
process.env.DB_PATH = ':memory:';

const { createApp } = await import('../server/app.js');
const { migrate } = await import('../server/db/migrate.js');
const { closeDb } = await import('../server/db/connection.js');

let server;
let base;

async function call(method, url, body) {
  const response = await fetch(`${base}/api${url}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data };
}

before(async () => {
  migrate();
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}`;
});

after(() => {
  server.close();
  closeDb();
});

describe('Справочники', () => {
  test('после миграций есть счета и категории по умолчанию', async () => {
    const accounts = await call('GET', '/accounts');
    const categories = await call('GET', '/categories');
    assert.equal(accounts.status, 200);
    assert.ok(accounts.data.length >= 2);
    assert.ok(categories.data.some((c) => c.type === 'income'));
    assert.ok(categories.data.some((c) => c.type === 'expense'));
  });

  test('нельзя создать категорию с повторяющимся названием', async () => {
    const res = await call('POST', '/categories', { name: 'Продукты', type: 'expense', color: '#ff9500' });
    assert.equal(res.status, 409);
  });

  test('создание счета возвращает 201 и сумму в рублях', async () => {
    const res = await call('POST', '/accounts', { name: 'Копилка', type: 'savings', initialBalance: 1000.5 });
    assert.equal(res.status, 201);
    assert.equal(res.data.initialBalance, 1000.5);
    assert.equal(res.data.balance, 1000.5);
  });
});

describe('Операции', () => {
  test('добавление дохода и расхода меняет баланс счета', async () => {
    const categories = (await call('GET', '/categories')).data;
    const salary = categories.find((c) => c.name === 'Зарплата');
    const food = categories.find((c) => c.name === 'Продукты');
    const account = (await call('POST', '/accounts', { name: 'Тестовая карта', type: 'card' })).data;

    const income = await call('POST', '/transactions', {
      accountId: account.id,
      categoryId: salary.id,
      amount: 50000,
      date: '2026-11-05',
    });
    assert.equal(income.status, 201);
    assert.equal(income.data.type, 'income');

    await call('POST', '/transactions', {
      accountId: account.id,
      categoryId: food.id,
      amount: 1234.56,
      date: '2026-11-06',
      note: 'Супермаркет',
    });

    const updated = (await call('GET', `/accounts/${account.id}`)).data;
    assert.equal(updated.balance, 48765.44);
  });

  test('неверные данные возвращают 400 с ошибками по полям', async () => {
    const res = await call('POST', '/transactions', { amount: -5, date: '2026-13-40' });
    assert.equal(res.status, 400);
    assert.ok(res.data.details.amount);
    assert.ok(res.data.details.date);
    assert.ok(res.data.details.accountId);
  });

  test('фильтр по типу возвращает только расходы', async () => {
    const res = await call('GET', '/transactions?type=expense');
    assert.equal(res.status, 200);
    assert.ok(res.data.items.every((t) => t.type === 'expense'));
  });

  test('несуществующая операция - 404', async () => {
    const res = await call('GET', '/transactions/99999');
    assert.equal(res.status, 404);
  });

  test('нельзя удалить категорию, по которой есть операции', async () => {
    const food = (await call('GET', '/categories')).data.find((c) => c.name === 'Продукты');
    const res = await call('DELETE', `/categories/${food.id}`);
    assert.equal(res.status, 409);
  });
});

describe('Аналитика', () => {
  test('сводка за ноябрь считает доходы и расходы', async () => {
    const res = await call('GET', '/stats/summary?from=2026-11-01&to=2026-11-30');
    assert.equal(res.status, 200);
    assert.equal(res.data.income, 50000);
    assert.equal(res.data.expense, 1234.56);
    assert.equal(res.data.difference, 48765.44);
  });

  test('доли категорий в сумме дают 100%', async () => {
    const res = await call('GET', '/stats/by-category?from=2026-11-01&to=2026-11-30&type=expense');
    const total = res.data.reduce((s, r) => s + r.share, 0);
    assert.equal(Math.round(total), 100);
  });

  test('помесячная статистика возвращает нужное число месяцев', async () => {
    const res = await call('GET', '/stats/by-month?months=6&until=2026-11');
    assert.equal(res.data.length, 6);
    assert.equal(res.data.at(-1).month, '2026-11');
  });

  test('бюджет считает потраченную сумму', async () => {
    const food = (await call('GET', '/categories')).data.find((c) => c.name === 'Продукты');
    const created = await call('POST', '/budgets', { categoryId: food.id, month: '2026-11', limit: 10000 });
    assert.equal(created.status, 201);
    assert.equal(created.data.spent, 1234.56);
    assert.equal(created.data.percent, 12);
  });

  test('неверный период - 400', async () => {
    const res = await call('GET', '/stats/summary?from=2026-12-01&to=2026-11-01');
    assert.equal(res.status, 400);
  });
});
