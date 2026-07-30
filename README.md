# Automação Alavro — Disparo em massa no WhatsApp (API oficial da Meta)

Sistema completo para envio de mensagens em massa pelo WhatsApp usando a
**WhatsApp Cloud API oficial da Meta** (Graph API v23.0). Não usa bibliotecas
não oficiais, não automatiza o WhatsApp Web e não usa números pessoais — tudo
passa pelo canal autorizado da Meta, com token permanente de Usuário do Sistema.

## O que está incluído

| Recurso | Descrição |
|---|---|
| **Cliente da Cloud API** | Envio de templates, texto, mídia; gestão de templates; diagnóstico de token e número |
| **Motor de disparo** | Fila persistente, controle de ritmo (token bucket), concorrência, retentativa com backoff exponencial |
| **Tratamento de erros da Meta** | ~40 códigos mapeados em 5 ações: retry, throttle, fail, invalid, pause |
| **Webhook** | Verificação (`hub.challenge`), validação HMAC `X-Hub-Signature-256`, status de entrega e mensagens recebidas |
| **Janela de 24h** | Controlada automaticamente: texto livre só sai para quem respondeu nas últimas 24h |
| **Opt-out automático** | Palavras-chave (PARAR, SAIR, CANCELAR…) descadastram e cancelam envios pendentes na hora |
| **Limite diário por tier** | Respeita o teto de destinatários únicos em 24h da sua conta |
| **Importação CSV** | Vírgula ou ponto e vírgula, BOM do Excel, colunas em português, campos extras viram variáveis |
| **Telefones brasileiros** | Normalização E.164 com nono dígito, validação de DDD, casamento do `wa_id` do webhook |
| **Painel web** | Métricas em tempo real, progresso das campanhas, controle do motor |
| **API REST + CLI** | Automação por HTTP ou pelo terminal |

---

## Parte 1 — Configurar a conta na Meta

Esta parte é feita no site da Meta, uma única vez.

### 1.1 Criar o app

