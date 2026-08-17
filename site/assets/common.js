/* Общие помощники всех страниц: форматирование чисел, обёртки над DOM,
 * вывод строки живого расчёта «формула = подстановка = результат» и сводка.
 * Подключается первым, до site.js и скриптов конкретных страниц. */
'use strict';

/* Число с запятой в качестве разделителя и разумным числом знаков. */
function f(x, dec) {
  if (x === null || x === undefined || !isFinite(x)) return '—';
  if (dec === undefined) {
    const a = Math.abs(x);
    dec = a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 2 : a >= 1 ? 3 : 4;
  }
  return x.toFixed(dec).replace('.', ',').replace('-', '−');
}

/* Русское склонение существительного при числе. */
function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

const el = (id) => document.getElementById(id);
const num = (id) => parseFloat(String(el(id).value).replace(',', '.')) || 0;
const val = (id) => el(id).value;

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* Строка живого расчёта: подстановка серым, результат жирным. */
function out(id, lead, subst, result, why) {
  const n = el(id);
  if (!n) return;
  n.innerHTML = esc(lead) + '<span class="sub">' + esc(subst) + '</span> = <b>' +
    esc(result) + '</b>' + (why ? '<div class="why">' + why + '</div>' : '');
}

/* Пересчёт при любом изменении полей внутри контейнера. */
function bind(container, fn) {
  const box = typeof container === 'string' ? el(container) : container;
  if (!box) return;
  box.querySelectorAll('input, select').forEach((n) => {
    n.addEventListener('input', fn);
    n.addEventListener('change', fn);
  });
  fn();
}

/* Сводка результатов: [{k, v}] с подсветкой изменившихся ячеек. */
const _prevCells = {};
function summary(id, cells) {
  const box = el(id);
  if (!box) return;
  box.innerHTML = cells.map((c, i) => {
    const key = id + i;
    const upd = _prevCells[key] !== undefined && _prevCells[key] !== c.v;
    _prevCells[key] = c.v;
    return `<div class="cell${upd ? ' upd' : ''}"><span class="k">${c.k}</span>` +
      `<span class="v">${c.v}</span></div>`;
  }).join('');
  requestAnimationFrame(() => box.querySelectorAll('.cell.upd')
    .forEach((n) => n.classList.remove('upd')));
}

/* Выполнить действие, когда разметка страницы полностью разобрана. */
const onReady = (fn) => (document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', fn) : fn());
