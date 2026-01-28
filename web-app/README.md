# KBot Dashboard - Plataforma White-Label de Chatbots

Dashboard administrativo para criação e gerenciamento de chatbots personalizados com IA, usando React Native Web, Material Design e WhatsApp.

## 🚀 Tecnologias

- **Frontend**: React Native Web (Expo)
- **UI**: React Native Paper (Material Design)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Navegação**: Expo Router
- **Estado**: Zustand
- **Validação**: Zod

## 🎨 Design

- Paleta de cores inspirada no WhatsApp (#25D366)
- Material Design 3
- Responsivo (desktop, tablet, mobile)
- Tema claro e escuro

## ⚙️ Configuração

### 1. Instalar Dependências

```bash
cd web-app
npm install
```

### 2. Configurar Supabase

1. Acesse o painel do Supabase
2. Vá em SQL Editor
3. Execute o arquivo `supabase/001_initial_schema.sql`

### 3. Configurar Variáveis de Ambiente

O arquivo `.env` já está configurado com suas credenciais do Supabase.

### 4. Rodar em Desenvolvimento

```bash
npm run start:web
```

A aplicação abrirá em `http://localhost:8081`

## 📦 Build para Produção

### Build Estático para Web

```bash
npm run build:web
```

Os arquivos serão gerados em `web-build/` pronto para deploy via SFTP.

### Deploy Manual (SFTP)

1. Faça build: `npm run build:web`
2. Conecte via SFTP ao seu servidor
3. Faça upload da pasta `web-build/` para o diretório público
4. Configure o servidor web (Apache/Nginx) para servir arquivos estáticos

## 📁 Estrutura do Projeto

```
web-app/
├── app/
│   ├── (auth)/          # Telas de autenticação
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/          # Dashboard principal
│   │   ├── index.tsx    # Home/Dashboard
│   │   ├── chatbots/    # Gerenciamento de bots
│   │   └── settings.tsx # Configurações
│   ├── _layout.tsx      # Layout raiz
│   └── index.tsx        # Rota inicial
├── lib/
│   ├── supabase.ts      # Cliente Supabase
│   ├── theme.ts         # Tema Material Design
│   └── types.ts         # Tipos TypeScript
└── supabase/
    └── 001_initial_schema.sql  # Schema do banco
```

## 🔑 Funcionalidades

### ✅ Implementadas

- [x] Autenticação (login/registro)
- [x] Dashboard com estatísticas
- [x] Criação de chatbots
- [x] Configuração de personalidade (tom de voz)
- [x] Coleta de leads (nome, email, telefone)
- [x] Integração WhatsApp
- [x] Toggle para RAG (base de conhecimento)
- [x] Status ativo/inativo
- [x] Tema WhatsApp com Material Design

### 🚧 Próximas Features

- [ ] Edição de chatbots existentes
- [ ] Upload de documentos para RAG
- [ ] Configuração de horários de atendimento
- [ ] Preview do chatbot
- [ ] Analytics e métricas
- [ ] API para integração Typebot

## 🔐 Segurança

- Row Level Security (RLS) no Supabase
- Autenticação JWT
- Políticas de acesso por organização
- Validação de formulários

## 📱 Responsividade

A aplicação é totalmente responsiva e funciona em:

- Desktop (1920x1080+)
- Tablet (768x1024)
- Mobile (360x640+)

## 🌐 Navegadores Suportados

- Chrome/Edge (últimas 2 versões)
- Firefox (últimas 2 versões)
- Safari (últimas 2 versões)

## 📞 Suporte

Para dúvidas ou problemas, consulte a documentação do Typebot e Supabase.

## 📄 Licença

Proprietary - Todos os direitos reservados
