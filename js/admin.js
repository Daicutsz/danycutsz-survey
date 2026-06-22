// ============================================================
// danycutsz Admin Dashboard — Main Logic
// ============================================================

// ── State ──────────────────────────────────────────────────
const adminState = {
  authenticated: false,
  surveys: [],
  filtered: [],
  daysFilter: 7,
  currentSection: 'overview',
  charts: {}
};

// ── Supabase ───────────────────────────────────────────────
let supabase = null;
try {
  if (CONFIG.SUPABASE_URL && !CONFIG.SUPABASE_URL.includes('TU_PROJECT')) {
    supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }
} catch(e) { console.warn('Supabase no configurado'); }

// ── Toast ──────────────────────────────────────────────────
function toast(msg, type = '') {
  const t = document.getElementById('toast-admin');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.className = 'toast', 3000);
}

// ── Auth ───────────────────────────────────────────────────
function initLogin() {
  const btn = document.getElementById('btnLogin');
  const input = document.getElementById('loginPass');
  const err = document.getElementById('loginError');

  const attempt = () => {
    if (input.value === CONFIG.ADMIN_PASSWORD) {
      sessionStorage.setItem('dcy_admin', '1');
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('dashboard').style.display = 'flex';
      loadData();
    } else {
      err.textContent = 'Contraseña incorrecta. Intenta de nuevo.';
      input.value = '';
      input.focus();
    }
  };

  btn.addEventListener('click', attempt);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });

  // Check existing session
  if (sessionStorage.getItem('dcy_admin') === '1') {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';
    loadData();
  }

  document.getElementById('btnLogout').addEventListener('click', () => {
    sessionStorage.removeItem('dcy_admin');
    location.reload();
  });
}

