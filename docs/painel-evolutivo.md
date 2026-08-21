# Painel evolutivo — status das ações e como regenerar

Painel publicado (privado, compartilhável pelo menu da própria página):
**https://claude.ai/code/artifact/806752bc-e882-4c16-9dec-9c181dc82ea0**

Gerado em 19/08/2026 · dados de 01/06/2026 a 19/08/2026.

---

## Números do painel (fonte e apuração)

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

## Estado das frentes em 19/08/2026

| Frente | Status | Observação |
|---|---|---|
| Perfil do Google (horário, site, telefone, descrição) | ✅ feito | via API |
| Campanha de avaliações + rotina de resposta | ✅ rodando | 28 novas, 100% 5★ |
| Posts por prioridade (laboratorial → ultrassom → tomografia) | ✅ concluído | 12, 15 e 18/08 |
| **Categorias do perfil (7 → 3)** | ⚠️ **pendente** | só no painel do GBP; é a ação nº 1 |
| Lista de Serviços no perfil | ⚠️ pendente | só no painel do GBP |
| Site oficial — HTML pré-renderizado, schema, imagens | ✅ resolvido | site reconstruído; ver auditoria abaixo |
| Site oficial — soft 404 | ⚠️ pendente | URL inexistente ainda responde HTTP 200 |
| Sites-clone (lovable.app, localo.site) | ⚠️ pendente | ambos no ar em 20/08 |

## Reverificação técnica do site (20/08/2026)

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

Permanece em aberto:

- **Soft 404**: `https://totalquality.med.br/pagina-que-nao-existe-xyz123` responde
  **HTTP 200** com o title da home e sem H1. Deve responder 404 (ou 410) para evitar
  que o Google indexe URLs inexistentes e dilua o rastreamento.
- **`aggregateRating` desatualizado** no JSON-LD: declara `reviewCount: 348` enquanto
  o perfil já tem 362. Vale automatizar a leitura ou revisar periodicamente.

## Como regenerar o painel

```bash
python3 docs/gerar-painel-evolutivo.py   # escreve docs/painel-evolutivo.html
```

Os dados estão no topo do script (listas `weeks_rev`, `weeks_imp`, `cum`, `solv`).
Para atualizar, puxar do conector Windsor (`google_my_business`) os campos
`date, impressions` e `review_create_time, review_star_rating`, recalcular os
agregados semanais e substituir as listas. Depois, republicar o mesmo arquivo como
artifact para manter a **mesma URL** acima.
