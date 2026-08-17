/* ccalc.js — общая расчётная библиотека сайта «Коррозия и обрастание».
 * Чистые функции (без DOM) + помощники вывода «формула = подстановка = результат».
 * Подключается перед скриптом конкретной страницы. */
'use strict';
window.C = (function () {

  /* ---------- форматирование ---------- */
  function f(x, dec) {
    if (x === null || x === undefined || !isFinite(x)) return '—';
    if (dec === undefined) {
      const a = Math.abs(x);
      dec = a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 2 : a >= 1 ? 3 : 4;
    }
    return x.toFixed(dec).replace('.', ',').replace('-', '−');
  }
  function plural(n, one, few, many) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }
  const fr = (a, b, dec) => f(a, dec) + '…' + f(b, dec);
  const el = (id) => document.getElementById(id);
  const num = (id) => parseFloat(String(el(id).value).replace(',', '.')) || 0;
  const val = (id) => el(id).value;
  const setText = (id, s) => { const n = el(id); if (n) n.textContent = s; };
  const setHtml = (id, s) => { const n = el(id); if (n) n.innerHTML = s; };
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
  const _prev = {};
  function summary(id, cells) {
    const box = el(id);
    if (!box) return;
    box.innerHTML = cells.map((c, i) => {
      const key = id + i;
      const upd = _prev[key] !== undefined && _prev[key] !== c.v;
      _prev[key] = c.v;
      return `<div class="cell${upd ? ' upd' : ''}"><span class="k">${c.k}</span>` +
        `<span class="v">${c.v}</span></div>`;
    }).join('');
    requestAnimationFrame(() => box.querySelectorAll('.cell.upd')
      .forEach((n) => n.classList.remove('upd')));
  }

  /* ================= электрохимия ================= */

  /* Стационарные потенциалы в морской воде, В по водородной шкале
     (лекция 7, стендовые испытания в Чёрном море). */
  const E_STAT = {
    'Al-Zn-Mg': -0.600, 'АМг5/АМг6': -0.500, '45Г17Ю3': -0.450, '09Г2': -0.420,
    'Ст3': -0.400, '10ХСНД (АБ, АК)': -0.370, 'ЛМуЖ55-32-1': -0.100,
    'ОЦ10-2': -0.080, 'М3С': 0.010, 'АЖН9-4-4': 0.030,
    '08Х18Н10Т': 0.100, '04Х20Н6Г11АМФ': 0.150, 'ВТ1-0': 0.400,
  };

  /* Протекторные сплавы: ГОСТ 26251-84, лекция 9.
     e — рабочий потенциал анодно поляризованного протектора, В (водородная шкала);
     qT — теоретическая токоотдача, А·ч/кг; q — фактическая; eta — выход по току, %. */
  const ALLOY = {
    AP2:  { name: 'АП2 (Al–Zn–Mn)',  e: -0.600, qT: 2940, q: 2360, eta: 80, rho: 2700 },
    AP3:  { name: 'АП3 (Al–Zn–Zr)',  e: -0.700, qT: 2880, q: 2300, eta: 80, rho: 2700 },
    AP4N: { name: 'АП4Н (Al–Zn–In)', e: -0.850, qT: 2880, q: 2450, eta: 85, rho: 2700 },
    CP1:  { name: 'ЦП1 (Zn–Al)',     e: -0.730, qT: 820,  q: 780,  eta: 95, rho: 7100 },
    MP1:  { name: 'МП1 (Mg–Al–Zn)',  e: -1.210, qT: 2200, q: 1430, eta: 65, rho: 1800 },
  };

  /* Защитная плотность тока, мА/м² — практика проектирования (лекции 7, 9). */
  const IDENS = {
    bare:    { name: 'голая сталь в движущейся морской воде', i: 150 },
    ice:     { name: 'подводная часть ледокола (разрушение ЛКП до 50 %)', i: 250 },
    platform:{ name: 'плакированная сталь МЛСП «Приразломная», зона 1', i: 500 },
    coat_new:{ name: 'новое покрытие, повреждений практически нет', i: 15 },
    coat_mid:{ name: 'покрытие в середине междокового периода', i: 40 },
    coat_old:{ name: 'изношенное покрытие к концу междокового периода', i: 90 },
    tank:    { name: 'внутренняя поверхность балластного танка без покрытия', i: 110 },
  };

  /* Удельное сопротивление морской воды: ρ = 1/σ, Ом·м (лекция 7). */
  const WATER = {
    kronstadt: { name: 'Финский залив, Кронштадт (σ = 0,3 См/м)', rho: 3.33 },
    black:     { name: 'Чёрное море (σ = 2,0 См/м)', rho: 0.50 },
    ocean:     { name: 'океан, умеренные широты (σ = 4,0 См/м)', rho: 0.25 },
    tropic:    { name: 'тропики (σ = 5,0 См/м)', rho: 0.20 },
  };

  /* Ток защиты, А: i [мА/м²] · S [м²] / 1000. */
  const protCurrent = (i_mAm2, S) => i_mAm2 * S / 1000;
  /* Требуемая масса протекторного сплава, кг: M = I·T·8760/(q·k_и). */
  const protMass = (I, T_years, q, ku) => I * T_years * 8760 / (q * ku);
  /* Сопротивление растеканию протектора (формула Мак-Коя для плоского
     прилегающего анода): R = 0,315·ρ/√A, Ом; A — площадь его открытой
     поверхности, м². */
  const anodeR = (rho, A) => 0.315 * rho / Math.sqrt(A);
  /* Токоотдача одного протектора, А: I₁ = ΔE/R. */
  const anodeI = (dE, R) => dE / R;
  /* Площадь днища с ППВЛ, м² (Jotun, «Формулы для расчёта площадей»):
     A = (2d + B)·Lpp·P. */
  const areaBottom = (d, B, Lpp, P) => (2 * d + B) * Lpp * P;
  /* Смоченная поверхность по формуле Мумфорда: S = 1,025·L·(Cb·B + 1,7·d). */
  const areaMumford = (L, B, d, Cb) => 1.025 * L * (Cb * B + 1.7 * d);

  /* ================= лакокрасочные покрытия ================= */
  /* Формулы «Книги инспектора окрасочных работ» Jotun, раздел 19.
     sv — объёмное содержание сухого остатка, %; DFT/WFT — мкм; lf — коэффициент
     потерь (0,7 при 30 % потерь), S — м². */
  const wft = (dft, sv) => dft * 100 / sv;                    // толщина мокрой плёнки
  const dftFromWft = (w, sv) => w * sv / 100;
  const tsr = (dft, sv) => 10 * sv / dft;                     // теор. укрывистость, м²/л
  const theorRate = (dft, sv) => 1 / tsr(dft, sv);            // теор. расход, л/м²
  const qTheor = (dft, S, sv) => dft * S / (10 * sv);         // теор. количество, л
  const qLoss = (dft, S, sv, lf) => dft * S / (10 * sv * lf); // то же с потерями
  const qDead = (S, dv, sv, lf) => S * dv * 100 / (sv * lf);  // «мёртвый объём», л
  /* Практический удельный расход с «мёртвым объёмом», л/м²:
     q = (dv + DFT)/(10·sv) · 100/(100 − Z), dv и DFT в мкм. */
  const rateFull = (dv_um, dft, sv, Z) =>
    (dv_um + dft) / (10 * sv) * (100 / (100 - Z));

  /* Зависимость «мёртвого объёма» от шероховатости (Jotun, раздел 20).
     Ry, мкм → л/м². */
  const DEADVOL = [[30, 0.02], [45, 0.03], [60, 0.04], [75, 0.05], [90, 0.06], [105, 0.07]];
  function deadVol(Ry) {                       // линейная интерполяция, л/м²
    const t = DEADVOL;
    if (Ry <= t[0][0]) return t[0][1];
    if (Ry >= t[t.length - 1][0]) return t[t.length - 1][1];
    for (let i = 1; i < t.length; i++) {
      if (Ry <= t[i][0]) {
        const [x0, y0] = t[i - 1], [x1, y1] = t[i];
        return y0 + (y1 - y0) * (Ry - x0) / (x1 - x0);
      }
    }
    return t[t.length - 1][1];
  }
  /* Минимальное число замеров толщины по площади (Jotun, раздел 5). */
  const NMEAS = [[10, 5], [20, 10], [100, 15], [200, 20], [400, 30], [600, 40],
    [800, 50], [1000, 60], [2000, 70], [5000, 90], [10000, 100], [25000, 125]];
  function nMeasure(S) {
    for (const [a, n] of NMEAS) if (S <= a) return n;
    return 125;
  }

  /* ================= обрастание и сопротивление ================= */
  /* Коэффициент трения эквивалентной пластины, ITTC-57. */
  const cf57 = (Re) => 0.075 / Math.pow(Math.log10(Re) - 2, 2);
  /* Надбавка на шероховатость по Боудену — Дэвисону в редакции ITTC-78:
     ΔC_F = 0,044[(k_s/L)^{1/3} − 10·Re^{−1/3}] + 0,000125. */
  const dcfBowden = (ks_um, L, Re) =>
    0.044 * (Math.pow(ks_um * 1e-6 / L, 1 / 3) - 10 * Math.pow(Re, -1 / 3)) + 0.000125;
  /* Кинематическая вязкость морской воды (солёность 3,5 %), м²/с, t в °C —
     квадратичная аппроксимация табличных значений ITTC по узлам 0, 15 и 30 °C
     (1,8284 / 1,1892 / 0,8513 ·10⁻⁶ м²/с). */
  const nuSea = (t) => (1.8284 - 0.052657 * t + 0.00066956 * t * t) * 1e-6;
  const RHO_SEA = 1025;                         // плотность морской воды, кг/м³
  const KNOT = 0.5144444;                       // узел → м/с
  /* Темп прироста шероховатости (AHR) за год, мкм/год — по типу покрытия. */
  const AF = {
    spc:  { name: 'самополирующееся (SPC), гидролиз', dks: 20, name2: 'сглаживание, линейный износ' },
    hydr: { name: 'самополирующееся, гидратация', dks: 40, name2: 'полирование без сглаживания' },
    frc:  { name: 'сбрасывающее обрастание (FRC, силикон)', dks: 10, name2: 'слабая адгезия организмов' },
    ins:  { name: 'нерастворимая матрица («долгоживущее»)', dks: 60, name2: 'выщелоченный слой растёт' },
    none: { name: 'без противообрастающего покрытия', dks: 250, name2: 'макрообрастание с 2–3 месяца' },
  };

  return {
    f, fr, plural, el, num, val, setText, setHtml, out, bind, esc, summary,
    E_STAT, ALLOY, IDENS, WATER,
    protCurrent, protMass, anodeR, anodeI, areaBottom, areaMumford,
    wft, dftFromWft, tsr, theorRate, qTheor, qLoss, qDead, rateFull,
    DEADVOL, deadVol, NMEAS, nMeasure,
    cf57, dcfBowden, nuSea, RHO_SEA, KNOT, AF,
  };
})();
