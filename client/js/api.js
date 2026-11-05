/**
 * Модуль взаимодействия с REST API сервера.
 * Все запросы проходят через функцию request, которая
 * единообразно обрабатывает ошибки сети и сервера.
 */

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details ?? {};
  }
}

const NO_CONTENT = 204;

async function request(method, url, body) {
  let response;
  try {
    response = await fetch(`/api${url}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Нет соединения с сервером. Проверьте, что сервер запущен', 0);
  }

  if (response.status === NO_CONTENT) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.error || `Ошибка сервера (${response.status})`, response.status, data.details);
  }
  return data;
}

/** Превращает объект фильтров в строку параметров, пропуская пустые значения */
function query(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const api = {
  accounts: {
    list: () => request('GET', '/accounts'),
    create: (data) => request('POST', '/accounts', data),
    update: (id, data) => request('PUT', `/accounts/${id}`, data),
    remove: (id) => request('DELETE', `/accounts/${id}`),
  },
  categories: {
    list: (type) => request('GET', `/categories${query({ type })}`),
    create: (data) => request('POST', '/categories', data),
    update: (id, data) => request('PUT', `/categories/${id}`, data),
    remove: (id) => request('DELETE', `/categories/${id}`),
  },
  transactions: {
    list: (filters) => request('GET', `/transactions${query(filters)}`),
    create: (data) => request('POST', '/transactions', data),
    update: (id, data) => request('PUT', `/transactions/${id}`, data),
    remove: (id) => request('DELETE', `/transactions/${id}`),
  },
  budgets: {
    list: (month) => request('GET', `/budgets${query({ month })}`),
    create: (data) => request('POST', '/budgets', data),
    update: (id, data) => request('PUT', `/budgets/${id}`, data),
    remove: (id) => request('DELETE', `/budgets/${id}`),
  },
  stats: {
    summary: (from, to) => request('GET', `/stats/summary${query({ from, to })}`),
    byCategory: (from, to, type) => request('GET', `/stats/by-category${query({ from, to, type })}`),
    byMonth: (months, until) => request('GET', `/stats/by-month${query({ months, until })}`),
    insights: (from, to) => request('GET', `/stats/insights${query({ from, to })}`),
  },
};