1. Acesse o [Painel de Apps da Meta](https://developers.facebook.com/apps) e clique em **Criar app**.
2. Informe nome e e-mail.
3. Selecione o caso de uso **"Conectar-se a clientes pelo WhatsApp"** e clique em **Avançar**.
4. Escolha um portfólio empresarial existente ou crie um novo.
5. Confirme e clique em **Criar app**.

### 1.2 Vincular a conta do WhatsApp Business

Na página **Personalizar caso de uso → Conectar no WhatsApp → Configuração da API**:

1. Selecione uma conta do WhatsApp Business (WABA) ou crie uma nova.
2. Anote o **WhatsApp Business Account ID** → vai em `WHATSAPP_BUSINESS_ACCOUNT_ID`.
3. Escolha ou cadastre o número comercial e anote o **Phone number ID**
   → vai em `WHATSAPP_PHONE_NUMBER_ID`.

> O número de teste que a Meta fornece só envia para até 5 destinatários
> cadastrados. Para disparo real, adicione e verifique um número próprio.

### 1.3 Gerar o token permanente

O token temporário do painel expira em 24h. Para produção:

1. Vá em [Configurações do Negócio](https://business.facebook.com/latest/settings) → **Usuários do sistema**.
2. **Adicionar** → crie um usuário do sistema (função: Administrador).
3. Selecione o usuário criado → **Atribuir ativos**:
   - seu **app** → ative **Gerenciar app** (controle total);
   - sua **conta do WhatsApp** → ative **Gerenciar contas do WhatsApp Business** (controle total).
4. Clique em **Gerar token**, selecione o app e marque as permissões:
   - `whatsapp_business_messaging` — enviar mensagens
   - `whatsapp_business_management` — gerenciar templates
   - `business_management` — acessar os ativos do negócio
5. Copie o token → vai em `WHATSAPP_ACCESS_TOKEN`. **Ele só aparece uma vez.**

### 1.4 Pegar o App Secret

**Configurações do app → Básico → Chave secreta do app** → vai em `WHATSAPP_APP_SECRET`.
É com ela que validamos a assinatura dos webhooks — sem isso qualquer um poderia
forjar eventos de entrega no seu sistema.

### 1.5 Configurar o webhook

O webhook precisa de uma **URL pública HTTPS**. Em desenvolvimento, use um túnel:

```bash
npx localtunnel --port 3000     # ou: ngrok http 3000
```

No painel: **Configuração → Webhooks → Editar**:

- **URL de callback:** `https://SEU-DOMINIO/webhook`
- **Token de verificação:** o mesmo valor que você colocou em `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- Clique em **Verificar e salvar** (o servidor precisa estar no ar)
- Em **Campos do webhook**, assine `messages`

---

## Parte 2 — Instalar e configurar o sistema

```bash
git clone <este-repositório>
cd Automacao-Alavro
npm install

cp .env.example .env
# preencha o .env com os dados da Parte 1

npm run migrate     # cria o banco
npm run cli doctor  # confere as credenciais
```

O `doctor` mostra o número, o nome verificado, a **nota de qualidade** e o
**tier de mensagens** — confira o tier antes de importar uma lista grande.

```bash
npm start           # sobe o servidor + painel em http://localhost:3000
```

---

## Parte 3 — Disparar a primeira campanha

### 3.1 Criar e aprovar o template

**Disparo em massa exige template aprovado.** A Meta só permite iniciar uma
conversa com uma mensagem pré-aprovada; texto livre é bloqueado (erro 131047).

```bash
curl -X POST http://localhost:3000/api/templates \
  -H 'Content-Type: application/json' \
  -d @examples/template-exemplo.json
```

A aprovação leva de minutos a 24h. Acompanhe com:

```bash
npm run cli templates    # só os APPROVED podem ser usados
```

### 3.2 Importar os contatos

```bash
npm run cli contacts import examples/contatos-exemplo.csv --list "clientes-julho"
```

O CSV aceita cabeçalho em português (`nome`, `telefone`/`celular`/`whatsapp`) e
separador `,` ou `;`. **Qualquer coluna extra vira variável** utilizável no
template: `cidade` → `{{cidade}}`, `plano` → `{{plano}}`.

### 3.3 Criar a campanha

```bash
npm run cli lists      # descubra o id da lista

npm run cli campaigns create "Promoção de Julho" \
  --template promocao_julho \
  --language pt_BR \
  --list 1 \
  --body "{{name}},{{cidade}}"
```

O `--body` mapeia, **na ordem**, os parâmetros `{{1}}`, `{{2}}`… do template
aprovado. No exemplo, `{{1}}` recebe o nome do contato e `{{2}}` a cidade.

### 3.4 Conferir antes de disparar

```bash
npm run cli campaigns preview 1
```

Mostra o tamanho do público, quem ficou de fora (opt-out, número inválido) e um
exemplo dos componentes que serão enviados. **Nada é enviado neste passo.**

Para um ensaio completo sem gastar conversas, coloque `DRY_RUN=true` no `.env`.

### 3.5 Disparar

```bash
npm run cli campaigns send 1              # acompanha no terminal até o fim
npm run cli campaigns send 1 --rate 5     # começa devagar (número novo)
npm run cli campaigns send 1 --detach     # o servidor cuida do envio
```

### 3.6 Acompanhar

```bash
npm run cli campaigns report 1
curl http://localhost:3000/api/campaigns/1/report.csv -o relatorio.csv
```

Ou abra o painel em `http://localhost:3000`.

---

## API REST

Todas as rotas sob `/api` exigem o header `X-API-Key` quando `API_KEY` está
definido no `.env`. A rota `/webhook` não usa chave — ela é autenticada pela
assinatura HMAC da própria Meta.

### Contatos

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/contacts` | Lista contatos (`?search=`, `?opted_in=`, `?limit=`, `?offset=`) |
| `POST` | `/api/contacts` | Cria/atualiza um contato |
| `POST` | `/api/contacts/import` | Importa em massa (`csv` em texto ou `contacts` em array) |
| `GET` | `/api/contacts/:id` | Detalhe |
| `GET` | `/api/contacts/lookup/:phone` | Busca por telefone em qualquer formato |
| `POST` | `/api/contacts/:id/opt-out` | Descadastra e cancela envios pendentes |
| `POST` | `/api/contacts/:id/opt-in` | Recadastra |
| `GET` | `/api/contacts/lists/all` | Lista os segmentos |
| `POST` | `/api/contacts/lists` | Cria um segmento |

### Campanhas

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/campaigns` | Lista com estatísticas |
| `POST` | `/api/campaigns` | Cria |
| `GET` | `/api/campaigns/:id` | Detalhe + progresso |
| `POST` | `/api/campaigns/:id/build-queue` | Materializa a fila (idempotente) |
| `POST` | `/api/campaigns/:id/start` | Enfileira para disparo |
| `POST` | `/api/campaigns/:id/pause` | Pausa |
| `POST` | `/api/campaigns/:id/resume` | Retoma |
| `POST` | `/api/campaigns/:id/cancel` | Cancela a campanha e a fila |
| `POST` | `/api/campaigns/:id/retry-failed` | Reenfileira as falhas |
| `GET` | `/api/campaigns/:id/messages` | Mensagens (`?status=failed`) |
| `GET` | `/api/campaigns/:id/report.csv` | Relatório em CSV |

### Templates e sistema

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/templates` | Templates em cache local |
| `POST` | `/api/templates/sync` | Sincroniza com a Meta |
| `POST` | `/api/templates` | Cria um template (entra em análise) |
| `GET` | `/api/health` | Saúde e credenciais faltando |
| `GET` | `/api/overview` | Métricas gerais |
| `GET` | `/api/phone-number` | Qualidade e tier do número na Meta |
| `GET` | `/api/dispatcher` | Estado do motor |
| `POST` | `/api/dispatcher/start` \| `/stop` | Liga/desliga o motor |
| `POST` | `/api/dispatcher/rate` | Ajusta msg/s em tempo real |

### Exemplo: campanha completa por HTTP

```bash
# 1. Importar
curl -X POST localhost:3000/api/contacts/import \
  -H 'Content-Type: application/json' \
  -d '{"list":"julho","csv":"nome,telefone,cidade\nMaria,11987654321,Caraguatatuba"}'

# 2. Criar
curl -X POST localhost:3000/api/campaigns \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Promoção de Julho",
    "list_id": 1,
    "message_type": "template",
    "template_name": "promocao_julho",
    "template_language": "pt_BR",
    "template_components": { "body": ["{{name}}", "{{cidade}}"] }
  }'

# 3. Conferir o público e disparar
curl -X POST localhost:3000/api/campaigns/1/build-queue
curl -X POST localhost:3000/api/campaigns/1/start
```

### Variáveis disponíveis nos templates

Além de qualquer coluna extra do CSV, sempre existem:
`{{name}}`, `{{nome}}`, `{{phone}}`, `{{telefone}}`.

Formas suportadas em `template_components`:

```json
{
  "header": { "type": "text", "parameters": ["{{name}}"] },
  "body": ["{{name}}", "{{cidade}}"],
  "buttons": [{ "subType": "url", "index": 0, "parameters": ["{{cupom}}"] }]
}
```

Header de mídia:

```json
{ "header": { "type": "image", "link": "https://exemplo.com/banner.jpg" } }
```

---

## As regras da Meta que o sistema aplica

### Janela de atendimento de 24h

Você só pode enviar **texto livre** para alguém que te escreveu nas últimas 24
horas. Fora disso, apenas templates aprovados.

O sistema controla isso sozinho: cada mensagem recebida no webhook atualiza
`last_inbound_at`. Numa campanha de texto, quem está fora da janela é marcado
como `skipped` com o motivo explicado — em vez de queimar a tentativa e receber
o erro 131047.

### Limite diário de destinatários únicos

Contas novas começam limitadas. Os tiers são 250 → 1.000 → 10.000 → 100.000 →
ilimitado, e a Meta promove automaticamente conforme volume e qualidade.

Configure o seu em `DAILY_UNIQUE_RECIPIENT_LIMIT`. Ao bater o teto, as mensagens
restantes ficam `pending` e voltam a sair depois — a campanha não falha nem se
perde. Confira o tier atual com `npm run cli doctor`.

### Ritmo e nota de qualidade

A Cloud API entrega 80 msg/s por padrão, mas **número novo disparando no limite
perde qualidade e é bloqueado**. Recomendação:

| Fase | `SEND_RATE_PER_SECOND` |
|---|---|
| Primeiros dias | 3–5 |
| Após 1 semana sem queda de qualidade | 10–15 |
| Número maduro, tier alto | 30–80 |

Quando a Meta responde com erro de throttle (130429, 80007, 4), o motor **corta
o ritmo pela metade automaticamente** e o recupera aos poucos.

O erro 131048 (limite anti-spam) **pausa a campanha inteira** — é o sinal de que
o conteúdo está gerando bloqueios. Revise a mensagem antes de retomar.

### Consentimento e LGPD

- Só envie para quem deu opt-in comprovável. É exigência da Meta e da LGPD.
- Inclua a saída no rodapé do template: *"Responda SAIR para não receber mais mensagens."*
- O sistema descadastra automaticamente ao receber PARAR, SAIR, CANCELAR,
  DESCADASTRAR, REMOVER, STOP e variações, e cancela na hora os envios pendentes
  daquele contato.
- Números marcados como sem WhatsApp (erro 131026) saem das campanhas seguintes.

---

## Códigos de erro tratados

| Código | Significado | Ação do sistema |
|---|---|---|
| 190, 0, 3, 200 | Token inválido/sem permissão | **Pausa a campanha** |
| 368, 131031 | Conta bloqueada por política | **Pausa a campanha** |
| 131048 | Limite anti-spam (qualidade caiu) | **Pausa a campanha** |
| 133010, 131045 | Número não registrado na Cloud API | **Pausa a campanha** |
| 4, 80007, 130429, 133016, 131056 | Excesso de requisições | Reduz o ritmo e reenvia |
| 1, 2, 131000, 131016, HTTP 5xx | Instabilidade temporária | Reenvia com backoff |
| 131026 | Número não usa WhatsApp | Marca o contato e não insiste |
| 131047 | Janela de 24h fechada | Falha definitiva (use template) |
| 132000–132016 | Erro de template | Falha definitiva |
| 100 | Parâmetro inválido | Falha definitiva |

Backoff exponencial com jitter: 2s → 4s → 8s → 16s (`RETRY_BASE_DELAY_MS`,
`MAX_RETRIES`).

---

## Arquitetura

```
src/
├── config.js               Configuração via .env, com validação
├── logger.js               Log estruturado com redação de segredos
├── cli.js                  Interface de linha de comando
├── db/
│   ├── schema.sql          Tabelas, índices e restrições
│   ├── index.js            Conexão SQLite (WAL)
│   └── migrate.js          Aplica o schema
├── whatsapp/
│   ├── client.js           Cliente da Graph API
│   ├── errors.js           Catálogo de erros da Meta → ação
│   └── messages.js         Construtores de payload e interpolação
├── core/
│   ├── contacts.js         Contatos, listas, opt-in/out, janela de 24h
│   ├── campaigns.js        Campanhas e fila idempotente
│   ├── dispatcher.js       Motor de disparo
│   ├── rateLimiter.js      Token bucket com recuo dinâmico
│   └── webhookProcessor.js HMAC, status de entrega, inbound
├── server/
│   ├── app.js              Express
│   ├── middleware.js       Autenticação, logs, erros
│   ├── routes/             contacts, campaigns, templates, system, webhook
│   └── public/index.html   Painel
└── utils/
    ├── phone.js            E.164, nono dígito, DDD
    └── csv.js              Importação e exportação
```

### Estados de uma mensagem

```
pending ──▶ sending ──▶ sent ──▶ delivered ──▶ read
   │           │        (webhook)   (webhook)   (webhook)
   │           └──▶ failed  (erro definitivo ou tentativas esgotadas)
   ├──▶ skipped   (opt-out, janela de 24h fechada, contato removido)
   └──▶ cancelled (campanha cancelada ou contato pediu para sair)
```

Erro temporário volta para `pending` com `next_attempt_at` no futuro.

### Garantias

- **Idempotência** — `UNIQUE (campaign_id, contact_id)`: reiniciar o processo
  ou remontar a fila não gera envio duplicado.
- **Nenhuma mensagem se perde** — ao pausar, o lote em andamento volta para
  `pending`; ao bater o teto diário, também.
- **Ordem dos webhooks** — status fora de ordem não regridem o estágio da
  mensagem (`read` não volta para `delivered`).
- **Auditoria** — o payload enviado a cada mensagem e o evento bruto de cada
  webhook ficam gravados.

---

## Testes

```bash
npm test
```

73 testes cobrindo normalização de telefones brasileiros, classificação dos
erros da Meta, token bucket, motor de disparo com a Graph API mockada
(retentativa, throttle, pausa por token inválido, teto diário, idempotência,
janela de 24h), validação HMAC dos webhooks, ciclo de status de entrega,
opt-out automático, importação de CSV e a API HTTP ponta a ponta.

O script usa `tests/*.test.js` — glob de um nível só, expandido pelo shell,
porque o Node 20 não interpreta `**` sozinho (isso só chegou no Node 22).
**Mantenha os arquivos de teste direto em `tests/`**: um teste dentro de
subpasta não seria executado e o CI passaria sem avisar.

---

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `WHATSAPP_ACCESS_TOKEN` | — | Token permanente do usuário do sistema |
| `WHATSAPP_PHONE_NUMBER_ID` | — | ID do número comercial |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | — | ID da WABA (necessário para templates) |
| `WHATSAPP_APP_SECRET` | — | Valida a assinatura dos webhooks |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | — | String que você define e repete no painel |
| `WHATSAPP_API_VERSION` | `v23.0` | Versão da Graph API |
| `SEND_RATE_PER_SECOND` | `15` | Ritmo de envio |
| `SEND_CONCURRENCY` | `8` | Requisições simultâneas |
| `DAILY_UNIQUE_RECIPIENT_LIMIT` | `1000` | Teto do seu tier (`0` = ilimitado) |
| `MAX_RETRIES` | `4` | Tentativas por mensagem |
| `RETRY_BASE_DELAY_MS` | `2000` | Base do backoff |
| `DRY_RUN` | `false` | Simula sem chamar a Meta |
| `PORT` / `HOST` | `3000` / `0.0.0.0` | Servidor |
| `DATABASE_PATH` | `./data/alavro.sqlite` | Banco |
| `API_KEY` | vazio | Protege `/api` (vazio = sem proteção) |
| `DEFAULT_COUNTRY_CODE` | `55` | DDI assumido em números sem DDI |
| `AUTO_START_DISPATCHER` | `true` | Liga o motor junto com o servidor |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error`, `silent` |

---

## Problemas comuns

**"Template name does not exist in the translation" (132001)**
O template não existe naquele idioma ou ainda não foi aprovado. Rode
`npm run cli templates` — o idioma precisa bater exatamente (`pt_BR`, não `pt`).

**"Number of parameters does not match" (132000)**
A quantidade de itens em `template_components.body` precisa ser igual ao número
de `{{n}}` do template aprovado.

**"Re-engagement message" (131047)**
Tentativa de texto livre fora da janela de 24h. Use uma campanha de template.

**Webhook não verifica**
A URL precisa ser HTTPS e pública, o servidor precisa estar no ar, e o token do
painel precisa ser idêntico a `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.

**Status de entrega não chegam**
Confirme que o campo `messages` está assinado em Webhooks e que
`WHATSAPP_APP_SECRET` está correto — assinatura inválida devolve 401.

**Qualidade do número caiu para "Baixa"**
Pare os disparos. Revise o conteúdo, confirme que todos deram opt-in e reduza o
ritmo. Insistir com qualidade baixa leva à restrição da conta.

**"Cannot find module 'better-sqlite3'"**
Rode `npm install`. Em ambientes sem binário pré-compilado é preciso ter
build-essential/python3 para compilar.

---

## Licença

MIT
