
import { GABARITOS, PDFS, GABARITO_LABELS, TOTAL_QUESTOES, DURACAO_MS } from "./gabaritos.js";
import { getSupabase } from "./supabaseClient.js";

let supabase = null;
try {
  supabase = getSupabase();
} catch (err) {
  console.warn(err.message);
}

let state = null;
let interval = null;

const el = (id) => document.getElementById(id);
const now = () => Date.now();

function comboKey() {
  return "enade_pedagogia_supabase_" + el("pdfSelect").value + "_" + el("keySelect").value;
}

function defaultState() {
  return {
    pdf: el("pdfSelect").value,
    key: el("keySelect").value,
    startedAt: null,
    submittedAt: null,
    name: "",
    email: "",
    answers: {},
    savedRemoteId: null
  };
}

function hydrateSelects() {
  const pdfSelect = el("pdfSelect");
  const keySelect = el("keySelect");

  pdfSelect.innerHTML = Object.entries(PDFS).map(([value, data]) =>
    `<option value="${value}">${data.label}</option>`
  ).join("");

  keySelect.innerHTML = Object.entries(GABARITO_LABELS).map(([value, label]) =>
    `<option value="${value}">${label}</option>`
  ).join("");
}

function loadState() {
  try {
    state = JSON.parse(localStorage.getItem(comboKey())) || defaultState();
  } catch(e) {
    state = defaultState();
  }

  state.pdf = el("pdfSelect").value;
  state.key = el("keySelect").value;
  el("studentName").value = state.name || "";
  el("studentEmail").value = state.email || "";
}

function saveState() {
  if (!state) loadState();
  state.name = el("studentName").value.trim();
  state.email = el("studentEmail").value.trim();
  state.pdf = el("pdfSelect").value;
  state.key = el("keySelect").value;
  localStorage.setItem(comboKey(), JSON.stringify(state));
}

function timeLeft() {
  if (!state || !state.startedAt) return DURACAO_MS;
  return Math.max(0, DURACAO_MS - (now() - state.startedAt));
}

function formatMs(ms) {
  const total = Math.ceil(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2,"0");
  const m = String(Math.floor((total % 3600)/60)).padStart(2,"0");
  const s = String(total % 60).padStart(2,"0");
  return `${h}:${m}:${s}`;
}

function isLocked() {
  return !!state?.submittedAt || (state?.startedAt && timeLeft() <= 0);
}

function tick() {
  const remaining = timeLeft();
  el("timer").textContent = formatMs(remaining);
  el("timer").style.background = remaining <= 10*60*1000 ? "#fee4e2" : "#fff3cd";
  if (remaining <= 0) {
    el("timer").textContent = "Tempo encerrado";
    lockForm(true);
    clearInterval(interval);
  }
}

function updatePdf() {
  const pdf = PDFS[el("pdfSelect").value].file;
  el("pdfViewer").data = pdf + "#view=FitH";
}

function renderQuestions() {
  const container = el("questoes");
  container.innerHTML = "";
  const gab = GABARITOS[state.key];

  for (let i=1; i<=TOTAL_QUESTOES; i++) {
    const ans = gab[i];
    const div = document.createElement("div");
    div.className = "q" + (state.answers[i] ? " answered" : "") + (ans === "ANULADA" ? " anulada" : "");
    div.dataset.q = i;

    const qnum = document.createElement("div");
    qnum.className = "qnum";
    qnum.innerHTML = `<span>Q${String(i).padStart(2,"0")}</span>${ans === "ANULADA" ? '<span class="badge">anulada</span>' : ''}`;
    div.appendChild(qnum);

    const alts = document.createElement("div");
    alts.className = "alts";
    ["A","B","C","D"].forEach(letter => {
      const lab = document.createElement("label");
      const checked = state.answers[i] === letter ? "checked" : "";
      const disabled = ans === "ANULADA" ? "disabled" : "";
      lab.innerHTML = `<input type="radio" name="q${i}" value="${letter}" ${checked} ${disabled}> ${letter}`;
      alts.appendChild(lab);
    });

    div.appendChild(alts);
    container.appendChild(div);
  }

  container.querySelectorAll("input[type=radio]").forEach(input => {
    input.addEventListener("change", (e) => {
      if (isLocked()) return;
      const q = e.target.name.replace("q","");
      state.answers[q] = e.target.value;
      e.target.closest(".q").classList.add("answered");
      saveState();
    });
  });

  lockForm(isLocked());
}

