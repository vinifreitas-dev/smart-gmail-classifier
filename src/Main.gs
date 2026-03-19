// Main.gs
// Orquestrador principal — função que o trigger vai executar

/**
 * Função principal que processa emails não classificados.
 * Esta é a função que será executada pelo trigger automático.
 * 
 * Fluxo:
 * 1. Lê lista de clientes do Google Doc
 * 2. Busca emails não processados
 * 3. Para cada email, classifica com Gemini
 * 4. Aplica label correspondente
 */
function processEmails() {
  Logger.log('========== INÍCIO DO PROCESSAMENTO ==========');

  // Passo 1: Ler lista de clientes
  const clients = getClientList();
  if (clients.length === 0) {
    Logger.log('ALERTA: Lista de clientes está vazia. Verifique o Google Doc.');
    return;
  }

  // Passo 2: Buscar emails não processados
  const threads = getUnprocessedThreads();
  if (threads.length === 0) {
    Logger.log('Nenhum email novo para processar. Encerrando.');
    return;
  }

  // Contadores para o resumo final
  let successCount = 0;
  let errorCount = 0;
  const results = [];

  // Passo 3 e 4: Para cada thread, classificar e aplicar label
  for (const thread of threads) {
    try {
      // Extrai dados do email
      const emailData = extractEmailData(thread);

      // Classifica com Gemini
      const classification = classifyWithGemini(clients, emailData);

      // Aplica a label ao email
      classifyThread(thread, classification);

      // Registra o resultado
      results.push({
        from: emailData.from,
        subject: emailData.subject,
        classification: classification,
        status: 'OK'
      });
      successCount++;

    } catch (error) {
      // Se um email falhar, loga o erro e continua com os outros
      Logger.log(`ERRO ao processar thread: ${error.message}`);
      errorCount++;
      results.push({
        subject: thread.getFirstMessageSubject(),
        classification: 'ERRO',
        status: error.message
      });
    }
  }

  // Resumo da execução
  Logger.log('========== RESUMO ==========');
  Logger.log(`Total processados: ${successCount + errorCount}`);
  Logger.log(`Sucesso: ${successCount}`);
  Logger.log(`Erros: ${errorCount}`);

  // Log detalhado de cada classificação
  results.forEach(r => {
    Logger.log(`  [${r.status}] ${r.subject} → ${r.classification}`);
  });

  Logger.log('========== FIM DO PROCESSAMENTO ==========');
}
