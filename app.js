/* Monk x Direct Connect Logistix - business case model + match-rate trajectory
   Mirrors the DCL Proof of Value workbook. Unlike a DSO-days model, DCL's case is
   driven by the past-due book: revenue leakage caught in the correction window, the
   carrying benefit on what comes out of past-due AR, and the AR hire deferred. */

(function () {
  'use strict';

  var ANNUAL_FEE = 92000;   // post-pilot annual; not shown on the page
  var HORIZON    = 3;

  var C = {
    primary:   '#E97221',
    highlight: '#FEEFB1',
    onDark:    '#FCFAF7',
    faint:     'rgba(252,250,247,.42)',
    grid:      'rgba(252,250,247,.10)',
    axis:      'rgba(252,250,247,.45)'
  };

  var $ = function (id) { return document.getElementById(id); };

  function usd(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

  function compact(n) {
    var abs = Math.abs(n);
    if (abs >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd(n);
  }

  /* ---------- model ----------
     Three conservative levers only: a modest DSO improvement, the hours the AR
     function gets back, and the hire that defers. Revenue leakage from fuel drift
     is deliberately NOT counted here - it is real and Keegan sized it himself, but
     the case does not need it, so it stays upside rather than an assumption a CFO
     has to accept. Hours are the mechanism behind the deferred hire, so they are
     reported as a count and monetised once, through headcount, never twice. */
  function model() {
    var rev     = +$('rev').value    || 0;
    var days    = +$('days').value   || 0;
    var coc     = (+$('coc').value   || 0) / 100;
    var hrsCash = +$('hrscash').value || 0;
    var hrsOther= +$('hrsother').value || 0;
    var hires   = +$('hires').value  || 0;
    var hire    = +$('hire').value   || 0;

    var HIRE_YEARS = 2;      // deferred in years one and two
    var FTE_HOURS  = 2080;   // one full-time equivalent year

    var perDay    = rev / 365;
    var release   = perDay * days;        // working capital, comes out once
    var carry     = release * coc;        // what that release is worth each year
    var hoursYear = (hrsCash + hrsOther) * 52;
    var headcount = hires * hire;

    var years = [];
    for (var y = 1; y <= HIRE_YEARS + 1; y++) {
      var h = y <= HIRE_YEARS ? headcount : 0;
      years.push({ carry: carry, head: h, recurring: carry + h });
    }
    var recurringTotal = years.reduce(function (s, y) { return s + y.recurring; }, 0);
    var y1 = years[0];

    return {
      perDay:    perDay,
      days:      days,
      dsoNow:    42,
      release:   release,
      carry:     carry,
      hoursYear: hoursYear,
      fte:       hoursYear / FTE_HOURS,
      headcount: headcount,
      y1:        y1,
      threeYear: recurringTotal + release,
      roi:       ANNUAL_FEE > 0 ? y1.recurring / ANNUAL_FEE : 0,
      payback:   y1.recurring > 0 ? ANNUAL_FEE / (y1.recurring / 12) : 0
    };
  }

  /* ---------- render ---------- */
  function render() {
    var m = model();
    var r1 = function (v) { return Math.round(v * 10) / 10; };

    $('o-threeyear').textContent = compact(m.threeYear);
    $('o-release').textContent   = compact(m.release);
    $('o-recurring').textContent = compact(m.y1.recurring);
    $('o-roi').textContent       = m.roi.toFixed(1) + '\u00D7';
    $('o-payback').textContent   = m.payback > 0 ? Math.max(1, Math.round(m.payback)) + ' mo' : '\u2014';
    $('o-hours').textContent     = Math.round(m.hoursYear).toLocaleString('en-US');

    $('o-days').textContent      = r1(m.days);
    $('o-dsonew').textContent    = r1(m.dsoNow - m.days);
    $('o-perday').textContent    = usd(m.perDay);
    $('o-fte').textContent       = m.fte.toFixed(2);

    $('b-release').textContent   = compact(m.release);
    $('b-carry').textContent     = compact(m.carry);
    $('b-hours').textContent     = Math.round(m.hoursYear).toLocaleString('en-US') + ' hrs';
    $('b-head').textContent      = compact(m.headcount);
    $('b-total').textContent     = compact(m.y1.recurring);

    $('h-three').textContent     = compact(m.threeYear);
    $('h-days').textContent      = r1(m.days);

    var hf = $('hf-dso');
    if (hf) { hf.textContent = '42 \u2192 ' + r1(m.dsoNow - m.days); }

    drawChart();
  }

  /* ---------- match-rate trajectory ---------- */
  function drawChart() {
    var host = $('chart');
    if (!host) { return; }

    var W = 940, H = 280, padL = 46, padR = 20, padT = 22, padB = 36;
    var WEEKS = 12, START = 65, END = 92, NATIVE = 50;

    var pts = [];
    for (var i = 0; i < WEEKS; i++) {
      var t = i / (WEEKS - 1);
      pts.push(START + (END - START) * (1 - Math.pow(1 - t, 2)));
    }

    var lo = 35, hi = 100;
    var x = function (i) { return padL + (W - padL - padR) * (i / (WEEKS - 1)); };
    var y = function (v) { return padT + (H - padT - padB) * (1 - (v - lo) / (hi - lo)); };

    var path = function (vals) {
      return vals.map(function (v, i) {
        return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1);
      }).join(' ');
    };

    var grid = '';
    [40, 55, 70, 85, 100].forEach(function (v) {
      var gy = y(v).toFixed(1);
      grid += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy +
              '" stroke="' + C.grid + '"/>' +
              '<text x="' + (padL - 10) + '" y="' + (+gy + 4) + '" text-anchor="end" fill="' + C.axis +
              '" font-size="11" font-family="Inter,sans-serif">' + v + '%</text>';
    });

    var labels = '';
    for (var w = 0; w < WEEKS; w += 2) {
      labels += '<text x="' + x(w).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle" fill="' + C.axis +
                '" font-size="11" font-family="Inter,sans-serif">Wk ' + (w + 1) + '</text>';
    }

    var band = '<rect x="' + padL + '" y="' + y(60).toFixed(1) + '" width="' + (W - padL - padR) +
               '" height="' + (y(40) - y(60)).toFixed(1) + '" fill="rgba(252,250,247,.05)"/>';

    var nativeLine =
      '<path d="' + path(pts.map(function () { return NATIVE; })) + '" fill="none" stroke="' + C.faint +
      '" stroke-width="2" stroke-dasharray="5 5"/>' +
      '<text x="' + (padL + 8) + '" y="' + (y(NATIVE) - 10).toFixed(1) + '" fill="' + C.faint +
      '" font-size="14" font-family="\'Instrument Serif\',Georgia,serif">ERP native, 40 to 60%</text>';

    var endDot =
      '<circle cx="' + x(WEEKS - 1).toFixed(1) + '" cy="' + y(END).toFixed(1) + '" r="4.5" fill="' + C.primary + '"/>' +
      '<text x="' + (x(WEEKS - 1) - 10).toFixed(1) + '" y="' + (y(END) - 14).toFixed(1) +
      '" text-anchor="end" fill="' + C.primary + '" font-size="15" font-family="\'Instrument Serif\',Georgia,serif">' +
      '90%+ by week twelve</text>';

    var startDot =
      '<circle cx="' + x(0).toFixed(1) + '" cy="' + y(START).toFixed(1) + '" r="4.5" fill="' + C.highlight + '"/>' +
      '<text x="' + (x(0) + 10).toFixed(1) + '" y="' + (y(START) - 12).toFixed(1) + '" fill="' + C.highlight +
      '" font-size="14" font-family="\'Instrument Serif\',Georgia,serif">65% on day one</text>';

    host.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Cash application match rate ' +
      'starts at 65 percent and rises above 90 percent by week twelve, against an ERP native rate of 40 to 60 percent">' +
      band + grid + labels + nativeLine +
      '<path d="' + path(pts) + '" fill="none" stroke="' + C.primary +
      '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      startDot + endDot + '</svg>';
  }

  /* ---------- wiring ---------- */
  ['rev', 'days', 'coc', 'hrscash', 'hrsother', 'hires', 'hire'].forEach(function (id) {
    var el = $(id);
    if (el) { el.addEventListener('input', function () { syncChips(); render(); }); }
  });

  var chips = [].slice.call(document.querySelectorAll('[data-scenario]'));

  function syncChips() {
    var v = +$('days').value;
    chips.forEach(function (c) {
      c.setAttribute('aria-pressed', String(+c.dataset.days === v));
    });
  }

  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      $('days').value = +c.dataset.days;
      syncChips();
      render();
    });
  });

  window.addEventListener('resize', render);
  render();
})();
