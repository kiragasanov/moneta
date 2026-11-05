import { escapeHtml } from '../format.js';
import { toastError } from './toast.js';

export const PALETTE = [
  '#34c759',
  '#30b0c7',
  '#0071e3',
  '#5856d6',
  '#af52de',
  '#ff2d55',
  '#ff3b30',
  '#ff9500',
  '#ffcc00',
  '#a2845e',
  '#00c7be',
  '#8e8e93',
];

/** HTML одного поля формы по его описанию */
function renderField(field) {
  const id = `f-${field.name}`;
  const value = field.value ?? '';
  let control;

  if (field.type === 'select') {
    const options = field.options
      .map(
        (o) =>
          `<option value="${escapeHtml(o.value)}" ${String(o.value) === String(value) ? 'selected' : ''}>${escapeHtml(o.label)}</option>`,
      )
      .join('');
    control = `<select class="input" id="${id}" name="${field.name}">${options}</select>`;
  } else if (field.type === 'segmented') {
    const buttons = field.options
      .map(
        (o) =>
          `<button type="button" data-value="${o.value}" class="${o.value === value ? 'active' : ''}">${o.label}</button>`,
      )
      .join('');
    control = `<div class="segmented" data-segmented="${field.name}">${buttons}</div>
      <input type="hidden" name="${field.name}" value="${escapeHtml(value)}">`;
  } else if (field.type === 'color') {
    control = `<div class="colors">${PALETTE.map(
      (c) => `<label><input type="radio" name="${field.name}" value="${c}" ${c === value ? 'checked' : ''}>
        <span style="background:${c}"></span></label>`,
    ).join('')}</div>`;
  } else {
    const extra = field.type === 'number' ? 'step="0.01" min="0" inputmode="decimal"' : '';
    control = `<input class="input" id="${id}" name="${field.name}" type="${field.type || 'text'}"
      value="${escapeHtml(value)}" placeholder="${escapeHtml(field.placeholder ?? '')}" ${extra}
      ${field.autofocus ? 'autofocus' : ''}>`;
  }

  return `<div class="field" data-field="${field.name}">
    <label for="${id}">${field.label}</label>
    ${control}
    <div class="field-error"></div>
  </div>`;
}

/**
 * Открывает модальное окно с формой.
 * onSubmit получает объект значений; если он бросает ApiError с details,
 * ошибки подсвечиваются под соответствующими полями.
 */
export function openForm({ title, fields, submitText = 'Сохранить', onSubmit, onDelete, onChange }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <h2>${escapeHtml(title)}</h2>
      <form novalidate>
        ${fields.map(renderField).join('')}
        <div class="modal-actions">
          ${onDelete ? '<button type="button" class="btn danger-btn" data-delete>Удалить</button>' : ''}
          <div class="right">
            <button type="button" class="btn secondary" data-cancel>Отмена</button>
            <button type="submit" class="btn">${submitText}</button>
          </div>
        </div>
      </form>
    </div>`;

  const form = backdrop.querySelector('form');
  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (event) => event.key === 'Escape' && close();

  // Сегментированные переключатели записывают значение в скрытое поле
  backdrop.querySelectorAll('[data-segmented]').forEach((group) => {
    group.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      group.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === button));
      const input = form.elements[group.dataset.segmented];
      input.value = button.dataset.value;
      onChange?.(group.dataset.segmented, input.value, form);
    });
  });

  form.addEventListener('change', (event) => onChange?.(event.target.name, event.target.value, form));

  const values = () => Object.fromEntries(new FormData(form).entries());

  const showErrors = (details = {}) => {
    form.querySelectorAll('.field').forEach((el) => {
      const message = details[el.dataset.field];
      el.classList.toggle('invalid', Boolean(message));
      el.querySelector('.field-error').textContent = message ?? '';
    });
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = form.querySelector('[type=submit]');
    submit.disabled = true;
    try {
      await onSubmit(values());
      close();
    } catch (error) {
      showErrors(error.details);
      toastError(error);
    } finally {
      submit.disabled = false;
    }
  });

  backdrop.querySelector('[data-cancel]').addEventListener('click', close);
  backdrop.querySelector('[data-delete]')?.addEventListener('click', async () => {
    if (!window.confirm('Удалить запись? Действие нельзя отменить')) return;
    try {
      await onDelete();
      close();
    } catch (error) {
      toastError(error);
    }
  });
  backdrop.addEventListener('mousedown', (event) => event.target === backdrop && close());
  document.addEventListener('keydown', onKey);

  document.body.append(backdrop);
  backdrop.querySelector('[autofocus]')?.focus();
  return { form, close };
}
