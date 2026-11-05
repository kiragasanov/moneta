/**
 * Ошибка с HTTP-статусом. Бросается в маршрутах и обрабатывается
 * централизованным обработчиком ошибок.
 */
export class HttpError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
  }

  static badRequest(message, details) {
    return new HttpError(400, message, details);
  }

  static notFound(message = 'Запись не найдена') {
    return new HttpError(404, message);
  }

  static conflict(message) {
    return new HttpError(409, message);
  }
}
