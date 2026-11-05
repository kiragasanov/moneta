import { isoMonth } from './format.js';

/**
 * Общее состояние интерфейса. Выбранный месяц сохраняется между
 * страницами, чтобы пользователь не выбирал его заново.
 */
export const state = {
  month: isoMonth(new Date()),
};
