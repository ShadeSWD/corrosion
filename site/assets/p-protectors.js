/* Живой расчёт протекторной защиты. */
'use strict';
(function () {
  /* заполнение выпадающих списков */
  el('idens').innerHTML = Object.keys(C.IDENS)
    .map((k) => `<option value="${k}"${k === 'coat_mid' ? ' selected' : ''}>` +
      `${C.IDENS[k].name} — ${C.IDENS[k].i} мА/м²</option>`).join('');
  el('alloy').innerHTML = Object.keys(C.ALLOY)
    .map((k) => `<option value="${k}"${k === 'AP4N' ? ' selected' : ''}>` +
      `${C.ALLOY[k].name}</option>`).join('');
  el('water').innerHTML = Object.keys(C.WATER)
    .map((k) => `<option value="${k}"${k === 'ocean' ? ' selected' : ''}>` +
      `${C.WATER[k].name}</option>`).join('');

  /* справочные таблицы под шагами */
  el('tab_i').innerHTML = '<thead><tr><th>Состояние поверхности</th>' +
    '<th class="n">i, мА/м²</th></tr></thead><tbody>' +
    Object.keys(C.IDENS).map((k) => `<tr data-k="${k}"><td>${C.IDENS[k].name}</td>` +
      `<td class="n">${C.IDENS[k].i}</td></tr>`).join('') + '</tbody>';
  el('tab_alloy').innerHTML = '<thead><tr><th>Сплав</th>' +
    '<th class="n">Рабочий потенциал, В</th><th class="n">Теор. токоотдача, А·ч/кг</th>' +
    '<th class="n">Факт. токоотдача, А·ч/кг</th><th class="n">Выход по току, %</th>' +
    '</tr></thead><tbody>' +
    Object.keys(C.ALLOY).map((k) => {
      const a = C.ALLOY[k];
      return `<tr data-a="${k}"><td>${a.name}</td><td class="n">${f(a.e, 3)}</td>` +
        `<td class="n">${a.qT}</td><td class="n">${a.q}</td><td class="n">${a.eta}</td></tr>`;
    }).join('') + '</tbody>';

  /* реакция на выбор из справочников: подставить значение в числовое поле */
  el('idens').addEventListener('change', () => {
    el('i').value = C.IDENS[val('idens')].i; run();
  });
  el('alloy').addEventListener('change', () => {
    const a = C.ALLOY[val('alloy')];
    el('q').value = a.q; el('ea').value = a.e; run();
  });
  el('water').addEventListener('change', () => {
    el('rho').value = C.WATER[val('water')].rho; run();
  });

  function run() {
    const mode = val('mode');
    const shipMode = mode === 'ship';
    /* скрываем неактуальные поля */
    ['S'].forEach((id) => { el(id).closest('label').style.display = shipMode ? 'none' : ''; });
    ['Lpp', 'B', 'd', 'P'].forEach((id) => {
      el(id).closest('label').style.display = shipMode ? '' : 'none';
    });

    const Lpp = num('Lpp'), B = num('B'), d = num('d'), P = parseFloat(val('P'));
    const S = shipMode ? C.areaBottom(d, B, Lpp, P) : num('S');
    if (shipMode) {
      out('o_S', 'A = ', `(2·${f(d, 1)} + ${f(B, 1)})·${f(Lpp, 0)}·${f(P, 2)}`,
        f(S, 0) + ' м²');
    } else {
      out('o_S', 'S = ', 'задано напрямую', f(S, 0) + ' м²',
        'Переключите способ задания площади, чтобы посчитать её по главным размерениям.');
    }

    const i = num('i'), T = num('T');
    const I = C.protCurrent(i, S);
    out('o_I', 'I = ', `${f(i, 0)}·${f(S, 0)}/1000`, f(I, 1) + ' А');

    const q = num('q'), ku = num('ku'), m1 = num('m1');
    const Q = I * T * 8760;
    out('o_Q', 'Q = ', `${f(I, 1)}·${f(T, 1)}·8760`, f(Q, 0) + ' А·ч');
    const M = C.protMass(I, T, q, ku);
    out('o_M', 'M = ', `${f(I, 1)}·${f(T, 1)}·8760/(${f(q, 0)}·${f(ku, 2)})`,
      f(M, 0) + ' кг');
    const nm = Math.max(1, Math.ceil(M / m1));
    out('o_nm', 'n_m = ', `⌈${f(M, 0)}/${f(m1, 0)}⌉`,
      nm + ' ' + plural(nm, 'протектор', 'протектора', 'протекторов'));

    const ez = num('ez'), ea = num('ea'), rho = num('rho');
    const pa = num('pa'), pb = num('pb');
    const Aa = pa * pb;
    const dE = ez - ea;
    out('o_dE', 'ΔE = ', `${f(ez, 2)} − (${f(ea, 2)})`, f(dE, 3) + ' В');
    const Ra = C.anodeR(rho, Aa);
    out('o_Ra', 'R_а = ', `0,315·${f(rho, 2)}/√${f(Aa, 4)}`, f(Ra, 3) + ' Ом',
      `Площадь рабочей поверхности протектора A_а = ${f(pa, 2)}·${f(pb, 2)} = ${f(Aa, 4)} м².`);
    const I1 = dE > 0 ? C.anodeI(dE, Ra) : 0;
    out('o_I1', 'I₁ = ', `${f(dE, 3)}/${f(Ra, 3)}`, f(I1, 3) + ' А');
    const ni = I1 > 0 ? Math.max(1, Math.ceil(I / I1)) : Infinity;
    out('o_ni', 'n_i = ', I1 > 0 ? `⌈${f(I, 1)}/${f(I1, 3)}⌉` : '—',
      isFinite(ni) ? ni + ' ' + plural(ni, 'протектор', 'протектора', 'протекторов') : '—');

    const n = isFinite(ni) ? Math.max(nm, ni) : nm;
    out('o_n', 'n = ', `max(${nm}; ${isFinite(ni) ? ni : '—'})`,
      n + ' ' + plural(n, 'протектор', 'протектора', 'протекторов'),
      nm >= ni ? 'Определяющее условие — <b>масса</b>: срок службы задаёт число протекторов.'
        : 'Определяющее условие — <b>ток</b>: массы хватило бы, но протекторы не в состоянии отдать нужный ток.');
    const S1 = S / n;
    out('o_S1', 'S₁ = ', `${f(S, 0)}/${n}`, f(S1, 1) + ' м² на протектор');
    const Mu = n * m1;
    out('o_Mu', 'M_уст = ', `${n}·${f(m1, 0)}`, f(Mu, 0) + ' кг = ' + f(Mu / 1000, 2) + ' т');
    const kI = I > 0 ? n * I1 / I : 0;
    out('o_kI', 'k_I = ', `${n}·${f(I1, 3)}/${f(I, 1)}`, f(kI, 2),
      'Отношение суммарной токоотдачи к требуемому току; при k_I заметно больше единицы протекторы прослужат дольше расчётного срока.');

    summary('sum', [
      { k: 'Площадь S', v: f(S, 0) + ' м²' },
      { k: 'Ток защиты I', v: f(I, 1) + ' А' },
      { k: 'Масса сплава M', v: f(M, 0) + ' кг' },
      { k: 'Число протекторов n', v: String(n) },
      { k: 'Площадь на протектор', v: f(S1, 1) + ' м²' },
      { k: 'Ток одного I₁', v: f(I1, 3) + ' А' },
      { k: 'Запас по току', v: f(kI, 2) },
    ]);

    /* вердикт */
    const msgs = [];
    if (dE <= 0) {
      msgs.push('<div class="note warn"><b>Схема неработоспособна.</b> Рабочий потенциал сплава ' +
        'должен быть отрицательнее защитного потенциала стали, иначе протектор становится катодом ' +
        'и защиты нет вовсе.</div>');
    }
    if (ea < -0.9) {
      msgs.push('<div class="note warn"><b>Риск перезащиты.</b> Потенциал сплава ' + f(ea, 2) +
        ' В отрицательнее предела −0,85 В: на окрашенном корпусе возможны отслаивание покрытия ' +
        'и наводороживание. Такие протекторы ставят изолированно и подключают через ' +
        'регулировочные сопротивления.</div>');
    }
    if (rho > 2) {
      msgs.push('<div class="note"><b>Маловодопроводящая среда.</b> При ρ = ' + f(rho, 2) +
        ' Ом·м токоотдача одного протектора мала, и расчёт определяется током, а не массой. ' +
        'В пресной воде протекторная защита практически неэффективна.</div>');
    }
    if (kI > 3) {
      msgs.push('<div class="note tip">Запас по току ' + f(kI, 1) + '-кратный: число протекторов ' +
        'диктует срок службы. Можно перейти на протекторы большей единичной массы — их будет ' +
        'меньше, а монтаж дешевле.</div>');
    }
    el('verdict').innerHTML = msgs.join('') ||
      '<div class="note tip">Оба условия — по массе и по току — выполняются согласованно.</div>';

    /* подсветка строк справочных таблиц */
    el('tab_i').querySelectorAll('tr[data-k]').forEach((tr) => {
      tr.classList.toggle('on', tr.dataset.k === val('idens'));
    });
    el('tab_alloy').querySelectorAll('tr[data-a]').forEach((tr) => {
      tr.classList.toggle('on', tr.dataset.a === val('alloy'));
    });

    draw(S, n, Lpp, B, shipMode);
  }

  /* схема размещения протекторов в плане */
  function draw(S, n, Lpp, B, shipMode) {
    const W = 640, H = 300;
    const ratio = shipMode && B > 0 ? Lpp / B : 6;
    /* подбираем прямоугольник в масштабе, вписанный в поле */
    const maxW = 520, maxH = 170;
    let w = maxW, h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    const x0 = (W - w) / 2, y0 = 70;
    /* раскладка n точек сеткой с сохранением пропорций */
    const shown = Math.min(n, 400);
    let cols = Math.max(1, Math.round(Math.sqrt(shown * ratio)));
    let rows = Math.max(1, Math.ceil(shown / cols));
    cols = Math.max(1, Math.ceil(shown / rows));
    const dots = [];
    let left = shown;
    for (let r = 0; r < rows && left > 0; r++) {
      const inRow = Math.min(cols, left);
      left -= inRow;
      for (let c = 0; c < inRow; c++) {
        dots.push([
          x0 + w * (c + 0.5) / inRow,
          y0 + h * (r + 0.5) / rows,
        ]);
      }
    }
    const rDot = Math.max(1.8, Math.min(5, 260 / Math.sqrt(shown * 40)));
    const svg = el('board');
    svg.innerHTML = `
      <text x="20" y="24" class="cap b">размещение протекторов на защищаемой поверхности</text>
      <text x="20" y="42" class="cap gray">площадь ${f(S, 0)} м², протекторов ${n}, на каждый приходится ${f(S / n, 1)} м²</text>
      <rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="rgba(21,94,117,.08)"
        stroke="#155e75" stroke-width="1.4"/>
      ${dots.map(([x, y]) =>
        `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(rDot * 1.9).toFixed(1)}" ry="${rDot.toFixed(1)}" fill="#2f6f4f"/>`).join('')}
      ${n > shown ? `<text x="${W / 2}" y="${y0 + h + 20}" text-anchor="middle" class="cap gray">показаны первые ${shown} из ${n}</text>` : ''}
      <text x="${x0}" y="${y0 - 8}" class="cap gray">${shipMode ? 'днище в плане, L<tspan baseline-shift="sub" font-size="8">pp</tspan> × B' : 'защищаемая поверхность условно'}</text>
      <text x="20" y="272" class="cap gray">Шаг расстановки должен быть меньше зоны действия одного анода: на окрашенном</text>
      <text x="20" y="288" class="cap gray">корпусе это порядка 20 м, на голой стали — около 5 м (см. главу 4).</text>`;
  }

  bind('in', run);
})();
