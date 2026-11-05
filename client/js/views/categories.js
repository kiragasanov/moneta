import { api } from '../api.js';
import { PALETTE, openForm } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { escapeHtml } from '../format.js';

function categoryList(list) {
  if (!list.length) return '<div class="empty">Категорий нет</div>';
  return `<ul class="chip-list">${list
    .map(
      (c) => `<li class="chip-item" data-id="${c.id}">
        <span class="swatch" style="background:${c.color}"></span>
        <span class="grow">${escapeHtml(c.name)}</span>
        <span class="muted">${c.transactionsCount} опер.</span>
      </li>`,
    )
    .join('')}</ul>`;
}

/** Страница «Категории»: справочник категорий доходов и расходов */
export async function categoriesView(root) {
  const categories = await api.categories.list();
  const rerender = () => categoriesView(root);
  const expense = categories.filter((c) => c.type === 'expense');
  const income = categories.filter((c) => c.type === 'income');

  root.innerHTML = `
    <header class="page-head">
      <div>
        <h1>Категории</h1>
        <p>Как группируются доходы и расходы</p>
      </div>
      <button class="btn" id="add">+ Категория</button>
    </header>
    <section class="grid grid-2">
      <div class="card"><div class="card-head"><h3>Расходы</h3><span class="muted">${expense.length}</span></div>${categoryList(expense)}</div>
      <div class="card"><div class="card-head"><h3>Доходы</h3><span class="muted">${income.length}</span></div>${categoryList(income)}</div>
    </section>`;

  const open = (category) =>
    openForm({
      title: category ? 'Изменить категорию' : 'Новая категория',
      fields: [
        {
          name: 'name',
          label: 'Название',
          value: category?.name ?? '',
          autofocus: true,
          placeholder: 'Например, Спорт',
        },
        {
          name: 'type',
          label: 'Тип',
          type: 'segmented',
          value: category?.type ?? 'expense',
          options: [
            { value: 'expense', label: 'Расход' },
            { value: 'income', label: 'Доход' },
          ],
        },
        { name: 'color', label: 'Цвет', type: 'color', value: category?.color ?? PALETTE[2] },
      ],
      async onSubmit(values) {
        if (category) await api.categories.update(category.id, values);
        else await api.categories.create(values);
        toast(category ? 'Категория сохранена' : 'Категория добавлена');
        rerender();
      },
      onDelete: category
        ? async () => {
            await api.categories.remove(category.id);
            toast('Категория удалена');
            rerender();
          }
        : undefined,
    });

  root.querySelector('#add').addEventListener('click', () => open());
  root.querySelectorAll('.chip-item').forEach((item) => {
    item.addEventListener('click', () => open(categories.find((c) => c.id === Number(item.dataset.id))));
  });
}
