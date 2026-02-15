# Marketplace & SaaS Roadmap

## ✅ Concluído
- Checkout seguro via Hub Central (sem tokens na instância).
- Webhook de ativação de licença no Supabase.
- Controle de ativação de plugins por tenant no `plugin-manager`.
- Interface do Marketplace com botão "Assinar Plugin" e auto-refresh.
- SDK Skeleton (`@watink/plugin-sdk`).
- Plugin SaaS (skeleton + gestão de tenants inicial).
- Tabela `TenantSubscriptions` no backend local.
- Proxy de quota: Backend informa quota do tenant para o `plugin-manager`.

## ⏳ Em Andamento
- Implementação detalhada do SDK para registro dinâmico de menus e rotas.
- Dashboard financeiro no Admin Hub (fora da instância).

## 🚀 Próximos Passos
1. **SDK Avançado**: Criar decorator/helper para injetar rotas e menus de plugins no app principal sem alterar o core.
2. **SaaS Plugin v1**:
   - Bloqueio de tenant no middleware principal se `status === 'overdue'`.
   - Limite de usuários/conexões por plano.
3. **Admin Hub (Central)**: 
   - Dashboard para Ronaldo ver todas as vendas.
   - Gerenciador de licenças globais.
