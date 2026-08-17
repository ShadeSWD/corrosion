/* Живой расчёт влияния обрастания на сопротивление и расход топлива. */
'use strict';
(function () {
  el('af').innerHTML = Object.keys(C.AF)
    .map((k) => `<option value="${k}"${k === 'spc' ? ' selected' : ''}>` +
      `${C.AF[k].name}</option>`).join('');
  el('tab_af').innerHTML = '<thead><tr><th>Противообрастающая система</th>' +
    '<th class="n">Прирост k<sub>s</sub>, мкм/год</th><th>Механизм</th></tr></thead><tbody>' +
    Object.keys(C.AF).map((k) => {
      const a = C.AF[k];
      return `<tr data-af="${k}"><td>${a.name}</td><td class="n">${a.dks}</td>` +
        `<td>${a.name2}</td></tr>`;
    }).join('') + '</tbody>';
  el('af').addEventListener('change', () => { el('dks').value = C.AF[val('af')].dks; run(); });

  /* модель: возвращает коэффициенты и мощность при заданной шероховатости */
  function state(ks, ctx) {
    const dcf = C.dcfBowden(ks, ctx.L, ctx.Re);
    const Ct = ctx.CF + dcf + ctx.CR;
    const R = 0.5 * C.RHO_SEA * ctx.S * ctx.v * ctx.v * Ct;
    const PE = R * ctx.v / 1000;                 // кВт
    const PB = PE / ctx.etaD;
    return { dcf: dcf, C: Ct, R: R, PE: PE, PB: PB };
  }

  function run() {
    const L = num('L'), B = num('B'), d = num('d'), Cb = num('Cb');
    const Vkn = num('V'), tw = num('tw'), CR = num('CR');
    const v = Vkn * C.KNOT;
    const S = C.areaMumford(L, B, d, Cb);
    out('o_S', 'S = ', `1,025·${f(L, 0)}·(${f(Cb, 2)}·${f(B, 1)} + 1,7·${f(d, 1)})`,
      f(S, 0) + ' м²');

    const nu = C.nuSea(tw);
    const Re = v * L / nu;
    out('o_Re', 'Re = ', `${f(v, 3)}·${f(L, 0)}/${f(nu * 1e6, 4)}·10⁻⁶`,
      f(Re / 1e9, 3) + '·10⁹',
      `Скорость ${f(Vkn, 1)} уз = ${f(v, 3)} м/с; вязкость морской воды при ${f(tw, 0)} °C равна ${f(nu * 1e6, 4)}·10⁻⁶ м²/с.`);

    const CF = C.cf57(Re);
    out('o_CF', 'C_F = ', `0,075/(lg(${f(Re / 1e9, 3)}·10⁹) − 2)²`,
      f(CF * 1000, 4) + '·10⁻³');

    const ctx = { L: L, Re: Re, CF: CF, CR: CR, S: S, v: v, etaD: num('etaD') };
    const ks0 = num('ks0'), dks = num('dks'), Tm = num('T');
    const Ty = Tm / 12;
    const ksT = ks0 + dks * Ty;

    const s0 = state(ks0, ctx);
    out('o_dcf0', 'ΔC_F(0) = ',
      `0,044·[(${f(ks0, 0)}·10⁻⁶/${f(L, 0)})^⅓ − 10·Re^(−⅓)] + 0,000125`,
      f(s0.dcf * 1000, 4) + '·10⁻³',
      `Это состояние сразу после докования: свежая краска не идеально гладкая, её собственная шероховатость ${f(ks0, 0)} мкм.`);
    out('o_ksT', 'k_s(T) = ', `${f(ks0, 0)} + ${f(dks, 0)}·${f(Ty, 2)}`,
      f(ksT, 0) + ' мкм');
    const sT = state(ksT, ctx);
    out('o_dcfT', 'ΔC_F(T) = ',
      `0,044·[(${f(ksT, 0)}·10⁻⁶/${f(L, 0)})^⅓ − 10·Re^(−⅓)] + 0,000125`,
      f(sT.dcf * 1000, 4) + '·10⁻³');

    out('o_C', 'C(0) = ',
      `${f(CF * 1000, 4)}·10⁻³ + ${f(s0.dcf * 1000, 4)}·10⁻³ + ${f(CR * 1000, 4)}·10⁻³`,
      f(s0.C * 1000, 4) + '·10⁻³',
      `В конце периода C(T) = ${f(sT.C * 1000, 4)}·10⁻³.`);
    out('o_P', 'R(0) = ',
      `0,5·1025·${f(S, 0)}·${f(v, 3)}²·${f(s0.C * 1000, 4)}·10⁻³`,
      f(s0.R / 1000, 1) + ' кН; P_E = ' + f(s0.PE, 0) + ' кВт; P_B = ' + f(s0.PB, 0) + ' кВт');
    out('o_PT', 'R(T) = ',
      `0,5·1025·${f(S, 0)}·${f(v, 3)}²·${f(sT.C * 1000, 4)}·10⁻³`,
      f(sT.R / 1000, 1) + ' кН; P_E = ' + f(sT.PE, 0) + ' кВт; P_B = ' + f(sT.PB, 0) + ' кВт');
    const delta = (sT.PB - s0.PB) / s0.PB * 100;
    out('o_delta', 'δ = ', `(${f(sT.PB, 0)} − ${f(s0.PB, 0)})/${f(s0.PB, 0)}·100`,
      f(delta, 2) + ' %');

    /* интегрирование по периоду */
    const N = 200;
    let acc = 0;
    const track = [];
    for (let i = 0; i <= N; i++) {
      const tau = Ty * i / N;
      const ks = ks0 + dks * tau;
      const st = state(ks, ctx);
      const w = (i === 0 || i === N) ? 0.5 : 1;   // трапеции
      acc += w * st.PB;
      track.push({ tau: tau, ks: ks, PB: st.PB });
    }
    const PBavg = acc / N;

    const th = Tm * 730 * num('run') / 100;
    out('o_th', 't_ход = ', `${f(Tm, 0)}·730·${f(num('run'), 0)}/100`, f(th, 0) + ' ч');
    const sfoc = num('sfoc');
    const G0 = sfoc * s0.PB * th / 1e6;           // т
    out('o_G0', 'G₀ = ', `${f(sfoc, 0)}·${f(s0.PB, 0)}·${f(th, 0)}/10⁶`, f(G0, 0) + ' т');
    const G = sfoc * PBavg * th / 1e6;
    out('o_G', 'G = ', `${f(sfoc, 0)}·${f(PBavg, 0)}·${f(th, 0)}/10⁶`, f(G, 0) + ' т',
      `Средняя за период потребная мощность P̄_B = ${f(PBavg, 0)} кВт против ${f(s0.PB, 0)} кВт сразу после докования.`);
    const dG = G - G0;
    const price = num('price');
    out('o_dG', 'ΔG = ', `${f(G, 0)} − ${f(G0, 0)}`,
      f(dG, 1) + ' т; ' + f(dG * price / 1000, 1) + ' тыс. $',
      `Перерасход ${f(dG / Math.max(G0, 1e-9) * 100, 2)} % за междоковый период. Для сравнения: доковый ремонт с полной переокраской подводной части площадью ${f(S, 0)} м² при 30–50 $/м² стоит ${f(S * 30 / 1000, 0)}–${f(S * 50 / 1000, 0)} тыс. $.`);

    const vRatio = Math.pow(s0.C / sT.C, 1 / 3);
    out('o_V', 'V(T)/V(0) = ',
      `(${f(s0.C * 1000, 4)}/${f(sT.C * 1000, 4)})^⅓`,
      f(vRatio, 4) + ' → ' + f(Vkn * vRatio, 2) + ' уз вместо ' + f(Vkn, 1) + ' уз',
      `Потеря хода ${f((1 - vRatio) * Vkn, 2)} уз, или ${f((1 - vRatio) * 100, 2)} %.`);

    summary('sum', [
      { k: 'Смоченная поверхность', v: f(S, 0) + ' м²' },
      { k: 'Re', v: f(Re / 1e9, 2) + '·10⁹' },
      { k: 'C_F', v: f(CF * 1000, 3) + '·10⁻³' },
      { k: 'k_s в конце периода', v: f(ksT, 0) + ' мкм' },
      { k: 'Мощность в начале', v: f(s0.PB, 0) + ' кВт' },
      { k: 'Мощность в конце', v: f(sT.PB, 0) + ' кВт' },
      { k: 'Прирост мощности', v: f(delta, 1) + ' %' },
      { k: 'Перерасход топлива', v: f(dG, 1) + ' т' },
      { k: 'Стоимость перерасхода', v: f(dG * price / 1000, 1) + ' тыс. $' },
      { k: 'Потеря хода', v: f((1 - vRatio) * Vkn, 2) + ' уз' },
    ]);

    const msgs = [];
    if (delta > 12) {
      msgs.push('<div class="note warn">Прирост потребной мощности к концу периода ' +
        f(delta, 1) + ' % — междоковый период великоват для выбранного покрытия. ' +
        'Либо сокращают интервал, либо переходят на самополирующуюся систему с меньшим ' +
        'темпом прироста шероховатости.</div>');
    }
    if (val('af') === 'none') {
      msgs.push('<div class="note warn">Вариант без противообрастающего покрытия дан для ' +
        'сравнения. Помимо роста сопротивления, обрастание прорастает сквозь ' +
        'противокоррозионную плёнку и разрушает её — теряется и защита от коррозии.</div>');
    }
    if (val('af') === 'frc') {
      msgs.push('<div class="note tip">Покрытия, сбрасывающие обрастание, работают только на ' +
        'ходу: гидродинамические силы срывают слабо прилипшие организмы. При доле ходового ' +
        'времени ' + f(num('run'), 0) + ' % и длительных стоянках эффект будет хуже расчётного.</div>');
    }
    if (dG * price / 1000 > S * 30 / 1000) {
      msgs.push('<div class="note">Перерасход топлива за период превысил стоимость полной ' +
        'переокраски подводной части. Это и есть экономическое обоснование более дорогого ' +
        'покрытия или более частого докования.</div>');
    }
    el('verdict').innerHTML = msgs.join('') ||
      '<div class="note tip">Выбранное сочетание покрытия и междокового периода выглядит ' +
      'сбалансированным.</div>';

    el('tab_af').querySelectorAll('tr[data-af]').forEach((tr) => {
      tr.classList.toggle('on', tr.dataset.af === val('af'));
    });

    draw(track, s0.PB, Ty, ks0, ksT, delta);
  }

  function draw(track, PB0, Ty, ks0, ksT, delta) {
    const x0 = 66, x1 = 606;
    const sx = (tau) => x0 + (x1 - x0) * (Ty > 0 ? tau / Ty : 0);
    /* верхний график: k_s */
    const ksTop = 52, ksBot = 128;
    const ksMax = Math.max(ksT * 1.1, ks0 * 1.3, 10);
    const sy1 = (k) => ksBot - (ksBot - ksTop) * k / ksMax;
    /* нижний график: прирост мощности, % */
    const pTop = 190, pBot = 268;
    const dMax = Math.max(delta * 1.25, 2);
    const sy2 = (p) => pBot - (pBot - pTop) * p / dMax;

    const line1 = track.map((p, i) => `${i ? 'L' : 'M'} ${sx(p.tau).toFixed(1)} ${sy1(p.ks).toFixed(1)}`).join(' ');
    const pts2 = track.map((p) => [sx(p.tau), sy2((p.PB - PB0) / PB0 * 100)]);
    const line2 = pts2.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    const area2 = line2 + ` L ${x1} ${pBot} L ${x0} ${pBot} Z`;

    const months = Ty * 12;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((r) => ({
      x: x0 + (x1 - x0) * r, t: f(months * r, 0),
    }));

    el('board').innerHTML = `
      <text x="20" y="24" class="cap b">эквивалентная шероховатость корпуса, мкм</text>
      <line x1="${x0}" y1="${ksTop - 8}" x2="${x0}" y2="${ksBot}" class="ln-thin"/>
      <line x1="${x0}" y1="${ksBot}" x2="${x1}" y2="${ksBot}" class="ln-thin"/>
      <path d="${line1}" fill="none" stroke="#b3382e" stroke-width="2.4"/>
      <text x="${x0 - 8}" y="${sy1(ks0) + 4}" text-anchor="end" class="cap gray">${f(ks0, 0)}</text>
      <text x="${x1 - 2}" y="${(sy1(ksT) - 8).toFixed(1)}" text-anchor="end" class="cap red">${f(ksT, 0)} мкм</text>
      <text x="${x0 + 12}" y="${ksTop - 2}" class="cap gray">рост шероховатости между докованиями</text>

      <text x="20" y="164" class="cap b">прирост потребной мощности, %</text>
      <line x1="${x0}" y1="${pTop - 8}" x2="${x0}" y2="${pBot}" class="ln-thin"/>
      <line x1="${x0}" y1="${pBot}" x2="${x1}" y2="${pBot}" class="ln-thin"/>
      <path d="${area2}" fill="rgba(47,111,79,.22)" stroke="none"/>
      <path d="${line2}" fill="none" stroke="#2f6f4f" stroke-width="2.4"/>
      <text x="${x1 - 2}" y="${(sy2(delta) - 8).toFixed(1)}" text-anchor="end" class="cap green">${f(delta, 1)} %</text>
      <text x="${x0 - 8}" y="${pBot + 4}" text-anchor="end" class="cap gray">0</text>
      <text x="${(x0 + x1) / 2}" y="${pBot - 10}" text-anchor="middle" class="cap green">площадь = перерасход топлива</text>
      ${ticks.map((t) => `<line x1="${t.x.toFixed(1)}" y1="${pBot}" x2="${t.x.toFixed(1)}" y2="${pBot + 5}" class="ln-thin"/>` +
        `<text x="${t.x.toFixed(1)}" y="${pBot + 20}" text-anchor="middle" class="cap gray">${t.t}</text>`).join('')}
      <text x="${(x0 + x1) / 2}" y="${pBot + 38}" text-anchor="middle" class="cap gray">время после докования, месяцы</text>
      <text x="20" y="330" class="cap gray">Средний прирост примерно вдвое меньше конечного — топливо считают интегралом.</text>`;
  }

  bind('in', run);
})();
