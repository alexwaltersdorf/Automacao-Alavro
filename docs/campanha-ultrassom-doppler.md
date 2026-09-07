# Campanha [TQ] Pesquisa | Ultrassom com Doppler | Caraguá 40km

**Criada em:** 07/09/2026 · **Conta:** 920-715-3288 · **ID:** `24220275336`
**Status:** 🔴 **PAUSADA — não ativar antes de definir o raio geográfico (§5)**

---

## 1. Escopo clínico

Definido pela clínica em 07/09/2026:

| Exame | Realiza? |
|---|:---:|
| Doppler de carótidas e vertebrais | ✅ |
| Doppler de tireoide | ✅ |
| Doppler de membros inferiores | ✅ |
| Doppler de membros superiores | ✅ |
| Doppler das mamas | ✅ |
| Doppler dos rins | ✅ |
| **Ecodopplercardiograma** | ❌ **não realiza** |

Essa distinção é o eixo da campanha. "Doppler" sozinho é ambíguo: em uso corrente
no Brasil, **"ecodoppler" costuma significar o exame cardíaco**. Uma campanha de
Doppler sem bloqueio do cardíaco compra clique de quem procura outra coisa — e
anunciar exame não prestado viola as diretrizes do Google e as normas do CFM.

## 2. Estrutura

Três grupos, consolidados por região anatômica. **Não** foram criados sete grupos
de um exame cada: a auditoria da campanha Ultrassom Modo B mostrou que
fragmentação por anatomia mata o volume — lá, sete grupos somaram 74 impressões
em 68 dias enquanto um único grupo genérico levava 93% da verba.

| Grupo | ID | Palavras |
|---|---|---:|
| Doppler Vascular \| Carótidas e Membros | `199497437906` | 2 |
| Doppler Tireoide e Mamas | `200883209758` | 4 |
| Doppler Rins e Geral | `200672463115` | 3 |

Palavras ativas (todas correspondência de frase):

| Grupo | Palavras |
|---|---|
| Vascular | `doppler de membros superiores` · `exame de circulacao das pernas` |
| Tireoide e Mamas | `doppler de mamas` · `doppler tireoidiano` · `ultrassom de mama com doppler` · `usg mamas com doppler` |
| Rins e Geral | `ultrassom com doppler` · `exame de doppler` · `agendar ultrassom com doppler` |

## 3. Negativas — 49

**Bloco cardíaco (12) — o que define a campanha:**
`ecocardiograma` · `ecocardio` · `ecodopplercardiograma` · `ecodoppler cardiaco` ·
`doppler cardiaco` · `doppler do coracao` · `cardiaco` · `cardiaca` · `coracao` ·
`cardiologista` · `ecotransesofagico` · `prostata`

`prostata` entra aqui porque a campanha Doppler antiga tinha um grupo "Doppler
Próstata" — exame que **não** consta da lista de Doppler realizados.

**Bloco de proteção entre campanhas (8):**
`obstetrico` · `obstetrica` · `gestante` · `gravidez` · `morfologico` · `sexagem` ·
`translucencia nucal` · `fetal`

A separação com a campanha Ultrassom Modo B já está garantida do outro lado: a
Modo B tem `doppler` como negativa ampla, então ela não disputa nenhum termo desta.

**Concorrentes, fora de área e ruído (29):** mesmos blocos aplicados à Modo B.

## 4. Anúncios, lance e destino

3 anúncios responsivos, um por grupo, todos apontando para
`https://totalquality.med.br/exames/ultrassonografia`:

| Grupo | ID do anúncio |
|---|---|
| Doppler Vascular | `823766676648` |
| Doppler Tireoide e Mamas | `823766638557` |
| Doppler Rins e Geral | `823810976305` |

Nenhum usa a palavra "ecodoppler" — o repositório do site tem guard-rail que a
proíbe, justamente pela ambiguidade com o exame cardíaco.

| Parâmetro | Valor |
|---|---|
| Estratégia | Maximizar conversões |
| CPA-alvo | R$ 20,00 |
| Orçamento diário | R$ 10,00 |
| Idioma | (padrão da conta) |

## 5. 🔴 O bloqueio: segmentação geográfica

**A API do Windsor.ai não expõe segmentação por localização.** As ações
disponíveis no conector `google_ads` cobrem campanha, grupo, anúncio, orçamento,
lance, idioma e programação — **não** localização.

Uma campanha de Pesquisa sem segmentação geográfica **serve o Brasil inteiro**.
Com CPA-alvo de R$ 20,00 e orçamento de R$ 10/dia, ativá-la assim queimaria a
verba em cliques de São Paulo, Rio e Belo Horizonte antes de encontrar um
paciente de Caraguatatuba.

