// ============================================================
// danycutsz — Encuesta de servicio (detalle vs. velocidad)
// Guarda en la tabla Supabase: service_survey
// ============================================================

const QUESTIONS = [
  { id: 'delay_frequency', type: 'choice',
    title: 'En tus últimas visitas, ¿con qué frecuencia<br/>tu cita empezó tarde?',
    options: [['Nunca','🟢'], ['Pocas veces','🟡'], ['Frecuentemente','🟠'], ['Casi siempre','🔴']] },
  { id: 'wait_time', type: 'choice',
    title: '¿Cuánto esperaste normalmente<br/>antes de ser atendido?',
    options: [['Menos de 10 minutos','⚡'], ['10 a 20 minutos','🟡'], ['20 a 30 minutos','🟠'], ['Más de 30 minutos','🔴']] },
  { id: 'detail_perception', type: 'choice',
    title: '¿Cómo percibes la calidad y el detalle<br/>de tu corte comparado con antes?',
    options: [['Mejor que antes','🔥'], ['Igual que antes','✅'], ['Peor que antes','⚠️'], ['No noto diferencia','🤷']] },
  { id: 'preference', type: 'choice',
    title: '¿Qué prefieres?',
    options: [
      ['Mismo nivel de detalle, aunque la cita dure más','✂️'],
      ['Servicio más rápido, con menos detalle','⏱️'],
      ['Poder elegir entre ambas según el día','🔀']
    ] },
  { id: 'delay_impact', type: 'choice',
    title: '¿Cómo te afectan los retrasos?',
    options: [['No me afectan','😌'], ['Me incomodan un poco','😕'], ['Debo reorganizar mi día','📅'], ['Consideraría ir a otro lugar','🚪']] },
  { id: 'interest_two_tiers', type: 'choice',
    title: '¿Te interesaría tener un servicio “Detallado”<br/>y uno “Express” más corto?',
    options: [['Sí, me interesa','👍'], ['No, prefiero un solo servicio','👎'], ['Depende del día','🤔']] },
  { id: 'satisfaction', type: 'scale',
    title: 'En general, ¿qué tan satisfecho estás<br/>con el servicio?' },
  { id: 'comment', type: 'text',
    title: '¿Qué mejorarías de tu<br/>experiencia en general?' }
];

const state = { currentQ: 1, totalQ: QUESTIONS.length, answers: {}, submitting: false };

// ── Supabase ────────────────────────────────────────────────
let supabaseClient = null;
try {
  supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
} catch (e) { console.warn('Supabase no inicializado:', e); }

// ── Utilidades ──────────────────────────────────────────────
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = 'toast'; }, 3000);
}
function updateProgress(q) {
  document.getElementById('progressFill').style.width = (q / state.totalQ * 100) + '%';
  document.getElementById('progressText').textContent = `${q} / ${state.totalQ}`;
}
function enableNext(card) {
  const btn = card && card.querySelector('.btn-next');
  if (btn) btn.disabled = false;
}
function checkCooldown() {
  const last = localStorage.getItem('dcy_service_submit');
  return !last || (Date.now() - parseInt(last, 10)) / 1000 > CONFIG.COOLDOWN_SECONDS;
}

