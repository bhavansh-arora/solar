(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  $('#year').textContent = new Date().getFullYear();

  /* ---------- Nav: scrolled state, mobile menu, sticky CTA ---------- */
  const nav = $('#nav');
  const sticky = $('#stickyCta');
  const quote = $('#quote');
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 10);
    const q = quote.getBoundingClientRect();
    const nearQuote = q.top < window.innerHeight && q.bottom > 0;
    sticky.classList.toggle('show', window.scrollY > 600 && !nearQuote);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('#burger');
  const links = $('#navLinks');
  const closeMenu = () => { links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); };
  burger.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
  $$('a', links).forEach((a) => a.addEventListener('click', closeMenu));

  /* ---------- Reveal on scroll + counters ---------- */
  const animateCount = (el) => {
    const target = +el.dataset.count;
    const pre = el.dataset.prefix || '';
    const suf = el.dataset.suffix || '';
    if (reduceMotion) { el.textContent = pre + fmt(target) + suf; return; }
    const dur = 1600;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = pre + fmt(target * eased) + suf;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      $$('[data-count]', e.target).forEach(animateCount);
      if (e.target.matches('[data-count]')) animateCount(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => io.observe(el));

  /* ---------- Live hero widgets ---------- */
  const liveKw = $('#liveKw');
  const liveSaved = $('#liveSaved');
  let saved = 187;
  if (!reduceMotion) {
    setInterval(() => {
      liveKw.textContent = (7.1 + Math.random() * 0.7).toFixed(2);
      if (Math.random() > 0.6) liveSaved.textContent = ++saved;
    }, 2200);
  }

  /* ---------- Savings calculator ---------- */
  const bill = $('#bill');
  let battery = false;
  const RATE_INFLATION = 0.035;  // annual utility rate increase
  const OFFSET = 0.95;           // share of bill offset by solar
  const KWH_PRICE = 0.16;        // $/kWh
  const KWH_PER_KW = 1400;       // annual production per kW
  const COST_PER_KW = 2800;      // net installed $/W * 1000
  const BATTERY_COST = 11000;
  const BATTERY_VALUE = 0.08;    // extra bill value from TOU shifting

  const setText = (id, v) => { $(id).textContent = v; };

  const calc = () => {
    const b = +bill.value;
    const pct = ((b - bill.min) / (bill.max - bill.min)) * 100;
    bill.style.setProperty('--p', pct + '%');
    setText('#billOut', b >= 600 ? '600+' : b);

    const annualBill = b * 12;
    const kw = (annualBill / KWH_PRICE) / KWH_PER_KW;
    const panels = Math.ceil((kw * 1000) / 420);
    const cost = kw * COST_PER_KW + (battery ? BATTERY_COST : 0);
    const offset = OFFSET + (battery ? BATTERY_VALUE : 0);

    let lifetime = 0, cum = 0, payback = 0;
    for (let y = 0; y < 25; y++) {
      const yearSave = annualBill * Math.pow(1 + RATE_INFLATION, y) * Math.min(offset, 1.02);
      lifetime += yearSave;
      cum += yearSave;
      if (!payback && cum >= cost) payback = y + 1;
    }
    const net = Math.max(lifetime - cost, 0);
    const co2 = (kw * KWH_PER_KW * 0.39) / 1000;

    setText('#savings25', fmt(net));
    setText('#ctaSavings', fmt(net));
    setText('#sysKw', kw.toFixed(1));
    setText('#panels', panels);
    setText('#payback', payback || '25+');
    setText('#co2', co2.toFixed(1));
  };
  bill.addEventListener('input', calc);
  $$('.calc-toggle button').forEach((btn) => btn.addEventListener('click', () => {
    $$('.calc-toggle button').forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-checked', 'false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-checked', 'true');
    battery = btn.dataset.battery === '1';
    calc();
  }));
  calc();

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
    nextBtn.innerHTML = i === steps.length - 1 ? 'Get my free plan ☀' : 'Continue →';
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
    // Hook up your CRM / backend here, e.g.:
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
