import { api } from '../api.js';
import { today } from '../format.js';
import { openForm } from './modal.js';
import { toast } from './toast.js';

/**
 * Форма добавления и редактирования операции.
 * При переключении «Доход / Расход» список категорий перестраивается.
 */
export async function openTransactionForm({ transaction, onSaved } = {}) {
  const [accounts, categories] = await Promise.all([api.accounts.list(), api.categories.list()]);
  const isEdit = Boolean(transaction);
  const type = transaction?.type ?? 'expense';

  const categoryOptions = (kind) =>
    categories.filter((c) => c.type === kind).map((c) => ({ value: c.id, label: c.name }));

  openForm({
    title: isEdit ? 'Изменить операцию' : 'Новая операция',
    submitText: isEdit ? 'Сохранить' : 'Добавить',
    fields: [
      {
        name: 'type',
        label: 'Тип',
        type: 'segmented',
        value: type,
        options: [
          { value: 'expense', label: 'Расход' },
          { value: 'income', label: 'Доход' },
        ],
      },
      {
        name: 'amount',
        label: 'Сумма, ₽',
        type: 'number',
        value: transaction?.amount ?? '',
        placeholder: '0',
        autofocus: true,
      },
      {
        name: 'categoryId',
        label: 'Категория',
        type: 'select',
        value: transaction?.category.id,
        options: categoryOptions(type),
      },
      {
        name: 'accountId',
        label: 'Счет',
        type: 'select',
        value: transaction?.account.id,
        options: accounts.map((a) => ({ value: a.id, label: a.name })),
      },
      { name: 'date', label: 'Дата', type: 'date', value: transaction?.date ?? today() },
      {
        name: 'note',
        label: 'Комментарий',
        value: transaction?.note ?? '',
        placeholder: 'Например, продукты на неделю',
      },
    ],
    onChange(name, value, form) {
      if (name !== 'type') return;
      const select = form.elements.categoryId;
      select.innerHTML = categoryOptions(value)
        .map((o) => `<option value="${o.value}">${o.label}</option>`)
        .join('');
    },
    async onSubmit(values) {
      const payload = {
        accountId: Number(values.accountId),
        categoryId: Number(values.categoryId),
        amount: values.amount.replace(',', '.'),
        date: values.date,
        note: values.note,
      };
      if (isEdit) await api.transactions.update(transaction.id, payload);
      else await api.transactions.create(payload);
      toast(isEdit ? 'Операция сохранена' : 'Операция добавлена');
      onSaved?.();
    },
    onDelete: isEdit
      ? async () => {
          await api.transactions.remove(transaction.id);
          toast('Операция удалена');
          onSaved?.();
        }
      : undefined,
  });
}
