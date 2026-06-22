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
let supabaseClient = null;
try {
  if (CONFIG.SUPABASE_URL && !CONFIG.SUPABASE_URL.includes('TU_PROJECT')) {
    supabaseClient = window.supabase.createClient(
      CONFIG.SUPABASE_URL,
      CONFIG.SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    );
  }
} catch(e) {
  console.warn('Supabase no inicializado:', e);
}

// ── Anti-spam ───────────────────────────────────────────────
function checkCooldown() {
  const last = localStorage.getItem('dcy_last_submit');
  if (!last) return true;
  return (Date.now() - parseInt(last)) / 1000 > CONFIG.COOLDOWN_SECONDS;
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
  document.getElementById('progressFill').style.width = (q / state.totalQ * 100) + '%';
  document.getElementById('progressText').textContent = `${q} / ${state.totalQ}`;
}

// ── Scale Buttons (1-10) ─────────────────────────────────────
function buildScale(containerId, field, displayId) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.className = 'scale-btn';
    btn.textContent = i;
    btn.type = 'button';
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
      enableNext(btn.closest('.question-card'));
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
    btn.className = 'nps-btn ' + (i <= 6 ? 'nps-detractor' : i <= 8 ? 'nps-passive' : 'nps-promoter');
    btn.textContent = i;
    btn.type = 'button';
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
      enableNext(btn.closest('.question-card'));
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
    btn.innerHTML = `<div class="barber-avatar">${b.emoji}</div><span class="barber-name">${b.name}</span>`;
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.barber-btn').forEach(x => x.classList.remove('selected'));
      btn.classList.add('selected');
      state.answers.barber = b.name;
      enableNext(btn.closest('.question-card'));
    });
    wrap.appendChild(btn);
  });
}

// ── Choice Grids ─────────────────────────────────────────────
function initChoiceGrids() {
  document.querySelectorAll('.choice-grid').forEach(grid => {
    const field = grid.dataset.field;
    grid.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.answers[field] = btn.dataset.value;
        enableNext(btn.closest('.question-card'));
      });
    });
  });
}

function enableNext(card) {
  const btn = card?.querySelector('.btn-next');
  if (btn) btn.disabled = false;
}

// ── Navigation ───────────────────────────────────────────────
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

function initNextButtons() {
  document.querySelectorAll('.btn-next').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextQ = parseInt(btn.dataset.next);
      if (!isNaN(nextQ)) goToQuestion(nextQ);
    });
  });
}

// ── Textareas ────────────────────────────────────────────────
function initTextareas() {
  const likedTA = document.getElementById('liked_most');
  const improveTA = document.getElementById('improvement');
  if (likedTA) likedTA.addEventListener('input', () => {
    state.answers.liked_most = likedTA.value;
    document.getElementById('count-liked').textContent = likedTA.value.length;
  });
  if (improveTA) improveTA.addEventListener('input', () => {
    state.answers.improvement = improveTA.value;
    document.getElementById('count-improve').textContent = improveTA.value.length;
  });
}

// ── Submit ───────────────────────────────────────────────────
async function submitSurvey() {
  if (state.submitting) return;
  if (!checkCooldown()) {
    showToast('Espera un momento antes de enviar otra encuesta.', 'error');
    return;
  }

  const required = ['satisfaction','attention','expectations','nps','cleanliness','wait_time','barber','is_new_client'];
  for (const field of required) {
    if (state.answers[field] === null || state.answers[field] === undefined) {
      showToast('Completa todas las preguntas antes de enviar.', 'error');
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
    created_at:   now.toISOString(),
    date:         now.toLocaleDateString('es-MX'),
    time:         now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    barber:       state.answers.barber,
    satisfaction: state.answers.satisfaction,
    attention:    state.answers.attention,
    expectations: state.answers.expectations,
    nps:          state.answers.nps,
    cleanliness:  state.answers.cleanliness,
    wait_time:    state.answers.wait_time,
    is_new_client: state.answers.is_new_client === 'Sí',
    liked_most:   state.answers.liked_most || null,
    improvement:  state.answers.improvement || null,
  };

  try {
    if (supabaseClient) {
      const { error } = await supabaseClient.from('surveys').insert([payload]);
      if (error) throw error;
    } else {
      const existing = JSON.parse(localStorage.getItem('dcy_surveys') || '[]');
      existing.push({ id: Date.now(), ...payload });
      localStorage.setItem('dcy_surveys', JSON.stringify(existing));
    }
    setCooldown();
    showSuccess();
  } catch (err) {
    console.error('Error:', err);
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
  const waBtn = s.querySelector('.btn-wa');
  if (waBtn && CONFIG.WA_NUMBER) {
    waBtn.href = `https://wa.me/${CONFIG.WA_NUMBER}?text=Hola%2C%20quiero%20agendar%20mi%20próxima%20cita%20en%20danycutsz%20💈`;
  }
}

function initSubmit() {
  document.getElementById('btnSubmit')?.addEventListener('click', submitSurvey);
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
