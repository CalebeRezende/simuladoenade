
import { isConfigured, listAttempts, deleteAttempt } from "./dataClient.js";

const PASSWORD_KEY = "enade_admin_password";
let attemptsCache = [];

const el = (id) => document.getElementById(id);

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value).replaceAll('"', '""');
  return `"${str}"`;
}

async function tryLoad(password) {
  try {
    attemptsCache = await listAttempts(password);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function init() {
  if (!isConfigured()) {
    el("loginStatus").innerHTML = `<div class="alerta warn"><strong>Configuração pendente:</strong> edite o arquivo config.js com a URL do Apps Script.</div>`;
    showLogin();
    return;
  }

  const savedPassword = sessionStorage.getItem(PASSWORD_KEY);
  if (savedPassword) {
    const result = await tryLoad(savedPassword);
    if (result.ok) { showDashboard(); return; }
    sessionStorage.removeItem(PASSWORD_KEY);
  }

  showLogin();
}

function showLogin() {
  el("loginPanel").style.display = "block";
  el("dashboardPanel").style.display = "none";
}

function showDashboard() {
  el("loginPanel").style.display = "none";
  el("dashboardPanel").style.display = "block";
  renderKpis();
  renderTable(attemptsCache);
  renderQuestionStats();
}

async function login() {
  const password = el("adminPassword").value;
  el("loginStatus").textContent = "Entrando...";

  const result = await tryLoad(password);
  if (!result.ok) {
    el("loginStatus").innerHTML = `<div class="alerta warn"><strong>Erro:</strong> ${result.error}</div>`;
    return;
  }

  sessionStorage.setItem(PASSWORD_KEY, password);
  el("loginStatus").textContent = "";
  showDashboard();
}

function logout() {
  sessionStorage.removeItem(PASSWORD_KEY);
  attemptsCache = [];
  showLogin();
}

async function loadAttempts() {
  const password = sessionStorage.getItem(PASSWORD_KEY);
  if (!password) { showLogin(); return; }

  el("tableBody").innerHTML = `<tr><td colspan="9">Carregando...</td></tr>`;

  const result = await tryLoad(password);
  if (!result.ok) {
    el("tableBody").innerHTML = `<tr><td colspan="9">Erro ao carregar: ${result.error}</td></tr>`;
    return;
  }

  renderKpis();
  renderTable(attemptsCache);
  renderQuestionStats();
}

function getFilteredData() {
  const q = el("searchBox").value.trim().toLowerCase();
  if (!q) return attemptsCache;

  return attemptsCache.filter(a => {
    const hay = [
      a.nome, a.email, a.prova_label, a.gabarito_label, a.nota_texto, a.enviado_em
    ].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

function renderKpis() {
  const data = getFilteredData();
  const total = data.length;
  const media = total ? data.reduce((acc, a) => acc + Number(a.acertos || 0), 0) / total : 0;
  const maior = total ? Math.max(...data.map(a => Number(a.acertos || 0))) : 0;
  const menor = total ? Math.min(...data.map(a => Number(a.acertos || 0))) : 0;

  el("kpis").innerHTML = `
    <div class="kpi"><span>Total de tentativas</span><strong>${total}</strong></div>
    <div class="kpi"><span>Média de acertos</span><strong>${media.toFixed(1)} de 80</strong></div>
    <div class="kpi"><span>Maior nota</span><strong>${maior} de 80</strong></div>
    <div class="kpi"><span>Menor nota</span><strong>${menor} de 80</strong></div>
  `;
}

function renderTable(data) {
  if (!data.length) {
    el("tableBody").innerHTML = `<tr><td colspan="9">Nenhuma tentativa encontrada.</td></tr>`;
    return;
  }

  el("tableBody").innerHTML = data.map(a => `
    <tr>
      <td><strong>${a.nome || "—"}</strong><br><span class="muted">${a.email || ""}</span></td>
      <td>${a.nota_texto || `${a.acertos} de ${a.total_questoes || 80}`}<br><span class="pill">${a.percentual || 0}%</span></td>
      <td>${a.acertos}</td>
      <td>${a.erros}</td>
      <td>${a.em_branco}</td>
      <td>${a.prova_label || a.prova_codigo}<br><span class="muted">${a.gabarito_label || a.gabarito_codigo}</span></td>
      <td>${formatDate(a.enviado_em)}<br><span class="muted">Duração: ${formatDuration(a.duracao_segundos)}</span></td>
      <td>${formatDate(a.iniciado_em)}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="secondary" data-action="view" data-id="${a.id}">Ver</button>
          <button class="danger" data-action="delete" data-id="${a.id}">Apagar</button>
        </div>
      </td>
    </tr>
  `).join("");

  el("tableBody").querySelectorAll("button[data-action='view']").forEach(btn => {
    btn.addEventListener("click", () => showDetails(btn.dataset.id));
  });

  el("tableBody").querySelectorAll("button[data-action='delete']").forEach(btn => {
    btn.addEventListener("click", () => handleDelete(btn.dataset.id));
  });
}

async function handleDelete(id) {
  if (!confirm("Apagar esta tentativa? Essa ação não pode ser desfeita.")) return;

  const password = sessionStorage.getItem(PASSWORD_KEY);
  try {
    await deleteAttempt(id, password);
    await loadAttempts();
  } catch (err) {
    alert("Erro ao apagar: " + err.message);
  }
}

function populateQuestionStatsFilter() {
  const select = el("questionStatsFilter");
  const combos = new Map();
  attemptsCache.forEach(a => {
    if (a.gabarito_codigo) combos.set(a.gabarito_codigo, a.gabarito_label || a.gabarito_codigo);
  });

  const previous = select.value;
  select.innerHTML = Array.from(combos.entries())
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");

  if (combos.has(previous)) select.value = previous;
}

function computeQuestionStats(gabaritoCodigo) {
  const stats = new Map();

  attemptsCache
    .filter(a => a.gabarito_codigo === gabaritoCodigo)
    .forEach(a => {
      const rows = Array.isArray(a.correcao) ? a.correcao : [];
      rows.forEach(r => {
        if (r.official === "ANULADA") return;

        if (!stats.has(r.q)) {
          stats.set(r.q, { q: r.q, official: r.official, total: 0, ok: 0, wrong: 0, blank: 0 });
        }
        const s = stats.get(r.q);
        s.total++;
        if (r.status === "ok") s.ok++;
        else if (!r.selected || r.selected === "—") s.blank++;
        else s.wrong++;
      });
    });

  return Array.from(stats.values())
    .map(s => ({ ...s, errorRate: s.total ? ((s.wrong + s.blank) / s.total) * 100 : 0 }))
    .sort((a, b) => b.errorRate - a.errorRate || a.q - b.q);
}

function renderQuestionStats() {
  populateQuestionStatsFilter();
  const select = el("questionStatsFilter");
  const gabaritoCodigo = select.value;

  if (!gabaritoCodigo) {
    el("questionStatsBody").innerHTML = `<tr><td colspan="7">Nenhuma tentativa encontrada ainda.</td></tr>`;
    return;
  }

  const stats = computeQuestionStats(gabaritoCodigo);

  if (!stats.length) {
    el("questionStatsBody").innerHTML = `<tr><td colspan="7">Sem dados para este gabarito.</td></tr>`;
    return;
  }

  el("questionStatsBody").innerHTML = stats.map(s => `
    <tr>
      <td><strong>Q${String(s.q).padStart(2,"0")}</strong></td>
      <td>${s.official}</td>
      <td>${s.total}</td>
      <td>${s.ok}</td>
      <td>${s.wrong}</td>
      <td>${s.blank}</td>
      <td><span class="pill${s.errorRate >= 50 ? " erroAlto" : ""}">${s.errorRate.toFixed(0)}%</span></td>
    </tr>
  `).join("");
}

function applyFilter() {
  renderKpis();
  renderTable(getFilteredData());
}

function showDetails(id) {
  const a = attemptsCache.find(item => item.id === id);
  if (!a) return;

  const rows = Array.isArray(a.correcao) ? a.correcao : [];
  el("detailContent").innerHTML = `
    <h2>${a.nome || "Participante"}</h2>
    <p><strong>Nota:</strong> ${a.nota_texto || `${a.acertos} de ${a.total_questoes || 80}`} — ${a.percentual || 0}%</p>
    <p class="muted">
      Prova: ${a.prova_label || a.prova_codigo}<br>
      Gabarito: ${a.gabarito_label || a.gabarito_codigo}<br>
      Início: ${formatDate(a.iniciado_em)}<br>
      Envio: ${formatDate(a.enviado_em)}<br>
      Duração: ${formatDuration(a.duracao_segundos)}
    </p>
    <h3>Correção questão a questão</h3>
    <div class="correcao">
      ${rows.map(r => `<div class="corrItem ${r.status}"><strong>Q${String(r.q).padStart(2,"0")}</strong><br>Você: ${r.selected || "—"}<br>Gab.: ${r.official}</div>`).join("")}
    </div>
  `;

  el("detailDialog").showModal();
}

function exportCsv() {
  const data = getFilteredData();

  const headers = [
    "nome", "email", "nota_texto", "percentual", "acertos", "erros", "em_branco", "anuladas",
    "prova_label", "gabarito_label", "iniciado_em", "enviado_em", "duracao_segundos", "respostas_json"
  ];

  const lines = [
    headers.join(","),
    ...data.map(a => [
      a.nome,
      a.email,
      a.nota_texto,
      a.percentual,
      a.acertos,
      a.erros,
      a.em_branco,
      a.anuladas,
      a.prova_label,
      a.gabarito_label,
      a.iniciado_em,
      a.enviado_em,
      a.duracao_segundos,
      JSON.stringify(a.respostas || {})
    ].map(csvEscape).join(","))
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `resultados_simulado_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

el("loginBtn").addEventListener("click", login);
el("logoutBtn").addEventListener("click", logout);
el("refreshBtn").addEventListener("click", loadAttempts);
el("exportBtn").addEventListener("click", exportCsv);
el("searchBox").addEventListener("input", applyFilter);
el("questionStatsFilter").addEventListener("change", renderQuestionStats);
el("closeDialog").addEventListener("click", () => el("detailDialog").close());

init();
