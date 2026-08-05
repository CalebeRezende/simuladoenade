# Simulado ENADE/PND 2025 — Pedagogia com Google Sheets

Esta versão foi pensada para publicar no **GitHub Pages** e salvar os resultados de graça numa **Google Sheets**, usando um Apps Script como backend.

## O que esta versão faz

- Mostra o PDF da prova.
- Permite escolher a prova/caderno e o gabarito separadamente.
- Dá 4 horas para responder.
- Bloqueia as respostas depois de finalizar.
- Esconde o cartão-resposta depois da finalização.
- Mostra a nota no formato `X de 80`.
- Salva na planilha:
  - nome;
  - e-mail opcional;
  - prova escolhida;
  - gabarito usado;
  - respostas;
  - correção questão a questão;
  - acertos, erros, brancos e anuladas;
  - início, envio e duração.
- Tem painel admin em `admin.html`, com ranking das questões mais erradas.
- Exporta CSV.

## Como configurar a planilha (Google Apps Script)

1. Crie uma planilha em [sheets.google.com](https://sheets.google.com).
2. Vá em **Extensões > Apps Script**.
3. Apague o conteúdo padrão e cole o conteúdo do arquivo [`google-apps-script/Code.gs`](google-apps-script/Code.gs) deste repositório.
4. No topo do script, troque o valor de `ADMIN_PASSWORD` pela senha que você vai usar para entrar em `admin.html`.
5. Clique em **Implantar > Nova implantação**.
   - Tipo: **Aplicativo da Web**.
   - Executar como: **Eu**.
   - Quem tem acesso: **Qualquer pessoa**.
6. Copie a URL do Web App gerada.
7. Abra o arquivo `config.js` e cole a URL:

```js
window.SHEETS_WEBAPP_URL = "https://script.google.com/macros/s/SEU_ID/exec";
```

A primeira tentativa enviada já cria a aba `attempts` e os cabeçalhos automaticamente.

### Sempre que editar o Code.gs

Toda alteração no script exige uma **nova implantação** (ou editar a implantação existente em **Implantar > Gerenciar implantações**) para o site passar a usar a versão nova.

## Como entrar no admin

Abra `admin.html` e digite a senha definida em `ADMIN_PASSWORD` no `Code.gs`. Não existe cadastro de usuário — é só essa senha, validada pelo próprio Apps Script.

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie todos estes arquivos para o repositório:
   - `index.html`
   - `admin.html`
   - `config.js`
   - pasta `assets`
   - pasta `pdfs`
3. Vá em **Settings > Pages**.
4. Em **Build and deployment**, escolha:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Salve.

Depois o simulado ficará disponível na URL do GitHub Pages.

## Observação sobre o PDF Tipo 2

O arquivo `pdfs/prova_tipo_2_substituir.pdf` está como placeholder. Substitua pelo PDF correto do Tipo 2 se você for usar esse caderno.

## Teste local simples

Como os arquivos usam módulos JavaScript, rode um servidor local simples:

```bash
python3 -m http.server 8000
```

Depois abra:

```text
http://localhost:8000
```
