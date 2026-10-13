(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const fmt = (n, d = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  $('#year').textContent = new Date().getFullYear();

  /* ---------- Nav: scrolled state, mobile menu, sticky CTA ---------- */
  const nav = $('#nav');
  const sticky = $('#stickyCta');
  const quote = $('#quote');
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
    const q = quote.getBoundingClientRect();
    const nearQuote = q.top < window.innerHeight && q.bottom > 0;
    sticky.classList.toggle('show', window.scrollY > 600 && !nearQuote);
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

  /* ---------- Animated numbers ---------- */
  const tween = (el, to, { decimals = 0, prefix = '', suffix = '', dur = 1400 } = {}) => {
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
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => io.observe(el));

  /* ---------- Savings + impact model ----------
     Public inputs (see #sources on the page):
     - EIA 2024 avg residential price: 16.5¢/kWh
     - NREL median module degradation: 0.5%/yr
     - EPA: 3.94e-4 t CO2/kWh (eGRID national average), 4.29 t CO2e per car-year,
            0.060 t CO2 per seedling-year (10-yr growth), 8.887e-3 t CO2 per gallon of gasoline
     Assumptions (edit for your market): production per kW, installed cost, rate escalation. */
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

  const bill = $('#bill');
  let battery = false;
  let homes = 1;
  let model = {};

  const compute = () => {
    const b = +bill.value;
    const annualKwh = (b * 12 / PRICE) * OFFSET;
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
      b, kw, panels: Math.ceil((kw * 1000) / PANEL_W), payback,
      net: Math.max(savings - cost, 0), lifetimeKwh, co2,
      trees: co2 / EPA.seedling10yr, cars: co2 / EPA.car, gallons: co2 / EPA.gallon,
    };
  };

  const renderCalc = () => {
    model = compute();
    const pct = ((model.b - bill.min) / (bill.max - bill.min)) * 100;
    bill.style.setProperty('--p', pct + '%');
    $('#billOut').textContent = model.b >= 600 ? '600+' : model.b;
    const opts = { dur: 500 };
    tween($('#savings25'), model.net, opts);
    tween($('#sysKw'), model.kw, { ...opts, decimals: 1 });
    $('#panels').textContent = model.panels;
    $('#payback').textContent = model.payback || '25+';
    tween($('#co2'), model.co2, opts);
    tween($('#ciTrees'), model.trees, opts);
    tween($('#ciCars'), model.cars, { ...opts, decimals: 1 });
    tween($('#ciGas'), model.gallons, opts);
    renderImpact(500);
  };

  const renderImpact = (dur = 900) => {
    const n = homes;
    const small = model.co2 * n < 1000;
    tween($('#imCo2'), model.co2 * n, { dur, decimals: small ? 0 : 0 });
    tween($('#imTrees'), model.trees * n, { dur });
    tween($('#imCars'), model.cars * n, { dur, decimals: model.cars * n < 100 ? 1 : 0 });
    tween($('#imMwh'), (model.lifetimeKwh / 1000) * n, { dur });
  };

  bill.addEventListener('input', renderCalc);

  const radioGroup = (selector, onPick) => $$(selector).forEach((btn, _, all) => btn.addEventListener('click', () => {
    all.forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-checked', 'false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-checked', 'true');
    onPick(btn);
  }));
  radioGroup('.calc-toggle button', (btn) => { battery = btn.dataset.battery === '1'; renderCalc(); });
  radioGroup('.scale-toggle button', (btn) => { homes = +btn.dataset.homes; renderImpact(); });

  renderCalc();

  /* ---------- Multi-step lead form ---------- */
  const form = $('#leadForm');
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

  backBtn.addEventListener('click', () => showStep(Math.max(current - 1, 0)));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (current < steps.length - 1) { showStep(current + 1); return; }

    const data = Object.fromEntries(new FormData(form));
    data.estimate = { monthlyBill: model.b, systemKw: +model.kw.toFixed(1), co2Tonnes25y: Math.round(model.co2), battery };
    // Send to your CRM / backend here, e.g.:
    // fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    console.info('Sunvera lead captured', data);

    $('#successName').textContent = (data.name || 'friend').split(' ')[0];
    form.hidden = true;
    $('.progress').hidden = true;
    $('.form-step-label').hidden = true;
    $('#formSuccess').hidden = false;
  });

  // Phone formatting
  $('#phone').addEventListener('input', (e) => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 10);
    e.target.value = d.length > 6 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
      : d.length > 3 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : d;
  });
  $$('#zip, #heroZip').forEach((z) => z.addEventListener('input', () => { z.value = z.value.replace(/\D/g, '').slice(0, 5); }));

  // Plan buttons carry the chosen plan into the form
  $$('[data-plan]').forEach((a) => a.addEventListener('click', () => { $('#planField').value = a.dataset.plan; }));

  /* ---------- Hero ZIP → prefill form ---------- */
  $('#heroForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const zip = $('#heroZip').value.trim();
    if (!/^\d{5}$/.test(zip)) {
      const f = $('#heroForm');
      f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
      $('#heroZip').focus();
      return;
    }
    $('#zip').value = zip;
    quote.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });
})();
