/* Данные каркаса страниц. Машинерия — assets/shell.js. */
'use strict';
(function () {
  const me = document.currentScript;
  const root = (me && me.dataset.root) || './';
  const marker = (id, color) =>
      `<marker id="${id}" markerWidth="9" markerHeight="7" refX="8.4" refY="3.5" orient="auto">
         <path d="M0,0 L9,3.5 L0,7 z" fill="${color}"/></marker>`;
  buildSiteShell({
    root,
    page: (me && me.dataset.page) || '',
    brand: 'Коррозия и обрастание',
    logo: `
  <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
    <rect x="1" y="1" width="28" height="28" rx="6" fill="#2f6f4f"/>
    <text x="15" y="22" text-anchor="middle" font-size="16">🧪</text>
  </svg>`,
    nav: [
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
    ],
    footer: `<div>Учебный сайт по курсу «Коррозия и обрастание» · защита судовых конструкций, живые расчёты в браузере</div>`,
    markers: `${marker('arrE', '#16161a')}
    ${marker('arrRed', '#b3382e')}
    ${marker('arrBlue', '#155e75')}
    ${marker('arrGreen', '#1a7f37')}
    ${marker('arrGray', '#6b6b74')}
    <marker id="arrS" markerWidth="9" markerHeight="7" refX="0.6" refY="3.5" orient="auto">
      <path d="M9,0 L0,3.5 L9,7 z" fill="#16161a"/></marker>`,
  });
})();
