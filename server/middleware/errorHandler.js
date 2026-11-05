import { HttpError } from '../utils/HttpError.js';

const INTERNAL_ERROR = 500;

/** Ответ для неизвестных адресов API */
export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Маршрут ${req.method} ${req.originalUrl} не найден` });
}

/**
 * Централизованная обработка ошибок. Все ответы об ошибках имеют
 * одинаковый формат: { error: "текст", details: { поле: "текст" } }
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  // Некорректный JSON в теле запроса
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Тело запроса должно быть корректным JSON' });
  }

  // Нарушение ограничений базы данных (уникальность, внешние ключи)
  if (err.code === 'ERR_SQLITE_ERROR' && /UNIQUE/.test(err.message)) {
    return res.status(409).json({ error: 'Запись с таким названием уже существует' });
  }
  if (err.code === 'ERR_SQLITE_ERROR' && /FOREIGN KEY/.test(err.message)) {
    return res.status(409).json({ error: 'Запись используется в других данных и не может быть изменена' });
  }

  console.error(err);
  return res.status(INTERNAL_ERROR).json({ error: 'Внутренняя ошибка сервера' });
}
