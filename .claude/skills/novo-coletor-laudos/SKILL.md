---
name: novo-coletor-laudos
description: >-
  Onboard de uma NOVA plataforma/portal de laudos no sistema laudos-whatsapp.
  Use sempre que o usuário quiser adicionar um portal de origem de laudos (ex.:
  Álvaro Apoio, ou qualquer outro lab/portal), configurar a coleta de PDFs de
  exames, cadastrar credenciais de acesso, mapear instância do Evolution
  (WhatsApp) ou criar um novo módulo coletor. Gatilhos: "novo portal", "novo
  coletor", "adicionar plataforma de laudos", "configurar coleta de laudos",
  "nova unidade/estabelecimento", "outro site de laudos". Conduz a entrevista
  de requisitos, monta a config do portal e gera coletor_<plataforma>.py
  mantendo o contrato coletar_laudos() e reaproveitando todo o resto do sistema.
---

# Novo Coletor de Laudos (onboarding de plataforma)

Esta skill orquestra a adição de uma **nova plataforma de origem de laudos** ao
sistema `laudos-whatsapp`. O princípio arquitetural é inegociável: **só o
coletor muda por plataforma**. Tudo após o PDF aterrissar no `PDF_DIR` e virar
registro normalizado na tabela `pacientes` é reaproveitado sem alteração
(schema, query de fila, worker, Evolution API, webapp de cadastro/gate, cron,
container/Traefik/HTTPS).

O contrato único que costura tudo:

```python
coletar_laudos() -> list[dict]
# cada dict: { "nome", "cpf", "numero_os", "data_exame", "caminho_pdf" }
# e cada PDF salvo dentro de PDF_DIR
```

---

## Regras de segurança e LGPD (aplicar SEMPRE, sem exceção)

Antes de qualquer passo, internalize. Estas regras valem durante toda a execução
da skill:

1. **NUNCA digite/defina segredos pelo usuário.** Senhas, API keys, tokens e
   `LabId` devem ser digitados pelo PRÓPRIO usuário no `.env`. Você só
   **referencia** nomes de variáveis de ambiente. Se precisar de um segredo,
   peça que o usuário o coloque no `.env` e siga usando `os.environ[...]`.
2. **PII nunca em log nem em commit.** Nome completo, CPF, telefone e dados de
   saúde sempre mascarados: `substr(nome,1,1)||'***'`, `substr(cpf,1,3)||'***'`,
   `'****'||substr(telefone,-4)`. Nada de PII em prints, logs ou arquivos
   versionados.
3. **`.env`, venv, banco, PDFs e logs ficam fora do Syncthing/vault** e fora do
   git. Só código entra na pasta sincronizada/versionada.
4. **Backup antes de editar** qualquer arquivo existente (guarde em
   `/opt/laudos-whatsapp/backups/`) e **valide a sintaxe com `ast.parse`** antes
   de rodar Python gerado.
5. **Gate humano obrigatório.** Todo registro entra com `status_envio='pendente'`
   e `pronto_para_envio=0`. Nada é enviado sem telefone cadastrado + PDF
   existente + liberação manual na webapp.
6. **Envio real de WhatsApp só com autorização explícita.** Desenvolva e teste
   com `DRY_RUN=1`. `DRY_RUN=0` é produção.
7. **Não apagar dados/arquivos sem confirmação explícita.**

---

## Passo 0 — Reconhecer o estado do projeto

Verifique se a base reaproveitável já existe no repo (`src/db.py`,
`src/config.py`, `src/enviar_laudos.py`, `src/whatsapp_evolution.py`,
`src/webapp/app.py`, coletores em `src/coletores/`). 

- Se **não existir**, avise que esta skill foca no coletor e na config do portal;
  os módulos núcleo (reaproveitáveis) precisam estar presentes ou serão
  scaffoldados à parte. Não reescreva o núcleo aqui.
- Se **já existir**, apenas adicione o novo coletor + entrada de config, sem
  tocar no que é comum.

Liste os coletores já existentes (`src/coletores/coletor_*.py`) para reaproveitar
padrões e não duplicar.

