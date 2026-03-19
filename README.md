# 📧 Smart Gmail Classifier

Automação inteligente que classifica emails do Gmail por cliente usando IA (Google Gemini), aplicando labels automaticamente com base em uma lista de clientes mantida em um Google Doc.

## 🎯 O que faz

- Lê uma lista de clientes de um Google Doc (um nome por linha)
- Monitora novos emails na inbox automaticamente (trigger a cada 10 min)
- Envia remetente, assunto e corpo do email para o Gemini classificar
- Cria e aplica labels no Gmail com o nome do cliente identificado
- Emails não relacionados a clientes recebem a label "Outros"
- Emails que falham na classificação (ex: rate limit da API) são pulados e reprocessados na próxima execução — nunca classificados incorretamente

## 🧠 Como a classificação funciona

O Gemini recebe a lista completa de clientes e os dados do email. Ele analisa remetente, assunto e corpo em busca de menções diretas, siglas, abreviações e domínios de email relacionados.

Exemplos de classificações reais em produção:

| Email | Classificação | Como identificou |
|-------|--------------|------------------|
| `Your Access to thejoylab1uat Expired` | The Joy Lab | Domínio contém o nome do cliente |
| `Julia sent you Base histórica TJL` | The Joy Lab | Reconheceu a sigla "TJL" |
| `Updated invitation: Alinhamento` | Bob's | Analisou o corpo do email |
| `Weekly Kickoff - Read AI` | Outros | Nenhum cliente mencionado |

## 🛠️ Tecnologias

- **Google Apps Script** — Plataforma de automação serverless do Google Workspace
- **Gmail API** (via GmailApp) — Busca de emails, criação e aplicação de labels
- **Google Docs API** (via DocumentApp) — Leitura da lista de clientes
- **Google Gemini 2.5 Flash** (via REST API) — Classificação inteligente dos emails
- **PropertiesService** — Armazenamento seguro da API key (fora do código)

## 📁 Estrutura do Projeto

```
Smart Gmail Classifier/
├── Config.gs      # Configurações centralizadas (IDs, modelo, limites)
├── Clients.gs     # Leitura da lista de clientes do Google Doc
├── Gmail.gs       # Busca de emails e gerenciamento de labels
├── Gemini.gs      # Integração com a API do Gemini (prompt + validação)
└── Main.gs        # Orquestrador principal (função do trigger)
```

Cada arquivo segue o **Single Responsibility Principle** — um módulo por domínio.

## ⚙️ Como instalar e configurar

### Pré-requisitos

- Conta Google com Gmail
- Google Doc com lista de clientes (um nome por linha)
- API Key do Google AI Studio ([gerar aqui](https://aistudio.google.com/apikey))

### Passo a passo

1. Acesse [script.google.com](https://script.google.com) e crie um novo projeto
2. Crie os 5 arquivos (`.gs`) e cole o código de cada módulo
3. No `Config.gs`, preencha o `CLIENT_DOC_ID` com o ID do seu Google Doc
4. Salve a API key de forma segura:
   - Crie uma função temporária que chame `PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', 'sua-key')`
   - Execute uma vez e apague a função
5. Configure o trigger automático:
   - Vá em ⏰ Acionadores → + Adicionar acionador
   - Função: `processEmails` | Baseado em tempo | A cada 10 minutos
6. Na primeira execução, autorize as permissões solicitadas (Gmail e Drive)

## 🔄 Fluxo de execução

```
Trigger (10 min)
    │
    ├─ Lê lista de clientes do Google Doc
    │
    ├─ Busca até 5 emails sem label "_Processado"
    │
    ├─ Para cada email:
    │   ├─ Extrai remetente, assunto e corpo (texto puro, até 3000 chars)
    │   ├─ Envia para o Gemini com prompt de classificação
    │   ├─ Valida resposta (match exato → parcial → fallback)
    │   │
    │   ├─ [Sucesso] → Aplica label do cliente + "_Processado"
    │   └─ [Falha API] → Pula (será reprocessado na próxima execução)
    │
    └─ Log com resumo: sucesso / pulados / erros
```

## 🛡️ Decisões técnicas e trade-offs

### Rate limiting e batching
O free tier do Gemini permite 5 requests/min e 20/dia. O script usa delay de 13s entre chamadas e batch de 5 emails por execução. Para uso em produção, ativar billing remove esses limites.

### Validação em 4 camadas
A resposta do Gemini passa por: (1) match exato, (2) match parcial bidirecional com mínimo de 4 caracteres, (3) fallback para "Outros", e verificação prévia de resposta nula. Isso previne falsos positivos de palavras genéricas curtas.

### Idempotência
A label `_Processado` garante que cada email é analisado uma única vez. Emails que falham na API **não** recebem essa label, permitindo reprocessamento automático — sem classificações incorretas por erro de infraestrutura.

### Segurança
API key armazenada no `PropertiesService`, separada do código-fonte. Pode ser compartilhado sem expor credenciais.

## 📈 Possíveis melhorias futuras

- **Notificação de erros:** Enviar alerta por email/Slack quando emails são pulados repetidamente
- **Sub-labels hierárquicas:** `Clientes/The Joy Lab` em vez de `The Joy Lab` na raiz
- **Cache da lista de clientes:** Evitar ler o Google Doc a cada execução (ler 1x/hora)
- **Dashboard de métricas:** Google Sheet com log de classificações para análise
- **Múltiplas categorias:** Além de cliente, classificar por tipo (suporte, comercial, financeiro)
- **Google Sheet em vez de Doc:** Permitir colunas adicionais (domínio do cliente, aliases, etc.)

## 📚 Conceitos aplicados

- **Single Responsibility Principle** — Cada módulo com uma responsabilidade
- **Idempotência** — Reprocessamento seguro sem duplicação
- **Guard Clauses** — Early returns para validação de pré-condições
- **Fail-safe design** — Falha de API nunca gera classificação incorreta
- **Separation of Secrets** — Credenciais fora do código via PropertiesService
- **Defensive parsing** — Múltiplas camadas de validação para output de LLM

## 👤 Autor

Vinicius da Fonseca Mendes Freitas.