function lockForm(lock) {
  const submitted = !!state?.submittedAt;
  document.body.classList.toggle("submitted", submitted);

  document.querySelectorAll("#answerForm input").forEach(i => {
    const q = parseInt(i.name.replace("q",""));
    i.disabled = lock || GABARITOS[state.key][q] === "ANULADA";
  });

  el("pdfSelect").disabled = submitted;
  el("keySelect").disabled = submitted;
  el("studentName").disabled = submitted;
  el("studentEmail").disabled = submitted;
  el("startBtn").disabled = submitted;
  el("saveBtn").disabled = !state?.startedAt || lock;
  el("submitBtn").disabled = !state?.startedAt || lock;
  el("printBtn").disabled = !submitted;
}

function startAttempt() {
  loadState();

  if (!state.name) {
    alert("Digite o nome da pessoa antes de iniciar.");
    el("studentName").focus();
    return;
  }

  if (!state.startedAt) state.startedAt = now();

  saveState();
  el("saveBtn").disabled = false;
  el("submitBtn").disabled = false;
  renderQuestions();
  tick();

  clearInterval(interval);
  interval = setInterval(tick, 1000);
}

function score() {
  saveState();

  const gab = GABARITOS[state.key];
  let correct = 0, wrong = 0, blank = 0, anuladas = 0;
  const rows = [];

  for (let i=1; i<=TOTAL_QUESTOES; i++) {
    const official = gab[i];
    const selected = state.answers[i] || "";

    if (official === "ANULADA") {
      correct++;
      anuladas++;
      rows.push({q:i, status:"auto", official, selected});
    } else if (!selected) {
      blank++;
      rows.push({q:i, status:"err", official, selected:"—"});
    } else if (selected === official) {
      correct++;
      rows.push({q:i, status:"ok", official, selected});
    } else {
      wrong++;
      rows.push({q:i, status:"err", official, selected});
    }
  }

  return {correct, wrong, blank, anuladas, rows};
}

async function saveAttemptRemote(s) {
  if (!supabase) {
    throw new Error("Supabase não configurado. Edite config.js antes de publicar.");
  }

  const startedIso = new Date(state.startedAt).toISOString();
  const submittedIso = new Date(state.submittedAt).toISOString();
  const duracaoSegundos = Math.round((state.submittedAt - state.startedAt) / 1000);

  const payload = {
    nome: state.name || "Participante",
    email: state.email || null,
    prova_codigo: state.pdf,
    prova_label: PDFS[state.pdf].label,
    gabarito_codigo: state.key,
    gabarito_label: GABARITO_LABELS[state.key],
    respostas: state.answers,
    correcao: s.rows,
    acertos: s.correct,
    erros: s.wrong,
    em_branco: s.blank,
    anuladas: s.anuladas,
    total_questoes: TOTAL_QUESTOES,
    nota_texto: `${s.correct} de ${TOTAL_QUESTOES}`,
    percentual: Number(((s.correct / TOTAL_QUESTOES) * 100).toFixed(2)),
    iniciado_em: startedIso,
    enviado_em: submittedIso,
    duracao_segundos: duracaoSegundos,
    user_agent: navigator.userAgent
  };

  const { data, error } = await supabase
    .from("attempts")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw error;
  state.savedRemoteId = data.id;
  saveState();
}

async function submitExam() {
  if (!state.startedAt) return;

  if (!confirm("Finalizar a prova agora? Depois disso, as respostas e o gabarito de correção não poderão mais ser alterados nesta tentativa.")) {
    return;
  }

  state.submittedAt = now();
  saveState();

  const s = score();
  showResult(s, "Salvando no banco de dados...");

  try {
    await saveAttemptRemote(s);
    showResult(s, "Resultado salvo no Supabase.");
  } catch (err) {
    console.error(err);
    showResult(s, "A correção foi feita, mas não consegui salvar no Supabase. Verifique o arquivo config.js, o SQL do banco e as políticas de acesso.");
  }

  lockForm(true);
  clearInterval(interval);
  el("resultado").scrollIntoView({behavior:"smooth", block:"start"});
}

