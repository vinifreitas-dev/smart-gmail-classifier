// Gmail.gs
// Módulo responsável por interações com o Gmail (emails e labels)

/**
 * Busca threads na inbox que ainda não foram processadas.
 * Usa a label de controle (_Processado) para evitar reprocessamento.
 * 
 * @returns {GmailThread[]} Array de threads não processadas
 */
function getUnprocessedThreads() {
  // Query: na inbox + sem a label de processado
  const query = `is:inbox -label:${CONFIG.PROCESSED_LABEL}`;
  
  // O terceiro parâmetro limita a quantidade de resultados (BATCH_SIZE)
  // search() retorna threads, não mensagens individuais
  const threads = GmailApp.search(query, 0, CONFIG.BATCH_SIZE);
  
  Logger.log(`Threads não processadas encontradas: ${threads.length}`);
  
  return threads;
}

/**
 * Extrai as informações relevantes de uma thread para enviar ao Gemini.
 * Pega a primeira mensagem da thread (email original).
 * 
 * @param {GmailThread} thread - A thread do Gmail
 * @returns {Object} Objeto com remetente, assunto e corpo do email
 */
function extractEmailData(thread) {
  // Pega todas as mensagens da thread
  const messages = thread.getMessages();
  
  // Usa a PRIMEIRA mensagem (email original, não as respostas)
  const firstMessage = messages[0];
  
  // Extrai o corpo como texto puro (sem HTML)
  // getPlainBody() é melhor que getBody() para análise de IA
  // porque remove tags HTML, assinaturas visuais e formatação
  let body = firstMessage.getPlainBody() || '';
  
  // Trunca o corpo para não estourar tokens do Gemini
  if (body.length > CONFIG.MAX_BODY_LENGTH) {
    body = body.substring(0, CONFIG.MAX_BODY_LENGTH) + '... [truncado]';
  }
  
  const emailData = {
    from: firstMessage.getFrom(),       // Ex: "João Silva <joao@empresa.com>"
    subject: thread.getFirstMessageSubject(),
    body: body
  };
  
  Logger.log(`Email de: ${emailData.from} | Assunto: ${emailData.subject}`);
  
  return emailData;
}

/**
 * Busca uma label pelo nome. Se não existir, cria.
 * 
 * @param {string} labelName - Nome da label desejada
 * @returns {GmailLabel} Objeto da label (existente ou recém-criada)
 */
function getOrCreateLabel(labelName) {
  // Tenta encontrar a label existente
  let label = GmailApp.getUserLabelByName(labelName);
  
  // Se não existe, cria uma nova
  if (!label) {
    label = GmailApp.createLabel(labelName);
    Logger.log(`Label criada: "${labelName}"`);
  } else {
    Logger.log(`Label encontrada: "${labelName}"`);
  }
  
  return label;
}

/**
 * Aplica a label de classificação (cliente ou "Outros") 
 * e a label de controle (_Processado) à thread.
 * 
 * @param {GmailThread} thread - A thread para classificar
 * @param {string} labelName - Nome da label a aplicar (nome do cliente ou "Outros")
 */
function classifyThread(thread, labelName) {
  // Aplica a label de classificação (ex: "Empresa ABC" ou "Outros")
  const classificationLabel = getOrCreateLabel(labelName);
  thread.addLabel(classificationLabel);
  
  // Aplica a label de controle para não processar novamente
  const processedLabel = getOrCreateLabel(CONFIG.PROCESSED_LABEL);
  thread.addLabel(processedLabel);
  
  Logger.log(`Thread classificada como: "${labelName}" ✓`);
}
