import { HttpError } from './HttpError.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const MAX_NAME_LENGTH = 60;
const MAX_NOTE_LENGTH = 200;
const KOPECKS_IN_RUBLE = 100;

export const ACCOUNT_TYPES = ['card', 'cash', 'savings'];
export const CATEGORY_TYPES = ['income', 'expense'];

/**
 * Небольшой валидатор входных данных. Собирает все ошибки сразу,
 * чтобы клиент мог подсветить каждое неверное поле.
 */
export class Validator {
  constructor(data) {
    this.data = data ?? {};
    this.errors = {};
    this.result = {};
  }

  fail(field, message) {
    this.errors[field] = message;
    return this;
  }

  string(field, { required = true, max = MAX_NAME_LENGTH } = {}) {
    const value = this.data[field];
    if (value === undefined || value === null || String(value).trim() === '') {
      if (required) this.fail(field, 'Поле обязательно для заполнения');
      else this.result[field] = '';
      return this;
    }
    const text = String(value).trim();
    if (text.length > max) return this.fail(field, `Не более ${max} символов`);
    this.result[field] = text;
    return this;
  }

  note(field) {
    return this.string(field, { required: false, max: MAX_NOTE_LENGTH });
  }

  oneOf(field, allowed) {
    const value = this.data[field];
    if (!allowed.includes(value)) return this.fail(field, `Допустимые значения: ${allowed.join(', ')}`);
    this.result[field] = value;
    return this;
  }

  /** Сумма приходит в рублях (например 1250.50) и переводится в копейки */
  money(field, { required = true, allowZero = false } = {}) {
    const value = this.data[field];
    if (value === undefined || value === null || value === '') {
      if (required) this.fail(field, 'Укажите сумму');
      else this.result[field] = 0;
      return this;
    }
    const number = Number(value);
    if (!Number.isFinite(number)) return this.fail(field, 'Сумма должна быть числом');
    const kopecks = Math.round(number * KOPECKS_IN_RUBLE);
    if (kopecks < 0 || (!allowZero && kopecks === 0)) {
      return this.fail(field, 'Сумма должна быть больше нуля');
    }
    this.result[field] = kopecks;
    return this;
  }

  id(field) {
    const number = Number(this.data[field]);
    if (!Number.isInteger(number) || number <= 0) return this.fail(field, 'Некорректный идентификатор');
    this.result[field] = number;
    return this;
  }

  date(field) {
    const value = this.data[field];
    if (!DATE_RE.test(value ?? '') || Number.isNaN(Date.parse(value))) {
      return this.fail(field, 'Дата в формате ГГГГ-ММ-ДД');
    }
    this.result[field] = value;
    return this;
  }

  month(field) {
    const value = this.data[field];
    if (!MONTH_RE.test(value ?? '')) return this.fail(field, 'Месяц в формате ГГГГ-ММ');
    this.result[field] = value;
    return this;
  }

  color(field) {
    const value = this.data[field] ?? '#86868b';
    if (!COLOR_RE.test(value)) return this.fail(field, 'Цвет в формате #RRGGBB');
    this.result[field] = value.toLowerCase();
    return this;
  }

  /** Возвращает проверенные данные или бросает ошибку 400 со списком полей */
  done() {
    if (Object.keys(this.errors).length > 0) {
      throw HttpError.badRequest('Проверьте правильность заполнения полей', this.errors);
    }
    return this.result;
  }
}

export function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw HttpError.badRequest('Некорректный идентификатор');
  return id;
}

export function isValidDate(value) {
  return DATE_RE.test(value ?? '') && !Number.isNaN(Date.parse(value));
}

export function isValidMonth(value) {
  return MONTH_RE.test(value ?? '');
}
