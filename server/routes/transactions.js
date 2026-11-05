import { Router } from 'express';
import { accountsRepository } from '../repositories/accountsRepository.js';
import { categoriesRepository } from '../repositories/categoriesRepository.js';
import { transactionsRepository } from '../repositories/transactionsRepository.js';
import { HttpError } from '../utils/HttpError.js';
import { CATEGORY_TYPES, Validator, isValidDate, parseId } from '../utils/validate.js';

export const transactionsRouter = Router();

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function validateTransaction(body) {
  const data = new Validator(body).id('accountId').id('categoryId').money('amount').date('date').note('note').done();

  // Проверяем, что связанные записи существуют, и возвращаем понятную ошибку
  const details = {};
  if (!accountsRepository.findById(data.accountId)) details.accountId = 'Счет не найден';
  if (!categoriesRepository.findById(data.categoryId)) details.categoryId = 'Категория не найдена';
  if (Object.keys(details).length) throw HttpError.badRequest('Проверьте правильность заполнения полей', details);
  return data;
}

// GET /api/transactions?from=2026-11-01&to=2026-11-30&type=expense&categoryId=4&search=кофе&limit=50&offset=0
transactionsRouter.get('/', (req, res) => {
  const { from, to, type, categoryId, accountId, search } = req.query;
  if (from && !isValidDate(from)) throw HttpError.badRequest('Параметр from должен быть датой ГГГГ-ММ-ДД');
  if (to && !isValidDate(to)) throw HttpError.badRequest('Параметр to должен быть датой ГГГГ-ММ-ДД');
  if (type && !CATEGORY_TYPES.includes(type)) throw HttpError.badRequest('Неверный тип операции');

  const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const result = transactionsRepository.findMany(
    {
      from,
      to,
      type,
      categoryId: categoryId ? parseId(categoryId) : undefined,
      accountId: accountId ? parseId(accountId) : undefined,
      search: search?.trim(),
    },
    { limit, offset },
  );
  res.json({ ...result, limit, offset });
});

transactionsRouter.get('/:id', (req, res) => {
  const transaction = transactionsRepository.findById(parseId(req.params.id));
  if (!transaction) throw HttpError.notFound('Операция не найдена');
  res.json(transaction);
});

transactionsRouter.post('/', (req, res) => {
  res.status(201).json(transactionsRepository.create(validateTransaction(req.body)));
});

transactionsRouter.put('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!transactionsRepository.findById(id)) throw HttpError.notFound('Операция не найдена');
  res.json(transactionsRepository.update(id, validateTransaction(req.body)));
});

transactionsRouter.delete('/:id', (req, res) => {
  if (!transactionsRepository.remove(parseId(req.params.id))) throw HttpError.notFound('Операция не найдена');
  res.status(204).end();
});
