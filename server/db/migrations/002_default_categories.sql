-- Базовый набор категорий и счетов, с которым пользователь начинает работу

INSERT INTO categories (name, type, color) VALUES
  ('Зарплата',      'income',  '#34c759'),
  ('Подработка',    'income',  '#30b0c7'),
  ('Подарки',       'income',  '#af52de'),
  ('Продукты',      'expense', '#ff9500'),
  ('Кафе',          'expense', '#ff3b30'),
  ('Транспорт',     'expense', '#0071e3'),
  ('Связь и интернет', 'expense', '#5856d6'),
  ('Развлечения',   'expense', '#ff2d55'),
  ('Одежда',        'expense', '#a2845e'),
  ('Здоровье',      'expense', '#00c7be'),
  ('Подписки',      'expense', '#8e8e93');

INSERT INTO accounts (name, type, initial_balance) VALUES
  ('Банковская карта', 'card', 0),
  ('Наличные',         'cash', 0);
