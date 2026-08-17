/* Каркас страниц «Коррозия и обрастание». */
'use strict';
(function () {
  const me = document.currentScript;
  const root = (me && me.dataset.root) || './';
  const page = (me && me.dataset.page) || '';
  const logoSvg = `
  <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
    <rect x="1" y="1" width="28" height="28" rx="6" fill="#2f6f4f"/>
    <text x="15" y="22" text-anchor="middle" font-size="16">🧪</text>
  </svg>`;
  const nav = [
    { h: '', k: 'index', t: 'Обзор' },
    { t: 'Теория', h: 'theory', drop: [
      { h: 'theory', k: 'theory', t: 'Оглавление курса' },
      { h: 't-basics', k: 't-basics', t: '1. Основы коррозии' },
      { h: 't-electro', k: 't-electro', t: '2. Коррозия в морской воде' },
      { h: 't-types', k: 't-types', t: '3. Виды разрушения' },
      { h: 't-protect', k: 't-protect', t: '4. Защита от коррозии' },
      { h: 't-paint', k: 't-paint', t: '5. Лакокрасочные системы' },
      { h: 't-fouling', k: 't-fouling', t: '6. Обрастание' },
      { h: 't-monitoring', k: 't-monitoring', t: '7. Обследование и ремонт' },
    ] },
    { t: 'Расчёты', h: 'p-protectors', drop: [
      { h: 'p-protectors', k: 'p-protectors', t: 'Протекторная защита' },
      { h: 'p-paint', k: 'p-paint', t: 'Расход краски' },
      { h: 'p-fouling', k: 'p-fouling', t: 'Обрастание и топливо' },
    ] },
    { h: 'sources', k: 'sources', t: 'Источники' },
  ];
  const navLink = (it) =>
    `<a href="${root}${it.h}" class="${page === it.k ? 'on' : ''}">${it.t}</a>`;
  const navHtml = nav.map((g) => {
    if (!g.drop) return navLink(g);
    const on = g.drop.some((it) => page === it.k) ? 'on' : '';
    return `<span class="nav-drop"><a href="${root}${g.h}" class="${on}">${g.t} ▾</a>`
      + `<span class="drop">${g.drop.map(navLink).join('')}</span></span>`;
  }).join('');
  const header = document.createElement('header');
  header.className = 'site';
  header.innerHTML = `<div class="wrap">
    <a class="logo" href="${root}">${logoSvg}<span>Коррозия и обрастание</span></a>
    <nav class="top">${navHtml}</nav>
  </div>`;
  document.body.prepend(header);
  const onReady = (fn) => (document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn) : fn());
  const footer = document.createElement('footer');
  footer.className = 'site';
  footer.innerHTML = `<div class="wrap">
    <div>Учебный сайт по курсу «Коррозия и обрастание» · защита судовых конструкций, живые расчёты в браузере</div>
  </div>`;
  onReady(() => document.body.appendChild(footer));
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.setAttribute('width', '0'); defs.setAttribute('height', '0');
  defs.style.position = 'absolute';
  const marker = (id, color) =>
    `<marker id="${id}" markerWidth="9" markerHeight="7" refX="8.4" refY="3.5" orient="auto">
       <path d="M0,0 L9,3.5 L0,7 z" fill="${color}"/></marker>`;
  defs.innerHTML = `<defs>
    ${marker('arrE', '#16161a')}
    ${marker('arrRed', '#b3382e')}
    ${marker('arrBlue', '#155e75')}
    ${marker('arrGreen', '#1a7f37')}
    ${marker('arrGray', '#6b6b74')}
    <marker id="arrS" markerWidth="9" markerHeight="7" refX="0.6" refY="3.5" orient="auto">
      <path d="M9,0 L0,3.5 L9,7 z" fill="#16161a"/></marker>
  </defs>`;
  onReady(() => document.body.appendChild(defs));
})();
