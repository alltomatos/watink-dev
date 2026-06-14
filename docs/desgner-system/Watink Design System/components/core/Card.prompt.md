Card de conteúdo base — container com fundo surface, bordas arredondadas e sombra suave. Baseado no padrão shadcn/ui (Radix-like composition).

### Exemplo de Uso (TypeScript)

```tsx
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";

// Card Padrão
<Card>
  <CardHeader>
    <CardTitle>Filas de Atendimento</CardTitle>
    <CardDescription>3 filas ativas</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Conteúdo da seção aqui...</p>
  </CardContent>
  <CardFooter>
    <Button variant="outline" size="sm">Ver Detalhes</Button>
  </CardFooter>
</Card>

// Card Customizado (Hover e Layout Flex)
<Card className="hover:border-primary/50 transition-colors cursor-pointer">
  <CardHeader className="flex flex-row items-center justify-between space-y-0">
    <CardTitle className="text-base font-medium">Contatos</CardTitle>
    <Users className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">+2350</div>
    <p className="text-xs text-muted-foreground">+180.1% desde o último mês</p>
  </CardContent>
</Card>
```

### Definições de Props (TypeScript)

O componente é dividido em sub-componentes atômicos para máxima flexibilidade de layout. Todos estendem seus respectivos atributos HTML nativos.

| Componente | Extende | Descrição |
| :--- | :--- | :--- |
| `Card` | `HTMLAttributes<HTMLDivElement>` | Wrapper principal com borda e sombra. |
| `CardHeader` | `HTMLAttributes<HTMLDivElement>` | Container para título e descrição (flex col por padrão). |
| `CardTitle` | `HTMLAttributes<HTMLHeadingElement>` | Título (renderizado como `h3`). |
| `CardDescription` | `HTMLAttributes<HTMLParagraphElement>` | Texto de apoio/descritivo. |
| `CardContent` | `HTMLAttributes<HTMLDivElement>` | Área principal de conteúdo (possui padding interno). |
| `CardFooter` | `HTMLAttributes<HTMLDivElement>` | Área de ações ou metadados no rodapé. |

### Padrões de Composição shadcn/ui

1. **Abordagem Modular:** Evite props gigantes como `title=""` ou `icon={}` no componente raiz. Use a composição de sub-componentes (`CardHeader`, `CardTitle`, etc) para construir o layout desejado.
2. **Customização via Tailwind:** Utilize a prop `className` para ajustes pontuais de padding, gap ou estados de hover (ex: `hover:bg-accent`).
3. **Sem Estilos Inline:** O design system consome as variáveis CSS de `frontend/src/theme/tokens/`. O componente `Card` usa `bg-card` e `text-card-foreground` para garantir consistência entre temas.
4. **Sem `padding` Prop:** Diferente da versão legada, o padding é controlado via classes CSS nos sub-componentes ou via Tailwind no `CardContent`.
