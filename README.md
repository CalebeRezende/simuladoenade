# Simulado ENADE/PND 2025 — Pedagogia com Supabase

Esta versão foi pensada para publicar no **GitHub Pages** e salvar os resultados em um banco pequeno no **Supabase**.

## O que esta versão faz

- Mostra o PDF da prova.
- Permite escolher a prova/caderno e o gabarito separadamente.
- Dá 4 horas para responder.
- Bloqueia as respostas depois de finalizar.
- Esconde o cartão-resposta depois da finalização.
- Mostra a nota no formato `X de 80`.
- Salva no Supabase:
  - nome;
  - e-mail opcional;
  - prova escolhida;
  - gabarito usado;
  - respostas;
  - correção questão a questão;
  - acertos, erros, brancos e anuladas;
  - início, envio e duração.
- Tem painel admin em `admin.html`.
- Exporta CSV.

## Como configurar o Supabase

1. Crie um projeto no Supabase.
2. Abra **SQL Editor**.
3. Cole e rode o conteúdo do arquivo `supabase_schema.sql`.
4. Vá em **Project Settings > API**.
5. Copie:
   - Project URL;
   - anon public key.
6. Abra o arquivo `config.js` e cole os dois valores:

```js
window.SUPABASE_URL = "https://seu-projeto.supabase.co";
window.SUPABASE_ANON_KEY = "sua-anon-public-key";
```

## Como criar o admin

1. No Supabase, vá em **Authentication > Users**.
2. Clique em **Add user**.
3. Crie um usuário com seu e-mail e senha.
4. Entre no painel `admin.html` usando esse e-mail e senha.

Para segurança, recomendo ir em **Authentication > Providers > Email** e desativar cadastro público, ou manter apenas seu usuário admin criado manualmente.

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie todos estes arquivos para o repositório:
   - `index.html`
   - `admin.html`
   - `config.js`
   - `supabase_schema.sql`
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

