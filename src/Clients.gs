// Clients.gs
// Módulo responsável por ler a lista de clientes do Google Doc

/**
 * Lê o Google Doc e retorna um array com os nomes dos clientes.
 * Cada linha do documento é tratada como um cliente.
 * Linhas vazias e espaços extras são ignorados.
 * 
 * @returns {string[]} Array de nomes de clientes (ex: ['Empresa A', 'Empresa B'])
 */
function getClientList() {
  // Abre o documento pelo ID configurado
  const doc = DocumentApp.openById(CONFIG.CLIENT_DOC_ID);
  
  // Acessa o corpo do documento
  const body = doc.getBody();
  
  // Pega todos os parágrafos (cada linha = 1 parágrafo)
  const paragraphs = body.getParagraphs();
  
  // Extrai o texto de cada parágrafo, limpa e filtra vazios
  const clients = paragraphs
    .map(paragraph => paragraph.getText().trim())  // Extrai texto e remove espaços
    .filter(name => name.length > 0);              // Remove linhas vazias
  
  Logger.log(`Clientes encontrados: ${clients.length}`);
  Logger.log(`Lista: ${clients.join(', ')}`);
  
  return clients;
}
