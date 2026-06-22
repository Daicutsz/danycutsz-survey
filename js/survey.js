// ============================================================
// danycutsz Survey — Main Logic
// ============================================================

// ── State ──────────────────────────────────────────────────
const state = {
  currentQ: 1,
  totalQ: 10,
  answers: {
    satisfaction: null,
    attention: null,
    expectations: null,
    nps: null,
    cleanliness: null,
    wait_time: null,
    barber: null,
    is_new_client: null,
    liked_most: '',
    improvement: ''
  },
  submitting: false
};

// ── Supabase Init ───────────────────────────────────────────
let supabase = null;
try {
  if (CONFIG.SUPABASE_URL && !CONFIG.SUPABASE_URL.includes('TU_PROJECT')) {
    supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }
} catch(e) {
  console.warn('Supabase no inicializado — revisa config.js');
}

// ── Anti-spam (localStorage cooldown) ──────────────────────
function checkCooldown() {
  const last = localStorage.getItem('dcy_last_submit');
  if (!last) return true;
  const elapsed = (Date.now() - parseInt(last)) / 1000;
  return elapsed > CONFIG.COOLDOWN_SECONDS;
}
function setCooldown() {
  localStorage.setItem('dcy_last_submit', Date.now().toString());
}

// ── Toast ───────────────────────────────────────────────────
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = 'toast'; }, 3000);
}

// ── Progress ────────────────────────────────────────────────
function updateProgress(q) {
  const pct = (q / state.totalQ) * 100;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = `${q} / ${state.totalQ}`;
}

// ── Scale Buttons (1-10) ─────────────────────────────────────
function buildScale(containerId, field, displayId, min = 1, max = 10) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  for (let i = min; i <= max; i++) {
    const btn = document.createElement('button');
    btn.className = 'scale-btn';
    btn.textContent = i;
    btn.type = 'button';
    btn.setAttribute('aria-label', `${i} — ${SCALE_LABELS[i] || i}`);
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.answers[field] = i;
      const disp = document.getElementById(displayId);
      if (disp) {
        disp.classList.add('has-value');
        disp.querySelector('.selected-number').textContent = i;
        disp.querySelector('.selected-label').textContent = SCALE_LABELS[i] || '';
      }
      // Enable next button
      const card = btn.closest('.question-card');
      if (card) enableNext(card);
    });
    wrap.appendChild(btn);
  }
}

// ── NPS Buttons (0-10) ──────────────────────────────────────
function buildNPS() {
  const wrap = document.getElementById('nps-buttons');
  if (!wrap) return;
  for (let i = 0; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.className = 'nps-btn';
    btn.textContent = i;
    btn.type = 'button';
    // Assign NPS category class
    if (i <= 6) btn.classList.add('nps-detractor');
    else if (i <= 8) btn.classList.add('nps-passive');
    else btn.classList.add('nps-promoter');

    btn.setAttribute('aria-label', `NPS ${i} — ${NPS_LABELS[i]}`);
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.nps-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.answers.nps = i;
      const disp = document.getElementById('display-nps');
      if (disp) {
        disp.classList.add('has-value');
        disp.querySelector('.selected-number').textContent = i;
        document.getElementById('nps-label-text').textContent = NPS_LABELS[i];
      }
      const card = btn.closest('.question-card');
      if (card) enableNext(card);
    });
    wrap.appendChild(btn);
  }
}

// ── Barber Buttons ───────────────────────────────────────────
function buildBarbers() {
  const wrap = document.querySelector('.barber-selector');
  if (!wrap) return;
  CONFIG.BARBERS.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'barber-btn';
    btn.type = 'button';
    btn.dataset.value = b.id;
    btn.innerHTML = `
      <div class="barber-avatar">${b.emoji}</div>
      <span class="barber-name">${b.name}</span>
    `;
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.barber-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.answers.barber = b.name;
      const card = btn.closest('.question-card');
      if (card) enableNext(card);
    });
    wrap.appendChild(btn);
  });
}

// ── Choice Buttons ───────────────────────────────────────────
function initChoiceGrids() {
  document.querySelectorAll('.choice-grid').forEach(grid => {
    const field = grid.dataset.field;
    grid.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.answers[field] = btn.dataset.value;
        const card = btn.closest('.question-card');
        if (card) enableNext(card);
      });
    });
  });
}

// ── Enable Next Button ───────────────────────────────────────
function enableNext(card) {
  const btn = card.querySelector('.btn-next');
  if (btn) btn.disabled = false;
}

// ── Question Navigation ──────────────────────────────────────
function goToQuestion(num) {
  const current = document.querySelector('.question-card.active');
  const next = document.querySelector(`.question-card[data-q="${num}"]`);
  if (!next) return;

  current?.classList.add('exit');
  setTimeout(() => {
    current?.classList.remove('active', 'exit');
    next.classList.add('active');
    state.currentQ = num;
    updateProgress(num);
    next.scrollTop = 0;
  }, 200);
}

