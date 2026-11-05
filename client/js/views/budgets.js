import { api } from '../api.js';
import { openForm } from '../components/modal.js';
import { bindPeriodSwitcher, periodSwitcher } from '../components/periodSwitcher.js';
import { toast } from '../components/toast.js';
import { formatMonth, money } from '../format.js';
import { state } from '../state.js';
import { budgetBar } from './dashboard.js';

/** Страница «Бюджеты»: лимиты расходов по категориям на месяц */
export async function budgetsView(root) {
  const [budgets, categories] = await Promise.all([api.budgets.list(state.month), api.categories.list('expense')]);
  const rerender = () => budgetsView(root);

  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const free = categories.filter((c) => !budgets.some((b) => b.category.id === c.id));

  root.innerHTML = `
    <header class="page-head">
      <div>
        <h1>Бюджеты</h1>
        <p>Лимиты трат по категориям на ${formatMonth(state.month)}</p>
      </div>
      <div class="head-actions">
        ${periodSwitcher()}
        <button class="btn" id="add" ${free.length ? '' : 'disabled'}>+ Бюджет</button>
      </div>
    </header>

    <section class="grid grid-3">
      <div class="card"><div class="stat-label">Запланировано</div><div class="stat-value">${money(totalLimit)}</div></div>
      <div class="card"><div class="stat-label">Потрачено</div><div class="stat-value">${money(totalSpent)}</div></div>
      <div class="card">
        <div class="stat-label">Осталось</div>
        <div class="stat-value ${totalLimit - totalSpent < 0 ? 'danger' : ''}">${money(totalLimit - totalSpent)}</div>
      </div>
    </section>

    <div class="card mt" id="list">
      ${
        budgets.length
          ? budgets.map((b) => `<div class="budget-wrap" data-id="${b.id}">${budgetBar(b)}</div>`).join('')
          : '<div class="empty">На этот месяц бюджеты еще не заданы. Нажмите «+ Бюджет»</div>'
      }
    </div>`;

  bindPeriodSwitcher(root, rerender);

  root.querySelector('#add').addEventListener('click', () =>
    openForm({
      title: 'Новый бюджет',
      submitText: 'Добавить',
      fields: [
        {
          name: 'categoryId',
          label: 'Категория расходов',
          type: 'select',
          options: free.map((c) => ({ value: c.id, label: c.name })),
        },
        { name: 'limit', label: 'Лимит на месяц, ₽', type: 'number', placeholder: '10000', autofocus: true },
      ],
      async onSubmit(values) {
        await api.budgets.create({
          categoryId: Number(values.categoryId),
          month: state.month,
          limit: values.limit.replace(',', '.'),
        });
        toast('Бюджет добавлен');
        rerender();
      },
    }),
  );

  root.querySelector('#list').addEventListener('click', (event) => {
    const row = event.target.closest('[data-id]');
    if (!row) return;
    const budget = budgets.find((b) => b.id === Number(row.dataset.id));
    openForm({
      title: `Бюджет: ${budget.category.name}`,
      fields: [{ name: 'limit', label: 'Лимит на месяц, ₽', type: 'number', value: budget.limit, autofocus: true }],
      async onSubmit(values) {
        await api.budgets.update(budget.id, { limit: values.limit.replace(',', '.') });
        toast('Бюджет обновлен');
        rerender();
      },
      async onDelete() {
        await api.budgets.remove(budget.id);
        toast('Бюджет удален');
        rerender();
      },
    });
  });
}