// ── Load Data ──────────────────────────────────────────────
async function loadData() {
  try {
    let data = [];

    if (supabase) {
      const { data: rows, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      data = rows || [];
    } else {
      // Demo: load from localStorage
      data = JSON.parse(localStorage.getItem('dcy_surveys') || '[]')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (data.length === 0) data = generateDemoData();
    }

    adminState.surveys = data;
    applyFilter(adminState.daysFilter);

    const now = new Date();
    document.getElementById('lastUpdated').textContent =
      `Act. ${now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;

  } catch(e) {
    console.error(e);
    toast('Error al cargar datos', 'error');
  }
}

// ── Demo Data Generator ────────────────────────────────────
function generateDemoData() {
  const barbers = CONFIG.BARBERS.map(b => b.name);
  const expectations = ['Superó mis expectativas', 'Cumplió mis expectativas', 'Cumplió parcialmente', 'No cumplió'];
  const waits = ['Nada', 'Menos de 5 minutos', '5-10 minutos', 'Más de 10 minutos'];
  const liked = ['El fade quedó perfecto', 'Muy buena vibra el lugar', 'El barbero estuvo muy atento', 'El ambiente es increíble', 'Rapidez y precisión', null];
  const improve = ['Música un poco más baja', 'Más opciones de bebidas', null, null, null];

  return Array.from({ length: 40 }, (_, i) => {
    const daysAgo = Math.floor(Math.random() * 90);
    const d = new Date(Date.now() - daysAgo * 86400000);
    const sat = Math.floor(Math.random() * 4) + 7;
    const nps = Math.floor(Math.random() * 5) + 6;
    return {
      id: i + 1,
      created_at: d.toISOString(),
      date: d.toLocaleDateString('es-MX'),
      time: `${Math.floor(Math.random()*10)+10}:${['00','15','30','45'][Math.floor(Math.random()*4)]}`,
      barber: barbers[Math.floor(Math.random() * barbers.length)],
      satisfaction: sat,
      attention: Math.floor(Math.random() * 3) + 7,
      expectations: expectations[Math.floor(Math.random() * (sat >= 8 ? 2 : 4))],
      nps: nps,
      cleanliness: Math.floor(Math.random() * 3) + 7,
      wait_time: waits[Math.floor(Math.random() * 4)],
      is_new_client: Math.random() > 0.65,
      liked_most: liked[Math.floor(Math.random() * liked.length)],
      improvement: improve[Math.floor(Math.random() * improve.length)],
    };
  });
}

// ── Filter by Date Range ───────────────────────────────────
function applyFilter(days) {
  adminState.daysFilter = days;
  if (days === 0) {
    adminState.filtered = [...adminState.surveys];
  } else {
    const cutoff = new Date(Date.now() - days * 86400000);
    adminState.filtered = adminState.surveys.filter(s => new Date(s.created_at) >= cutoff);
  }
  renderAll();
}

// ── Compute Stats ──────────────────────────────────────────
function computeStats(data) {
  if (!data.length) return null;
  const avg = (arr) => arr.reduce((a,b) => a+b, 0) / arr.length;

  const satisfaction  = avg(data.map(s => s.satisfaction));
  const attention     = avg(data.map(s => s.attention));
  const cleanliness   = avg(data.map(s => s.cleanliness));
  const allNPS        = data.map(s => s.nps);
  const promoters     = allNPS.filter(n => n >= 9).length;
  const detractors    = allNPS.filter(n => n <= 6).length;
  const nps           = Math.round(((promoters - detractors) / data.length) * 100);
  const newClients    = data.filter(s => s.is_new_client).length;
  const recurrents    = data.length - newClients;

  return { satisfaction, attention, cleanliness, nps, newClients, recurrents, total: data.length };
}

// ── Render KPIs ────────────────────────────────────────────
function renderKPIs() {
  const stats = computeStats(adminState.filtered);
  if (!stats) return;

  document.getElementById('kpi-total').textContent = stats.total;
  document.getElementById('kpi-total-sub').textContent = `${stats.newClients} nuevos, ${stats.recurrents} recurrentes`;
  document.getElementById('kpi-satisfaction').textContent = stats.satisfaction.toFixed(1);
  document.getElementById('kpi-attention').textContent = stats.attention.toFixed(1);
  document.getElementById('kpi-clean').textContent = stats.cleanliness.toFixed(1);
  document.getElementById('kpi-nps').textContent = stats.nps;

  const npsLbl = stats.nps >= 50 ? 'Excelente 🔥' : stats.nps >= 0 ? 'Bueno ✅' : 'Necesita atención ⚠️';
  document.getElementById('kpi-nps-label').textContent = npsLbl;
}

// ── Charts ─────────────────────────────────────────────────
const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1A1A1A',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      titleColor: '#F5F5F5',
      bodyColor: '#9A9A9A',
      padding: 10,
    }
  },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5A5A5A', font: { family: 'Inter', size: 11 } } },
    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5A5A5A', font: { family: 'Inter', size: 11 } } }
  }
};

function destroyChart(key) {
  if (adminState.charts[key]) {
    adminState.charts[key].destroy();
    delete adminState.charts[key];
  }
}

function renderCharts() {
  const data = adminState.filtered;
  Chart.defaults.font.family = 'Inter';

  // ── Timeline: group by week ──────────────────────────────
  destroyChart('timeline');
  const byDate = {};
  data.forEach(s => {
    const d = s.created_at ? s.created_at.split('T')[0] : s.date;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(s.satisfaction);
  });
  const sortedDates = Object.keys(byDate).sort();
  const tlLabels = sortedDates.map(d => {
    const dt = new Date(d);
    return dt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  });
  const tlData = sortedDates.map(d => {
    const vals = byDate[d];
    return (vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(1);
  });

  const tlCtx = document.getElementById('chartTimeline');
  if (tlCtx) {
    adminState.charts.timeline = new Chart(tlCtx, {
      type: 'line',
      data: {
        labels: tlLabels,
        datasets: [{
          data: tlData,
          borderColor: '#C9A84C',
          backgroundColor: 'rgba(201,168,76,0.06)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#C9A84C',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        }]
      },
      options: { ...CHART_DEFAULTS, scales: { ...CHART_DEFAULTS.scales, y: { ...CHART_DEFAULTS.scales.y, min: 0, max: 10 } } }
    });
  }

  // ── Expectations Donut ────────────────────────────────────
  destroyChart('expectations');
  const expCounts = {};
  data.forEach(s => { expCounts[s.expectations] = (expCounts[s.expectations] || 0) + 1; });
  const expCtx = document.getElementById('chartExpectations');
  if (expCtx) {
    adminState.charts.expectations = new Chart(expCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(expCounts),
        datasets: [{
          data: Object.values(expCounts),
          backgroundColor: ['#C9A84C', '#4CAF50', '#FFB74D', '#E57373'],
          borderColor: '#111111',
          borderWidth: 3,
        }]
      },
      options: {
        ...CHART_DEFAULTS,
        plugins: { ...CHART_DEFAULTS.plugins, legend: { display: true, position: 'bottom', labels: { color: '#9A9A9A', font: { size: 10, family: 'Inter' }, padding: 10, boxWidth: 10 } } },
        scales: {}
      }
    });
  }

  // ── Wait Times Bar ────────────────────────────────────────
  destroyChart('wait');
  const waitOrder = ['Nada', 'Menos de 5 minutos', '5-10 minutos', 'Más de 10 minutos'];
  const waitCounts = waitOrder.map(w => data.filter(s => s.wait_time === w).length);
  const waitCtx = document.getElementById('chartWait');
  if (waitCtx) {
    adminState.charts.wait = new Chart(waitCtx, {
      type: 'bar',
      data: {
        labels: ['Nada', '<5 min', '5-10 min', '>10 min'],
        datasets: [{
          data: waitCounts,
          backgroundColor: ['rgba(201,168,76,0.7)', 'rgba(76,175,80,0.6)', 'rgba(255,183,77,0.6)', 'rgba(229,115,115,0.6)'],
          borderColor: ['#C9A84C', '#4CAF50', '#FFB74D', '#E57373'],
          borderWidth: 1.5,
          borderRadius: 6,
        }]
      },
      options: CHART_DEFAULTS
    });
  }

  // ── NPS Distribution ──────────────────────────────────────
  destroyChart('nps');
  const npsCounts = Array(11).fill(0);
  data.forEach(s => { if (s.nps !== null && s.nps !== undefined) npsCounts[s.nps]++; });
  const npsCtx = document.getElementById('chartNPS');
  if (npsCtx) {
    adminState.charts.nps = new Chart(npsCtx, {
      type: 'bar',
      data: {
        labels: ['0','1','2','3','4','5','6','7','8','9','10'],
        datasets: [{
          data: npsCounts,
          backgroundColor: Array.from({ length: 11 }, (_, i) =>
            i <= 6 ? 'rgba(229,115,115,0.5)' : i <= 8 ? 'rgba(255,183,77,0.5)' : 'rgba(201,168,76,0.7)'
          ),
          borderRadius: 4,
          borderWidth: 0,
        }]
      },
      options: CHART_DEFAULTS
    });
  }

  // ── Clients Donut ──────────────────────────────────────────
  destroyChart('clients');
  const newC = data.filter(s => s.is_new_client).length;
  const recC = data.length - newC;
  const clientCtx = document.getElementById('chartClients');
  if (clientCtx) {
    adminState.charts.clients = new Chart(clientCtx, {
      type: 'doughnut',
      data: {
        labels: ['Nuevos', 'Recurrentes'],
        datasets: [{
          data: [newC, recC],
          backgroundColor: ['rgba(201,168,76,0.7)', 'rgba(150,150,150,0.3)'],
          borderColor: ['#C9A84C', '#444'],
          borderWidth: 2,
        }]
      },
      options: {
        ...CHART_DEFAULTS,
        plugins: { ...CHART_DEFAULTS.plugins, legend: { display: true, position: 'bottom', labels: { color: '#9A9A9A', font: { size: 10, family: 'Inter' }, padding: 10, boxWidth: 10 } } },
        scales: {}
      }
    });
  }
}

// ── Render Table ───────────────────────────────────────────
function renderTable(data = adminState.filtered) {
  const tbody = document.getElementById('responsesBody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No hay respuestas en este período</td></tr>';
    return;
  }

  const scoreClass = v => v >= 8 ? 'score-high' : v >= 5 ? 'score-mid' : 'score-low';

  tbody.innerHTML = data.slice(0, 200).map(s => `
    <tr>
      <td>${s.date || s.created_at?.split('T')[0] || '—'}</td>
      <td>${s.time || '—'}</td>
      <td style="color:#F5F5F5;font-weight:600">${s.barber || '—'}</td>
      <td><span class="score-pill ${scoreClass(s.satisfaction)}">${s.satisfaction}</span></td>
      <td><span class="score-pill ${scoreClass(s.attention)}">${s.attention}</span></td>
      <td><span class="score-pill ${s.nps >= 9 ? 'score-high' : s.nps >= 7 ? 'score-mid' : 'score-low'}">${s.nps}</span></td>
      <td><span class="score-pill ${scoreClass(s.cleanliness)}">${s.cleanliness}</span></td>
      <td>${s.wait_time || '—'}</td>
      <td><span class="badge ${s.is_new_client ? 'badge-new' : 'badge-rec'}">${s.is_new_client ? 'Nuevo' : 'Recurrente'}</span></td>
      <td style="color:#9A9A9A;font-size:0.78rem;max-width:180px;overflow:hidden;text-overflow:ellipsis">${s.expectations || '—'}</td>
    </tr>
  `).join('');

  document.getElementById('tableFooter').textContent = `Mostrando ${Math.min(200, data.length)} de ${data.length} registros`;
}

// ── Barbers Section ────────────────────────────────────────
function renderBarbers() {
  const data = adminState.filtered;
  const grid = document.getElementById('barbersGrid');
  const barberNames = [...new Set(data.map(s => s.barber).filter(Boolean))];

  const barberStats = barberNames.map(name => {
    const rows = data.filter(s => s.barber === name);
    const avg = field => rows.reduce((a,s) => a + (s[field] || 0), 0) / rows.length;
    return {
      name,
      count: rows.length,
      satisfaction: avg('satisfaction'),
      attention: avg('attention'),
      cleanliness: avg('cleanliness'),
      nps: avg('nps'),
    };
  }).sort((a, b) => b.satisfaction - a.satisfaction);

  const barberMap = {};
  CONFIG.BARBERS.forEach(b => { barberMap[b.name] = b.emoji; });

  grid.innerHTML = barberStats.map((b, i) => `
    <div class="barber-stat-card">
      <div class="barber-stat-header">
        <div class="barber-stat-avatar">${barberMap[b.name] || '✂️'}</div>
        <div>
          <div class="barber-stat-name">${b.name} ${i === 0 ? '🏆' : ''}</div>
          <div class="barber-stat-count">${b.count} encuestas</div>
        </div>
      </div>
      <div class="barber-metrics">
        ${[
          ['Satisfacción', b.satisfaction, 10],
          ['Atención', b.attention, 10],
          ['Limpieza', b.cleanliness, 10],
          ['NPS promedio', b.nps, 10],
        ].map(([label, val, max]) => `
          <div>
            <div class="barber-metric">
              <span>${label}</span>
              <span class="barber-metric-val">${val.toFixed(1)}</span>
            </div>
            <div class="barber-metric-bar">
              <div class="barber-metric-fill" style="width:${(val/max*100).toFixed(0)}%"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  // Barbers comparison chart
  destroyChart('barbers');
  const bCtx = document.getElementById('chartBarbers');
  if (bCtx && barberStats.length) {
    adminState.charts.barbers = new Chart(bCtx, {
      type: 'bar',
      data: {
        labels: barberStats.map(b => b.name),
        datasets: [
          { label: 'Satisfacción', data: barberStats.map(b => b.satisfaction.toFixed(1)), backgroundColor: 'rgba(201,168,76,0.7)', borderRadius: 4 },
          { label: 'Atención',     data: barberStats.map(b => b.attention.toFixed(1)),    backgroundColor: 'rgba(100,149,237,0.5)', borderRadius: 4 },
          { label: 'Limpieza',     data: barberStats.map(b => b.cleanliness.toFixed(1)),  backgroundColor: 'rgba(76,175,80,0.5)',   borderRadius: 4 },
        ]
      },
      options: {
        ...CHART_DEFAULTS,
        plugins: {
          ...CHART_DEFAULTS.plugins,
          legend: { display: true, position: 'top', labels: { color: '#9A9A9A', font: { size: 11, family: 'Inter' }, boxWidth: 10 } }
        },
        scales: { ...CHART_DEFAULTS.scales, y: { ...CHART_DEFAULTS.scales.y, min: 0, max: 10 } }
      }
    });
  }
}

// ── Insights ───────────────────────────────────────────────
function renderInsights() {
  const data = adminState.filtered;
  if (!data.length) return;

  const insights = [];
  const avg = (arr, field) => arr.reduce((a, s) => a + (s[field] || 0), 0) / arr.length;

  // NPS insight
  const npsAvg = avg(data, 'nps');
  if (npsAvg >= 8.5) {
    insights.push({ type: 'positive', icon: '🔥', title: 'Clientes promotores fuertes', desc: `NPS promedio de ${npsAvg.toFixed(1)}/10 — tus clientes están activamente recomendando la barbería.` });
  } else if (npsAvg < 7) {
    insights.push({ type: 'warning', icon: '⚠️', title: 'NPS por debajo del objetivo', desc: `Promedio NPS ${npsAvg.toFixed(1)}/10. Considera revisar la experiencia general del servicio.` });
  }

  // Wait time
  const highWait = data.filter(s => s.wait_time === 'Más de 10 minutos').length;
  const waitPct = (highWait / data.length * 100);
  if (waitPct > 20) {
    insights.push({ type: 'negative', icon: '⏱', title: 'El tiempo de espera afecta la satisfacción', desc: `${waitPct.toFixed(0)}% de clientes esperaron más de 10 minutos. Considera ajustar el sistema de citas.` });
  } else if (waitPct < 5) {
    insights.push({ type: 'positive', icon: '⚡', title: 'Gestión de tiempos excelente', desc: `Solo el ${waitPct.toFixed(0)}% de clientes esperó más de 10 min. Tu sistema de citas está funcionando muy bien.` });
  }

  // Best barber
  const barberNames = [...new Set(data.map(s => s.barber).filter(Boolean))];
  if (barberNames.length > 1) {
    const barberAvgs = barberNames.map(name => ({
      name, avg: avg(data.filter(s => s.barber === name), 'satisfaction')
    })).sort((a,b) => b.avg - a.avg);
    insights.push({ type: 'info', icon: '🏆', title: `${barberAvgs[0].name} lidera en satisfacción`, desc: `Con ${barberAvgs[0].avg.toFixed(1)}/10 de promedio en satisfacción. Compartir sus técnicas con el equipo puede elevar el estándar.` });
  }

  // New vs recurrent
  const newClients = data.filter(s => s.is_new_client);
  const recClients = data.filter(s => !s.is_new_client);
  if (newClients.length > 5 && recClients.length > 5) {
    const newAvg = avg(newClients, 'satisfaction');
    const recAvg = avg(recClients, 'satisfaction');
    if (newAvg > recAvg + 0.5) {
      insights.push({ type: 'info', icon: '👋', title: 'Los clientes nuevos califican más alto', desc: `Nuevos: ${newAvg.toFixed(1)} vs Recurrentes: ${recAvg.toFixed(1)}. La primera impresión es fuerte — mantén esa consistencia.` });
    } else if (recAvg > newAvg + 0.5) {
      insights.push({ type: 'positive', icon: '🔄', title: 'Los clientes recurrentes son más satisfechos', desc: `Recurrentes: ${recAvg.toFixed(1)} vs Nuevos: ${newAvg.toFixed(1)}. La fidelidad habla bien del servicio consistente.` });
    }
  }

  // Expectations
  const exceeded = data.filter(s => s.expectations === 'Superó mis expectativas').length;
  const exceededPct = (exceeded / data.length * 100);
  if (exceededPct > 50) {
    insights.push({ type: 'positive', icon: '🎯', title: 'La mayoría supera expectativas', desc: `${exceededPct.toFixed(0)}% de clientes dijeron que superaste sus expectativas. Eso es diferenciación real.` });
  }

  // Satisfaction trend (if enough data)
  if (insights.length < 3) {
    const satAvg = avg(data, 'satisfaction');
    insights.push({ type: satAvg >= 8 ? 'positive' : 'warning', icon: '📈', title: `Satisfacción general: ${satAvg.toFixed(1)}/10`, desc: satAvg >= 9 ? 'Nivel de excelencia. Mantén los estándares.' : satAvg >= 7 ? 'Buen nivel. Identifica los puntos de mejora para llegar a 9+.' : 'Hay oportunidades claras de mejora. Revisa los comentarios.' });
  }

  const grid = document.getElementById('insightsGrid');
  grid.innerHTML = insights.map(ins => `
    <div class="insight-card">
      <div class="insight-icon ${ins.type}"><span>${ins.icon}</span></div>
      <div class="insight-body">
        <div class="insight-title">${ins.title}</div>
        <div class="insight-desc">${ins.desc}</div>
      </div>
    </div>
  `).join('');

  // Comments
  const liked = data.filter(s => s.liked_most).slice(0, 8);
  const improve = data.filter(s => s.improvement).slice(0, 8);

  document.getElementById('likedComments').innerHTML = liked.length
    ? liked.map(s => `<div class="comment-item">${s.liked_most}<div class="comment-meta">${s.barber || ''} · ${s.date || ''}</div></div>`).join('')
    : '<div class="comment-item" style="color:#5A5A5A">Sin comentarios en este período.</div>';

  document.getElementById('improveComments').innerHTML = improve.length
    ? improve.map(s => `<div class="comment-item">${s.improvement}<div class="comment-meta">${s.barber || ''} · ${s.date || ''}</div></div>`).join('')
    : '<div class="comment-item" style="color:#5A5A5A">Sin sugerencias en este período.</div>';
}

// ── Exports ────────────────────────────────────────────────
function exportToCSV() {
  const data = adminState.filtered;
  if (!data.length) return toast('No hay datos para exportar', 'error');
  const headers = ['ID','Fecha','Hora','Barbero','Satisfacción','Atención','NPS','Limpieza','Espera','Tipo Cliente','Expectativas','Lo que gustó','Mejoras'];
  const rows = data.map(s => [
    s.id || '', s.date || '', s.time || '', s.barber || '',
    s.satisfaction, s.attention, s.nps, s.cleanliness,
    s.wait_time || '', s.is_new_client ? 'Nuevo' : 'Recurrente',
    s.expectations || '', (s.liked_most || '').replace(/,/g, ';'), (s.improvement || '').replace(/,/g, ';')
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  downloadFile(`danycutsz_encuestas_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv', csv);
  toast('CSV exportado ✓', 'success');
}

function exportToExcel() {
  const data = adminState.filtered;
  if (!data.length) return toast('No hay datos para exportar', 'error');
  const ws_data = [
    ['ID','Fecha','Hora','Barbero','Satisfacción','Atención','NPS','Limpieza','Espera','Tipo','Expectativas','Lo que gustó','Mejoras'],
    ...data.map(s => [
      s.id || '', s.date || '', s.time || '', s.barber || '',
      s.satisfaction, s.attention, s.nps, s.cleanliness,
      s.wait_time || '', s.is_new_client ? 'Nuevo' : 'Recurrente',
      s.expectations || '', s.liked_most || '', s.improvement || ''
    ])
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  ws['!cols'] = [8,12,8,14,12,10,6,10,18,12,22,30,30].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Encuestas');
  XLSX.writeFile(wb, `danycutsz_${new Date().toISOString().split('T')[0]}.xlsx`);
  toast('Excel exportado ✓', 'success');
}

function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const stats = computeStats(adminState.filtered);
  if (!stats) return toast('No hay datos', 'error');
  const doc = new jsPDF();
  const gold = [201, 168, 76];

  doc.setFillColor(8, 8, 8);
  doc.rect(0, 0, 210, 297, 'F');

  doc.setTextColor(...gold);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('danycutsz', 20, 30);

  doc.setTextColor(245, 245, 245);
  doc.setFontSize(13);
  doc.text('Reporte de Satisfacción al Cliente', 20, 42);

  doc.setTextColor(90, 90, 90);
  doc.setFontSize(9);
  const dateStr = new Date().toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' });
  doc.text(`Generado: ${dateStr} · Período: ${adminState.daysFilter === 0 ? 'Todo' : `últimos ${adminState.daysFilter} días`}`, 20, 52);

  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(20, 58, 190, 58);

  const metrics = [
    ['Total de encuestas', stats.total],
    ['Satisfacción promedio', `${stats.satisfaction.toFixed(1)}/10`],
    ['Atención promedio', `${stats.attention.toFixed(1)}/10`],
    ['Ambiente y limpieza', `${stats.cleanliness.toFixed(1)}/10`],
    ['NPS General', `${stats.nps} pts`],
    ['Clientes nuevos', stats.newClients],
    ['Clientes recurrentes', stats.recurrents],
  ];

  let y = 72;
  doc.setFontSize(10);
  metrics.forEach(([label, val]) => {
    doc.setTextColor(90, 90, 90);
    doc.setFont('helvetica', 'normal');
    doc.text(label, 20, y);
    doc.setTextColor(...gold);
    doc.setFont('helvetica', 'bold');
    doc.text(String(val), 160, y, { align: 'right' });
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.2);
    doc.line(20, y + 3, 190, y + 3);
    y += 12;
  });

  y += 8;
  doc.setTextColor(245, 245, 245);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Comentarios destacados', 20, y);
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const likedOnes = adminState.filtered.filter(s => s.liked_most).slice(0, 5);
  likedOnes.forEach(s => {
    doc.setTextColor(150, 150, 150);
    const lines = doc.splitTextToSize(`"${s.liked_most}"`, 165);
    doc.text(lines, 25, y);
    y += lines.length * 5 + 4;
  });

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8);
  doc.text('danycutsz © ' + new Date().getFullYear() + ' · Reporte confidencial', 20, 287);

  doc.save(`danycutsz_reporte_${new Date().toISOString().split('T')[0]}.pdf`);
  toast('PDF exportado ✓', 'success');
}

function downloadFile(filename, type, content) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Navigation ──────────────────────────────────────────────
function initNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      item.classList.add('active');
      document.getElementById(`section-${section}`)?.classList.add('active');
      document.getElementById('pageTitle').textContent = {
        overview: 'Resumen', responses: 'Respuestas', barbers: 'Barberos', insights: 'Insights'
      }[section] || 'Dashboard';
      adminState.currentSection = section;
    });
  });
}

// ── Date Range Buttons ──────────────────────────────────────
function initRangeButtons() {
  document.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilter(parseInt(btn.dataset.days));
    });
  });
}

// ── Search ──────────────────────────────────────────────────
function initSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    const filtered = adminState.filtered.filter(s =>
      (s.barber || '').toLowerCase().includes(q) ||
      (s.liked_most || '').toLowerCase().includes(q) ||
      (s.improvement || '').toLowerCase().includes(q) ||
      (s.expectations || '').toLowerCase().includes(q)
    );
    renderTable(filtered);
  });
}

// ── Render All ──────────────────────────────────────────────
function renderAll() {
  renderKPIs();
  renderCharts();
  renderTable();
  renderBarbers();
  renderInsights();
}

// ── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  initNav();
  initRangeButtons();
  initSearch();

  document.getElementById('btnRefresh')?.addEventListener('click', loadData);
  document.getElementById('btnExportCSV')?.addEventListener('click', exportToCSV);
  document.getElementById('btnExportExcel')?.addEventListener('click', exportToExcel);
  document.getElementById('btnExportPDF')?.addEventListener('click', exportToPDF);
});
