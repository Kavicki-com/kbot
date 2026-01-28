# Deploy via SFTP - Guia Passo a Passo

Este guia ensina como fazer deploy da aplicação KBot Dashboard via SFTP para seu servidor.

## 📋 Pré-requisitos

- Acesso SFTP ao seu servidor
- Servidor web configurado (Apache, Nginx, etc.)
- Node.js instalado localmente (para build)

## 🔨 Passo 1: Build da Aplicação

No seu computador local, navegue até a pasta do projeto:

```bash
cd C:\Users\aluga.com\kbot\web-app
```

Execute o build:

```bash
npm run build:web
```

Aguarde o processo finalizar. Os arquivos serão gerados na pasta `web-build/`.

## 📁 Passo 2: Estrutura dos Arquivos

Após o build, você terá a seguinte estrutura em `web-build/`:

```
web-build/
├── index.html
├── _expo/
│   └── static/
│       ├── js/
│       ├── css/
│       └── media/
└── ...outros arquivos...
```

## 🌐 Passo 3: Configurar Servidor Web

### Apache (.htaccess)

Crie um arquivo `.htaccess` dentro de `web-build/`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Configurações de cache
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType text/javascript "access plus 1 month"
</IfModule>

# Compressão
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html
  AddOutputFilterByType DEFLATE text/css
  AddOutputFilterByType DEFLATE text/javascript
  AddOutputFilterByType DEFLATE application/javascript
  AddOutputFilterByType DEFLATE application/json
</IfModule>
```

### Nginx (nginx.conf)

```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache de arquivos estáticos
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Compressão
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

## 📤 Passo 4: Upload via SFTP

### Usando FileZilla

1. Abra o FileZilla
2. Conecte ao seu servidor:
   - **Host**: seu-servidor.com
   - **Usuário**: seu-usuario
   - **Senha**: sua-senha
   - **Porta**: 22 (SFTP)

3. Navegue até o diretório público do seu site:
   - Geralmente: `/var/www/html/` ou `/public_html/`

4. Selecione **TODOS** os arquivos dentro de `web-build/`
5. Arraste para o painel direito (servidor)
6. Aguarde o upload completar

### Usando WinSCP

1. Abra o WinSCP
2. Novo Site:
   - **Protocolo de arquivo**: SFTP
   - **Nome do host**: seu-servidor.com
   - **Usuário**: seu-usuario
   - **Senha**: sua-senha

3. Conectar
4. Navegue até `/var/www/html/` (ou caminho do seu site)
5. Arraste a pasta `web-build/` para o servidor
6. Confirme substituição de arquivos se necessário

### Usando Terminal (Linux/Mac)

```bash
# Navegar até a pasta de build
cd C:\Users\aluga.com\kbot\web-app

# Upload via SCP
scp -r web-build/* seu-usuario@seu-servidor.com:/var/www/html/
```

## 🔧 Passo 5: Verificar Permissões

Após upload, conecte via SSH e ajuste permissões:

```bash
ssh seu-usuario@seu-servidor.com

# Navegar até o diretório
cd /var/www/html

# Ajustar permissões
chmod -R 755 *
chown -R www-data:www-data *
```

## ✅ Passo 6: Testar

1. Abra o navegador
2. Acesse seu domínio: `http://seu-dominio.com`
3. Verifique se a aplicação carrega corretamente
4. Teste login/registro
5. Verifique responsividade (F12 → Device Mode)

## 🔄 Atualizações Futuras

Quando precisar atualizar a aplicação:

1. Faça as alterações no código
2. Execute `npm run build:web`
3. Faça upload apenas dos arquivos modificados
4. Limpe cache do navegador (Ctrl+F5)

## 📝 Checklist de Deploy

- [ ] Build executado sem erros
- [ ] Arquivo `.htaccess` ou configuração Nginx criada
- [ ] Arquivos enviados via SFTP
- [ ] Permissões ajustadas (755)
- [ ] Site acessível no navegador
- [ ] Login funciona corretamente
- [ ] Supabase conectado
- [ ] Responsividade testada
- [ ] SSL configurado (HTTPS)

## 🔒 Configurar SSL (HTTPS)

### Usando Let's Encrypt (Certbot)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-apache  # Apache
# ou
sudo apt install certbot python3-certbot-nginx    # Nginx

# Obter certificado
sudo certbot --apache -d seu-dominio.com  # Apache
# ou
sudo certbot --nginx -d seu-dominio.com   # Nginx

# Renovação automática
sudo certbot renew --dry-run
```

## ⚡ Otimizações

### CDN (Opcional)

Para melhor performance, use um CDN como Cloudflare:

1. Adicione seu site ao Cloudflare
2. Aponte DNS para Cloudflare
3. Ative cache automático
4. Ative minificação de JS/CSS

### Compressão Brotli

```nginx
# Nginx com Brotli
load_module modules/ngx_http_brotli_filter_module.so;
load_module modules/ngx_http_brotli_static_module.so;

http {
    brotli on;
    brotli_comp_level 6;
    brotli_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

## 🐛 Troubleshooting

### Erro 404 em rotas

- Verifique se `.htaccess` está presente
- Confirme que mod_rewrite está ativo no Apache
- Para Nginx, verifique a diretiva `try_files`

### Arquivos não carregam

- Verifique permissões (755 para pastas, 644 para arquivos)
- Confirme que o caminho está correto

### Supabase não conecta

- Verifique se `.env` foi incluído no build
- Confirme CORS no painel do Supabase
- Adicione seu domínio em "Authentication > URL Configuration"

## 📞 Suporte

Para problemas de deploy:
- Verifique logs do servidor: `/var/log/apache2/error.log` ou `/var/log/nginx/error.log`
- Use F12 → Console no navegador para erros JavaScript
- Teste conexão Supabase no console do navegador

---

**Pronto!** Sua aplicação KBot Dashboard está no ar! 🚀
