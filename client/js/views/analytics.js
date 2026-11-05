import { api } from '../api.js';
import { categoriesDoughnut, monthsBarChart, savingsLineChart } from '../components/charts.js';
import { escapeHtml, formatMonth, monthRange, money, shiftMonth } from '../format.js';
import { state } from '../state.js';

const PERIODS = [3, 6, 12];
const PERCENT = 100;
let selectedMonths = 6;

function categoryTable(rows) {
  if (!rows.length) return '<div class="empty">Нет данных за период</div>';
  return `<table class="table">
    <thead><tr><th>Категория</th><th class="num">Операций</th><th class="num">Сумма</th><th class="num">Доля</th></tr></thead>
    <tbody>${rows
      .map(
        (r) => `<tr>
          <td><span class="swatch" style="display:inline-block;vertical-align:-2px;margin-right:8px;background:${r.category.color}"></span>${escapeHtml(r.category.name)}</td>
          <td class="num">${r.count}</td>
          <td class="num">${money(r.total)}</td>
          <td class="num">${r.share}%</td>
        </tr>`,
      )
      .join('')}</tbody>
  </table>`;
}

/** Изменение показателя относительно прошлого периода в процентах */
function delta(current, previous) {
  if (!previous) return '';
  const value = Math.round(((current - previous) / previous) * PERCENT);
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}% к прошлому периоду`;
}

/** Страница «Аналитика»: динамика за несколько месяцев и структура по категориям */
export async function analyticsView(root) {
  const until = state.month;
  const startMonth = shiftMonth(until, -(selectedMonths - 1));
  const from = monthRange(startMonth).from;
  const { to } = monthRange(until);
  const prevFrom = monthRange(shiftMonth(startMonth, -selectedMonths)).from;
  const prevTo = monthRange(shiftMonth(startMonth, -1)).to;

  const [byMonth, expenses, incomes, current, previous] = await Promise.all([
    api.stats.byMonth(selectedMonths, until),
    api.stats.byCategory(from, to, 'expense'),
    api.stats.byCategory(from, to, 'income'),
    api.stats.summary(from, to),
    api.stats.summary(prevFrom, prevTo),
  ]);

  const savingsRate = current.income ? Math.round((current.difference / current.income) * PERCENT) : 0;
  const avgExpense = current.expense / selectedMonths;

  root.innerHTML = `
    <header class="page-head">
      <div>
        <h1>Аналитика</h1>
        <p>${formatMonth(startMonth)} - ${formatMonth(until)}</p>
      </div>
      <div class="segmented" id="period">
        ${PERIODS.map((m) => `<button data-months="${m}" class="${m === selectedMonths ? 'active' : ''}">${m} мес.</button>`).join('')}
      </div>
    </header>

    <section class="grid grid-4">
      <div class="card">
        <div class="stat-label">Доходы за период</div>
        <div class="stat-value income">${money(current.income)}</div>
        <div class="stat-sub">${delta(current.income, previous.income)}</div>
      </div>
      <div class="card">
        <div class="stat-label">Расходы за период</div>
        <div class="stat-value">${money(current.expense)}</div>
        <div class="stat-sub">${delta(current.expense, previous.expense)}</div>
      </div>
      <div class="card">
        <div class="stat-label">Средний расход в месяц</div>
        <div class="stat-value">${money(Math.round(avgExpense))}</div>
        <div class="stat-sub">${current.count} операций</div>
      </div>
      <div class="card">
        <div class="stat-label">Норма сбережений</div>
        <div class="stat-value ${savingsRate < 0 ? 'danger' : ''}">${savingsRate}%</div>
        <div class="stat-sub">доля дохода, которая осталась</div>
      </div>
    </section>

    <section class="grid grid-2 mt">
      <div class="card">
        <div class="card-head"><h3>Доходы и расходы по месяцам</h3></div>
        <div class="chart-box"><canvas id="a-months"></canvas></div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Накопления нарастающим итогом</h3></div>
        <div class="chart-box"><canvas id="a-savings"></canvas></div>
      </div>
    </section>

    <section class="grid grid-2 mt">
      <div class="card">
        <div class="card-head"><h3>Структура расходов</h3></div>
        ${expenses.length ? '<div class="chart-box small"><canvas id="a-expenses"></canvas></div>' : ''}
        <div class="mt">${categoryTable(expenses)}</div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Источники доходов</h3></div>
        ${incomes.length ? '<div class="chart-box small"><canvas id="a-incomes"></canvas></div>' : ''}
        <div class="mt">${categoryTable(incomes)}</div>
      </div>
    </section>`;

  monthsBarChart(root.querySelector('#a-months'), byMonth);
  savingsLineChart(root.querySelector('#a-savings'), byMonth);
  if (expenses.length) categoriesDoughnut(root.querySelector('#a-expenses'), expenses);
  if (incomes.length) categoriesDoughnut(root.querySelector('#a-incomes'), incomes);

  root.querySelector('#period').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    selectedMonths = Number(button.dataset.months);
    analyticsView(root);
  });
}
