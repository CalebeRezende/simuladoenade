
function getWebAppUrl_() {
  const url = window.SHEETS_WEBAPP_URL;
  if (!url || url.includes("COLE_AQUI")) {
    throw new Error("Planilha não configurada. Edite o arquivo config.js com a URL do Apps Script.");
  }
  return url;
}

export function isConfigured() {
  try {
    getWebAppUrl_();
    return true;
  } catch (err) {
    return false;
  }
}

async function postToSheet_(body) {
  const url = getWebAppUrl_();

  // Content-Type text/plain evita o preflight CORS que o Apps Script não responde corretamente.
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body)
  });

  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Erro desconhecido ao falar com a planilha.");
  return json;
}

export async function submitAttempt(payload) {
  const json = await postToSheet_(payload);
  return json.id;
}

export async function listAttempts(password) {
  const json = await postToSheet_({ action: "list", password });
  return json.data;
}

export async function deleteAttempt(id, password) {
  await postToSheet_({ action: "delete", id, password });
}
