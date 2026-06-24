# ADR 0009 — Stage Upsert por Nome ao Editar Pipeline

**Status:** Accepted  
**Data:** 2026-06-24

## Contexto
Ao editar um Pipeline, o backend precisava reconciliar a lista nova de stages com a existente. A abordagem original deletava todas as stages e recriava, gerando novos IDs — quebrando silenciosamente as FKs de `Deal.stageId`.

## Decisão
Upsert por nome: stages com mesmo nome mantêm o ID original; stages novas recebem novo ID; stages removidas têm seus Deals migrados para `stages[0]` antes da remoção. Se todas as stages forem removidas, a operação é bloqueada com erro 422.

O frontend exibe modal de confirmação antes de salvar qualquer edição de stages, informando que deals de stages removidas serão movidos.

## Alternativas consideradas
- **Delete + recreate (original):** simples, mas quebra `Deal.stageId` silenciosamente
- **Soft-delete:** preserva referências, mas adiciona complexidade de schema e queries; stages "mortas" poluem a UI
- **Bloquear remoção com deals:** seguro, mas cria atrito — usuário precisa mover deals manualmente antes de poder simplificar o pipeline

## Consequências
- Renomear uma stage preserva todos os deals nela
- Deals nunca ficam órfãos por edição de pipeline
- A ordem das stages pode mudar livremente sem impacto nos deals
- Futuro: quando o plugin Helpdesk/SLA configurar threshold de estagnação por stage, os IDs estáveis serão necessários para vincular config à stage correta
