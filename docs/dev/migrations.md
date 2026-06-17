# Migrations e Seeds

## Regras de Ouro (Paridade OpenCore ↔ Business)

O Watink Business pode ter colunas e tabelas extras. O OpenCore **nunca pode quebrar** por causa delas.

1. **Backward-safe**: novas colunas devem ser `NULL` ou ter `DEFAULT`. Nunca `NOT NULL` sem default em tabela existente.
2. **Seeds idempotentes**: use `upsert` / `ON CONFLICT DO NOTHING`. Seeds nunca assumem banco vazio.
3. **Fallback no código**: toda leitura de campo novo deve ter fallback para o caso de o campo não existir.
4. **Sem hard break no OpenCore**: recursos extras do Business podem ficar sem dados no OpenCore — isso não pode gerar erro em runtime.

## Checklist de PR (obrigatório para migrations)

### A. Migration
- [ ] Adiciona apenas estruturas compatíveis (sem hard break)
- [ ] Campos novos têm `NULL` permitido ou `DEFAULT`
- [ ] Índices/constraints não bloqueiam dados legados

### B. Seed
- [ ] Reexecutável sem duplicar dados
- [ ] Não sobrescreve configuração existente sem critério
- [ ] Roda com segurança em ambiente já populado

### C. Código
- [ ] Leitura de coluna nova com fallback
- [ ] Fluxo legado validado (OpenCore) após migration
- [ ] Nenhum endpoint crítico quebra por ausência de dado novo

### D. Validação
- [ ] Smoke test OpenCore aprovado
- [ ] Smoke test Business aprovado
- [ ] Evidências registradas no PR

> PR só pode ser aprovada com os quatro blocos completos.

## Comandos (legacy Node backend)

```bash
cd legacy/backend

# Criar migration
npx sequelize migration:create --name <descricao>

# Aplicar
npm run db:migrate

# Reverter última
npx sequelize db:migrate:undo

# Seeds
npm run db:seed
```

## Template de Relatório de Pareamento

```
## Relatório de Pareamento — Migrations/Seeds

Data:
Branch:
Commit:
Lado validado: ( ) OpenCore  ( ) Business

### Scope
- [ ] Migrations aplicadas sem erro
- [ ] Seeds sem duplicação
- [ ] Compatibilidade com schema legado preservada
- [ ] Colunas extras do Business não quebram OpenCore

### Smoke Tests
OpenCore: ( ) Login  ( ) Conexões  ( ) Tickets  ( ) Contatos  ( ) Filas
Business:  ( ) Login  ( ) Conexões  ( ) Tickets  ( ) Contatos  ( ) Filas

### Divergências
Bug/Erro:
Severidade: P0 / P1 / P2
Evidência (log):
Correção aplicada:

### Resultado
Status: ( ) Aprovado  ( ) Aprovado com ressalvas  ( ) Reprovado
Risco residual:
```
