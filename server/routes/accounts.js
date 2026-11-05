import { Router } from 'express';
import { accountsRepository } from '../repositories/accountsRepository.js';
import { HttpError } from '../utils/HttpError.js';
import { ACCOUNT_TYPES, Validator, parseId } from '../utils/validate.js';

export const accountsRouter = Router();

const validateAccount = (body) =>
  new Validator(body)
    .string('name')
    .oneOf('type', ACCOUNT_TYPES)
    .money('initialBalance', { required: false, allowZero: true })
    .done();

// GET /api/accounts - список счетов с текущим балансом
accountsRouter.get('/', (req, res) => {
  res.json(accountsRepository.findAll());
});

// GET /api/accounts/:id
accountsRouter.get('/:id', (req, res) => {
  const account = accountsRepository.findById(parseId(req.params.id));
  if (!account) throw HttpError.notFound('Счет не найден');
  res.json(account);
});

// POST /api/accounts - создание счета
accountsRouter.post('/', (req, res) => {
  const account = accountsRepository.create(validateAccount(req.body));
  res.status(201).json(account);
});

// PUT /api/accounts/:id - изменение счета
accountsRouter.put('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!accountsRepository.findById(id)) throw HttpError.notFound('Счет не найден');
  res.json(accountsRepository.update(id, validateAccount(req.body)));
});

// DELETE /api/accounts/:id - удаление возможно только для счета без операций
accountsRouter.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!accountsRepository.findById(id)) throw HttpError.notFound('Счет не найден');
  if (accountsRepository.countTransactions(id) > 0) {
    throw HttpError.conflict('Нельзя удалить счет, по которому есть операции');
  }
  accountsRepository.remove(id);
  res.status(204).end();
});
