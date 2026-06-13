# ADR-FE-003: Migração do Dashboard e Tickets de MUI v4 para Tailwind + shadcn/ui

**Status:** Aceito  
**Data:** 2026-06-12  
**Branch:** `tinker/ui-and-di-refactor`  
**Autores:** Orchestrator (análise) + alltomatos

---

## Contexto

Apesar da decisão estabelecida no ADR-001 (migração global para shadcn/ui + Tailwind), as páginas de maior tráfego do sistema ainda utilizam **MUI v4 exclusivamente**:

| Página | LOC | MUI imports |
|--------|-----|-------------|
| `pages/Dashboard/index.js` | ~200 | `makeStyles`, `Container`, `Grid`, `Modal`, `Typography`, `Button`, `Checkbox`, `IconButton` |
| `pages/Tickets/index.js` | ~100 | `makeStyles`, `Grid`, `Hidden` |

Estas são as **duas páginas mais visíveis do produto** — o Dashboard é a primeira tela após login e o Tickets é onde os agentes passam 90% do tempo. A manutenção destas páginas em MUI v4 cria:

1. Dois sistemas de design paralelos no mesmo produto
2. Inconsistência visual severa entre páginas novas e legadas
3. Bloqueio para remoção futura do pacote `@material-ui` (item T3-01 no DAG)

---

## Referência Visual

- **`docs/desgner-system/2.png`**: Layout alvo do Dashboard (grid de MetricCards + gráficos, AppBar com avatar)
- **`docs/desgner-system/3.png`**: Layout alvo do Tickets (3 colunas: lista | chat | detalhes do contato)

---

## Decisão

Migrar `Dashboard` e `Tickets` para **Tailwind CSS + shadcn/ui**, seguindo rigorosamente:
- O layout visual das imagens de referência (`2.png`, `3.png`)
- Os tokens do design system (`colors.css`, `typography.css`, `spacing.css`, `motion.css`)
- Os componentes canônicos de `components/ui/`

---

## Estratégia de Migração

### Dashboard (`2.png`)
- **Zona superior**: Grid de 4 `MetricCard` (em atendimento, aguardando, tickets abertos, resolvidos hoje)
- **Zona central**: Gráficos de atendimento (manter lógica de negócio, trocar wrapper MUI por `Card`)
- **AppBar**: Substituir por `MainHeader` com `Avatar` do usuário logado + ícone de notificação
- **Modal de configurações**: Substituir por `Dialog` do shadcn/ui

### Tickets (`3.png`)
- **Layout**: 3 colunas via CSS Grid/Flex — `260px | 1fr | 320px`
- **Coluna esquerda**: Lista de tickets com `StatusChip` e `Avatar`
- **Coluna central**: Área de chat com `MessagesList` e `MessageInput`
- **Coluna direita**: Detalhes do `Contact` com `Card` e `BaseCard`
- **Responsividade**: Coluna direita colapsa em telas < 1024px

---

## Plano de Execução Atômico

### Dashboard
1. Criar `pages/Dashboard/index.tsx` (novo arquivo, não sobrescrever o .js)
2. Implementar grid de `MetricCard` com dados do hook `useTickets` existente
3. Implementar seção de gráficos com `Card` wrapper
4. Substituir modal de configurações por `Dialog`
5. Após validação visual, remover `index.js` legado

### Tickets
1. Criar `pages/Tickets/index.tsx`
2. Implementar layout 3-colunas com componentes canônicos
3. Conectar lógica de negócio existente (hooks, sockets, reducers)
4. Após validação visual, remover `index.js` legado

---

## Alternativas Consideradas

| Opção | Motivo da rejeição |
|-------|-------------------|
| Migrar gradualmente inline (JSX por JSX) | Alto risco de estado inconsistente durante a transição |
| Wrapping MUI em componentes Tailwind | Dois runtimes de CSS — piora performance |
| Aguardar remoção total do MUI | Indefinido, cria débito permanente |

---

## Consequências

- **Positivas**: Consistência visual, performance (sem JSS runtime), DX unificada, caminho limpo para remover `@material-ui`
- **Negativas**: Esforço de 2-3 sessões de implementação
- **Riscos**: Regressão de funcionalidade (lógica de negócio complexa em Tickets). Mitigação: manter `.js` legado até validação visual + smoke test.