// ── Next Button Click ────────────────────────────────────────
function initNextButtons() {
  document.querySelectorAll('.btn-next').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextQ = parseInt(btn.dataset.next);
      if (!isNaN(nextQ)) goToQuestion(nextQ);
    });
  });
}

// ── Textarea char counters ───────────────────────────────────
function initTextareas() {
  const likedTA = document.getElementById('liked_most');
  const improveTA = document.getElementById('improvement');

  if (likedTA) {
    likedTA.addEventListener('input', () => {
      state.answers.liked_most = likedTA.value;
      document.getElementById('count-liked').textContent = likedTA.value.length;
    });
  }
  if (improveTA) {
    improveTA.addEventListener('input', () => {
      state.answers.improvement = improveTA.value;
      document.getElementById('count-improve').textContent = improveTA.value.length;
    });
  }
}

// ── Submit ───────────────────────────────────────────────────
async function submitSurvey() {
  if (state.submitting) return;

  // Anti-spam
  if (!checkCooldown()) {
    showToast('Por favor espera un momento antes de enviar otra encuesta.', 'error');
    return;
  }

  // Validar campos obligatorios
  const required = ['satisfaction', 'attention', 'expectations', 'nps', 'cleanliness', 'wait_time', 'barber', 'is_new_client'];
  for (const field of required) {
    if (state.answers[field] === null || state.answers[field] === undefined) {
      showToast('Asegúrate de completar todas las preguntas.', 'error');
      return;
    }
  }

  state.submitting = true;
  const btn = document.getElementById('btnSubmit');
  const submitText = document.getElementById('submitText');
  const spinner = document.getElementById('submitSpinner');
  btn.disabled = true;
  submitText.textContent = 'Enviando...';
  spinner.style.display = 'block';

  const now = new Date();
  const payload = {
    created_at: now.toISOString(),
    date: now.toLocaleDateString('es-MX'),
    time: now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    barber: state.answers.barber,
    satisfaction: state.answers.satisfaction,
    attention: state.answers.attention,
    expectations: state.answers.expectations,
    nps: state.answers.nps,
    cleanliness: state.answers.cleanliness,
    wait_time: state.answers.wait_time,
    is_new_client: state.answers.is_new_client === 'Sí',
    liked_most: state.answers.liked_most || null,
    improvement: state.answers.improvement || null,
  };

  try {
    if (supabase) {
      const { error } = await supabase.from('surveys').insert([payload]);
      if (error) throw error;
    } else {
      // Fallback: guardar en localStorage para demo
      const existing = JSON.parse(localStorage.getItem('dcy_surveys') || '[]');
      existing.push({ id: Date.now(), ...payload });
      localStorage.setItem('dcy_surveys', JSON.stringify(existing));
      console.log('Guardado en localStorage (modo demo):', payload);
    }

    setCooldown();
    showSuccess();

  } catch (err) {
    console.error('Error al guardar:', err);
    showToast('Error al enviar. Verifica tu conexión.', 'error');
    btn.disabled = false;
    submitText.textContent = 'Enviar mi opinión';
    spinner.style.display = 'none';
    state.submitting = false;
  }
}

function showSuccess() {
  document.getElementById('app').style.display = 'none';
  const s = document.getElementById('successScreen');
  s.style.display = 'flex';
  // Update WA link
  const waBtn = s.querySelector('.btn-wa');
  if (waBtn && CONFIG.WA_NUMBER) {
    waBtn.href = `https://wa.me/${CONFIG.WA_NUMBER}?text=Hola%2C%20quiero%20agendar%20mi%20próxima%20cita%20en%20danycutsz%20💈`;
  }
}

// ── Submit button ────────────────────────────────────────────
function initSubmit() {
  const btn = document.getElementById('btnSubmit');
  if (btn) btn.addEventListener('click', submitSurvey);
}

// ── Splash ───────────────────────────────────────────────────
function initSplash() {
  setTimeout(() => {
    const splash = document.getElementById('splash');
    splash.classList.add('exit');
    setTimeout(() => {
      splash.style.display = 'none';
      const app = document.getElementById('app');
      app.style.display = 'flex';
      updateProgress(1);
    }, 500);
  }, 1500);
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildScale('scale-satisfaction', 'satisfaction', 'display-satisfaction');
  buildScale('scale-attention', 'attention', 'display-attention');
  buildScale('scale-cleanliness', 'cleanliness', 'display-cleanliness');
  buildNPS();
  buildBarbers();
  initChoiceGrids();
  initNextButtons();
  initTextareas();
  initSubmit();
  initSplash();
});
