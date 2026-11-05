import { api } from '../api.js';
import { categoriesDoughnut, monthsBarChart } from '../components/charts.js';
import { bindPeriodSwitcher, periodSwitcher } from '../components/periodSwitcher.js';
import { openTransactionForm } from '../components/transactionForm.js';
import { transactionItem } from '../components/transactionList.js';
import { escapeHtml, formatDay, monthRange, money } from '../format.js';
import { state } from '../state.js';

const RECENT_COUNT = 6;
const LEGEND_SIZE = 5;
const MONTHS_ON_CHART = 6;
const WARNING_PERCENT = 85;
const FULL = 100;

/** Полоса бюджета: зеленая, оранжевая при 85% и красная при превышении */
export function budgetBar(b) {
  const color = b.percent >= FULL ? 'var(--danger)' : b.percent >= WARNING_PERCENT ? '#ff9500' : b.category.color;
  return `<div class="budget">
    <div class="budget-row">
      <strong>${escapeHtml(b.category.name)}</strong>
      <span class="${b.percent >= FULL ? 'danger' : 'muted'}">${money(b.spent)} из ${money(b.limit)}</span>
    </div>
    <div class="bar"><span style="width:${Math.min(b.percent, FULL)}%;background:${color}"></span></div>
  </div>`;
}

/** Главная страница: ключевые показатели месяца, графики, бюджеты, последние операции */
export async function dashboardView(root) {
  const { from, to } = monthRange(state.month);
  const [summary, byMonth, byCategory, recent, budgets, insights] = await Promise.all([
    api.stats.summary(from, to),
    api.stats.byMonth(MONTHS_ON_CHART, state.month),
    api.stats.byCategory(from, to, 'expense'),
    api.transactions.list({ from, to, limit: RECENT_COUNT }),
    api.budgets.list(state.month),
    api.stats.insights(from, to),
  ]);

  const legend = byCategory
    .slice(0, LEGEND_SIZE)
    .map(
      (r) => `<li><span class="swatch" style="background:${r.category.color}"></span>
        <span class="grow">${escapeHtml(r.category.name)}</span>
        <span class="muted">${r.share}%</span></li>`,
    )
    .join('');

  root.innerHTML = `
    <header class="page-head">
      <div>
        <h1>Обзор</h1>
        <p>Как идут дела с деньгами в этом месяце</p>
      </div>
      <div class="head-actions">
        ${periodSwitcher()}
        <button class="btn" id="add">+ Операция</button>
      </div>
    </header>

    <section class="grid grid-4">
      <div class="card">
        <div class="stat-label">Баланс на всех счетах</div>
        <div class="stat-value">${money(summary.balance)}</div>
        <div class="stat-sub">${summary.count} операций за месяц</div>
      </div>
      <div class="card">
        <div class="stat-label">Доходы</div>
        <div class="stat-value income">${money(summary.income)}</div>
        <div class="stat-sub">за выбранный месяц</div>
      </div>
      <div class="card">
        <div class="stat-label">Расходы</div>
        <div class="stat-value">${money(summary.expense)}</div>
        <div class="stat-sub">в среднем ${money(insights.averagePerDay)} в день</div>
      </div>
      <div class="card">
        <div class="stat-label">Осталось</div>
        <div class="stat-value ${summary.difference < 0 ? 'danger' : ''}">${money(summary.difference)}</div>
        <div class="stat-sub">доходы минус расходы</div>
      </div>
    </section>

    <section class="grid grid-main mt">
      <div class="card">
        <div class="card-head"><h3>Доходы и расходы</h3><span class="muted">${MONTHS_ON_CHART} месяцев</span></div>
        <div class="chart-box tall"><canvas id="months-chart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Куда ушли деньги</h3><a href="#/analytics">Подробнее</a></div>
        ${
          byCategory.length
            ? `<div class="chart-box small"><canvas id="categories-chart"></canvas></div><ul class="legend">${legend}</ul>`
            : '<div class="empty">Расходов в этом месяце нет</div>'
        }
      </div>
    </section>

    <section class="grid grid-main mt">
      <div class="card">
        <div class="card-head"><h3>Последние операции</h3><a href="#/transactions">Все операции</a></div>
        ${
          recent.items.length
            ? `<ul class="tx-list" id="recent">${recent.items.map(transactionItem).join('')}</ul>`
            : '<div class="empty">Операций пока нет</div>'
        }
      </div>
      <div class="stack">
        <div class="card">
          <div class="card-head"><h3>Бюджеты</h3><a href="#/budgets">Настроить</a></div>
          ${budgets.length ? budgets.map(budgetBar).join('') : '<div class="empty">Бюджеты на месяц не заданы</div>'}
        </div>
        <div class="card">
          <div class="stat-label">Самая крупная трата</div>
          ${
            insights.biggestExpense
              ? `<div class="stat-value">${money(insights.biggestExpense.amount)}</div>
                 <div class="stat-sub">${escapeHtml(insights.biggestExpense.category)} · ${formatDay(insights.biggestExpense.date)}</div>`
              : '<div class="stat-sub">Нет данных</div>'
          }
        </div>
      </div>
    </section>`;

  monthsBarChart(root.querySelector('#months-chart'), byMonth);
  if (byCategory.length) categoriesDoughnut(root.querySelector('#categories-chart'), byCategory);

  const rerender = () => dashboardView(root);
  bindPeriodSwitcher(root, rerender);
  root.querySelector('#add').addEventListener('click', () => openTransactionForm({ onSaved: rerender }));
  root.querySelector('#recent')?.addEventListener('click', (event) => {
    const item = event.target.closest('.tx');
    if (!item) return;
    const transaction = recent.items.find((t) => t.id === Number(item.dataset.id));
    openTransactionForm({ transaction, onSaved: rerender });
  });
}
