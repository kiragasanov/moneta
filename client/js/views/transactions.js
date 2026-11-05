import { api } from '../api.js';
import { bindPeriodSwitcher, periodSwitcher } from '../components/periodSwitcher.js';
import { toastError } from '../components/toast.js';
import { openTransactionForm } from '../components/transactionForm.js';
import { groupedTransactions } from '../components/transactionList.js';
import { escapeHtml, monthRange } from '../format.js';
import { state } from '../state.js';

const PAGE_SIZE = 30;
const SEARCH_DELAY = 300;

/** Страница «Операции»: список с фильтрами, поиском и постраничной загрузкой */
export async function transactionsView(root) {
  const [categories, accounts] = await Promise.all([api.categories.list(), api.accounts.list()]);
  const filters = { type: '', categoryId: '', accountId: '', search: '' };
  let items = [];
  let total = 0;

  root.innerHTML = `
    <header class="page-head">
      <div>
        <h1>Операции</h1>
        <p id="counter" class="muted">&nbsp;</p>
      </div>
      <div class="head-actions">
        ${periodSwitcher()}
        <button class="btn" id="add">+ Операция</button>
      </div>
    </header>

    <div class="filters">
      <div class="segmented" id="type-filter">
        <button data-value="" class="active">Все</button>
        <button data-value="expense">Расходы</button>
        <button data-value="income">Доходы</button>
      </div>
      <select class="input" id="category-filter" aria-label="Категория">
        <option value="">Все категории</option>
        ${categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
      </select>
      <select class="input" id="account-filter" aria-label="Счет">
        <option value="">Все счета</option>
        ${accounts.map((a) => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('')}
      </select>
      <input class="input" id="search" type="search" placeholder="Поиск по комментарию или категории">
    </div>

    <div class="card">
      <div id="list"><div class="skeleton"></div></div>
      <div class="load-more" id="more" hidden><button class="btn secondary">Показать еще</button></div>
    </div>`;

  const list = root.querySelector('#list');
  const more = root.querySelector('#more');
  const counter = root.querySelector('#counter');

  async function load(append = false) {
    const { from, to } = monthRange(state.month);
    try {
      const page = await api.transactions.list({
        from,
        to,
        ...filters,
        limit: PAGE_SIZE,
        offset: append ? items.length : 0,
      });
      items = append ? items.concat(page.items) : page.items;
      total = page.total;
      list.innerHTML = groupedTransactions(items);
      more.hidden = items.length >= total;
      counter.textContent = `Найдено операций: ${total}`;
    } catch (error) {
      toastError(error);
    }
  }

  // Фильтры
  root.querySelector('#type-filter').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    root.querySelectorAll('#type-filter button').forEach((b) => b.classList.toggle('active', b === button));
    filters.type = button.dataset.value;
    load();
  });
  root.querySelector('#category-filter').addEventListener('change', (event) => {
    filters.categoryId = event.target.value;
    load();
  });
  root.querySelector('#account-filter').addEventListener('change', (event) => {
    filters.accountId = event.target.value;
    load();
  });

  // Поиск с задержкой, чтобы не отправлять запрос на каждую букву
  let timer;
  root.querySelector('#search').addEventListener('input', (event) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      filters.search = event.target.value;
      load();
    }, SEARCH_DELAY);
  });

  more.querySelector('button').addEventListener('click', () => load(true));
  root.querySelector('#add').addEventListener('click', () => openTransactionForm({ onSaved: () => load() }));
  list.addEventListener('click', (event) => {
    const row = event.target.closest('.tx');
    if (!row) return;
    const transaction = items.find((t) => t.id === Number(row.dataset.id));
    openTransactionForm({ transaction, onSaved: () => load() });
  });
  bindPeriodSwitcher(root, () => transactionsView(root));

  await load();
}
