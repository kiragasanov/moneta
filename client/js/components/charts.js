import { formatShortMonth, money } from '../format.js';

const COLORS = {
  income: '#34c759',
  expense: '#1d1d1f',
  grid: 'rgba(0, 0, 0, 0.06)',
  muted: '#86868b',
};

// Общие настройки Chart.js в стиле интерфейса
if (window.Chart) {
  Chart.defaults.font.family = getComputedStyle(document.body).getPropertyValue('--font') || 'system-ui';
  Chart.defaults.color = COLORS.muted;
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(29, 29, 31, 0.92)';
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 10;
}

const compact = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 });

/** Хранилище созданных графиков, чтобы удалять старые при перерисовке */
const instances = new Map();

function draw(canvas, config) {
  if (!window.Chart || !canvas) return null;
  instances.get(canvas.id)?.destroy();
  const chart = new Chart(canvas, config);
  instances.set(canvas.id, chart);
  return chart;
}

export function destroyCharts() {
  instances.forEach((chart) => chart.destroy());
  instances.clear();
}

/** Столбчатая диаграмма доходов и расходов по месяцам */
export function monthsBarChart(canvas, rows) {
  return draw(canvas, {
    type: 'bar',
    data: {
      labels: rows.map((r) => formatShortMonth(r.month)),
      datasets: [
        { label: 'Доходы', data: rows.map((r) => r.income), backgroundColor: COLORS.income, borderRadius: 6 },
        { label: 'Расходы', data: rows.map((r) => r.expense), backgroundColor: COLORS.expense, borderRadius: 6 },
      ],
    },
    options: {
      maintainAspectRatio: false,
      datasets: { bar: { maxBarThickness: 22, categoryPercentage: 0.6 } },
      scales: {
        x: { grid: { display: false }, border: { display: false } },
        y: {
          grid: { color: COLORS.grid },
          border: { display: false },
          ticks: { callback: (v) => compact.format(v) },
        },
      },
      plugins: {
        legend: { display: true, position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${money(ctx.raw)}` } },
      },
    },
  });
}

/** Линейный график накоплений (разница доходов и расходов) */
export function savingsLineChart(canvas, rows) {
  let total = 0;
  const cumulative = rows.map((r) => (total += r.difference));
  return draw(canvas, {
    type: 'line',
    data: {
      labels: rows.map((r) => formatShortMonth(r.month)),
      datasets: [
        {
          label: 'Накоплено',
          data: cumulative,
          borderColor: '#0071e3',
          backgroundColor: 'rgba(0, 113, 227, 0.08)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#0071e3',
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false }, border: { display: false } },
        y: { grid: { color: COLORS.grid }, border: { display: false }, ticks: { callback: (v) => compact.format(v) } },
      },
      plugins: { tooltip: { callbacks: { label: (ctx) => money(ctx.raw) } } },
    },
  });
}

/** Кольцевая диаграмма структуры расходов или доходов по категориям */
export function categoriesDoughnut(canvas, rows) {
  return draw(canvas, {
    type: 'doughnut',
    data: {
      labels: rows.map((r) => r.category.name),
      datasets: [
        {
          data: rows.map((r) => r.total),
          backgroundColor: rows.map((r) => r.category.color),
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${money(ctx.raw)}` } } },
    },
  });
}
