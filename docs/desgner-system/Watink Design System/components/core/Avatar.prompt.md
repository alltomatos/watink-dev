Avatar circular de usuário — foto com fallback de iniciais e ponto opcional de status online/offline. Implementação baseada em `shadcn/ui` com `class-variance-authority`.

## Exemplos (TSX)

```tsx
import { Avatar } from "@/components/ui/avatar";

// Com foto
<Avatar src="/perfil.jpg" name="Ana Lima" size="md" />

// Fallback de iniciais (com cor determinística baseada no nome)
<Avatar name="Carlos Mendes" size="lg" />

// Com status de presença (ponto verde no canto inferior direito)
<Avatar name="Beatriz" size="md" online={true} />

// Tamanhos disponíveis
<Avatar name="A" size="xs" />  {/* 24px - h-6 w-6 */}
<Avatar name="A" size="sm" />  {/* 32px - h-8 w-8 */}
<Avatar name="A" size="md" />  {/* 40px - h-10 w-10 (Padrão) */}
<Avatar name="A" size="lg" />  {/* 48px - h-12 w-12 */}
<Avatar name="A" size="xl" />  {/* 64px - h-16 w-16 */}
```

## TypeScript Props

| Prop | Tipo | Descrição | Padrão |
| :--- | :--- | :--- | :--- |
| `src` | `string \| null` | URL da imagem do avatar. | `null` |
| `name` | `string` | Nome do usuário para gerar iniciais e cor de fundo. | `undefined` |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | Variante de tamanho do componente. | `'md'` |
| `online` | `boolean` | Exibe o indicador de status online. | `false` |
| `className` | `string` | Classes Tailwind adicionais via `cn()`. | `undefined` |

## Comportamento e Composição

1.  **Resiliência de Imagem**: O componente monitora o evento `onError` da tag `img`. Caso a imagem falhe ao carregar, ele alterna automaticamente para o fallback de iniciais.
2.  **Iniciais Inteligentes**: O helper `getInitials` extrai a primeira letra das duas primeiras palavras (ex: "João Silva" -> "JS").
3.  **Cores Determinísticas**: Para facilitar a identificação visual sem fotos, o componente atribui uma das 5 cores da escala Watink baseada no hash do nome do usuário.
4.  **Acessibilidade**: Utiliza `aria-label="Online"` no ponto de status e `alt` dinâmico na imagem.
5.  **Composição Shadcn**: Utiliza `forwardRef` para permitir integração com Tooltips e outros componentes Radix/Shadcn.
