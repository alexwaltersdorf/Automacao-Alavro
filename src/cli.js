#!/usr/bin/env node
import { Command } from 'commander';
import config, { missingSendingCredentials } from './config.js';
import logger from './logger.js';
import { getDb, closeDb } from './db/index.js';
import { parseContactsCsvFile } from './utils/csv.js';
import { formatDisplay } from './utils/phone.js';
import { getClient } from './whatsapp/client.js';
import { buildTemplateComponents } from './whatsapp/messages.js';
import {
  importContacts, createList, listLists, listContacts, getContactByPhone, optOut,
} from './core/contacts.js';
import {
  createCampaign, getCampaign, listCampaigns, buildQueue, startCampaign,
  pauseCampaign, cancelCampaign, retryFailed, getCampaignMessages,
} from './core/campaigns.js';
import { Dispatcher } from './core/dispatcher.js';

const program = new Command();

program
  .name('alavro')
  .description('Disparo de mensagens em massa pelo WhatsApp usando a API oficial da Meta')
  .version('1.0.0');

// --- Diagnóstico ------------------------------------------------------------

program
  .command('doctor')
  .description('Confere credenciais, token e saúde do número na Meta')
  .action(async () => {
    getDb();
    const missing = missingSendingCredentials();
    console.log('\n== Configuração ==');
    console.log(`Graph API:        ${config.whatsapp.apiVersion}`);
    console.log(`Phone Number ID:  ${config.whatsapp.phoneNumberId || '(vazio)'}`);
    console.log(`WABA ID:          ${config.whatsapp.businessAccountId || '(vazio)'}`);
    console.log(`Token:            ${config.whatsapp.accessToken ? `${config.whatsapp.accessToken.slice(0, 8)}…` : '(vazio)'}`);
    console.log(`App Secret:       ${config.whatsapp.appSecret ? 'configurado' : '(vazio)'}`);
    console.log(`Verify Token:     ${config.whatsapp.webhookVerifyToken ? 'configurado' : '(vazio)'}`);
    console.log(`Ritmo:            ${config.sending.ratePerSecond} msg/s, concorrência ${config.sending.concurrency}`);
    console.log(`Limite diário:    ${config.sending.dailyUniqueRecipientLimit || 'ilimitado'}`);
    console.log(`DRY_RUN:          ${config.sending.dryRun ? 'SIM (nada é enviado)' : 'não'}`);

    if (missing.length > 0) {
      console.log(`\n✗ Faltando no .env: ${missing.join(', ')}`);
      process.exitCode = 1;
      return closeDb();
    }

    try {
      const phone = await getClient().getPhoneNumber();
      console.log('\n== Número comercial ==');
      console.log(`Número:           ${phone.display_phone_number}`);
      console.log(`Nome verificado:  ${phone.verified_name}`);
      console.log(`Qualidade:        ${phone.quality_rating}`);
      console.log(`Tier de envio:    ${phone.messaging_limit_tier ?? 'não informado'}`);
      console.log(`Verificação:      ${phone.code_verification_status}`);
      console.log('\n✓ Conexão com a Meta funcionando.');
    } catch (error) {
      console.log(`\n✗ Falha ao consultar a Meta: ${error.detail ?? error.message}`);
      process.exitCode = 1;
    }
    closeDb();
  });

// --- Contatos ---------------------------------------------------------------

const contacts = program.command('contacts').description('Gerenciar contatos');

contacts
  .command('import <arquivo.csv>')
  .description('Importa contatos de um CSV (colunas: telefone, nome, + campos livres)')
  .option('-l, --list <nome>', 'adiciona os contatos a uma lista')
  .option('--no-opt-in', 'marca os contatos como não consentidos')
  .action((file, options) => {
    getDb();
    const rows = parseContactsCsvFile(file);
    const listId = options.list ? createList(options.list).id : null;
    const summary = importContacts(rows, { listId, defaultOptedIn: options.optIn !== false });

    console.log(`\nLinhas lidas:  ${summary.total}`);
    console.log(`Criados:       ${summary.created}`);
    console.log(`Atualizados:   ${summary.updated}`);
    console.log(`Inválidos:     ${summary.invalid.length}`);
    if (options.list) console.log(`Lista:         ${options.list} (id ${listId})`);
    for (const item of summary.invalid.slice(0, 15)) {
      console.log(`  ✗ ${item.phone}: ${item.error}`);
    }
    if (summary.invalid.length > 15) console.log(`  … e mais ${summary.invalid.length - 15}`);
    closeDb();
  });

