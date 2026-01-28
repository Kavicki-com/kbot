# Integração Typebot - Guia Rápido

## 1. Buscar Configuração do Bot (Supabase)

Adicione um bloco **HTTP Request** no início do fluxo para carregar as configurações da empresa.

- **Method:** `POST`
- **URL:** `https://opwwyjkevpzocfolesqv.supabase.co/functions/v1/get-bot-config`
- **Headers:**
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wd3d5amtldnB6b2Nmb2xlc3F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwOTk5NTksImV4cCI6MjA4NDY3NTk1OX0.q6CcYI7luV35yJiTnAhYQCLNrqHieYy1P_TVvcNBBQE`
- **Body (JSON):**
  ```json
  {
    "whatsapp_number": "{{contact.phone}}"
  }
  ```
- **Test Request:** Use um número de exemplo que esteja no banco de dados.
- **Save variables:**
  - Salve o resultado (Data) na variável: `botConfig`

> **Nota:** Certifique-se de que o número do WhatsApp no banco inclui o código do país e DDD (ex: `5511999999999`).

---

## 2. Configurar Chat com IA (Gemini)

Adicione um bloco **HTTP Request** para gerar as respostas usando o Google Gemini.

- **Method:** `POST`
- **URL:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=SUA_GOOGLE_AI_KEY`
- **Headers:**
  - `Content-Type`: `application/json`
- **Body (JSON):**
  ```json
  {
    "contents": [
      {
        "parts": [
          { "text": "{{Input}}" }
        ]
      }
    ],
    "systemInstruction": {
      "parts": [
        { "text": "{{botConfig.system_prompt}}\n\nNome da Empresa: {{botConfig.company_name}}\nTom de voz: {{botConfig.tone_of_voice}}" }
      ]
    },
    "generationConfig": {
      "temperature": 0.7
    }
  }
  ```
- **Save variables:**
  - Selecione o caminho: `candidates[0].content.parts[0].text`
  - Salve na variável: `aiResponse`

Em seguida, adicione um bloco de **Texto** exibindo: `{{aiResponse}}`

---

## 3. Variáveis Disponíveis (Referência)

**O que fazer com isso?**
Estas variáveis são carregadas automaticamente pelo passo 1. Você **NÃO PRECISAR FAZER NADA** para "criar" elas.

Apenas use-as nos seus textos para personalizar a conversa:

| Use no texto assim... | Para aparecer assim pro cliente... |
|-----------------------|------------------------------------|
| `Bem-vindo à {{botConfig.company_name}}!` | Bem-vindo à **Padaria do João**! |
| `Eu sou {{botConfig.bot_name}}` | Eu sou **Assistente Virtual** |
| `{{botConfig.system_prompt}}` | (Usado internamente pela IA) |

---

## 4. Conectar WhatsApp (Evolution API)

Execute estes comandos no seu Terminal (ou Postman) para conectar o WhatsApp ao Typebot.

### A. Criar Instância
```bash
curl -X POST https://evolution-api-production-03df.up.railway.app/instance/create \
  -H "apikey: Kb6t#$271i8" \
  -d '{"instanceName": "kbot-whatsapp", "qrcode": true, "integration": "WHATSAPP-BAILEYS"}'
```

### B. Ler QR Code
Acesse no navegador para ler o código:
[https://evolution-api-production-03df.up.railway.app/instance/connect/kbot-whatsapp](https://evolution-api-production-03df.up.railway.app/instance/connect/kbot-whatsapp)

### C. Configurar Webhook (Ligar ao Typebot)
Pegue a URL "Start chat" no seu Typebot e configure abaixo:

```bash
curl -X POST https://evolution-api-production-03df.up.railway.app/webhook/set/kbot-whatsapp \
  -H "apikey: Kb6t#$271i8" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "SUA_URL_DO_TYPEBOT",
    "enabled": true,
    "events": ["messages.upsert"],
    "webhook_by_events": false
  }'
```

---

## 5. Resolução de Problemas Comuns

### O bot não responde depois da primeira mensagem?

Isso geralmente acontece por um destes 3 motivos. Verifique no seu fluxo do Typebot:

1. **Faltou o Bloco de Texto (Display)**
   - O Typebot **não mostra automaticamente** o resultado de uma requisição API.
   - **Solução:** Imediatamente após o bloco *HTTP Request* (Gemini), adicione um bloco de **Texto** (Text Bubble).
   - No conteúdo, coloque a variável que você salvou: `{{aiResponse}}`

   - **Solução:**
     1. No bloco *HTTP Request*, clique em **"Test the request"** (botão laranja).
     2. Logo abaixo do botão, clique em **"Save in variables"** (Salvar em variáveis) para expandir a lista.
     3. Procure o campo que contém o texto da resposta (`candidates` -> `0` -> `content`...).
     4. Selecione a variável `aiResponse` para esse campo.
     5. Se não encontrar na lista, use a opção "Custom path" e digite: `candidates.0.content.parts.0.text`

3. **Faltou o Loop (Conversa Infinita) - CRÍTICO**
   - **Diagnóstico:** O usuário manda a primeira mensagem, o bot responde, e a conversa encerra (o campo de digitar some ou não funciona mais).
   - **Solução:** Olhe para o seu último bloco "Resposta". Ele tem uma bolinha de saída do lado direito?
   - **AÇÃO:** Clique nessa bolinha e arraste uma linha conectando de volta para o bloco **"Pergunta"** (o segundo bloco do fluxo).
   - Isso faz com que, após responder, o bot volte a esperar a próxima fala do usuário. Sem isso, o bot morre após a primeira frase.
