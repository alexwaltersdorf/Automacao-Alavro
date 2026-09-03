# Painel evolutivo — status das ações e como regenerar

Painel publicado (privado, compartilhável pelo menu da própria página):
**https://claude.ai/code/artifact/806752bc-e882-4c16-9dec-9c181dc82ea0**

Gerado em 19/08/2026 · dados de 01/06/2026 a 19/08/2026.
**Última verificação: 31/08/2026** — os números de tráfego e avaliações seguem os de
19/08 (ver "Lacuna de dados" abaixo); o bloco técnico foi remedido hoje.

---

## Números do painel (fonte e apuração) — congelados em 19/08/2026

| Indicador | Valor | Fonte |
|---|---|---|
| Avaliações totais | 362 (4,5★) | GBP via Windsor — `review_total_count` |
| Avaliações novas na campanha (29/07–19/08) | 28, todas 5★ | GBP — `review_create_time` + `review_star_rating` |
| Taxa de resposta | 100% em até 24h | rotina diária automatizada desde 30/07 |
| Impressões/dia — antes (01–28/07) | 118,7 | GBP — `impressions` diário |
| Impressões/dia — durante (29/07–14/08) | 142,5 (**+20,0%**) | idem |
| Melhor semana de impressões | 1.073 (semana de 10/08) | idem |
| SoLV “laboratório” | 0,4% (fev) → 2,0% (mai) → 3,9% (ago) | Local Falcon, grade 7×7 |

Notas de apuração:
- A semana de 17/08 fica fora do gráfico de impressões: o Google consolida essas
  métricas com 3–5 dias de atraso e os valores ainda chegam zerados.
- Os três SoLV vêm de scans com raios diferentes (25 km em ago, menores antes), então
  servem como referência de ordem de grandeza, não como série temporal exata. Para a
  medição da meta de 90 dias, usar sempre a mesma grade e o mesmo raio.

## Lacuna de dados desde 22/08/2026

O conector Windsor.ai parou de devolver dados. A mensagem mudou de natureza no caminho,
e isso muda a correção:

| Data | Mensagem do Windsor | O que limita |
|---|---|---|
| 22/08 a 02/09 | "more **accounts** than your **Free** plan allows" | nº de contas |
| a partir de 03/09 | "more **data sources** than your **Basic** plan allows" | nº de **conectores** |

O plano foi elevado para **Basic** (pago, conta `sac@totalquality.med.br`) e uma conta do
Meta foi desconectada, mas o bloqueio persiste porque agora o que conta são as **fontes de
dados**, não as contas dentro delas. Desconectar contas não resolve mais.

São 5 conectores ligados hoje:

| Conector | Para que serve aqui |
|---|---|
| `google_my_business` | rotina de resposta às avaliações + impressões do painel |
| `searchconsole` | impressões, cliques e posição do site |
| `google_ads` | dashboard diário de tráfego pago |
| `facebook` | dashboard diário de tráfego pago |
| `googleanalytics4` | sessões e conversões |

**Decisão tomada em 03/09: priorizar `google_my_business`.** As avaliações são o ativo que
já moveu o ponteiro (4,4★ → 4,5★, base crescendo ~26/mês) e o passivo sem resposta fica
visível para qualquer paciente que abre o perfil. O gasto de mídia continua auditável no
painel do próprio Google Ads, sem depender do Windsor.

Consequência aceita: o **dashboard diário de tráfego pago (18h) para de atualizar** enquanto
`google_ads` e `facebook` estiverem desconectados.

Efeitos enquanto o bloqueio durar:

- **Impressões, cliques e posição média** param na série que vai até 19/08.
- **Contagem e nota das avaliações** param em 362 / 4,5★.
- **Rotina de resposta às avaliações** sem enxergar nada desde 22/08. No ritmo medido
  (~26 avaliações/mês), são cerca de 12 aguardando. A rotina já está instruída a tratar a
  primeira execução bem-sucedida como recuperação (varredura de 90 dias, 15 respostas/dia
  das mais recentes para as mais antigas, até zerar).

O Local Falcon (SoLV) exige autorização OAuth que não pode ser feita nesta sessão.

## Estado das frentes em 31/08/2026

| Frente | Status | Observação |
|---|---|---|
| Perfil do Google (horário, site, telefone, descrição) | ✅ feito | via API |
| Campanha de avaliações | ✅ rodando | 28 novas até 19/08, 100% 5★ |
| Rotina de resposta às avaliações | 🔴 **parada desde 22/08** | limite de fontes de dados do plano Basic do Windsor |
| Posts por prioridade (laboratorial → ultrassom → tomografia) | ✅ concluído | 12, 15 e 18/08 |
| **Categorias do perfil (7 → 3)** | ⚠️ **pendente** | só no painel do GBP; é a ação nº 1 |
| Lista de Serviços no perfil | ⚠️ pendente | só no painel do GBP |
| Site oficial — HTML pré-renderizado, schema, imagens | ✅ resolvido | reconfirmado em 31/08 |
| Site oficial — soft 404 | ⚠️ pendente | reconfirmado em 31/08: ainda HTTP 200 |
| Site oficial — anos de atuação automáticos + `foundingDate` | ⚠️ aguardando merge | PR #11 aberto em draft; nada no ar |
| Sites-clone (lovable.app, localo.site) | ⚠️ pendente | **ambos ainda HTTP 200 em 31/08** |

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

1. No painel do Windsor (Connectors), deixar apenas `google_my_business` conectado —
   ver "Lacuna de dados" acima. O limite do plano Basic é por fonte de dados, não por conta.
2. Puxar do conector `google_my_business` os campos `date, impressions` (série diária) e
   `review_create_time, review_star_rating, review_total_count, review_average_rating`.
3. Recalcular os agregados semanais e a série acumulada de avaliações.
4. Rodar um scan novo no Local Falcon para o SoLV — **mesma grade 7×7 e mesmo raio de
   25 km** usados em agosto, senão o número não é comparável.
5. Republicar o HTML no **mesmo `file_path`** para manter a URL do artifact acima.