// ── Render de preguntas ─────────────────────────────────────
function renderQuestions() {
  const container = document.getElementById('questionsContainer');
  QUESTIONS.forEach((q, i) => {
    const n = i + 1;
    const card = document.createElement('div');
    card.className = 'question-card' + (n === 1 ? ' active' : '');
    card.dataset.q = n;

    const eyebrow = document.createElement('div');
    eyebrow.className = 'q-eyebrow';
    eyebrow.textContent = `Pregunta ${n} de ${state.totalQ}` + (q.type === 'text' ? ' · Opcional' : '');
    const title = document.createElement('h2');
    title.className = 'q-title';
    title.innerHTML = q.title;
    card.append(eyebrow, title);

    if (q.type === 'choice') {
      const grid = document.createElement('div');
      grid.className = 'choice-grid single-col';
      q.options.forEach(([label, icon]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'choice-btn';
        btn.innerHTML = '<span class="choice-icon"></span><span class="choice-label"></span>';
        btn.querySelector('.choice-icon').textContent = icon;
        btn.querySelector('.choice-label').textContent = label;
        btn.addEventListener('click', () => {
          grid.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          state.answers[q.id] = label;
          enableNext(card);
        });
        grid.appendChild(btn);
      });
      card.appendChild(grid);
    }

    if (q.type === 'scale') {
      const wrap = document.createElement('div');
      wrap.className = 'scale-selector';
      wrap.innerHTML =
        '<div class="scale-labels"><span>Poco</span><span>Mucho</span></div>' +
        '<div class="scale-track"><div class="scale-buttons"></div></div>' +
        '<div class="scale-selected-display"><span class="selected-number">—</span>' +
        '<span class="selected-label">Selecciona una opción</span></div>';
      const buttons = wrap.querySelector('.scale-buttons');
      const disp = wrap.querySelector('.scale-selected-display');
      for (let v = 1; v <= 10; v++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'scale-btn';
        b.textContent = v;
        b.addEventListener('click', () => {
          buttons.querySelectorAll('.scale-btn').forEach(x => x.classList.remove('selected'));
          b.classList.add('selected');
          state.answers[q.id] = v;
          disp.classList.add('has-value');
          disp.querySelector('.selected-number').textContent = v;
          disp.querySelector('.selected-label').textContent = SCALE_LABELS[v] || '';
          enableNext(card);
        });
        buttons.appendChild(b);
      }
      card.appendChild(wrap);
    }

    if (q.type === 'text') {
      const wrap = document.createElement('div');
      wrap.className = 'textarea-wrap';
      wrap.innerHTML =
        '<textarea class="premium-textarea" maxlength="500" rows="4" placeholder="Escribe aquí tu comentario (opcional)"></textarea>' +
        '<div class="char-count"><span class="cc">0</span>/500</div>';
      const ta = wrap.querySelector('textarea');
      ta.addEventListener('input', () => {
        state.answers[q.id] = ta.value;
        wrap.querySelector('.cc').textContent = ta.value.length;
      });
      card.appendChild(wrap);
    }

    if (n < state.totalQ) {
      const next = document.createElement('button');
      next.className = 'btn-next';
      next.type = 'button';
      next.disabled = q.type !== 'text';
      next.textContent = 'Continuar →';
      next.addEventListener('click', () => goToQuestion(n + 1));
      card.appendChild(next);
    } else {
      const submit = document.createElement('button');
      submit.className = 'btn-submit';
      submit.id = 'btnSubmit';
      submit.type = 'button';
      submit.innerHTML = '<span id="submitText">Enviar mi opinión</span>';
      submit.addEventListener('click', submitSurvey);
      card.appendChild(submit);
    }
    container.appendChild(card);
  });
}

function goToQuestion(num) {
  const current = document.querySelector('.question-card.active');
  const next = document.querySelector(`.question-card[data-q="${num}"]`);
  if (!next) return;
  if (current) current.classList.add('exit');
  setTimeout(() => {
    if (current) current.classList.remove('active', 'exit');
    next.classList.add('active');
    state.currentQ = num;
    updateProgress(num);
  }, 200);
}

// ── Envío ───────────────────────────────────────────────────
async function submitSurvey() {
  if (state.submitting) return;
  if (!checkCooldown()) { showToast('Espera un momento antes de enviar otra encuesta.', 'error'); return; }

  const required = QUESTIONS.filter(q => q.type !== 'text').map(q => q.id);
  for (const f of required) {
    if (state.answers[f] === undefined || state.answers[f] === null) {
      showToast('Completa todas las preguntas antes de enviar.', 'error');
      return;
    }
  }

  state.submitting = true;
  const btn = document.getElementById('btnSubmit');
  const txt = document.getElementById('submitText');
  btn.disabled = true;
  txt.textContent = 'Enviando...';

  const a = state.answers;
  const payload = {
    delay_frequency: a.delay_frequency,
    wait_time: a.wait_time,
    detail_perception: a.detail_perception,
    preference: a.preference,
    delay_impact: a.delay_impact,
    interest_two_tiers: a.interest_two_tiers,
    satisfaction: a.satisfaction,
    comment: (a.comment || '').trim() || null
  };

  try {
    if (!supabaseClient) throw new Error('Supabase no disponible');
    const { error } = await supabaseClient.from('service_survey').insert([payload]);
    if (error) throw error;
    localStorage.setItem('dcy_service_submit', Date.now().toString());
    document.getElementById('app').style.display = 'none';
    document.getElementById('successScreen').style.display = 'flex';
  } catch (err) {
    console.error('Error:', err);
    showToast('Error al enviar. Verifica tu conexión.', 'error');
    btn.disabled = false;
    txt.textContent = 'Enviar mi opinión';
    state.submitting = false;
  }
}

// ── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderQuestions();
  setTimeout(() => {
    const splash = document.getElementById('splash');
    splash.classList.add('exit');
    setTimeout(() => {
      splash.style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      updateProgress(1);
    }, 500);
  }, 1500);
});