contacts
  .command('list')
  .description('Lista contatos')
  .option('-n, --limit <n>', 'quantidade', '20')
  .option('-s, --search <texto>', 'filtra por nome ou telefone')
  .action((options) => {
    getDb();
    const { total, items } = listContacts({ limit: Number(options.limit), search: options.search ?? '' });
    console.log(`\n${items.length} de ${total} contatos\n`);
    for (const contact of items) {
      const flag = contact.opted_in ? ' ' : '✗';
      console.log(`${flag} #${String(contact.id).padEnd(5)} ${formatDisplay(contact.phone_e164).padEnd(22)} ${contact.name ?? ''}`);
    }
    closeDb();
  });

contacts
  .command('opt-out <telefone>')
  .description('Descadastra um contato manualmente')
  .action((phone) => {
    getDb();
    const contact = getContactByPhone(phone);
    if (!contact) {
      console.log('Contato não encontrado.');
      process.exitCode = 1;
    } else {
      const result = optOut(contact.id, 'descadastro manual via CLI');
      console.log(`✓ ${formatDisplay(contact.phone_e164)} descadastrado (${result.cancelledMessages} envios cancelados).`);
    }
    closeDb();
  });

program
  .command('lists')
  .description('Mostra as listas de contatos')
  .action(() => {
    getDb();
    const items = listLists();
    if (items.length === 0) console.log('Nenhuma lista cadastrada.');
    for (const list of items) {
      console.log(`#${String(list.id).padEnd(4)} ${list.name.padEnd(30)} ${list.contact_count} contatos`);
    }
    closeDb();
  });

// --- Templates --------------------------------------------------------------

program
  .command('templates')
  .description('Lista os templates cadastrados na sua conta da Meta')
  .action(async () => {
    getDb();
    try {
      const page = await getClient().listTemplates({ limit: 100 });
      console.log('');
      for (const template of page.data ?? []) {
        const mark = template.status === 'APPROVED' ? '✓' : template.status === 'REJECTED' ? '✗' : '…';
        console.log(`${mark} ${template.name.padEnd(32)} ${template.language.padEnd(8)} ${template.status.padEnd(10)} ${template.category ?? ''}`);
      }
      console.log('\nSó templates APPROVED podem ser usados em disparos.');
    } catch (error) {
      console.log(`✗ ${error.detail ?? error.message}`);
      process.exitCode = 1;
    }
    closeDb();
  });

// --- Campanhas --------------------------------------------------------------

const campaigns = program.command('campaigns').description('Gerenciar campanhas');

campaigns
  .command('create <nome>')
  .description('Cria uma campanha de template')
  .requiredOption('-t, --template <nome>', 'nome do template APROVADO na Meta')
  .option('-g, --language <código>', 'idioma do template', 'pt_BR')
  .option('-l, --list <id>', 'id da lista de contatos')
  .option('-b, --body <vars>', 'variáveis do corpo separadas por vírgula, ex.: "{{name}},{{cidade}}"')
  .option('-s, --schedule <iso>', 'agenda o disparo (ISO 8601, ex.: 2026-08-01T09:00:00Z)')
  .action((name, options) => {
    getDb();
    const templateComponents = options.body
      ? { body: options.body.split(',').map((value) => value.trim()) }
      : null;

    const campaign = createCampaign({
      name,
      listId: options.list ? Number(options.list) : null,
      messageType: 'template',
      templateName: options.template,
      templateLanguage: options.language,
      templateComponents,
      scheduledAt: options.schedule ?? null,
    });
    console.log(`✓ Campanha #${campaign.id} "${campaign.name}" criada (${campaign.status}).`);
    console.log(`  Próximo passo: alavro campaigns preview ${campaign.id}`);
    closeDb();
  });

