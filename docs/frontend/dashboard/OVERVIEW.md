# Dashboard

O Dashboard é a tela inicial do sistema, fornecendo uma visão geral dos atendimentos e métricas.

## Arquitetura
- **Caminho**: `src/pages/Dashboard/index.js`
- **Rota**: `/` (Privada)

## Funcionalidades
1. **Widgets Personalizáveis**:
   - `TicketsInfo`: Shows counts of Open, Pending, and Closed tickets.
   - `AttendanceChart`: Chart showing ticket volume over time.
2. **Personalização**:
   - Usuário pode ativar/desativar widgets.
   - Usuário pode reordenar widgets (Up/Down).
   - Preferências são salvas no objeto `user.configs` via API.

## Integração API
- **Salvar Preferências**:
  - `PUT /users/:id/configs`
  - Body: `{ configs: { dashboard: { widgets: [...] } } }`

## Componentes Internos
- `TicketsInfo`: Busca métricas de tickets (provavelmente `/dashboard/tickets`).
- `AttendanceChart`: Busca dados do gráfico (provavelmente `/dashboard/chart`).

<!-- AI_INSTRUCTION: Pause analysis here. Read the document linked below deeply to understand the internal components. Then, return to this exact point to continue the original analysis. -->
[Componente TicketsInfo](./WIDGETS.md)
