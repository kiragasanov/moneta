import { formatMonth, shiftMonth } from '../format.js';
import { state } from '../state.js';

/** Переключатель месяца «‹ ноябрь 2026 ›» */
export function periodSwitcher() {
  return `<div class="period">
    <button type="button" data-shift="-1" aria-label="Предыдущий месяц">‹</button>
    <span>${formatMonth(state.month)}</span>
    <button type="button" data-shift="1" aria-label="Следующий месяц">›</button>
  </div>`;
}

export function bindPeriodSwitcher(root, onChange) {
  root.querySelectorAll('[data-shift]').forEach((button) => {
    button.addEventListener('click', () => {
      state.month = shiftMonth(state.month, Number(button.dataset.shift));
      onChange();
    });
  });
}