campaigns
  .command('list')
  .description('Lista as campanhas e o progresso de cada uma')
  .action(() => {
    getDb();
    const { items } = listCampaigns({ limit: 50 });
    if (items.length === 0) console.log('Nenhuma campanha cadastrada.');
    for (const campaign of items) {
      const s = campaign.stats;
      console.log(
        `#${String(campaign.id).padEnd(4)} ${campaign.name.slice(0, 28).padEnd(30)} ${campaign.status.padEnd(10)} ` +
          `${s.processed}/${s.total} · entregues ${s.deliveredTotal} · falhas ${s.failed}`,
      );
    }
    closeDb();
  });

campaigns
  .command('preview <id>')
  .description('Monta a fila e mostra o público e um exemplo da mensagem, sem enviar nada')
  .action((id) => {
    getDb();
    const campaignId = Number(id);
    const summary = buildQueue(campaignId);
    const campaign = getCampaign(campaignId);

    console.log(`\nCampanha #${campaign.id} — ${campaign.name}`);
    console.log(`Público:            ${summary.audience}`);
    console.log(`Na fila:            ${summary.queued}`);
    console.log(`Já estavam na fila: ${summary.alreadyQueued}`);
    console.log(`Fora (opt-out):     ${summary.skippedOptOut}`);
    console.log(`Fora (sem WhatsApp):${summary.invalidWhatsApp}`);

    const { items } = getCampaignMessages(campaignId, { limit: 3 });
    if (items.length > 0) {
      console.log('\nPrimeiros destinatários:');
      for (const message of items) console.log(`  ${formatDisplay(message.phone_e164)} ${message.contact_name ?? ''}`);
    }
    if (campaign.template_components) {
      const example = buildTemplateComponents(campaign.template_components, {
        name: 'Maria', nome: 'Maria', cidade: 'Caraguatatuba',
      });
      console.log(`\nComponentes do template (exemplo):\n${JSON.stringify(example, null, 2)}`);
    }
    console.log(`\nPara disparar: alavro campaigns send ${campaignId}`);
    closeDb();
  });

campaigns
  .command('send <id>')
  .description('Dispara a campanha e acompanha o progresso até o fim')
  .option('-r, --rate <n>', 'mensagens por segundo (sobrescreve o .env)')
  .option('--detach', 'apenas marca como "queued" e sai (o servidor faz o envio)')
  .action(async (id, options) => {
    const db = getDb();
    const campaignId = Number(id);
    const campaign = getCampaign(campaignId);
    if (!campaign) {
      console.log('Campanha não encontrada.');
      process.exitCode = 1;
      return closeDb();
    }

    const missing = missingSendingCredentials();
    if (missing.length > 0 && !config.sending.dryRun) {
      console.log(`✗ Credenciais faltando no .env: ${missing.join(', ')}`);
      process.exitCode = 1;
      return closeDb();
    }

    startCampaign(campaignId);
    if (options.detach) {
      console.log(`✓ Campanha #${campaignId} enfileirada. O servidor cuida do envio.`);
      return closeDb();
    }

    const dispatcher = new Dispatcher({
      db,
      ratePerSecond: options.rate ? Number(options.rate) : config.sending.ratePerSecond,
    });

    console.log(`\nDisparando campanha #${campaignId} — ${campaign.name}${config.sending.dryRun ? ' [DRY RUN]' : ''}\n`);

    let done = false;
    while (!done) {
      await dispatcher.tick();
      const current = getCampaign(campaignId);
      const s = current.stats;
      process.stdout.write(
        `\r  ${s.processed}/${s.total} processadas · enviadas ${s.sent + s.deliveredTotal} · ` +
          `falhas ${s.failed} · ignoradas ${s.skipped}   `,
      );
      done = ['completed', 'paused', 'cancelled', 'failed'].includes(current.status);
      if (!done && s.pending > 0) await new Promise((resolve) => setTimeout(resolve, 400));
      else if (!done) break;
    }

    const final = getCampaign(campaignId);
    console.log(`\n\nStatus final: ${final.status}`);
    if (final.last_error) console.log(`Motivo: ${final.last_error}`);
    console.log(
      `Enviadas ${final.stats.sent + final.stats.deliveredTotal} · entregues ${final.stats.deliveredTotal} · ` +
        `falhas ${final.stats.failed} · ignoradas ${final.stats.skipped}`,
    );
    closeDb();
  });

