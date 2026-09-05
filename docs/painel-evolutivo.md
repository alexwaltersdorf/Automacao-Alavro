# Painel evolutivo — status das ações e como regenerar

Painel publicado (privado, compartilhável pelo menu da própria página):
**https://claude.ai/code/artifact/806752bc-e882-4c16-9dec-9c181dc82ea0**

Gerado em 19/08/2026 · dados de 01/06/2026 a 19/08/2026.
**Última atualização de dados: 05/09/2026** — o Windsor foi destravado em 05/09 e a série
foi refeita até 01/09. O bloco técnico foi remedido em 31/08.

---

## Números do painel (fonte e apuração) — dados de 05/09/2026

| Indicador | 19/08 | 05/09 | Fonte |
|---|---|---|---|
| Avaliações totais | 362 | **409** (+47) | GBP — `review_total_count` |
| Avaliações sem resposta | — | **0** | varredura de 90 dias em 05/09 |
| Impressões/dia — base (07–28/07) | 118,7 | 116,5 | GBP — `impressions` diário |
| Impressões/dia — campanha (29/07–19/08) | 142,5 | **144,9** (+24,4% sobre a base) | idem |
| Impressões/dia — pós (20/08–01/09) | — | 134,5 | idem |
| Melhor semana | 1.073 | **1.168** (semana de 10/08) | idem |
| SoLV "laboratório" | 3,9% (ago) | sem medição nova | Local Falcon, grade 7×7 |

Totais semanais de impressões:

| Semana (seg) | Impressões |
|---|---:|
| 06/07 | 579 *(série começa em 07/07, semana parcial)* |
| 13/07 | 845 |
| 20/07 | 827 |
| 27/07 | 819 |
| 03/08 | 842 |
| **10/08** | **1.168** |
| **17/08** | **1.154** |
| **24/08** | **1.018** |
| 31/08 | 248 *(parcial — ver nota)* |

O patamar mudou: as três semanas de 10, 17 e 24 de agosto ficaram acima de 1.000, contra
uma faixa de 819–845 nas quatro semanas anteriores. Não é um pico isolado, é um degrau.

### Cuidado ao ler `review_average_rating`

Esse campo **não é a nota exibida no perfil** — é a média das avaliações *dentro da janela
consultada*, e muda conforme a janela:

| Janela | `review_average_rating` |
|---|---|
| últimos 30 dias | 4,962 |
| últimos 90 dias | 4,893 |
| últimos 2 anos | 4,726 |

Ou seja: mede a **qualidade do fluxo recente**, que está ótima (praticamente só 5★
entrando). A nota vitalícia que o Google mostra no perfil é outra coisa e sobe devagar,
porque o denominador são as 409 avaliações. Nunca reportar 4,9 como "a nota da clínica" —
o último valor confirmado da nota exibida é 4,5.

Notas de apuração:
- Os dias 02, 03 e 04/09 vêm zerados: o Google consolida essas métricas com 3–5 dias de
  atraso. Por isso a semana de 31/08 aparece com 248 — só 31/08 e 01/09 têm dado.
- Os SoLV vêm de scans com raios diferentes. Para medir a meta de 90 dias, usar sempre a
  mesma grade 7×7 e o mesmo raio de 25 km.

## Apagão de dados 22/08 – 05/09 (encerrado)

O Windsor.ai ficou 14 dias sem devolver dado nenhum. A mensagem mudou de natureza no meio
do caminho, e a distinção custou tempo — vale registrar para não repetir:

| Período | Mensagem | O que realmente limitava |
|---|---|---|
| 22/08 – 02/09 | "more **accounts** than your **Free** plan allows" | nº de contas |
| 03/09 – 05/09 | "more **data sources** than your **Basic** plan allows" | nº de **conectores** |

Remover contas dentro de um conector não adiantou: o plano Basic conta **fontes de dados**.
Destravou em 05/09 ao desconectar `googleanalytics4` e `searchconsole`, deixando 3
conectores (`google_my_business`, `google_ads`, `facebook`).

A chave da API REST (`connectors.windsor.ai`) **não contorna** o bloqueio — o limite é
aplicado na conta, não no caminho de acesso. Testado em 03/09.

Custo do apagão: 14 dias sem série de impressões e sem resposta a avaliações. O passivo foi
zerado na volta — varredura de 90 dias em 05/09 não achou nenhuma avaliação sem resposta.

Perda permanente: `searchconsole` saiu, então impressões, cliques e posição média do **site**
deixam de ser coletados. O dashboard de tráfego pago mantém `google_ads` e `facebook`.

## Achado aberto: convênio Hapvida divulgado no site

A avaliação de 3★ de Elaine Rocha (26/08) — a única abaixo de 4★ nos últimos 90 dias —
aponta uma contradição factual:

> "no site aparece que atendem meu plano de saúde e quando liguei a atendente falou que não
> atende, então sugeri que atualizem o site! Meu plano é o Hapvida."

Verificado em 05/09: `https://totalquality.med.br/convenios` lista **Hapvida** sob o título
"Planos de saúde atendidos", entre Unimed, Bradesco Saúde, SulAmérica, Amil, Porto Seguro,
NotreDame Intermédica, Cassi, Geap, Postal Saúde, Economus e Funasa.

