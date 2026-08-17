/* Живой расчёт расхода лакокрасочных материалов. */
'use strict';
(function () {
  const f = C.f, el = C.el, num = C.num, val = C.val;

  el('tab_dv').innerHTML = '<thead><tr><th class="n">Ry, мкм</th>' +
    C.DEADVOL.map((r) => `<th class="n">${r[0]}</th>`).join('') + '</tr></thead><tbody><tr>' +
    '<td class="n">«Мёртвый объём», л/м²</td>' +
    C.DEADVOL.map((r) => `<td class="n" data-ry="${r[0]}">${f(r[1], 2)}</td>`).join('') +
    '</tr></tbody>';

  const FIELDS = {
    direct: ['S'],
    bottom: ['Lpp', 'B', 'd', 'P'],
    belt: ['Lpp', 'B', 'hb'],
    side: ['Loa', 'B', 'H'],
    deck: ['Loa', 'B', 'N'],
  };
  const ALL = ['S', 'Lpp', 'Loa', 'B', 'd', 'H', 'hb', 'P', 'N'];

  function area(mode) {
    const Lpp = num('Lpp'), Loa = num('Loa'), B = num('B'), d = num('d');
    const H = num('H'), hb = num('hb');
    const P = parseFloat(val('P')), N = parseFloat(val('N'));
    switch (mode) {
      case 'bottom': return { S: (2 * d + B) * Lpp * P,
        s: `(2·${f(d, 1)} + ${f(B, 1)})·${f(Lpp, 0)}·${f(P, 2)}`, lead: 'A_днище = ' };
      case 'belt': return { S: 2 * hb * (Lpp + 0.5 * B),
        s: `2·${f(hb, 1)}·(${f(Lpp, 0)} + 0,5·${f(B, 1)})`, lead: 'A_ППВЛ = ' };
      case 'side': return { S: 2 * H * (Loa + 0.5 * B),
        s: `2·${f(H, 1)}·(${f(Loa, 0)} + 0,5·${f(B, 1)})`, lead: 'A_борт = ' };
      case 'deck': return { S: Loa * B * N,
        s: `${f(Loa, 0)}·${f(B, 1)}·${f(N, 2)}`, lead: 'A_палуба = ' };
      default: return { S: num('S'), s: 'задано напрямую', lead: 'S = ' };
    }
  }

  function run() {
    const mode = val('mode');
    const show = FIELDS[mode] || FIELDS.direct;
    ALL.forEach((id) => {
      el(id).closest('label').style.display = show.indexOf(id) >= 0 ? '' : 'none';
    });

    const a = area(mode);
    const S = a.S;
    C.out('o_S', a.lead, a.s, f(S, 0) + ' м²');

    const dft = num('dft'), sv = num('sv'), Z = num('Z'), Ry = num('Ry');
    const wft = C.wft(dft, sv);
    C.out('o_wft', 'WFT = ', `${f(dft, 0)}·100/${f(sv, 0)}`, f(wft, 0) + ' мкм');
    C.out('o_back', 'DFT = ', `${f(wft, 0)}·${f(sv, 0)}/100`, f(dft, 0) + ' мкм',
      'Проверка обратимости: гребёнка показывает мокрую плёнку, толщиномер — сухую.');

    const tsr = C.tsr(dft, sv);
    C.out('o_tsr', 'TSR = ', `10·${f(sv, 0)}/${f(dft, 0)}`, f(tsr, 2) + ' м²/л');
    C.out('o_qt', 'q_теор = ', `1/${f(tsr, 2)}`, f(1 / tsr, 4) + ' л/м²');

    const usedv = val('usedv');
    const dvRaw = C.deadVol(Ry);                 // л/м²
    const dvUm = usedv === 'no' ? 0 : dvRaw * 1000; // л/м² → мкм эквивалента
    C.out('o_dv', 'dv = ', usedv === 'no' ? 'не учитывается (окраска по покрытию)'
      : `dv(Ry = ${f(Ry, 0)} мкм)`,
      usedv === 'no' ? '0' : `${f(dvRaw, 3)} л/м² = ${f(dvUm, 0)} мкм`,
      usedv === 'no' ? '' :
        'Промежуточные значения шероховатости получены линейной интерполяцией таблицы.');

    const lf = (100 - Z) / 100;
    const q1 = C.rateFull(dvUm, dft, sv, Z);
    const q2 = C.rateFull(usedv === 'all' ? dvUm : 0, dft, sv, Z);
    C.out('o_q1', 'q₁ = ', `(${f(dvUm, 0)} + ${f(dft, 0)})/(10·${f(sv, 0)})·100/(100 − ${f(Z, 0)})`,
      f(q1, 3) + ' л/м²',
      `Коэффициент потерь lf = ${f(lf, 2)}: при ${f(Z, 0)} % потерь на поверхность попадает лишь ${f(lf * 100, 0)} % израсходованной краски.`);
    C.out('o_q2', 'q₂…ₙ = ',
      usedv === 'all' ? `(${f(dvUm, 0)} + ${f(dft, 0)})/(10·${f(sv, 0)})·100/(100 − ${f(Z, 0)})`
        : `${f(dft, 0)}/(10·${f(sv, 0)})·100/(100 − ${f(Z, 0)})`,
      f(q2, 3) + ' л/м²');

    const dfts = num('dfts');
    const n = Math.max(1, Math.ceil(dfts / dft - 1e-9));
    C.out('o_n', 'n = ', `⌈${f(dfts, 0)}/${f(dft, 0)}⌉`,
      n + ' ' + C.plural(n, 'слой', 'слоя', 'слоёв'));
    const Q = S * (q1 + (n - 1) * q2);
    C.out('o_Q', 'Q = ', `${f(S, 0)}·[${f(q1, 3)} + ${n - 1}·${f(q2, 3)}]`,
      f(Q, 0) + ' л');
    const solp = num('sol');
    const Qs = Q * solp / 100;
    C.out('o_sol', 'Q_р = ', `${f(Q, 0)}·${f(solp, 0)}/100`, f(Qs, 0) + ' л');
    C.out('o_dfts', 'ΣDFT_факт = ', `${n}·${f(dft, 0)}`, f(n * dft, 0) + ' мкм',
      n * dft > dfts ? 'Фактическая толщина превышает требуемую: целое число слоёв редко ложится ровно.' : '');

    const nm = C.nMeasure(S);
    C.out('o_meas', 'N_замеров = ', `по площади ${f(S, 0)} м²`,
      nm + ' ' + C.plural(nm, 'замер', 'замера', 'замеров'),
      'Таблица минимального числа замеров приведена в главе 5 и главе 7.');

    C.summary('sum', [
      { k: 'Площадь S', v: f(S, 0) + ' м²' },
      { k: 'Мокрая плёнка WFT', v: f(wft, 0) + ' мкм' },
      { k: 'Укрывистость TSR', v: f(tsr, 2) + ' м²/л' },
      { k: 'Удельный расход q₁', v: f(q1, 3) + ' л/м²' },
      { k: 'Слоёв', v: String(n) },
      { k: 'Краски всего', v: f(Q, 0) + ' л' },
      { k: 'Растворителя', v: f(Qs, 0) + ' л' },
      { k: 'Замеров толщины', v: String(nm) },
    ]);

    const msgs = [];
    const shareDead = q1 > 0 ? (q1 - C.rateFull(0, dft, sv, Z)) / q1 : 0;
    if (shareDead > 0.4) {
      msgs.push('<div class="note warn"><b>«Мёртвый объём» съедает ' +
        f(shareDead * 100, 0) + ' % расхода первого слоя.</b> Так бывает у тонких цеховых ' +
        'грунтов на грубом профиле: краски уходит больше, чем ложится в плёнку. Либо снижают ' +
        'шероховатость подбором абразива, либо сразу закладывают повышенный расход.</div>');
    }
    if (wft > 400) {
      msgs.push('<div class="note warn">Мокрая плёнка ' + f(wft, 0) + ' мкм — очень толстая. ' +
        'Риск потёков, сморщивания и запирания растворителя в плёнке: слой лучше разбить надвое.</div>');
    }
    if (sv < 40 && dft > 120) {
      msgs.push('<div class="note">Низкий сухой остаток при большой толщине слоя: чтобы ' +
        'получить ' + f(dft, 0) + ' мкм сухой плёнки, надо нанести ' + f(wft, 0) +
        ' мкм мокрой. Толстослойные системы делают на материалах с s.v. 70–85 %.</div>');
    }
    if (Z >= 30) {
      msgs.push('<div class="note">Потери ' + f(Z, 0) + ' % соответствуют окраске сложных ' +
        'конструкций и работе на открытом воздухе с ветром; в цеховых условиях на плоских ' +
        'поверхностях закладывают 10–20 %.</div>');
    }
    el('verdict').innerHTML = msgs.join('') ||
      '<div class="note tip">Параметры системы согласованы: толщина слоя, сухой остаток и ' +
      'потери дают реалистичный расход.</div>';

    el('tab_dv').querySelectorAll('td[data-ry]').forEach((td) => {
      const v = parseFloat(td.dataset.ry);
      td.classList.toggle('on', Math.abs(v - Ry) <= 7.5 && usedv !== 'no');
      td.style.background = (Math.abs(v - Ry) <= 7.5 && usedv !== 'no') ? '#fdf3d7' : '';
    });

    draw(n, dft, dvUm, sv, Z, q1);
  }

  function draw(n, dft, dvUm, sv, Z, q1) {
    /* левая часть — разрез системы в масштабе, правая — структура расхода */
    const totalUm = n * dft + dvUm;
    const maxH = 170, top = 62;
    const k = Math.min(1.2, maxH / Math.max(totalUm, 1));
    const x0 = 40, w = 240;
    let y = top + maxH;                         // низ (сталь)
    const layers = [];
    if (dvUm > 0) {
      const h = dvUm * k;
      y -= h;
      layers.push({ y, h, fill: '#e8d9c2', stroke: '#b45309', t: 'мёртвый объём ' + C.f(dvUm, 0) + ' мкм' });
    }
    for (let i = 0; i < n; i++) {
      const h = dft * k;
      y -= h;
      layers.push({ y, h, fill: i % 2 ? '#dcebe1' : '#cfe0d6', stroke: '#2f6f4f',
        t: `слой ${i + 1} — ${C.f(dft, 0)} мкм` });
    }
    const rects = layers.map((L) =>
      `<rect x="${x0}" y="${L.y.toFixed(1)}" width="${w}" height="${Math.max(L.h, 1).toFixed(1)}"
        fill="${L.fill}" stroke="${L.stroke}" stroke-width="1.1"/>` +
      (L.h > 11 ? `<text x="${x0 + 8}" y="${(L.y + L.h / 2 + 4).toFixed(1)}" class="cap">${L.t}</text>` : ''))
      .join('');

    /* структура расхода: плёнка / мёртвый объём / потери */
    const qFilm = dft / (10 * sv);
    const qDead = dvUm / (10 * sv);
    const qLoss = q1 - qFilm - qDead;
    const parts = [
      { v: qFilm, c: '#2f6f4f', t: 'плёнка' },
      { v: qDead, c: '#b45309', t: 'мёртвый объём' },
      { v: qLoss, c: '#b3382e', t: 'потери' },
    ];
    const bx = 340, bw = 70, bTop = 70, bH = 190;
    const sum = Math.max(q1, 1e-9);
    let by = bTop + bH;
    const bars = parts.map((p) => {
      const h = bH * p.v / sum;
      by -= h;
      return `<rect x="${bx}" y="${by.toFixed(1)}" width="${bw}" height="${Math.max(h, 0).toFixed(1)}"
        fill="${p.c}" opacity=".8"/>` +
        (h > 13 ? `<text x="${bx + bw + 10}" y="${(by + h / 2 + 4).toFixed(1)}" class="cap">${p.t}: ${C.f(p.v, 3)} л/м², ${C.f(p.v / sum * 100, 0)} %</text>` : '');
    }).join('');

    el('board').innerHTML = `
      <text x="20" y="24" class="cap b">схема системы в масштабе толщин</text>
      <text x="20" y="42" class="cap gray">всего ${n} ${C.plural(n, 'слой', 'слоя', 'слоёв')} по ${C.f(dft, 0)} мкм = ${C.f(n * dft, 0)} мкм</text>
      <rect x="${x0}" y="${(top + maxH).toFixed(1)}" width="${w}" height="26" fill="#c9ccc6" stroke="#16161a" stroke-width="1.2"/>
      <text x="${x0 + 8}" y="${(top + maxH + 18).toFixed(1)}" class="cap">сталь</text>
      ${rects}
      <text x="326" y="24" class="cap b">структура удельного расхода первого слоя</text>
      <text x="326" y="42" class="cap gray">итого ${C.f(q1, 3)} л/м² при s.v. ${C.f(sv, 0)} % и потерях ${C.f(Z, 0)} %</text>
      ${bars}
      <text x="20" y="276" class="cap gray">Толщина слоёв показана в масштабе; «мёртвый объём» изображён</text>
      <text x="20" y="292" class="cap gray">как эквивалентный по объёму слой под покрытием.</text>`;
  }

  C.bind('in', run);
})();
