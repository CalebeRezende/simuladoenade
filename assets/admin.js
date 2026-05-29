
import { getSupabase } from "./supabaseClient.js";

let supabase = null;
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

async function init() {
  try {
    supabase = getSupabase();
  } catch (err) {
    el("loginStatus").innerHTML = `<div class="alerta warn"><strong>Configuração pendente:</strong> ${err.message}</div>`;
    return;
  }

  const { data } = await supabase.auth.getSession();
  if (data?.session) showDashboard();
  else showLogin();
}

function showLogin() {
  el("loginPanel").style.display = "block";
  el("dashboardPanel").style.display = "none";
}

async function showDashboard() {
  el("loginPanel").style.display = "none";
  el("dashboardPanel").style.display = "block";
  await loadAttempts();
}

async function login() {
  const email = el("adminEmail").value.trim();
  const password = el("adminPassword").value;

  el("loginStatus").textContent = "Entrando...";

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    el("loginStatus").innerHTML = `<div class="alerta warn"><strong>Erro:</strong> ${error.message}</div>`;
    return;
  }

  el("loginStatus").textContent = "";
  showDashboard();
}

async function logout() {
  await supabase.auth.signOut();
  showLogin();
}

async function loadAttempts() {
  el("tableBody").innerHTML = `<tr><td colspan="9">Carregando...</td></tr>`;

  const { data, error } = await supabase
    .from("attempts")
    .select("*")
    .order("enviado_em", { ascending: false });

  if (error) {
    el("tableBody").innerHTML = `<tr><td colspan="9">Erro ao carregar: ${error.message}</td></tr>`;
    return;
  }

  attemptsCache = data || [];
  renderKpis();
  renderTable(attemptsCache);
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
      <td><button class="secondary" data-id="${a.id}">Ver</button></td>
    </tr>
  `).join("");

  el("tableBody").querySelectorAll("button[data-id]").forEach(btn => {
    btn.addEventListener("click", () => showDetails(btn.dataset.id));
  });
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
el("closeDialog").addEventListener("click", () => el("detailDialog").close());

init();
