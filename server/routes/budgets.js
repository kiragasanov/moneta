import { Router } from 'express';
import { budgetsRepository } from '../repositories/budgetsRepository.js';
import { categoriesRepository } from '../repositories/categoriesRepository.js';
import { HttpError } from '../utils/HttpError.js';
import { Validator, isValidMonth, parseId } from '../utils/validate.js';
import { currentMonth } from '../utils/period.js';

export const budgetsRouter = Router();

// GET /api/budgets?month=2026-11 - бюджеты месяца с фактическими расходами
budgetsRouter.get('/', (req, res) => {
  const month = req.query.month ?? currentMonth();
  if (!isValidMonth(month)) throw HttpError.badRequest('Месяц в формате ГГГГ-ММ');
  res.json(budgetsRepository.findByMonth(month));
});

budgetsRouter.post('/', (req, res) => {
  const data = new Validator(req.body).id('categoryId').month('month').money('limit').done();
  const category = categoriesRepository.findById(data.categoryId);
  if (!category)
    throw HttpError.badRequest('Проверьте правильность заполнения полей', { categoryId: 'Категория не найдена' });
  if (category.type !== 'expense') {
    throw HttpError.badRequest('Бюджет можно задать только для категории расходов', {
      categoryId: 'Выберите категорию расходов',
    });
  }
  res.status(201).json(budgetsRepository.create(data));
});

budgetsRouter.put('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!budgetsRepository.findById(id)) throw HttpError.notFound('Бюджет не найден');
  const data = new Validator(req.body).money('limit').done();
  res.json(budgetsRepository.update(id, data));
});

budgetsRouter.delete('/:id', (req, res) => {
  if (!budgetsRepository.remove(parseId(req.params.id))) throw HttpError.notFound('Бюджет не найден');
  res.status(204).end();
});