---

## Passo 1 — Entrevista de requisitos do portal

Colete as informações abaixo do usuário. Use `AskUserQuestion` para as escolhas
estruturadas (tipo de acesso, método de download, etc.) e perguntas diretas para
texto livre. **Não peça os segredos em si** — peça apenas os NOMES das variáveis
e instrua o usuário a preenchê-las no `.env`.

### 1.1 Identidade e acesso ao portal
- **Nome curto da plataforma** (slug, ex.: `alvaro`, `xpto`) → vira
  `coletor_<slug>.py` e prefixo das variáveis de ambiente.
- **URL de login** (ex.: `https://aol.alvaroapoio.com.br/login`).
- **Pré-autenticação que antecede o login?** (no Álvaro existe o campo `LabId:`
  antes de usuário/senha). Pergunte se há um campo extra (LabId, código de
  unidade, tenant, etc.), 2FA, captcha ou QR/token.
- **Usuário e senha**: confirme os NOMES das variáveis de ambiente que o usuário
  vai preencher no `.env`, ex.: `<SLUG>_URL`, `<SLUG>_LABID`, `<SLUG>_USER`,
  `<SLUG>_PASSWORD`. Você nunca digita os valores.

### 1.2 Existe API oficial?
Pergunte explicitamente: **o portal oferece API REST oficial para listar/baixar
laudos?** Se sim, **prefira a API a scraping com Playwright** (mais estável).
Capte base URL e o nome da variável do token. Se não, segue com Playwright.

### 1.3 Tela de listagem dos laudos (origem dos metadados)
Esta é a etapa que mais muda por portal. Levante:
- Onde ficam os exames prontos para download (rota/menu/filtro).
- Há paginação? Filtro por data?
- **De onde sai cada metadado obrigatório**: **Nome completo do paciente, CPF,
  Data do exame, Número da OS** — da tela (seletores) ou extraídos do próprio PDF
  (pdfplumber/pypdf). Todos os quatro são obrigatórios no contrato.
- **Como o PDF é obtido**: download direto, link temporário, iframe, geração sob
  demanda, validação por token/QR. Anote o fluxo.

### 1.4 Mapeamento Evolution / multi-portal por estabelecimento
Um **Estabelecimento (Unidade)** pode ter **3 ou mais portais diferentes** de
laudos. Levante:
- A qual **Unidade/Estabelecimento** este portal pertence.
- Qual **instância do Evolution** (WhatsApp) envia os laudos vindos deste portal
  — pode ser instância dedicada por portal ou compartilhada pela unidade.
- Nomes das variáveis: `<SLUG>_EVOLUTION_INSTANCE`, e as comuns
  `EVOLUTION_BASE_URL`, `EVOLUTION_API_KEY` (segredo → `.env`).
- Decisão de modelagem (pergunte ao usuário com `AskUserQuestion` se ambíguo):
  como distinguir registros de portais diferentes na mesma fila. Recomendado
  acrescentar colunas `portal` e `instancia_evolution` (ou `unidade`) na tabela
  `pacientes`, preenchidas pelo coletor, para o worker rotear o envio à instância
  correta. **Não invente** — confirme antes de mexer no schema comum.

### 1.5 Cadastro do telefone (webapp / gate)
O fluxo do operador é reaproveitado: a unidade cadastra os portais com seus
dados de acesso; o operador acessa a webapp, filtra por data/nome/CPF, cadastra
o **telefone do paciente** e marca `pronto_para_envio=1`. Confirme que o novo
portal aparece/filtra na webapp (campo `portal`/`unidade` se adotado) e que o
gate humano segue obrigatório. Esta parte é da webapp comum — **não reescrever**,
apenas garantir compatibilidade do novo coletor.

---

## Passo 2 — Registrar a config do portal

Crie/atualize um arquivo de configuração de portais (sem segredos — só
referências e metadados não sensíveis). Use `templates/portais.example.yaml`
como base. Cada portal contém: slug, url, unidade/estabelecimento, instância
Evolution, método de coleta (api|playwright), flags de pré-auth, e os nomes das
variáveis de ambiente esperadas. Os **valores secretos vão no `.env`**, nunca
neste arquivo nem no git.