Por isso a campanha foi criada **pausada**. Antes de ativar, no painel do
Google Ads:

1. Configurações da campanha → **Locais**
2. Inserir **Caraguatatuba, São Paulo** com **raio de 40 km**
3. Em opções de local, escolher **"Presença: pessoas que estão ou frequentam
   regularmente o local"** — e não "presença ou interesse", que traz quem só
   pesquisou sobre a cidade
4. Ativar a campanha

As outras campanhas da conta já usam esse padrão — o próprio nome
"Caraguá 40km" vem delas.

## 6. 🟠 As palavras que o Google recusou

Das 28 palavras planejadas, **19 foram recusadas** com erro de política. O
conector devolve apenas `A policy was violated. See PolicyViolationDetails for
more detail.` e **não expõe o `PolicyViolationDetails`**, então a política citada
não pode ser lida daqui.

Recusadas, para adicionar pelo painel:

**Doppler Vascular | Carótidas e Membros**
```
doppler de carotidas
doppler carotideo
doppler de carotidas e vertebrais
ultrassom doppler de carotidas
doppler carotidas caraguatatuba
doppler de membros inferiores
doppler venoso de membros inferiores
doppler arterial de membros inferiores
doppler venoso
doppler arterial
doppler de pernas
ultrassom vascular
```

**Doppler Tireoide e Mamas**
```
doppler de tireoide
ultrassom de tireoide com doppler
```

**Doppler Rins e Geral**
```
doppler renal
doppler de rins
ultrassom com doppler caraguatatuba
doppler colorido
onde fazer doppler
```

O mesmo aconteceu na auditoria da Modo B, com termos clínicos comuns
(`ultrassom abdominal`, `ultrassom de rins`, `ultrassom de mama`). O padrão sugere
uma política do Google Ads aplicada a termos clínicos que exige **isenção** —
mecanismo que a interface oferece e que este conector não implementa.

**Isso é grave para esta campanha em particular:** as palavras recusadas incluem
`doppler de carotidas` e `doppler de membros inferiores`, que são os dois exames
de maior demanda. Sem elas, a campanha nasce com cobertura muito parcial. Vale
adicioná-las pelo painel **antes** de ativar.

## 7. A campanha Doppler antiga

`[TQ] Pesquisa | Ultrassom Doppler | Caraguá 40km` (`24112137057`) segue
**pausada** e agora é redundante. Duas ações já tomadas nela:

- Removidas as palavras `ecodoppler` e `eco doppler` — anunciavam o exame
  cardíaco que a clínica não realiza
- Anúncios migrados do WhatsApp para o site (07/09)

**Recomendação:** removê-la. Se as duas forem ativadas juntas, disputam o mesmo
leilão com a mesma conta — a canibalização que esta sessão passou o dia corrigindo.
Ela tem sete grupos de um exame cada, estrutura que a auditoria da Modo B mostrou
não funcionar, e R$ 39,49 gastos com zero conversões.

## 8. Página de destino

A `/exames/ultrassonografia` passou a listar os Doppler realizados —
`Doppler de carótidas e vertebrais`, `Doppler de membros inferiores e superiores`,
`Doppler de tireoide, mamas e rins` — no lugar do genérico "Avaliação vascular
(Doppler)", que subdescrevia a oferta (tireoide, mamas e rins não são vasculares).

Alteração no PR `alexwaltersdorf/total-quality#26`, com guard-rail que trava os
dois lados: a página precisa continuar descrevendo Doppler, e não pode passar a
sugerir ecodopplercardiograma em nenhuma rota.

## 9. Checklist antes de ativar

- [ ] Definir **Caraguatatuba + 40 km**, com opção "Presença"
- [ ] Adicionar as 19 palavras recusadas (§6) — principalmente carótidas e membros inferiores
- [ ] Conferir se os 3 anúncios foram aprovados pela análise do Google
- [ ] Remover ou arquivar a campanha Doppler antiga (§7)
- [ ] Mesclar o PR #26 para a página descrever os exames anunciados
- [ ] Ativar com `enable_campaign` ou pelo painel

## 10. Como medir

Revisar em 7 e 14 dias, na mesma ordem da Modo B:

1. **Termos de busca** — nenhum termo cardíaco pode aparecer. Se aparecer, o bloco
   de negativas falhou e é prioridade.
2. **CPC** — referência: a Modo B saiu de R$ 3,00 com anúncios no WhatsApp; esta
   nasce apontando para o site, então deve começar mais barata.
3. **Distribuição entre os 3 grupos** — se "Rins e Geral" concentrar tudo, é sinal
   de que as palavras específicas recusadas fazem falta.
4. **CPA** — não reagir antes de ~15 conversões.
