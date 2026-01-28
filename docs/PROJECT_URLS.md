# 🌐 URLs do Projeto KBot

Este documento centraliza todos os links importantes para a infraestrutura do seu projeto.

## 🤖 Typebot (Fluxo de Conversa)

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **Builder** (Editor) | [https://builder-production-f35a.up.railway.app](https://builder-production-f35a.up.railway.app) | Onde você cria e edita os fluxos do bot |
| **Viewer** (Chat) | [https://viewer-production-77fa.up.railway.app](https://viewer-production-77fa.up.railway.app) | Onde o chat é renderizado para o usuário final |

## 📱 Evolution API (WhatsApp)

| Serviço | URL / Endpoint | Descrição |
|---------|----------------|-----------|
| **API Base** | [https://evolution-api-production-03df.up.railway.app](https://evolution-api-production-03df.up.railway.app) | URL base para conexão |
| **Criar Instância** | `/instance/create` | `POST` - Cria conexão com WhatsApp |
| **Status Conexão** | `/instance/connectionState/{instanceName}` | `GET` - Verifica se está online |
| **Webhook Config** | `/webhook/set/{instanceName}` | `POST` - Configura envio para Typebot |

## 🗄️ Backend & Dados (Supabase)

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **Dashboard** | [https://supabase.com/dashboard/project/opwwyjkevpzocfolesqv](https://supabase.com/dashboard/project/opwwyjkevpzocfolesqv) | Gerenciamento do banco de dados |
| **API REST** | `https://opwwyjkevpzocfolesqv.supabase.co` | Endpoint base da API nativa |
| **Edge Function** | `https://opwwyjkevpzocfolesqv.supabase.co/functions/v1/get-bot-config` | **Endpoint usado no Typebot** para buscar configs |

## 🪣 Armazenamento (MinIO - Typebot S3)

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **MinIO Console** | [https://minio-production-5fb8.up.railway.app](https://minio-production-5fb8.up.railway.app) | Gerenciamento de arquivos do Typebot (se necessário login) |

---

## 🔑 Credenciais Importantes (Lembretes)

> **⚠️ Atenção:** Mantenha estas chaves seguras e nunca compartilhe publicamente.

- **Evolution API Key:** `Kb6t#$271i8` (ou `kbot_secret_2024...` conforme configurado)
- **Supabase Anon Key:** (Disponível no dashboard do Supabase > Project Settings > API)
- **Google AI Key:** (Para o Gemini no Typebot)

## 🛠️ Comandos Rápidos

**Deploy da Edge Function:**
```bash
npx supabase functions deploy get-bot-config
```

**Verificar logs da Evolution API (Local/Docker):**
```bash
docker logs -f evolution-api
```
