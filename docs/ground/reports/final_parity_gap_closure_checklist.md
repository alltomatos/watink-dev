# Fase Final — Fechamento de GAP para Paridade Total (Standard x Business)

## Objetivo
Concluir a paridade funcional, estrutural e de segurança entre `backend-standard` e `backend business` com validação final auditável.

## Status atual
- ✅ `configs` em `User` nos dois backends
- ✅ `ConversationEmbeddings` no Go
- ✅ RLS ativo em tabelas críticas no Go
- ⚠️ Ainda existem diferenças de schema/fluxo e pontos legados de autorização no Standard

---

## Checklist de Fechamento (ordem recomendada)

### 1) Paridade de autorização (RBAC) no Standard
- [x] Mapear todos os middlewares/guards que ainda usam `GroupPermission` ✅
- [x] Migrar para `Roles + RolePermissions + Scopes` em 100% das rotas protegidas ✅
- [x] Garantir compatibilidade com `tenantId` em todas as verificações ✅
- [ ] Adicionar testes de autorização por perfil e por escopo (fila/tenant)

### 2) Paridade de estrutura de banco
- [x] Listar tabelas exclusivas do `opencore` e classificar: manter, migrar, deprecar ✅
- [x] Listar tabelas exclusivas do `business` e classificar: manter, migrar, deprecar ✅
- [x] Definir padrão único de naming para tabelas de junção (PascalCase) ✅
- [x] Criar relatório de alinhamento para o time de Frontend ✅
- [ ] Criar plano de migração sem downtime para renomeações na branch principal

### 3) Paridade de plugins e módulos
- [x] Validar módulo de Protocolos (attachments/histories) no Go ✅
- [ ] Validar módulo de Clientes no Go vs Standard
- [ ] Validar fluxos de install/seed de plugins em ambos

### 4) Paridade de IA e conhecimento
- [x] Confirmar pipelines de geração/consulta de embeddings no Go ✅
- [ ] Garantir índices e performance de busca vetorial equivalentes
- [x] Validar isolamento de embeddings por tenant com RLS ✅

### 5) Paridade de seeds e dados iniciais
- [ ] Normalizar comportamento de seeds em ambiente limpo (incluindo admin bootstrap)
- [ ] Garantir que permissões iniciais e defaults sejam equivalentes
- [ ] Criar script de validação pós-seed com asserts automáticos

### 6) Validação final de paridade
- [ ] Rodar suíte de comparação de schema (colunas/tipos/constraints)
- [ ] Rodar suíte de testes funcionais espelhados (Node x Go)
- [ ] Rodar testes de segurança multi-tenant (vazamento cruzado)
- [ ] Emitir relatório final de conformidade “Paridade Total Validada”

---

## Critérios de aceite (DoD)
1. 100% das rotas críticas com RBAC unificado e testes verdes.
2. 0 divergências críticas de schema entre módulos equivalentes.
3. RLS ativo + forçado para todas as entidades multi-tenant críticas.
4. Seeds reproduzíveis sem intervenção manual em ambiente limpo.
5. Relatório final assinado em `docs/ground/reports/`.

---

## Entregáveis previstos
- `docs/ground/reports/final_parity_gap_closure_checklist.md` (este)
- `docs/ground/reports/final_parity_validation_report.md` (ao concluir execução)
