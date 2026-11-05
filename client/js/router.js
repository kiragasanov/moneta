import { destroyCharts } from './components/charts.js';
import { toastError } from './components/toast.js';

/**
 * Простой маршрутизатор на основе hash (#/transactions).
 * Каждому адресу соответствует функция-представление, которая
 * получает контейнер и отрисовывает в нем страницу.
 */
export function createRouter(routes, container) {
  async function render() {
    const path = window.location.hash.replace(/^#/, '') || '/';
    const view = routes[path] ?? routes['/'];

    document.querySelectorAll('#nav a').forEach((link) => {
      link.classList.toggle('active', link.dataset.route === path);
    });

    destroyCharts();
    container.innerHTML = '<div class="skeleton"></div>';
    try {
      await view(container);
    } catch (error) {
      container.innerHTML = `<div class="card empty">Не удалось загрузить данные.<br>${error.message}</div>`;
      toastError(error);
    }
    container.focus({ preventScroll: true });
  }

  window.addEventListener('hashchange', render);
  return { render };
}