function showResult(s, saveMessage = "") {
  const nome = state.name ? state.name : "Participante";
  const perc = Math.round((s.correct/TOTAL_QUESTOES)*100);
  const provaNome = PDFS[state.pdf].label;
  const gabNome = GABARITO_LABELS[state.key];

  const html = `
    <h2>Resultado</h2>
    <div class="score">${s.correct} de ${TOTAL_QUESTOES}</div>
    <p><strong>${nome}</strong> — ${perc}% de aproveitamento.</p>
    ${saveMessage ? `<p class="alerta"><strong>Status:</strong> ${saveMessage}</p>` : ""}
    <p class="muted">Prova selecionada: ${provaNome}<br>Gabarito usado: ${gabNome}</p>
    <div class="detalhes">
      <div class="mini"><strong>Acertos</strong><br>${s.correct}</div>
      <div class="mini"><strong>Erros</strong><br>${s.wrong}</div>
      <div class="mini"><strong>Em branco</strong><br>${s.blank}</div>
      <div class="mini"><strong>Anuladas</strong><br>${s.anuladas}</div>
    </div>
    <h3>Correção questão a questão</h3>
    <div class="correcao">
      ${s.rows.map(r => `<div class="corrItem ${r.status}"><strong>Q${String(r.q).padStart(2,"0")}</strong><br>Você: ${r.selected || "—"}<br>Gab.: ${r.official}</div>`).join("")}
    </div>
  `;

  el("resultado").innerHTML = html;
  el("resultado").style.display = "block";
  el("printBtn").disabled = false;
}

function resetAttempt() {
  if (!confirm("Tem certeza que deseja zerar esta tentativa e apagar as respostas desta combinação de prova e gabarito neste navegador?")) {
    return;
  }

  localStorage.removeItem(comboKey());
  document.body.classList.remove("submitted");

  el("pdfSelect").disabled = false;
  el("keySelect").disabled = false;
  el("studentName").disabled = false;
  el("studentEmail").disabled = false;
  el("startBtn").disabled = false;

  loadState();
  el("resultado").style.display = "none";
  renderQuestions();
  el("timer").textContent = "04:00:00";
  el("timer").style.background = "#fff3cd";
  clearInterval(interval);
  el("saveBtn").disabled = true;
  el("submitBtn").disabled = true;
  el("printBtn").disabled = true;
}

function switchExamOrKey() {
  if (!state?.submittedAt) {
    const pdfSuggestedKey = PDFS[el("pdfSelect").value].suggestedKey;
    if (el("keySelect").value !== pdfSuggestedKey) {
      const ok = confirm("O gabarito selecionado parece não corresponder à prova. Deseja ajustar automaticamente?");
      if (ok) el("keySelect").value = pdfSuggestedKey;
    }
  }

  loadState();
  updatePdf();
  el("resultado").style.display = state.submittedAt ? "block" : "none";
  renderQuestions();

  if (state.startedAt && !state.submittedAt) {
    tick();
    clearInterval(interval);
    interval = setInterval(tick, 1000);
  } else {
    el("timer").textContent = state.startedAt ? (state.submittedAt ? "Finalizada" : formatMs(timeLeft())) : "04:00:00";
  }

  if (state.submittedAt) showResult(score(), state.savedRemoteId ? "Resultado já salvo no Supabase." : "");
}

function showConfigWarning() {
  if (!supabase) {
    const div = document.createElement("div");
    div.className = "alerta warn";
    div.innerHTML = "<strong>Supabase ainda não configurado:</strong> edite o arquivo <code>config.js</code> com a URL e a anon key do seu projeto antes de publicar.";
    document.querySelector("main").prepend(div);
  }
}

hydrateSelects();

el("startBtn").addEventListener("click", startAttempt);
el("saveBtn").addEventListener("click", () => { saveState(); alert("Respostas salvas neste navegador."); });
el("submitBtn").addEventListener("click", submitExam);
el("resetBtn").addEventListener("click", resetAttempt);
el("printBtn").addEventListener("click", () => window.print());
el("pdfSelect").addEventListener("change", switchExamOrKey);
el("keySelect").addEventListener("change", switchExamOrKey);
el("studentName").addEventListener("input", saveState);
el("studentEmail").addEventListener("input", saveState);

loadState();
updatePdf();
renderQuestions();
switchExamOrKey();
showConfigWarning();