Há uma ressalva na página ("A lista é atualizada periodicamente. Confirme a aceitação do seu
plano pelo WhatsApp"), mas ela não evita o dano: a paciente se planejou pela lista e recebeu
a negativa só ao telefone.

**Não dá para resolver sem a clínica dizer qual lado está certo** — ou o site está
desatualizado, ou a atendente errou. Definido isso:
- se a Total Quality **não** atende Hapvida → remover da lista (correção no repositório do site);
- se **atende** → o erro foi no atendimento telefônico, e o caso é de treinamento da recepção.

A mesma dúvida vale para os outros 11 planos listados: nenhum foi conferido contra a
realidade operacional. Vale uma revisão da lista inteira de uma vez.

## Estado das frentes em 05/09/2026

| Frente | Status | Observação |
|---|---|---|
| Perfil do Google (horário, site, telefone, descrição) | ✅ feito | via API |
| Campanha de avaliações | ✅ rodando | **409 avaliações** (+47 desde 19/08) |
| Rotina de resposta às avaliações | ✅ **normalizada em 05/09** | passivo zerado; 0 avaliações sem resposta em 90 dias |
| Posts por prioridade (laboratorial → ultrassom → tomografia) | ✅ concluído | 12, 15 e 18/08 |
| **Categorias do perfil (7 → 3)** | ⚠️ **pendente** | só no painel do GBP; é a ação nº 1 |
| Lista de Serviços no perfil | ⚠️ pendente | só no painel do GBP |
| Site oficial — HTML pré-renderizado, schema, imagens | ✅ resolvido | reconfirmado em 31/08 |
| Site oficial — soft 404 | ⚠️ pendente | reconfirmado em 31/08: ainda HTTP 200 |
| Site oficial — anos de atuação automáticos + `foundingDate` | ⚠️ aguardando merge | PR #11 aberto em draft; nada no ar |
| Sites-clone (lovable.app, localo.site) | ⚠️ pendente | ambos ainda HTTP 200 em 31/08 |
| **Convênio Hapvida no site** | ⚠️ **novo, aguarda decisão** | ver achado acima; gerou a única avaliação 3★ do período |

## Reverificação técnica do site (medida em 31/08/2026)

O site foi reconstruído desde a análise de 29/07. Foram resolvidos:

- **HTML pré-renderizado**: a home entrega um bloco `<main class="seo-prerender">`
  com ~2.500 caracteres de texto rastreável, incluindo H1 e links internos. O problema
  de “SPA com HTML vazio” não existe mais.
- **Schema.org**: JSON-LD de `MedicalClinic`/`LocalBusiness`, `MedicalBusiness` (com
  ~29 exames em `availableService`) e `WebSite`.
- **Peso da página**: home em ~21 KB; hero servido em AVIF responsivo com preload. A
  imagem de 5,87 MB não existe mais.
- **Páginas de exame por prioridade**: `/exames/exames-de-sangue`,
  `/exames/ultrassonografia`, `/exames/tomografia-computadorizada`,
  `/laboratorio-caraguatatuba` e `/checkup` respondem com titles próprios e
  otimizados para Caraguatatuba.
- `robots.txt` e `sitemap.xml` respondem 200.

Medições de 31/08/2026 (`curl` na produção):

| Verificação | Resultado |
|---|---|
| Home | HTTP 200 · 20.884 bytes · 0,72 s |
| `robots.txt` / `sitemap.xml` | 200 / 200 |
| URL inexistente (`/pagina-que-nao-existe-xyz123`) | **HTTP 200** com o title da home |
| `aggregateRating` no JSON-LD | presente · `ratingValue 4.5` · `reviewCount 348` |
| `foundingDate` no JSON-LD | `"2003"` (só o ano), 2 ocorrências |
| Anos de atuação no HTML pré-renderizado | `"23 anos"` fixo, 2 ocorrências |
| `total-quality-web.lovable.app` | **HTTP 200** — clone ainda no ar |
| `wwwtotalqualitymedbr.localo.site` | **HTTP 200** — clone ainda no ar |

Permanece em aberto:

- **Soft 404**: URL inexistente responde **HTTP 200** com o title da home e sem H1.
  Deve responder 404 (ou 410) para evitar que o Google indexe URLs inexistentes e dilua
  o rastreamento. Sem mudança desde 20/08.
- **`aggregateRating` autodeclarado e desatualizado**: `reviewCount: 348` contra 362 no
  perfil. O PR #11 remove o bloco — está no ar exatamente o estado anterior ao PR, o que
  confirma que ele não foi mergeado.
- **`foundingDate` e anos de atuação ainda fixos**: `"2003"` sem dia e `"23 anos"` escrito
  à mão. Também sai com o merge do PR #11. Sem ele, o texto fica errado em 08/07/2027.
- **Dois sites-clone no ar**, canibalizando a marca.

## Como regenerar o painel

> ⚠️ O script gerador (`gerar-painel-evolutivo.py`) **não está no repositório** — foi
> perdido quando o container da sessão foi reciclado. Refazê-lo depende de ter os dados
> de volta, então a ordem é: destravar o Windsor primeiro, regerar depois.

Sequência para atualizar:

1. Conferir que o Windsor responde (se voltar a bloquear, o limite do plano Basic é por
   **fonte de dados**, não por conta — ver "Apagão de dados" acima).
2. Puxar do conector `google_my_business` os campos `date, impressions` (série diária) e
   `review_create_time, review_star_rating, review_total_count, review_average_rating`.
3. Recalcular os agregados semanais e a série acumulada de avaliações.
4. Rodar um scan novo no Local Falcon para o SoLV — **mesma grade 7×7 e mesmo raio de
   25 km** usados em agosto, senão o número não é comparável.
5. Republicar o HTML no **mesmo `file_path`** para manter a URL do artifact acima.
