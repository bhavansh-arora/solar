(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const fmt = (n, d = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Session storage carries the visitor's estimate between pages (fails safely if blocked).
  const store = {
    get(k) { try { return JSON.parse(sessionStorage.getItem('sunvera:' + k)); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem('sunvera:' + k, JSON.stringify(v)); } catch { /* ignore */ } },
  };

  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Nav: scrolled state, mobile menu, sticky CTA ---------- */
  const nav = $('#nav');
  const sticky = $('#stickyCta');
  const formCard = $('#formCard');
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
    let nearForm = false;
    if (formCard) {
      const r = formCard.getBoundingClientRect();
      nearForm = r.top < window.innerHeight && r.bottom > 0;
    }
    sticky.classList.toggle('show', window.scrollY > 600 && !nearForm);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('#burger');
  const links = $('#navLinks');
  const setMenu = (open) => {
    links.classList.toggle('open', open);
    nav.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
  };
  burger.addEventListener('click', () => setMenu(!links.classList.contains('open')));
  $$('a', links).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Animated numbers ---------- */
  const tween = (el, to, { decimals = 0, prefix = '', suffix = '', dur = 1400 } = {}) => {
    if (!el) return;
    const from = parseFloat(el.dataset.current || '0');
    el.dataset.current = to;
    if (reduceMotion) { el.textContent = prefix + fmt(to, decimals) + suffix; return; }
    cancelAnimationFrame(el._raf);
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = prefix + fmt(from + (to - from) * e, decimals) + suffix;
      if (t < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      $$('[data-count]', e.target).forEach((el) => tween(el, +el.dataset.count, {
        decimals: +(el.dataset.decimals || 0), prefix: el.dataset.prefix || '', suffix: el.dataset.suffix || '', dur: 1600,
      }));
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => io.observe(el));

  /* ---------- Savings + impact model ----------
     Public inputs (cited on impact.html#sources):
     - EIA 2024 avg residential price: 16.5¢/kWh
     - NREL median module degradation: 0.5%/yr
     - EPA: 3.94e-4 t CO2/kWh (eGRID national average), 4.29 t CO2e per car-year,
            0.060 t CO2 per seedling-year (10-yr growth), 8.887e-3 t CO2 per gallon of gasoline
     Assumptions (tune for your market): production per kW, installed cost, rate escalation. */
  const PRICE = 0.165;
  const DEGRADATION = 0.005;
  const RATE_ESCALATION = 0.025;
  const KWH_PER_KW = 1400;
  const OFFSET = 0.95;
  const COST_PER_KW = 2800;
  const PANEL_W = 420;
  const BATTERY_COST = 11000;
  const BATTERY_VALUE = 0.06;
  const YEARS = 25;
  const EPA = { co2PerKwh: 3.94e-4, car: 4.29, seedling10yr: 0.060 * 10, gallon: 8.887e-3 };

  const compute = (bill, battery) => {
    const annualKwh = (bill * 12 / PRICE) * OFFSET;
    const kw = annualKwh / KWH_PER_KW;
    const cost = kw * COST_PER_KW + (battery ? BATTERY_COST : 0);
    const valueShare = 1 + (battery ? BATTERY_VALUE : 0);
    let lifetimeKwh = 0, savings = 0, payback = 0;
    for (let y = 0; y < YEARS; y++) {
      const kwh = annualKwh * Math.pow(1 - DEGRADATION, y);
      lifetimeKwh += kwh;
      savings += kwh * PRICE * Math.pow(1 + RATE_ESCALATION, y) * valueShare;
      if (!payback && savings >= cost) payback = y + 1;
    }
    const co2 = lifetimeKwh * EPA.co2PerKwh;
    return {
      bill, battery, kw, panels: Math.ceil((kw * 1000) / PANEL_W), payback,
      net: Math.max(savings - cost, 0), lifetimeKwh, co2,
      trees: co2 / EPA.seedling10yr, cars: co2 / EPA.car, gallons: co2 / EPA.gallon,
    };
  };

  const saved = store.get('estimate') || {};
  const state = { bill: saved.bill || 140, battery: !!saved.battery, homes: 1, model: null };
  const billInput = $('[data-bill]');

  const renderAll = (dur = 500) => {
    const m = state.model = compute(state.bill, state.battery);
    store.set('estimate', { bill: m.bill, battery: m.battery, kw: +m.kw.toFixed(1), co2: Math.round(m.co2) });

    if (billInput) {
      const pct = ((m.bill - billInput.min) / (billInput.max - billInput.min)) * 100;
      billInput.style.setProperty('--p', pct + '%');
    }
    $$('[data-bill-out]').forEach((el) => { el.textContent = m.bill >= 600 ? '600+' : m.bill; });

    const out = (k) => $(`[data-out="${k}"]`);
    tween(out('net'), m.net, { dur });
    tween(out('kw'), m.kw, { dur, decimals: 1 });
    if (out('panels')) out('panels').textContent = m.panels;
    if (out('payback')) out('payback').textContent = m.payback || '25+';
    tween(out('co2'), m.co2, { dur });
    tween(out('trees'), m.trees, { dur });
    tween(out('cars'), m.cars, { dur, decimals: 1 });
    tween(out('gallons'), m.gallons, { dur });
    renderImpact(dur);
  };

  const renderImpact = (dur = 900) => {
    const m = state.model, n = state.homes;
    const imp = (k) => $(`[data-impact="${k}"]`);
    tween(imp('co2'), m.co2 * n, { dur });
    tween(imp('trees'), m.trees * n, { dur });
    tween(imp('cars'), m.cars * n, { dur, decimals: m.cars * n < 100 ? 1 : 0 });
    tween(imp('mwh'), (m.lifetimeKwh / 1000) * n, { dur });
  };

  const radioGroup = (selector, onPick) => {
    const all = $$(selector);
    all.forEach((btn) => btn.addEventListener('click', () => {
      all.forEach((b) => { b.classList.toggle('active', b === btn); b.setAttribute('aria-checked', String(b === btn)); });
      onPick(btn);
    }));
  };

  if (billInput || $('[data-impact]')) {
    if (billInput) {
      billInput.value = state.bill;
      billInput.addEventListener('input', () => { state.bill = +billInput.value; renderAll(); });
    }
    $$('.calc-toggle button').forEach((b) => {
      const on = (b.dataset.battery === '1') === state.battery;
      b.classList.toggle('active', on); b.setAttribute('aria-checked', String(on));
    });
    radioGroup('.calc-toggle button', (btn) => { state.battery = btn.dataset.battery === '1'; renderAll(); });
    radioGroup('.scale-toggle button', (btn) => { state.homes = +btn.dataset.homes; renderImpact(); });
    renderAll(0);
  }

  /* ---------- ZIP forms → quote page ---------- */
  $$('[data-zip]').forEach((z) => z.addEventListener('input', () => { z.value = z.value.replace(/\D/g, '').slice(0, 5); }));
  $$('[data-zip-form]').forEach((f) => f.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('[data-zip]', f);
    const zip = input.value.trim();
    if (!/^\d{5}$/.test(zip)) {
      f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
      input.focus();
      return;
    }
    window.location.href = 'quote.html?zip=' + zip;
  }));

  /* ---------- FAQ page: search + active topic ---------- */
  const faqSearch = $('#faqSearch');
  if (faqSearch) {
    faqSearch.addEventListener('input', () => {
      const q = faqSearch.value.trim().toLowerCase();
      let any = false;
      $$('.faq-group').forEach((g) => {
        let groupHit = false;
        $$('details', g).forEach((d) => {
          const hit = !q || d.textContent.toLowerCase().includes(q);
          d.hidden = !hit;
          if (hit && q) d.open = true;
          groupHit = groupHit || hit;
        });
        g.hidden = !groupHit;
        any = any || groupHit;
      });
      $('#faqEmpty').hidden = any;
    });
    const catLinks = $$('.faq-cats a');
    const groupIo = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) catLinks.forEach((a) => a.classList.toggle('active', a.hash === '#' + en.target.id));
    }), { rootMargin: '-40% 0px -55% 0px' });
    $$('.faq-group').forEach((g) => groupIo.observe(g));
  }

  /* ---------- Quote page: multi-step lead form ---------- */
  const form = $('#leadForm');
  if (!form) return;

  const params = new URLSearchParams(location.search);
  if (/^\d{5}$/.test(params.get('zip') || '')) $('#zip').value = params.get('zip');
  const planParam = params.get('plan');
  if (planParam) {
    const radio = $$('input[name=plan]', form).find((r) => r.value === planParam);
    if (radio) radio.checked = true;
  }
  const est = store.get('estimate');
  if (est && est.bill) {
    $('#billAmt').value = est.bill;
    $('#ecBill').textContent = est.bill;
    $('#ecKw').textContent = est.kw;
    $('#ecCo2').textContent = fmt(est.co2);
    $('#estimateChip').hidden = false;
  }

  const steps = $$('.fstep', form);
  const nextBtn = $('#nextBtn');
  const backBtn = $('#backBtn');
  const errorEl = $('#formError');
  let current = 0;

  const showStep = (i) => {
    steps.forEach((s, idx) => s.classList.toggle('active', idx === i));
    current = i;
    $('#stepNum').textContent = i + 1;
    $('#progressBar').style.width = ((i + 1) / steps.length) * 100 + '%';
    backBtn.hidden = i === 0;
    nextBtn.textContent = i === steps.length - 1 ? 'Get my free plan ☀' : 'Continue →';
    errorEl.textContent = '';
    const first = $('input:not([type=hidden])', steps[i]);
    if (first && i > 0 && first.type !== 'radio') first.focus({ preventScroll: true });
  };

  const validate = () => {
    const step = steps[current];
    const radios = $$('input[type=radio]', step);
    if (radios.length && !radios.some((r) => r.checked)) {
      errorEl.textContent = 'Please choose an option to continue.';
      return false;
    }
    if (current === 0 && $('input[name=owner]:checked').value === 'no') {
      errorEl.textContent = 'Solar is installed for homeowners — but ask your landlord to get in touch with us!';
      return false;
    }
    let ok = true;
    $$('.input', step).forEach((inp) => {
      let valid = inp.value.trim() !== '';
      if (inp.type === 'email') valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value.trim());
      if (inp.name === 'zip') valid = /^\d{5}$/.test(inp.value.trim());
      if (inp.name === 'monthlyBill') valid = +inp.value > 0;
      if (inp.type === 'tel') valid = inp.value.replace(/\D/g, '').length >= 10;
      inp.classList.toggle('invalid', !valid);
      if (!valid) ok = false;
    });
    if (!ok) errorEl.textContent = 'Please check the highlighted fields.';
    return ok;
  };

  // Auto-advance on choice selection for a snappier flow
  $$('.choice input', form).forEach((r) => r.addEventListener('change', () => {
    if (r.name === 'owner' && r.value === 'no') { validate(); return; }
    setTimeout(() => { if (validate() && current < steps.length - 1) showStep(current + 1); }, 220);
  }));
  $$('.input', form).forEach((inp) => inp.addEventListener('input', () => inp.classList.remove('invalid')));
  $('#billAmt').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4); });
  $('#zip').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5); });
  $('#phone').addEventListener('input', (e) => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 10);
    e.target.value = d.length > 6 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
      : d.length > 3 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : d;
  });

  backBtn.addEventListener('click', () => showStep(Math.max(current - 1, 0)));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (current < steps.length - 1) { showStep(current + 1); return; }

    const data = Object.fromEntries(new FormData(form));
    const m = compute(+data.monthlyBill || 140, data.plan !== 'Solar Essential' && data.plan !== 'Not sure');
    data.estimate = { systemKw: +m.kw.toFixed(1), co2Tonnes25y: Math.round(m.co2), savings25y: Math.round(m.net) };
    // Send to your CRM / backend here, e.g.:
    // fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    console.info('Sunvera lead captured', data);

    $('#successName').textContent = (data.name || 'friend').split(' ')[0];
    form.hidden = true;
    $('.progress').hidden = true;
    $('.form-step-label').hidden = true;
    $('#formSuccess').hidden = false;
  });
})();
