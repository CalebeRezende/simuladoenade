// Cole este código no editor do Apps Script (Extensões > Apps Script) de uma
// planilha do Google Sheets. Depois publique como Web App (Implantar > Nova
// implantação > Tipo: Aplicativo da Web > Executar como: Eu > Quem tem
// acesso: Qualquer pessoa) e copie a URL para o config.js do site.

var ADMIN_PASSWORD = "TROQUE_ESTA_SENHA";
var SHEET_NAME = "attempts";

var HEADERS = [
  "id", "created_at", "nome", "email", "prova_codigo", "prova_label",
  "gabarito_codigo", "gabarito_label", "respostas", "correcao",
  "acertos", "erros", "em_branco", "anuladas", "total_questoes",
  "nota_texto", "percentual", "iniciado_em", "enviado_em",
  "duracao_segundos", "user_agent"
];

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    if (body.action === "list") {
      if (body.password !== ADMIN_PASSWORD) {
        return jsonResponse_({ ok: false, error: "Senha incorreta." });
      }
      return jsonResponse_({ ok: true, data: listAttempts_() });
    }

    return jsonResponse_({ ok: true, id: insertAttempt_(body) });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

function insertAttempt_(payload) {
  var sheet = getSheet_();
  var id = Utilities.getUuid();
  var row = [
    id,
    new Date().toISOString(),
    payload.nome || "",
    payload.email || "",
    payload.prova_codigo || "",
    payload.prova_label || "",
    payload.gabarito_codigo || "",
    payload.gabarito_label || "",
    JSON.stringify(payload.respostas || {}),
    JSON.stringify(payload.correcao || []),
    payload.acertos || 0,
    payload.erros || 0,
    payload.em_branco || 0,
    payload.anuladas || 0,
    payload.total_questoes || 80,
    payload.nota_texto || "",
    payload.percentual || 0,
    payload.iniciado_em || "",
    payload.enviado_em || "",
    payload.duracao_segundos || 0,
    payload.user_agent || ""
  ];
  sheet.appendRow(row);
  return id;
}

function listAttempts_() {
  var sheet = getSheet_();
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var headers = values[0];
  var rows = values.slice(1).map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    obj.respostas = safeParse_(obj.respostas, {});
    obj.correcao = safeParse_(obj.correcao, []);
    return obj;
  });
  return rows.reverse();
}

function safeParse_(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (e) {
    return fallback;
  }
}
