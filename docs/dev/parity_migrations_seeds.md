# Checklist Obrigatório — Paridade de Migrations e Seeds (OpenCore ↔ Business)

Objetivo: garantir que o **OpenCore continue funcionando** mesmo quando o Watink Business possuir colunas/tabelas extras.

## Regras de Ouro

1. **Backward-safe sempre**
   - Novas colunas devem ser `NULL` ou ter `DEFAULT`.
   - Nunca adicionar `NOT NULL` sem valor padrão em tabela já existente.

2. **Seeds idempotentes**
   - Usar `upsert` / `ON CONFLICT DO NOTHING`.
   - Seed não pode assumir banco vazio.

3. **Fallback de aplicação**
   - Código deve tratar ausência de dados novos sem quebrar fluxo antigo.
   - Toda leitura de campo novo deve ter fallback.

4. **Sem hard break no OpenCore**
   - Recursos extras do Business podem ficar sem dados no OpenCore.
   - Isso **não** pode gerar erro em runtime.

---

## Checklist de PR (MANDATÓRIO)

### A. Migration
- [ ] A migration adiciona apenas estruturas compatíveis (sem hard break).
- [ ] Campos novos têm `NULL` permitido ou `DEFAULT`.
- [ ] Índices/constraints não bloqueiam dados legados.

### B. Seed
- [ ] Seed é reexecutável sem duplicar dados.
- [ ] Seed não sobrescreve configuração existente sem critério.
- [ ] Seed roda com segurança em ambiente já populado.

### C. Código
- [ ] Leitura de coluna nova com fallback.
- [ ] Fluxo legado validado (OpenCore) após migration.
- [ ] Nenhum endpoint crítico quebra por ausência de dado novo.

### D. Validação
- [ ] Smoke test OpenCore aprovado.
- [ ] Smoke test Business aprovado.
- [ ] Evidências registradas no changelog/PR.

---

## Gate de Merge

PR só pode ser aprovada se os quatro blocos acima estiverem marcados.

Responsável: Groud (com revisão de Robot/Tinker quando aplicável).
Data: 2026-02-20
