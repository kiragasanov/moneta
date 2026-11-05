const TOAST_LIFETIME = 3200;

/** Короткое всплывающее уведомление в углу экрана */
export function toast(message, type = 'info') {
  const container = document.getElementById('toasts');
  const element = document.createElement('div');
  element.className = `toast ${type === 'error' ? 'error' : ''}`;
  element.textContent = message;
  container.append(element);
  setTimeout(() => element.remove(), TOAST_LIFETIME);
}

export const toastError = (error) => toast(error.message || 'Что-то пошло не так', 'error');
