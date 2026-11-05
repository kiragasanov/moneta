const KOPECKS_IN_RUBLE = 100;

/** Перевод копеек из базы данных в рубли для ответа API */
export const toRubles = (kopecks) => Math.round(Number(kopecks ?? 0)) / KOPECKS_IN_RUBLE;
