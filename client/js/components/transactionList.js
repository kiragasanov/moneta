import { escapeHtml, formatDay, money, signedMoney } from '../format.js';

/** Одна строка операции: цветной кружок категории, название, счет, сумма */
export function transactionItem(t) {
  const title = t.note || t.category.name;
  return `<li class="tx" data-id="${t.id}">
    <span class="tx-dot" style="background:${t.category.color}">${escapeHtml(t.category.name.charAt(0))}</span>
    <div style="min-width:0">
      <div class="tx-title">${escapeHtml(title)}</div>
      <div class="tx-meta">${escapeHtml(t.category.name)} · ${escapeHtml(t.account.name)}</div>
    </div>
    <span class="tx-amount ${t.type === 'income' ? 'income' : ''}">${signedMoney(t.amount, t.type)}</span>
  </li>`;
}

/** Список операций, сгруппированный по дням, с итогом за каждый день */
export function groupedTransactions(items) {
  if (!items.length) return '<div class="empty">Операций пока нет</div>';

  const groups = new Map();
  items.forEach((t) => {
    if (!groups.has(t.date)) groups.set(t.date, []);
    groups.get(t.date).push(t);
  });

  return [...groups.entries()]
    .map(([date, list]) => {
      const total = list.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
      return `<section class="tx-group">
        <div class="tx-day"><span>${formatDay(date)}</span><span>${total >= 0 ? '+' : '-'}${money(Math.abs(total))}</span></div>
        <ul class="tx-list">${list.map(transactionItem).join('')}</ul>
      </section>`;
    })
    .join('');
}
