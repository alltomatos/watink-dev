# SECURITY NOTICE - Credenciais Expostas

## Acao Imediata Requerida

As seguintes credenciais foram commitadas no historico do git e **DEVEM ser rotacionadas**:

### backend/.env
- `DB_PASS` - Senha do banco PostgreSQL
- `JWT_SECRET` - Chave de assinatura JWT
- `JWT_REFRESH_SECRET` - Chave de refresh token JWT
- `REDIS_URI` - URI do Redis com senha (`:strongredispass@`)
- `AMQP_URL` - URL do RabbitMQ com credenciais (`guest:guest`)

### ecosystem.config.js
- `DB_PASS`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `AMQP_URL` com credenciais hardcoded
- Substituidas por `process.env.*` — mas valores reais permanecem no historico

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
6. **Historico do git purgado com BFG Repo-Cleaner** (2026-05-24)
   - Todas as strings de credenciais substituidas por `***REMOVED***`
   - Force push realizado para `origin/main`
   - Commit IDs reescritos (ex: `3bd7bccde` → `7774d2786`)

## O que falta fazer
- [ ] Rotacionar **TODAS** as credenciais listadas acima
- [x] ~~Considerar uso de `git filter-repo` ou BFG Repo-Cleaner para purgar secrets do historico~~ (Concluido com BFG)
- [x] ~~Adicionar pre-commit hook (ex: `detect-secrets` ou `gitleaks`) para prevenir vazamentos futuros~~ (gitleaks instalado)
