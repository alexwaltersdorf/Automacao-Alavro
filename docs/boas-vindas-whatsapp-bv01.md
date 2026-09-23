# BV-01 — Boas-vindas automáticas no WhatsApp

Workflow N8N `1rnwiIYsRCzPYe7D`, criado em 23/09/2026. **Desativado.**

## O que faz

A cada 5 minutos lê a aba Leads da planilha, seleciona os cadastros novos e
manda uma mensagem de boas-vindas pelo WhatsApp, usando a mesma instância
Evolution que o ANA-01 já usa.

```
Schedule (5 min) → Ler aba Leads → Selecionar novos e montar mensagem
   → Dentro do horário (8h-20h)? ─true→ Registrar (trava) → Enviar (Evolution)
                                 └false→ não envia
```

## A trava de duplicidade é o ponto central

A planilha prova que o mesmo paciente entra várias vezes:

| Pessoa | Cadastros | Intervalo |
| --- | ---: | --- |
| Isabela Nanni | 3 | 09:30, 09:32:21, 09:32:52 |
| Valdomiro de Jesus Souza | 3 | 11:06:41, 11:06:57, 11:21:51 |
| Ramon Santana | 2 | 29 segundos |
| Alex Waltersdorf | 5 | — |

Sem trava, a Isabela receberia a mesma mensagem **três vezes em dois minutos**.

A trava é a chave primária da tabela:

```sql
CREATE TABLE IF NOT EXISTS tq_boasvindas_enviadas (
  telefone   TEXT PRIMARY KEY,
  nome       TEXT,
  origem     TEXT,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

O nó grava com `ON CONFLICT (telefone) DO NOTHING ... RETURNING`. Se o telefone
já recebeu, a query devolve **zero linhas**, o item morre ali e o envio nem
acontece. Não há checagem separada que possa correr em paralelo com a gravação.

**Rodar esse CREATE TABLE antes de ativar.** Sem ele o workflow falha — de
propósito. Falhar é melhor do que mandar cinco vezes.

## Quem é descartado, e por quê

| Regra | Motivo | Caso real |
| --- | --- | --- |
| Telefone que não é celular de 11 dígitos | WhatsApp precisa de celular | fixo `(12) 3887-3535` |
| Terceiro dígito ≠ 9 | celular brasileiro começa com 9 | Edi, `(12) 07069-7843` |
| DDI/DDD ambíguo | não chutar destinatário | Jeane, `(55) 12982-2913` — DDD 55 ou +55? |
| Nome com "teste" ou "ignorar" | linhas de teste | `TESTE AUTOMATIZADO`, `Teste` |
| Número na lista de bloqueio | teste | `(12) 99999-0000` |
| Telefone repetido na mesma rodada | dedup dentro da leitura | Isabela ×3 |
| Cadastro há mais de 14 horas | não ressuscitar base antiga | — |

13 casos de normalização de telefone foram testados contra os números reais da
planilha antes de subir o workflow.

## Travas de segurança

- **Teto de 10 mensagens por rodada.** Um erro não vira disparo em massa.
- **Janela 8h-20h.** A planilha tem cadastro às 00:04, 00:30, 00:41 e 01:19;
  ninguém recebe propaganda da clínica à uma da manhã. Quem cadastra fora do
  horário recebe na primeira rodada da manhã, porque a janela de 14 horas
  alcança a noite anterior.
- **`onError: continueRegularOutput` no envio.** Uma falha de envio não derruba
  a rodada inteira.
- **Ao ativar, os leads das últimas 14 horas recebem.** Ativar em horário
  consciente.

## A mensagem

Reescrita depois de auditoria de conformidade (CFM 2.336/2023). O texto original
foi **reprovado**. O que saiu e por quê:

| Trecho removido | Dispositivo |
| --- | --- |
| "Equipamentos de última geração", "tecnologia de ponta" | art. 11, II — capacidade privilegiada a aparelhagem |
| "diagnósticos precisos e confiáveis" | art. 11, XII — insinuar bons resultados |
| "Resultados rápidos e laudos em curto prazo" | art. 11, XII — promessa sem prazo verificável |
| "Profissionais experientes e qualificados em cada especialidade" | art. 11, XVI (autopromoção) + art. 4º (especialidade exige RQE) |
| "Ambiente confortável e acolhedor… humanizado e personalizado" | art. 11, XVI — autopromoção |
| "Tempo é Vida" ao lado da lista de exames | sensacionalismo: informação que pode causar intranquilidade |
| Segunda saudação, segunda lista, segundo link | a mensagem original trazia tudo duas vezes |
| "Check-Ups a partir de R$ 99,90" / "R$ 179,99" | ver abaixo |

E o que **entrou**, porque faltava e é obrigatório (art. 5º):

```
Total Quality Medicina Diagnóstica — Registro 970616
Responsável Técnico: Alex Waltersdorf - 267.339
```

### O preço

A mensagem original citava **dois valores diferentes para o mesmo item**:
`R$ 99,90` num bloco e `R$ 179,99` no outro. Nenhum dos dois corresponde a
check-up no site, que anuncia Básico **R$ 299,90**, Select **R$ 599,90** e
Premium **R$ 999,90**. `R$ 99,90` é a mensalidade do **Cartão Quality Premium**,
outro produto.

Preço anunciado vincula o fornecedor (CDC art. 30). Uma mensagem automática
dizendo R$ 99,90 obrigaria a clínica a honrar esse valor para todo lead que a
recebesse.

Decisão do Alex em 23/09: **a mensagem não cita valor**, e aponta para
`totalquality.med.br/checkup`.

## Pendente de conferência

O **link do Instagram** vai para todo paciente novo e não foi auditado — não
consigo ver o conteúdo do reel. Se ele mostrar paciente identificável,
procedimento em andamento ou promessa de resultado, herda as mesmas vedações.
Conferir antes de ativar.

## Para ativar

1. Rodar o `CREATE TABLE` acima no Postgres do N8N.
2. Conferir o reel do Instagram.
3. Abrir o workflow e ativar, em horário comercial.
4. Acompanhar a primeira rodada nas execuções.
