# Campanha de Avaliações Google — Total Quality Medicina Diagnóstica

**Objetivo:** elevar a nota do perfil no Google (4,5★ em jul/2026, 316 avaliações) e o volume de
avaliações recentes, que são o principal fator de ranqueamento no mapa do Google (Local Pack) em
Caraguatatuba — onde a Total Quality tem 2% de Share of Local Voice contra 77,6% do Sabin.

**Status de compliance:** auditada conforme Resolução CFM 2.336/2023 e política de avaliações do
Google — APROVADA COM AJUSTES (aplicados abaixo). Pendência: rodapé de identificação do cartaz
(art. 5º) a preencher com registro CRM-SP da empresa e diretor técnico antes da impressão.

---

## Link e QR code

- **Link direto de avaliação:** https://search.google.com/local/writereview?placeid=ChIJl9cmhfhjzZQRANUzZnnRLF8
- **Place ID:** `ChIJl9cmhfhjzZQRANUzZnnRLF8`
- **QR code:** arquivo `qr-avaliacao-google-total-quality.png` (gerado com correção de erro nível H,
  adequado para impressão em até A4)

---

## Peça 1 — Mensagem WhatsApp pós-atendimento (versão aprovada)

Enviar **uma única vez**, no mesmo dia do atendimento ou na entrega do resultado:

> Olá, [NOME]! Aqui é da Total Quality 💙
>
> Obrigado por escolher nosso laboratório. Sua opinião é muito importante e ajuda outras pessoas
> de Caraguatatuba a conhecer nosso trabalho.
>
> Pode nos contar como foi sua experiência? Leva menos de 1 minuto:
> https://search.google.com/local/writereview?placeid=ChIJl9cmhfhjzZQRANUzZnnRLF8
>
> Obrigado! 😊

**Regras da automação (N8N/Evolution API):**
- Enviar para **todos** os pacientes atendidos — nunca filtrar por satisfação (review gating é
  vedado pela política do Google e pode derrubar avaliações legítimas).
- Envio único; sem lembrete para quem não responder.
- Se o paciente responder pedindo para não receber mensagens, marcar opt-out definitivo.
- Nunca oferecer desconto, brinde ou vantagem em troca da avaliação (vedado pelo Google e pelo
  art. 9º, VIII, da CFM 2.336/2023).

## Peça 2 — Cartaz/display de recepção (versão aprovada)

> **Sua opinião vale muito! 💙**
>
> Conte como foi sua experiência na Total Quality.
>
> Aponte a câmera do celular para o QR code e deixe sua avaliação no Google — leva menos de 1 minuto.
>
> **Total Quality Medicina Diagnóstica — cuidando de você desde 2003.**
>
> *(Forma perene, alinhada ao site: nunca fixar o número de anos numa peça impressa —
> a data de fundação é 08/07/2003 e o número muda sozinho a cada aniversário.)*
>
> ---
> *[Razão social] — Registro CRM-SP nº [PREENCHER] · Diretor(a) técnico(a): Dr(a). [NOME] — CRM-SP [Nº]*

Formatos sugeridos: display de balcão A5 na recepção e na sala de coleta; adesivo A6 no guichê de
entrega de resultados.

## Peça 3 — Script verbal da recepção (versão aprovada)

> "Antes de ir, posso te pedir uma coisinha? Sua avaliação no Google ajuda muito o laboratório.
> Tem um QR code aqui no balcão, leva menos de um minuto. Obrigado(a)!"

*(Sem condicionar o pedido a ter "sido bem atendido" — pedir a todos, sempre.)*

---

## Rotina complementar: responder avaliações

Responder avaliações (novas e antigas) também é sinal de ranqueamento e recuperação de nota:

- **5★–4★:** agradecer em 1–2 frases, personalizando quando possível. Sem citar exames ou dados
  do paciente na resposta (LGPD — resultado de exame é dado sensível).
- **3★ ou menos:** agradecer o relato, lamentar a experiência sem admitir culpa clínica, e levar a
  conversa para canal privado: "Queremos entender o que houve — pode nos chamar no (12) 3887-3535?"
  Nunca discutir publicamente nem expor qualquer informação do atendimento.
- Meta operacional: responder 100% das novas avaliações em até 48h e limpar o passivo das
  não respondidas ao ritmo de ~10 por semana (a resposta pode ser automatizada via integração já
  conectada — ação `reply_to_review`).

## Metas da campanha (revisar em 90 dias)

| Indicador | Base (jul/2026) | Meta 90 dias |
|---|---|---|
| Nota média | 4,5★ | ≥ 4,6★ |
| Total de avaliações | 316 | ≥ 420 |
| Novas avaliações/mês | — | ≥ 35 |
| Taxa de resposta às avaliações | — | 100% em 48h |
| SoLV "laboratório" (Local Falcon) | 2,0% | ≥ 15% |

Instrumentação: rescan mensal no Local Falcon (grade 7x7, termo "laboratório") e leitura mensal
das avaliações.
