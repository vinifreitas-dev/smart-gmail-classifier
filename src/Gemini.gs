// Gemini.gs
// Módulo responsável pela integração com a API do Gemini

/**
 * Monta o prompt de classificação com a lista de clientes e dados do email.
 * 
 * @param {string[]} clientList - Array com nomes dos clientes
 * @param {Object} emailData - Objeto com from, subject e body do email
 * @returns {string} Prompt formatado para o Gemini
 */
function buildClassificationPrompt(clientList, emailData) {
  const clientListFormatted = clientList
    .map((name, index) => `${index + 1}. ${name}`)
    .join('\n');

  return `Você é um assistente de classificação de emails corporativos.

Sua tarefa: analisar o email abaixo e determinar se ele está relacionado a algum dos clientes listados.

## LISTA DE CLIENTES
${clientListFormatted}

## EMAIL PARA CLASSIFICAR
Remetente: ${emailData.from}
Assunto: ${emailData.subject}
Corpo:
${emailData.body}

## REGRAS DE CLASSIFICAÇÃO
1. Analise o remetente, assunto e corpo do email em busca de menções a qualquer cliente da lista.
2. Considere variações: siglas, abreviações, nomes parciais, domínios de email que contenham o nome do cliente.
3. Se o email for relacionado a um cliente, responda com o nome EXATAMENTE como aparece na lista.
4. Se o email NÃO for relacionado a nenhum cliente, responda exatamente com a palavra: Outros (em português, nunca em inglês)
5. Se houver dúvida entre dois clientes, escolha o mais provável.

## FORMATO DE RESPOSTA
Responda APENAS com o nome do cliente (exatamente como na lista) ou "Outros".
Não inclua explicações, pontuação extra ou texto adicional.

Resposta:`;
}

/**
 * Extrai o texto da resposta do Gemini de forma segura.
 * A estrutura da resposta pode variar — esta função lida com todos os casos.
 * 
 * @param {Object} responseBody - Corpo da resposta da API
 * @returns {string|null} Texto extraído ou null se não foi possível extrair
 */
function extractGeminiResponse(responseBody) {
  try {
    if (!responseBody.candidates || responseBody.candidates.length === 0) {
      Logger.log('Sem candidates na resposta');
      return null;
    }

    const candidate = responseBody.candidates[0];

    if (!candidate.content) {
      Logger.log(`Candidate sem content. finishReason: ${candidate.finishReason || 'N/A'}`);
      return null;
    }

    if (!candidate.content.parts || candidate.content.parts.length === 0) {
      Logger.log('Content sem parts');
      return null;
    }

    const text = candidate.content.parts[0].text;
    if (text === undefined || text === null) {
      Logger.log('Parts[0] sem campo text');
      return null;
    }

    return text.trim();

  } catch (error) {
    Logger.log(`Erro ao extrair resposta do Gemini: ${error.message}`);
    Logger.log(`Response body: ${JSON.stringify(responseBody).substring(0, 500)}`);
    return null;
  }
}

/**
 * Chama a API do Gemini para classificar um email.
 * Retorna o nome do cliente, "Outros", ou null em caso de falha.
 * 
 * null = a API falhou e o email deve ser reprocessado depois.
 * "Outros" = o Gemini analisou e concluiu que não é de nenhum cliente.
 * 
 * @param {string[]} clientList - Array com nomes dos clientes
 * @param {Object} emailData - Objeto com from, subject e body do email
 * @returns {string|null} Nome do cliente, "Outros", ou null se falhou
 */
function classifyWithGemini(clientList, emailData) {
  // Delay configurável pelo perfil de uso (free tier vs paid)
  Utilities.sleep(CONFIG.API_DELAY_MS);

  const prompt = buildClassificationPrompt(clientList, emailData);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseBody = JSON.parse(response.getContentText());

  // Verifica erro HTTP — retorna null para reprocessar depois
  if (responseCode !== 200) {
    Logger.log(`Erro na API do Gemini (HTTP ${responseCode}): ${JSON.stringify(responseBody)}`);
    return null;
  }

  // Extrai resposta de forma segura
  const rawResponse = extractGeminiResponse(responseBody);

  if (rawResponse === null) {
    Logger.log('Não foi possível extrair resposta do Gemini — será reprocessado');
    return null;
  }

  Logger.log(`Resposta do Gemini (raw): "${rawResponse}"`);

  const classification = validateClassification(rawResponse, clientList);
  Logger.log(`Classificação final: "${classification}"`);

  return classification;
}

/**
 * Valida a resposta do Gemini contra a lista de clientes.
 * Se o Gemini retornar algo que não está na lista, aplica fallback.
 * 
 * @param {string} response - Resposta bruta do Gemini
 * @param {string[]} clientList - Lista de clientes válidos
 * @returns {string} Nome do cliente validado ou "Outros"
 */
function validateClassification(response, clientList) {
  // Caso 1: Resposta é exatamente "Outros"
  if (response.toLowerCase() === 'outros') {
    return CONFIG.DEFAULT_LABEL;
  }

  // Caso 2: Match exato (case-insensitive)
  const exactMatch = clientList.find(
    client => client.toLowerCase() === response.toLowerCase()
  );
  if (exactMatch) {
    return exactMatch;
  }

  // Caso 3: Match parcial bidirecional
  // Proteção: exige mínimo de 4 caracteres para evitar falsos positivos
  const MIN_MATCH_LENGTH = 4;
  const partialMatch = clientList.find(client => {
    const responseLower = response.toLowerCase();
    const clientLower = client.toLowerCase();

    if (responseLower.includes(clientLower)) {
      return true;
    }

    if (responseLower.length >= MIN_MATCH_LENGTH && clientLower.includes(responseLower)) {
      return true;
    }

    return false;
  });

  if (partialMatch) {
    Logger.log(`Match parcial: "${response}" → "${partialMatch}"`);
    return partialMatch;
  }

  // Caso 4: Nenhum match — fallback para "Outros"
  Logger.log(`Sem match para: "${response}" — classificando como Outros`);
  return CONFIG.DEFAULT_LABEL;
}
