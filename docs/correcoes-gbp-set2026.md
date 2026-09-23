# Correções aplicadas no Google Meu Negócio — 05/09/2026

Aplicadas via API (conector Windsor `google_my_business`, ações `update_categories` e
`update_service_items`), na location `locations/17072583008115284441`.

> Nota de método: a auditoria de agosto registrava que "a API do Business Profile não expõe
> lista de serviços nem categorias". **Isso mudou** — o conector passou a oferecer
> `update_categories`, `update_service_items`, `update_service_area`, `update_attributes`,
> `update_address` e `set_open_status`. As duas pendências que dependiam do painel foram
> resolvidas por API.

---

## 1. Categoria "Serviço de exame de sangue"

**Antes:** principal `gcid:laboratory` + 1 adicional (`gcid:medical_diagnostic_imaging_center`).
**Depois:** principal `gcid:laboratory` + 2 adicionais — `gcid:blood_testing_service`
("Serviço de exame de sangue") e `gcid:medical_diagnostic_imaging_center`.

**Por quê.** A auditoria de agosto recomendava reduzir de 7 para "no máximo 2–3 realmente
estratégicas (ex.: *Serviço de exames de sangue* + Centro de diagnóstico por imagem)". A
redução foi feita, mas essa categoria específica ficou de fora — justamente a que nomeia o
exame definido como prioridade nº 1.

**Evidência.** No scan 7×7 de 25/08 para "exame de sangue caraguatatuba", o LABORATORIO
FERREIRA LF — **29 avaliações**, categoria `Blood testing service` — faz 20,7% de SoLV. A
Total Quality, com **393 avaliações**, faz 0%.

## 2. Lista de Serviços: de 1 para 16 itens

**Antes:** um único item ("Teste de alergia").
**Depois:** 16 itens, distribuídos pelas três categorias.

| Categoria | Itens |
|---|---|
| Serviço de exame de sangue | Exame de sangue · Hemograma completo · Glicemia em jejum · Colesterol total e frações · Exame de urina · Exame de fezes (parasitológico) · Exame toxicológico para CNH |
| Laboratório *(principal)* | Exames laboratoriais · Análises clínicas · Check-up preventivo · Coleta domiciliar |
| Centro de diagnóstico por imagem | Ultrassonografia geral e Doppler · Tomografia computadorizada · Raio-X digital · Mamografia digital |
| *(estruturado, mantido)* | Teste de alergia |

**Por quê.** É o veículo legítimo para o perfil carregar expressões como "análises clínicas" e
"exames laboratoriais". O caminho que Sabin e Duclin usam — enfiar a palavra-chave no **nome
do perfil** — viola as diretrizes de representação do Google e sujeita o perfil a suspensão.

---

## Verificação factual antes de publicar

Cada item foi conferido contra o código-fonte do site, que é a fonte de verdade acordada.
Dois itens do rascunho foram corrigidos por não se sustentarem:

| Rascunho | Problema | Publicado |
|---|---|---|
| Exame toxicológico "Credenciado, com envio do resultado ao órgão" | O site diz que a amostra é **enviada a laboratório credenciado** — a Total Quality é o ponto de coleta, não o laboratório credenciado | "A coleta é feita na unidade e enviada a laboratório credenciado; o resultado é emitido em formato padronizado aceito pelo Detran" |
| Ultrassonografia "realizados por médico radiologista" | Nenhuma fonte no site sustenta quem executa | Removida a atribuição |

Confirmados no site e mantidos: coleta domiciliar, mamografia digital, ultrassom com Doppler,
exame toxicológico para categorias C/D/E, e toda a lista laboratorial.

## Compliance (CFM 2.336/2023)

Descrições redigidas sem promessa de resultado, sem superlativo de superioridade e sem
gancho de medo. O texto reforça, onde cabe, que o exame é feito **mediante solicitação
médica** e interpretado pelo médico — laboratório investiga, não trata.

**Pendência que depende de decisão humana.** O art. 5º exige, em local visível, o nome do
estabelecimento com o registro no CRM e o nome do diretor técnico-médico com o respectivo CRM;
o art. 6º estende a exigência à página principal de perfis. A descrição atual do perfil **não
traz nenhum dos dois** — verificado em 05/09 no campo `location_profile_description`. Registros
anteriores afirmavam que constavam "na bio"; não constam.

---

## Efeito esperado e como medir

Mudança de categoria passa por revisão do Google e leva de **2 a 6 semanas** para refletir no
ranking. A campanha do Local Falcon está **pausada desde 25/08** — sem religá-la não haverá
série para medir o efeito. Antes de religar, fixar grade e raio e não mexer mais.

Baseline a bater, do scan de 25/08 (7×7, 10 mi):

| Termo | ARP | SoLV |
|---|---:|---:|
| exame de sangue caraguatatuba | 8,48 | 0% |
| laboratório em caraguatatuba | 7,52 | 0% |
| laboratório de análises clínicas | 21,00 | 0% (0/29 pontos) |

## Adendo — 07/09/2026: conector `google_my_business` desconectado

O plano Basic do Windsor.ai limita a conta a **3 fontes de dados**. Para liberar
a leitura do Google Ads (auditoria de termos de busca), o conector
`google_my_business` foi desconectado, restando `facebook`, `google_ads` e
`googleanalytics4`.

**Consequência operacional:** a rotina diária de resposta a avaliações
(`trig_01RREzRcz8UhThrddo4WVb7v`, dispara às 03h01 UTC / 00h01 de Brasília)
depende do conector `google_my_business` para ler avaliações novas e publicar
respostas. Sem ele a rotina roda, mas não enxerga nada — as avaliações ficam
sem resposta e o acúmulo não é recuperado retroativamente pela rotina.

**Recomendação:** trocar `facebook` por `google_my_business` assim que a
auditoria do Google Ads for concluída. O `facebook` não sustenta nenhuma rotina
automática nem nenhum item em aberto; os outros três, sim:

| Conector | O que sustenta |
|---|---|
| `google_my_business` | Rotina diária de avaliações; SoLV/Local Pack; categorias e serviços |
| `googleanalytics4` | Painel evolutivo; eventos-chave; filtro de hostname |
| `google_ads` | Auditoria de termos de busca; negativas; revisões de 7 e 30 dias |
| `facebook` | Nada em aberto |

Enquanto o GBP estiver fora, as respostas a avaliações precisam ser feitas
manualmente no Perfil da Empresa, seguindo as mesmas regras invioláveis:
nunca citar exames, resultados ou dados de atendimento (LGPD, mesmo que o
paciente cite primeiro); avaliações ≤3★ agradecem, lamentam sem admitir falha
clínica e encaminham para o (12) 3887-3535; nenhuma promessa de resultado;
nenhum superlativo de superioridade (CFM 2.336/2023).
