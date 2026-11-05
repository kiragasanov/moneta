import { api } from '../api.js';
import { openForm } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { ACCOUNT_TYPE_NAMES, escapeHtml, money } from '../format.js';

/** Страница «Счета»: карты, наличные и накопления с текущими балансами */
export async function accountsView(root) {
  const accounts = await api.accounts.list();
  const rerender = () => accountsView(root);
  const total = accounts.reduce((s, a) => s + a.balance, 0);

  root.innerHTML = `
    <header class="page-head">
      <div>
        <h1>Счета</h1>
        <p>Всего на счетах: <strong style="color:var(--text)">${money(total)}</strong></p>
      </div>
      <button class="btn" id="add">+ Счет</button>
    </header>
    <section class="grid grid-3">
      ${accounts
        .map(
          (a) => `<div class="card account-card" data-id="${a.id}">
            <span class="account-type">${ACCOUNT_TYPE_NAMES[a.type]}</span>
            <div class="stat-value ${a.balance < 0 ? 'danger' : ''}">${money(a.balance)}</div>
            <div class="stat-sub">${escapeHtml(a.name)} · ${a.transactionsCount} операций</div>
          </div>`,
        )
        .join('')}
    </section>`;

  const open = (account) =>
    openForm({
      title: account ? 'Изменить счет' : 'Новый счет',
      fields: [
        {
          name: 'name',
          label: 'Название',
          value: account?.name ?? '',
          autofocus: true,
          placeholder: 'Например, Карта Сбер',
        },
        {
          name: 'type',
          label: 'Тип',
          type: 'select',
          value: account?.type ?? 'card',
          options: Object.entries(ACCOUNT_TYPE_NAMES).map(([value, label]) => ({ value, label })),
        },
        {
          name: 'initialBalance',
          label: 'Начальный остаток, ₽',
          type: 'number',
          value: account?.initialBalance ?? 0,
        },
      ],
      async onSubmit(values) {
        const payload = { ...values, initialBalance: values.initialBalance.replace(',', '.') };
        if (account) await api.accounts.update(account.id, payload);
        else await api.accounts.create(payload);
        toast(account ? 'Счет сохранен' : 'Счет добавлен');
        rerender();
      },
      onDelete: account
        ? async () => {
            await api.accounts.remove(account.id);
            toast('Счет удален');
            rerender();
          }
        : undefined,
    });

  root.querySelector('#add').addEventListener('click', () => open());
  root.querySelectorAll('.account-card').forEach((card) => {
    card.addEventListener('click', () => open(accounts.find((a) => a.id === Number(card.dataset.id))));
  });
}
