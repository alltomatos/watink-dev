# ADR-FE-002: Deduplicação do Componente MetricCard

**Status:** Aceito  
**Data:** 2026-06-12  
**Branch:** `tinker/ui-and-di-refactor`  
**Autores:** Orchestrator (análise) + alltomatos

---

## Contexto

Durante auditoria do design system, identificou-se **dois componentes MetricCard coexistindo** no codebase:

1. `/frontend/src/components/ui/metric-card.tsx` — implementação canônica shadcn/ui com CVA
2. `/frontend/src/components/MetricCard/index.tsx` — implementação customizada com `clsx` e `Card` wrapper

Os dois componentes possuem ~80% de código idêntico (mesmas props, mesmas variantes de cor, mesmo comportamento de trend badge). A divergência é apenas estrutural: o customizado usa `Card + CardContent` como wrapper enquanto o canônico implementa o layout diretamente.

**Consumidores do componente duplicado (`/components/MetricCard`):**
- `pages/Access/index.js`
- `components/Dashboard/Widgets/TicketsInfo.js`
- `components/Dashboard/Widgets/PerformanceMetrics.js`

**Consumidores do componente canônico (`/components/ui/metric-card`):**
- Nenhum (componente canônico não está sendo utilizado em produção)

---

## Problema

Manter dois componentes com a mesma responsabilidade cria:
- **Risco de divergência visual**: Uma mudança em um não reflete no outro
- **Confusão de DX**: O desenvolvedor não sabe qual usar
- **Violação da regra de ouro do CLAUDE.md**: "Componentização e Reuso Estrito"
- **Dívida técnica**: Double surface de manutenção para o mesmo comportamento

---

## Decisão

**Adotar `/components/ui/metric-card.tsx` como única fonte da verdade.**

Remover `/components/MetricCard/index.tsx` após redirecionar todos os imports.

---

## Plano de Execução

1. Redirecionar imports nos 3 consumidores para `../../components/ui/metric-card` (ou path relativo equivalente)
2. Mover o arquivo de teste `MetricCard.test.tsx` para cobrir a implementação canônica
3. Remover o diretório `/components/MetricCard/` inteiro
4. Verificar build sem erros

---

## Alternativas Consideradas

| Opção | Motivo da rejeição |
|-------|-------------------|
| Manter ambos | Duplicação permanente, dívida crescente |
| Adotar o customizado como canônico | Viola a convenção shadcn/ui estabelecida no ADR-001 |
| Criar um terceiro componente unificado | Over-engineering desnecessário |

---

## Consequências

- **Positivas**: Single source of truth, DX clara, zero duplicação
- **Negativas**: Necessário redirecionar 3 imports (esforço mínimo)
- **Riscos**: Regressão visual se a implementação canônica tiver diferença de layout. Mitigação: inspecionar visualmente após a mudança.
