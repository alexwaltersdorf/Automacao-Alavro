# Prompt para a sessão LOCAL do Claude Code

Cole o texto abaixo na sessão do Claude Code que roda **no computador da clínica**
(pasta do Avantix), onde os códigos do Álvaro já estão disponíveis.

---

```text
Contexto: Nesta máquina roda o Átria LIS (Clientweb.exe) da minha clínica, na pasta
C:\Users\suporte\OneDrive\AVANTIX\TotalQuality-Caragua. Você já tem acesso à lista
de códigos do Laboratório Álvaro (laboratório de apoio B2B).

Objetivo: em 15 exames de hepatite, preencher o campo "código do apoio/B2B" do
Átria com o código do Álvaro e, quando o Átria permitir, deixar o código interno
IGUAL ao do Álvaro. Também corrigir a grafia do nome. Meta: mesmo código nas duas
plataformas, para consulta futura no site do Álvaro.

Exames (código atual no Átria = grafia corrigida):
AU / QAU       = Hepatite B - HBsAg (Antígeno de Superfície)
HBCM / QHBCM   = Hepatite B - Anti-HBc IgM
HBCT / QHBCT   = Hepatite B - Anti-HBc Total (IgG+IgM)
HBE / QHBE     = Hepatite B - Anti-HBe
HBEAG / QHBEAG = Hepatite B - HBeAg
HCV / QHCV     = Hepatite C - Anti-HCV
HVAG           = Hepatite A - Anti-HAV IgG
HVAM / QHVAM   = Hepatite A - Anti-HAV IgM

Faça o seguinte, SEM alterar nada ainda:
1. Monte a tabela DE-PARA: [código atual Átria] -> [código Álvaro] -> [nome
   padronizado], usando a lista do Álvaro que você já tem. Para os pares com "Q",
   trate como metodologias diferentes e busque o código Álvaro de cada um.
2. Descubra qual banco o Átria usa (procure .ini/.xml/.config na pasta: Firebird,
   SQL Server etc.), o servidor e o nome do banco.
3. Identifique a tabela de cadastro de exames e, principalmente, o CAMPO que guarda
   o "código do apoio / código externo / B2B" (e a tabela de vínculo com o
   laboratório de apoio Álvaro, se for separada).
4. Faça um SELECT mostrando os 15 exames com: código interno, nome atual e código
   de apoio atual.
5. Me apresente a tabela DE-PARA e o plano de UPDATE para eu aprovar.

Só depois da minha confirmação: faça BACKUP da(s) tabela(s) e execute os UPDATEs,
começando por 1 exame de teste (AU) antes de aplicar o lote.
```

---

## Depois que a sessão local responder

Copie aqui (nesta conversa na nuvem) a tabela DE-PARA que ela montar, para
atualizarmos `docs/exames-hepatite-de-para.md` e os scripts SQL com os códigos
reais do Álvaro.
