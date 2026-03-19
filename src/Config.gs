// Config.gs
// Configurações centralizadas do projeto Smart Gmail Classifier

// ============================================================
// PERFIL DE USO — descomente o bloco que corresponde ao seu caso
// ============================================================

// --- PERFIL: FREE TIER (uso pessoal, sem billing) ---
// const USAGE_PROFILE = {
//   batchSize: 5,       // 5 emails por execução
//   delayMs: 13000,     // 13s entre chamadas (respeita 5 RPM)
//   model: 'gemini-2.5-flash'
// };

// --- PERFIL: PAID TIER (billing ativo ou conta corporativa) ---
const USAGE_PROFILE = {
  batchSize: 20,      // 20 emails por execução
  delayMs: 2000,      // 2s de cortesia (150+ RPM disponível)
  model: 'gemini-2.5-flash'
};

const CONFIG = {
  // ID do Google Doc com a lista de clientes (um por linha)
  CLIENT_DOC_ID: 'COLE_O_ID_DO_SEU_DOC_AQUI',

  // API Key carregada do PropertiesService (segura, fora do código)
  GEMINI_API_KEY: PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'),

  // Modelo e limites vindos do perfil de uso ativo
  GEMINI_MODEL: USAGE_PROFILE.model,
  BATCH_SIZE: USAGE_PROFILE.batchSize,
  API_DELAY_MS: USAGE_PROFILE.delayMs,

  // Labels
  PROCESSED_LABEL: '_Processado',
  DEFAULT_LABEL: 'Outros',

  // Tamanho máximo do corpo do email enviado ao Gemini (em caracteres)
  MAX_BODY_LENGTH: 3000
};
