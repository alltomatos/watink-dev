# SECURITY NOTICE - Credenciais Expostas

## Acao Imediata Requerida

As seguintes credenciais foram commitadas no historico do git e **DEVEM ser rotacionadas**:

### backend/.env
- `DB_PASS` - Senha do banco PostgreSQL
- `JWT_SECRET` - Chave de assinatura JWT
- `JWT_REFRESH_SECRET` - Chave de refresh token JWT
- `REDIS_URI` - URI do Redis com senha (`:***REMOVED_DB_PASS***@`)
- `AMQP_URL` - URL do RabbitMQ com credenciais (`***REMOVED_AMQP_CREDENTIALS***`)

### scripts/playwright-smoke.js
- Email e senha de administrador de producao (removidos do codigo, mas presentes no historico)

### .env.example
- `SUPABASE_ANON_KEY` - Chave anonima do Supabase (sanitizada, mas presente no historico)

## O que foi feito
1. Arquivos `.env` e `backend/.env` removidos do tracking do git
2. `logs.txt` removido do tracking
3. Credenciais hardcoded no `playwright-smoke.js` substituidas por env vars
4. `.env.example` sanitizado com placeholders
5. `.gitignore` atualizado para prevenir futuros commits de secrets

## O que falta fazer
- [ ] Rotacionar **TODAS** as credenciais listadas acima
- [ ] Considerar uso de `git filter-repo` ou BFG Repo-Cleaner para purgar secrets do historico
- [ ] Adicionar pre-commit hook (ex: `detect-secrets` ou `gitleaks`) para prevenir vazamentos futuros
