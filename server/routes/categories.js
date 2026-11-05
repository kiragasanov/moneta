import { Router } from 'express';
import { categoriesRepository } from '../repositories/categoriesRepository.js';
import { HttpError } from '../utils/HttpError.js';
import { CATEGORY_TYPES, Validator, parseId } from '../utils/validate.js';

export const categoriesRouter = Router();

const validateCategory = (body) =>
  new Validator(body).string('name').oneOf('type', CATEGORY_TYPES).color('color').done();

// GET /api/categories?type=expense
categoriesRouter.get('/', (req, res) => {
  const { type } = req.query;
  if (type && !CATEGORY_TYPES.includes(type)) throw HttpError.badRequest('Неверный тип категории');
  res.json(categoriesRepository.findAll(type));
});

categoriesRouter.get('/:id', (req, res) => {
  const category = categoriesRepository.findById(parseId(req.params.id));
  if (!category) throw HttpError.notFound('Категория не найдена');
  res.json(category);
});

categoriesRouter.post('/', (req, res) => {
  res.status(201).json(categoriesRepository.create(validateCategory(req.body)));
});

categoriesRouter.put('/:id', (req, res) => {
  const id = parseId(req.params.id);
  const current = categoriesRepository.findById(id);
  if (!current) throw HttpError.notFound('Категория не найдена');
  const data = validateCategory(req.body);
  // Смена типа у категории с операциями исказила бы всю статистику
  if (data.type !== current.type && current.transactionsCount > 0) {
    throw HttpError.conflict('Нельзя сменить тип категории, по которой уже есть операции');
  }
  res.json(categoriesRepository.update(id, data));
});

categoriesRouter.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);
  const current = categoriesRepository.findById(id);
  if (!current) throw HttpError.notFound('Категория не найдена');
  if (current.transactionsCount > 0) {
    throw HttpError.conflict('Нельзя удалить категорию, по которой есть операции');
  }
  categoriesRepository.remove(id);
  res.status(204).end();
});
