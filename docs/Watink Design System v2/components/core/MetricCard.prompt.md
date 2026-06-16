Card de métrica para dashboard — valor grande em destaque com container de ícone com gradiente e badge opcional de tendência. Use em PerformanceMetrics, TicketsInfo e qualquer seção de resumo de KPIs.

```jsx
// Métrica básica
<MetricCard label="Tickets Abertos" value="142" color="primary" />

// Com ícone (Material Icons)
<MetricCard
  label="Atendimentos Hoje"
  value="38"
  color="success"
  icon={<span className="material-icons-outlined">support_agent</span>}
/>

// Com badge de tendência
<MetricCard
  label="TMA"
  value="4m 12s"
  color="warning"
  icon={<span className="material-icons-outlined">timer</span>}
  trend={{ value: "+2min", positive: false }}
/>

// Métrica de alerta/erro
<MetricCard label="Sem Resposta" value="7" color="error" />
```

Props notáveis:
- `color`: primary | success | warning | error | info — define gradiente do ícone + cor do valor
- `trend`: `{ value: string, positive: boolean }` — renderiza badge com ↑ ou ↓
- `icon`: qualquer elemento React; cloneElement adiciona cor correspondente + tamanho 28px
- Sempre eleva no hover (translateY -6px), não configurável
