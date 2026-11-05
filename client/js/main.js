import { createRouter } from './router.js';
import { accountsView } from './views/accounts.js';
import { analyticsView } from './views/analytics.js';
import { budgetsView } from './views/budgets.js';
import { categoriesView } from './views/categories.js';
import { dashboardView } from './views/dashboard.js';
import { transactionsView } from './views/transactions.js';

/** Точка входа клиентского приложения */
const router = createRouter(
  {
    '/': dashboardView,
    '/transactions': transactionsView,
    '/analytics': analyticsView,
    '/budgets': budgetsView,
    '/categories': categoriesView,
    '/accounts': accountsView,
  },
  document.getElementById('app'),
);

router.render();