campaigns.command('pause <id>').description('Pausa uma campanha em andamento').action((id) => {
  getDb();
  pauseCampaign(Number(id), 'pausada via CLI');
  console.log(`✓ Campanha #${id} pausada.`);
  closeDb();
});

campaigns.command('cancel <id>').description('Cancela a campanha e a fila pendente').action((id) => {
  getDb();
  cancelCampaign(Number(id));
  console.log(`✓ Campanha #${id} cancelada.`);
  closeDb();
});

campaigns.command('retry <id>').description('Recoloca na fila as mensagens que falharam').action((id) => {
  getDb();
  const result = retryFailed(Number(id));
  console.log(`✓ ${result.requeued} mensagens recolocadas na fila.`);
  closeDb();
});

campaigns
  .command('report <id>')
  .description('Resumo detalhado da campanha')
  .action((id) => {
    getDb();
    const campaign = getCampaign(Number(id));
    if (!campaign) {
      console.log('Campanha não encontrada.');
      process.exitCode = 1;
      return closeDb();
    }
    const s = campaign.stats;
    console.log(`\nCampanha #${campaign.id} — ${campaign.name}`);
    console.log(`Status:     ${campaign.status}`);
    console.log(`Template:   ${campaign.template_name ?? '(texto livre)'} [${campaign.template_language}]`);
    console.log(`Início:     ${campaign.started_at ?? '—'}`);
    console.log(`Fim:        ${campaign.finished_at ?? '—'}`);
    console.log(`\nTotal:      ${s.total}`);
    console.log(`Pendentes:  ${s.pending}`);
    console.log(`Enviadas:   ${s.sent}`);
    console.log(`Entregues:  ${s.delivered}`);
    console.log(`Lidas:      ${s.read}`);
    console.log(`Falhas:     ${s.failed}`);
    console.log(`Ignoradas:  ${s.skipped}`);
    console.log(`Canceladas: ${s.cancelled}`);

    const failures = getCampaignMessages(Number(id), { status: 'failed', limit: 10 });
    if (failures.items.length > 0) {
      console.log('\nPrincipais falhas:');
      for (const message of failures.items) {
        console.log(`  ${formatDisplay(message.phone_e164)} [${message.error_code}] ${message.error_detail}`);
      }
    }
    closeDb();
  });

// --- Envio avulso -----------------------------------------------------------

program
  .command('send-test <telefone>')
  .description('Envia uma mensagem de teste para validar as credenciais')
  .option('-t, --template <nome>', 'nome do template aprovado', 'hello_world')
  .option('-g, --language <código>', 'idioma do template', 'en_US')
  .option('-m, --text <mensagem>', 'envia texto livre (só funciona com a janela de 24h aberta)')
  .action(async (phone, options) => {
    getDb();
    const client = getClient();
    const { normalizePhone } = await import('./utils/phone.js');
    const normalized = normalizePhone(phone, config.app.defaultCountryCode);
    if (!normalized.ok) {
      console.log(`✗ Telefone inválido: ${normalized.error}`);
      process.exitCode = 1;
      return closeDb();
    }

    try {
      const result = options.text
        ? await client.sendText(normalized.e164, options.text)
        : await client.sendTemplate(normalized.e164, options.template, options.language, []);
      console.log(`✓ Mensagem aceita pela Meta para ${formatDisplay(normalized.e164)}`);
      console.log(`  wamid: ${result.wamid}`);
    } catch (error) {
      console.log(`✗ [${error.code ?? '?'}] ${error.detail ?? error.message}`);
      if (error.action === 'pause') console.log('  → problema de credencial/conta: rode "alavro doctor".');
      process.exitCode = 1;
    }
    closeDb();
  });

program.parseAsync(process.argv).catch((error) => {
  logger.error('falha no comando', { error: error.message });
  process.exitCode = 1;
});
