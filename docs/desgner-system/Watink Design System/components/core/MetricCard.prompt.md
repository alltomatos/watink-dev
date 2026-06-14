# MetricCard

Card de métrica para dashboard — valor grande em destaque com container de ícone com gradiente e badge opcional de tendência. Implementado com Tailwind CSS e Radix primitives seguindo o padrão shadcn/ui.

## Uso

```tsx
import { MetricCard } from "@/components/ui/metric-card";
import { MessageSquare, Users, Timer } from "lucide-react";

// Métrica básica
<MetricCard 
  label="Tickets Abertos" 
  value="142" 
  color="primary" 
  icon={<MessageSquare className="h-6 w-6" />}
/>

// Com tendência positiva
<MetricCard
  label="Atendimentos Hoje"
  value="38"
  color="success"
  icon={<Users className="h-6 w-6" />}
  trend={{ value: "+12%", positive: true }}
/>

// Com tendência negativa
<MetricCard
  label="TMA"
  value="4m 12s"
  color="warning"
  icon={<Timer className="h-6 w-6" />}
  trend={{ value: "+2min", positive: false }}
/>
```

## Props (TypeScript)

O componente estende `React.HTMLAttributes<HTMLDivElement>`.

| Prop | Tipo | Descrição |
| :--- | :--- | :--- |
| `label` | `string` | Rótulo descritivo exibido acima do valor. |
| `value` | `string \| number` | Valor principal em destaque. |
| `icon` | `React.ReactNode` | Ícone renderizado no container com gradiente. |
| `color` | `'primary' \| 'success' \| 'warning' \| 'error' \| 'info'` | Define o gradiente do ícone e o tema visual do card. |
| `trend` | `MetricCardTrend` | (Opcional) Objeto com `value` (string) e `positive` (boolean) para exibir o badge de tendência. |

### Interface MetricCardTrend

```tsx
export interface MetricCardTrend {
  value: string;    // ex: "+12%", "-3,5%"
  positive: boolean; // true = verde/subida, false = vermelho/descida
}
```

## Composição e Estilos

- **Container**: Usa `bg-card` com `shadow-card`. Possui animação de elevação (`hover:-translate-y-1.5`) e sombra reforçada no hover.
- **Ícone**: O container do ícone usa um gradiente dinâmico baseado na prop `color`. O ícone em si deve ser passado como um componente (ex: Lucide) e ganha efeito de escala no hover do card.
- **Tipografia**: O label usa `text-xs uppercase font-medium tracking-caps`. O valor usa `text-2xl font-bold`.
- **Tendência**: Renderiza automaticamente o ícone `TrendingUp` ou `TrendingDown` do Lucide baseado no booleano `positive`.

## Referência de Cores

As cores são mapeadas para os tokens de design do Watink:
- `primary`: Blue 500 -> 700
- `success`: Emerald 500 -> 700
- `warning`: Amber 400 -> 600
- `error`: Red 500 -> 700
- `info`: Blue 400 -> 600
