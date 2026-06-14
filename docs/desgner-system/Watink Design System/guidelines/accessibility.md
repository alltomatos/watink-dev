# Diretrizes de Acessibilidade

Este documento estabelece os padrões de acessibilidade para o Watink Design System, fundamentados nos princípios do **Radix UI** e nas normas **WAI-ARIA**. Nossa meta é garantir que a plataforma seja plenamente utilizável por todos, incluindo usuários que dependem de tecnologias assistivas ou navegação exclusivamente por teclado.

## 1. Princípios Fundamentais (Radix UI)

Utilizamos o Radix UI como base para nossos componentes complexos (Modais, Selects, Dropdowns, Tabs) pois ele implementa nativamente:

- **WAI-ARIA Compliance**: Atributos `role`, `aria-expanded`, `aria-haspopup`, entre outros, são gerenciados automaticamente.
- **Focus Management**: Gestão inteligente de foco, incluindo "Focus Traps" para modais e "Roving Tabindex" para listas.
- **Keyboard Navigation**: Suporte completo a atalhos de teclado padronizados.

## 2. Padrões de Navegação por Teclado

### 2.1 Componentes de Ação (Buttons, Links)
- **Enter / Space**: Ativa o elemento.
- **Tab**: Move o foco para o próximo elemento interativo.
- **Shift + Tab**: Move o foco para o elemento anterior.

### 2.2 Menus e Dropdowns (`DropdownMenu`, `Select`)
- **Enter / Space / Seta Baixo**: Abre o menu e foca o primeiro item.
- **Setas Cima/Baixo**: Navega entre os itens (Roving Focus).
- **Enter / Space**: Seleciona o item e fecha o menu.
- **Esc**: Fecha o menu e retorna o foco ao elemento gatilho (Trigger).
- **Home / End**: Move o foco para o primeiro/último item.
- **Type-ahead**: Digitar caracteres foca o item que inicia com aquela sequência.

### 2.3 Diálogos e Modais (`Dialog`)
- **Focus Trap**: O foco deve circular apenas dentro do modal enquanto ele estiver aberto.
- **Esc**: Fecha o modal.
- **Foco Inicial**: O foco deve ser movido para o primeiro elemento interativo dentro do modal (ou para o `DialogContent`).
- **Foco de Retorno**: Ao fechar, o foco **deve** retornar ao botão que disparou a abertura.

### 2.4 Abas (`Tabs`)
- **Setas Esquerda/Direita**: Alterna entre as abas (se horizontal).
- **Setas Cima/Baixo**: Alterna entre as abas (se vertical).
- **Home / End**: Move para a primeira/última aba.
- **Space / Enter**: Ativa a aba (se o modo de ativação for manual).

## 3. Semântica e Rótulos

### 3.1 Identificação de Controles
Todos os campos de entrada **devem** ter um rótulo associado de uma das seguintes formas:
1. **Implícito**: Envolver o input com o componente `<Label>`.
2. **Explícito**: Usar `htmlFor` no Label apontando para o `id` do input.
3. **Aria-label**: Para botões puramente iconográficos (ex: fechar modal), use `aria-label="Fechar"`.

### 3.2 Títulos em Modais
Todo `DialogContent` deve conter obrigatoriamente um `DialogTitle`. 
- Caso o título não deva ser visível no design, utilize o componente `VisuallyHidden` para mantê-lo disponível para leitores de tela.

## 4. Feedback Visual

### 4.1 Focus Ring
O anel de foco (Focus Ring) nunca deve ser removido (`outline: none`) sem uma alternativa clara.
- Utilizamos o padrão de design do Watink: um anel de 2px na cor `primary-500` com offset.
- Em componentes shadcn/ui, isso é gerenciado pelas classes `focus-visible:ring-2`.

### 4.2 Estados de Erro
- Erros em formulários não devem ser indicados apenas por cor.
- Utilize ícones de alerta e mensagens de texto descritivas associadas via `aria-describedby`.

## 5. Checklist de Verificação

- [ ] Consigo navegar por toda a funcionalidade usando apenas o teclado?
- [ ] O indicador de foco é visível em todos os elementos interativos?
- [ ] Modais bloqueiam o foco fora deles?
- [ ] O foco retorna ao lugar correto após fechar um overlay?
- [ ] Elementos puramente visuais/decorativos possuem `aria-hidden="true"`?
- [ ] Contraste de cores atende ao nível AA da WCAG (mínimo 4.5:1 para texto normal)?

---
*Este documento é parte integrante do Watink Design System e deve ser seguido em todas as novas implementações de UI.*