Liste, ao final, as variáveis de ambiente que o **usuário** precisa preencher no
`.env`, ex.:

```
ALVARO_URL=...
ALVARO_LABID=...        # preenchido pelo usuário
ALVARO_USER=...         # preenchido pelo usuário
ALVARO_PASSWORD=...     # preenchido pelo usuário
ALVARO_EVOLUTION_INSTANCE=...
```

---

## Passo 3 — Gerar o módulo coletor

Copie `templates/coletor_template.py` para `src/coletores/coletor_<slug>.py` e
implemente conforme o levantamento. Requisitos do coletor:

- Expõe `def coletar_laudos() -> list[dict]` retornando registros normalizados
  com **exatamente** as chaves `nome`, `cpf`, `numero_os`, `data_exame`,
  `caminho_pdf` (acrescente `portal`/`instancia_evolution` se a modelagem do
  Passo 1.4 foi adotada).
- Salva cada PDF em `PDF_DIR` (de `config`); `caminho_pdf` aponta para o arquivo.
- Login lê credenciais **só** de variáveis de ambiente; aplica pré-auth (LabId)
  quando existir.
- Se houver API oficial, implemente via `httpx`; senão Playwright.
- Idempotência: não re-baixar/duplicar laudo já coletado (cheque por
  `numero_os`).
- **Logs sem PII** — use máscaras; logue contagens (coletados/novos/erros), não
  dados de paciente.
- Trata paginação, links temporários e geração sob demanda conforme o portal.

Depois de gerar: rode `python -c "import ast,sys; ast.parse(open(p).read())"`
sobre o arquivo (valide a sintaxe) antes de qualquer execução.

---

## Passo 4 — Plugar no pipeline (sem tocar no núcleo)

- O coletor é invocado pelo cron via `run.sh` (herdando `.env` e `PYTHONPATH`),
  igual ao do Álvaro.
- Cada registro retornado é inserido em `pacientes` com `status_envio='pendente'`
  e `pronto_para_envio=0` (gate). A inserção usa as funções comuns de `db.py` —
  reaproveitadas, não reescritas.
- Worker (`enviar_laudos.py`), query de fila, Evolution API e webapp permanecem
  intactos. Se adotou roteamento por instância, o worker seleciona a instância a
  partir da coluna `instancia_evolution`/`portal`.

---

## Passo 5 — Validar e entregar

1. Rode o coletor com **`DRY_RUN=1`** e dados de teste; confirme que os PDFs caem
   no `PDF_DIR` e os registros entram corretos (inspecione SQLite via módulo
   `sqlite3` do Python, **sempre mascarando PII**).
2. Verifique o gate: nada elegível para envio até telefone + liberação manual.
3. **Não** habilite `DRY_RUN=0` (envio real) sem autorização explícita do
   usuário.
4. Commit apenas de código/config (sem `.env`, sem PDFs, sem db, sem logs, sem
   PII) na branch de desenvolvimento; abra PR em draft.

---

## Checklist final (cole no resumo ao usuário)

- [ ] Slug, URL e pré-auth (LabId/2FA/captcha) levantados
- [ ] API oficial avaliada (preferida sobre Playwright quando existe)
- [ ] Origem dos 4 metadados definida (nome, CPF, data_exame, numero_os)
- [ ] Método de download do PDF mapeado
- [ ] Unidade/Estabelecimento + instância Evolution mapeados (multi-portal)
- [ ] Variáveis do `.env` listadas para o USUÁRIO preencher (segredos não digitados por você)
- [ ] `coletor_<slug>.py` gerado e validado com `ast.parse`
- [ ] Contrato `coletar_laudos()` respeitado; PDFs em `PDF_DIR`
- [ ] Núcleo reaproveitado sem alteração; gate humano preservado
- [ ] `DRY_RUN=1` no desenvolvimento; envio real só com autorização
