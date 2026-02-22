# Relatório de Paridade de Migrations/Seeds (Reexecução Limpa)

## Data/Hora
2026-02-22 17:08 (America/Sao_Paulo)

## Procedimento executado
1. Remoção completa dos bancos de teste:
   - `DROP DATABASE opencore WITH (FORCE)`
   - `DROP DATABASE business WITH (FORCE)`
2. Criação novamente dos bancos:
   - `CREATE DATABASE opencore`
   - `CREATE DATABASE business`
3. Execução do **backend-standard** no `opencore`:
   - `sequelize db:migrate`
   - `sequelize db:seed:all`
4. Execução do **backend business (Go)** no `business`:
   - `go run run_migrate.go` (AutoMigrate + Seed)

---

## Resultado da execução

### Banco `opencore` (standard)
- Migrations: ✅ sucesso completo
- Seeds: ✅ sucesso com avisos esperados
  - Seeds relacionadas a `admin@admin.com` foram puladas por não haver usuário pré-criado nesse cenário limpo (comportamento esperado do fluxo atual).

### Banco `business` (go)
- AutoMigrate: ✅ sucesso completo
- Seed de permissões: ✅ sucesso completo
- RLS: ✅ habilitado e forçado nas tabelas críticas
  - `Users`, `Tickets`, `Messages`, `Contacts`, `Settings`, `ConversationEmbeddings`

---

## Verificação de estrutura
- Tabelas em `opencore`: **38**
- Tabelas em `business`: **32**

### Conclusão de paridade
- Correções de paridade aplicadas e testadas com banco limpo.
- `ConversationEmbeddings` agora existe no `business`.
- `configs` está reconhecido no Node (`User.ts`).
- RLS no `business` está ativo e forçado nas tabelas de isolamento por tenant.

---

## Pendências arquiteturais (não erro de migration/seed)
1. Diferenças de modelagem ainda existentes entre produtos (escopo funcional diferente).
2. Etapa 2 recomendada: consolidar definitivamente autorização para RBAC em todos os middlewares legados do standard.
