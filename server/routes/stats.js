import { Router } from 'express';
import { statsRepository } from '../repositories/statsRepository.js';
import { HttpError } from '../utils/HttpError.js';
import { CATEGORY_TYPES, isValidDate, isValidMonth } from '../utils/validate.js';
import { currentMonth, currentMonthRange } from '../utils/period.js';

export const statsRouter = Router();

const DEFAULT_MONTHS = 6;
const MAX_MONTHS = 24;

/** Читает период из параметров from/to, по умолчанию - текущий месяц */
function readPeriod(query) {
  const fallback = currentMonthRange();
  const from = query.from ?? fallback.from;
  const to = query.to ?? fallback.to;
  if (!isValidDate(from) || !isValidDate(to)) throw HttpError.badRequest('Даты периода в формате ГГГГ-ММ-ДД');
  if (from > to) throw HttpError.badRequest('Начало периода не может быть позже конца');
  return { from, to };
}

// GET /api/stats/summary?from&to
statsRouter.get('/summary', (req, res) => {
  const { from, to } = readPeriod(req.query);
  res.json(statsRepository.summary(from, to));
});

// GET /api/stats/by-category?from&to&type=expense
statsRouter.get('/by-category', (req, res) => {
  const { from, to } = readPeriod(req.query);
  const type = req.query.type ?? 'expense';
  if (!CATEGORY_TYPES.includes(type)) throw HttpError.badRequest('Неверный тип');
  res.json(statsRepository.byCategory(from, to, type));
});

// GET /api/stats/by-month?months=6&until=2026-11
statsRouter.get('/by-month', (req, res) => {
  const months = Math.min(Math.max(Number(req.query.months) || DEFAULT_MONTHS, 1), MAX_MONTHS);
  const until = req.query.until ?? currentMonth();
  if (!isValidMonth(until)) throw HttpError.badRequest('Параметр until в формате ГГГГ-ММ');
  res.json(statsRepository.byMonth(months, until));
});

// GET /api/stats/insights?from&to
statsRouter.get('/insights', (req, res) => {
  const { from, to } = readPeriod(req.query);
  res.json(statsRepository.insights(from, to));
});
