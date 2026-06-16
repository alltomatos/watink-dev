# Sistema de Design Watink

> Guia de design e biblioteca de componentes para o **Watink** — plataforma open-source brasileira de atendimento multiagente no WhatsApp.

---

## 🚀 NOVO: Documentação Completa para Agentes de IA

**Watink Design System v2.0** — Documentação profissional pronta para desenvolvimento com agentes de IA.

### 📚 6 Documentos Completos (71 KB)

1. **[README_AI_AGENTS.md](README_AI_AGENTS.md)** — 📍 **COMECE AQUI** (10 min)
   - Guia rápido de entrada
   - Stack técnico resumido
   - Regras básicas

2. **[AI_AGENT_INSTRUCTIONS.md](AI_AGENT_INSTRUCTIONS.md)** (25 min)
   - Workflow passo-a-passo
   - Checklist antes de commitar
   - Regras estritas (✅ FAÇA / ❌ NÃO FAÇA)
   - Troubleshooting

3. **[FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md)** (35 min)
   - Arquitetura técnica completa
   - Hierarquia 3-camadas de tokens
   - Padrões de componentes
   - Dark mode implementation

4. **[DESIGN_SYSTEM_GUIDE.md](DESIGN_SYSTEM_GUIDE.md)** (Referência)
   - Paleta de cores com valores
   - Componentes base (shadcn/ui)
   - Padrões Tailwind CSS
   - Exemplos práticos

5. **[IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md)** (Tarefas)
   - 4 fases de implementação
   - Cronograma (junho-agosto 2026)
   - Tarefas imediatas priorizadas
   - Métricas de sucesso

6. **[DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)** (Navegação)
   - Índice completo
   - Como usar a documentação
   - Checklist de implementação

### ⏱️ Onboarding Rápido (90 min)
```bash
1. Ler README_AI_AGENTS.md               (10 min)
2. Ler AI_AGENT_INSTRUCTIONS.md          (25 min)
3. Ler FRONTEND_ARCHITECTURE.md          (35 min)
4. Guardar DESIGN_SYSTEM_GUIDE.md        (referência)
5. Consultar IMPLEMENTATION_ROADMAP.md   (tarefas)
```

### ✨ O Que Cobre

✅ Stack: React 18 + TypeScript + Vite + Tailwind v4 + shadcn/ui  
✅ Design tokens (3 camadas)  
✅ 15+ componentes base documentados  
✅ Padrões de composição e formulários  
✅ Dark mode + Acessibilidade (WCAG AA)  
✅ Workflow para agentes de IA  
✅ Checklist de validação  
✅ Troubleshooting + FAQ  
✅ Cronograma e tarefas  

---

**Repositórios e branches:**
- `alltomatos/watinkdev` @ `main` — **branch ativo** com React 18 + Tailwind CSS v4.3.0 + shadcn/ui
- `alltomatos/watinkdev` @ `tinker/ui-and-di-refactor` — branch anterior (histórico)
  - `frontend/src/components/ui/` — componentes shadcn/ui base (Button, Card, Dialog, Input, Label, Skeleton)
  - `frontend/src/components/` — componentes customizados Watink (BaseCard, MetricCard, MessageInput, Sidebar, etc.)
  - `frontend/src/layout/` — layouts do shell (MainContainer, MainHeader, Sidebar com Tailwind)
  - `frontend/src/pages/` — implementações de páginas
  - `frontend/tailwind.config.js` — configuração Tailwind com CSS variables (HSL)
  - `frontend/src/index.css` — variáveis de cores globais

---

## Visão Geral do Produto

O Watink é uma plataforma open-source brasileira que centraliza o atendimento via WhatsApp para equipes. Um número, vários atendentes. Funcionalidades principais: filas de tickets multiagente, Flow Builder visual para chatbots, CRM Kanban, respostas rápidas e marketplace de plugins (Helpdesk, Campanhas, integrações de CRM).

**Produtos / superfícies neste repositório:**
| Superfície | Descrição |
|---|---|
| **App Principal (SPA)** | Aplicação React 17 — gerenciamento de tickets, dashboard, contatos, filas, configurações |
| **Login** | Tela dividida ou centralizada com background configurável |
| **Flow Builder** | Editor de chatbots com arrastar e soltar (baseado em ReactFlow) |
| **Admin / SaaS** | Painel de administração multi-tenant (`MainLayoutSaaS.js`) |

**Status:** ✅ Sistema de design v2.0 — **shadcn/ui + Tailwind CSS v4.3.0 em produção**.

**Documentação:** Veja [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) para índice completo e navegação.

Este sistema de design representa a identidade visual do Watink de forma agnóstica ao framework, usando CSS custom properties em HSL que mapeiam para classes Tailwind.

**Para agentes de IA:** Comece por [README_AI_AGENTS.md](README_AI_AGENTS.md) — todo o contexto necessário está documentado.

---

## Fundamentos de Conteúdo

**Idioma:** Português do Brasil (pt-BR). Todo o texto de UI está em português. Datas, números e formatos seguem as convenções brasileiras.

**Tom:** Direto, profissional, prático. O copy do Watink é funcional — informa o usuário exatamente o que fazer e o que esperar, sem jargões ou textos de marketing.

- ✅ "Conectar WhatsApp" — imperativo direto
- ✅ "Fila: Suporte Técnico" — rótulo factual
- ✅ "Simples, Poderoso e Livre." — tagline, confiante e minimalista
- ❌ Sem emoji no texto da UI (emoji são usados em mensagens de chat, não no chrome da interface)
- ❌ Sem ponto de exclamação em rótulos de UI
- ❌ Sem voz passiva

**Pessoa:** Segunda pessoa informal (você / seu). O app dirige-se diretamente aos usuários: "Seu atendimento", "Sua equipe".

**Capitalização:**
- Itens de navegação: **Primeira letra maiúscula** ("Filas de Atendimento", "Flow Builder")
- Botões/CTAs: **Primeira letra maiúscula** ("Criar fila", "Salvar alterações")
- Rótulos de métricas: **MAIÚSCULAS** com letter-spacing (ex: "TICKETS ABERTOS")
- Cabeçalhos de seção: **Primeira letra maiúscula** ("Gerenciar conexões")

**Mensagens de erro:** Específicas e acionáveis. "Erro ao salvar preferências" em vez de "Algo deu errado".

**Vocabulário de status:** Aberto = "Aberto", Fechado = "Fechado", Pendente = "Aguardando", Em andamento = "Em Atendimento", Resolvido = "Resolvido".

---

## Fundamentos Visuais

### Cores

**Primária:** `#1A73E8` (Google Blue) — a cor de ação. Usada em botões primários, itens ativos da sidebar, links e anéis de foco. No modo escuro, muda para `#42A5F5` (blue-400) para melhor contraste.

**Hierarquia de superfícies (modo claro):**
```
--bg-default      #F8FAFC  slate-50    · Fundo da página
--bg-surface      #FFFFFF  branco      · Cards, modais, drawers
--bg-surface-alt  #F1F5F9  slate-100   · Listas, linhas de tabela, bandejas da sidebar
--bg-sidebar      #1E293B  slate-800   · Sidebar escura à esquerda
--bg-appbar       #FFFFFF  branco      · Barra de aplicativo superior
```

**Paleta de destaque:** Verde esmeralda é a cor da marca WhatsApp — usada exclusivamente para bolhas de mensagem do lado direito (`--message-right-bg: #D1FAE5`). Nunca reutilizar como verde genérico da UI; use `--status-success` para isso.

**Cores Google** (`--google-blue`, `--google-green`, etc.) são usadas para colorização dos ícones da sidebar no tema `google`. Não são de uso geral.

### Tipografia

**Primária:** `Inter` — pesos 400–800. Tamanho padrão de corpo **15px**, ligeiramente menor que 16px. Valores de métricas usam **peso 800** a 2.5rem com letter-spacing ajustado (`-0.02em`).

**Mono:** `JetBrains Mono` — para números de protocolo, chaves de API, strings de versão, código.

**No novo stack (Tailwind):** Fontes carregadas via Google Fonts CDN. Para produção, hospedar localmente e atualizar `tailwind.config.js`.

### Layout

- **Sidebar:** 260px expandida, 72px recolhida (somente ícone). Fundo escuro (`--bg-sidebar: slate-800`). Recolhe para trilho de ícones em mobile e por padrão no desktop.
- **Barra de aplicativo:** 64px de altura. Superfície branca com borda `--border-subtle` de 1px na base. Sem sombra por padrão.
- **Área de conteúdo:** `--bg-default` (slate-50) preenche atrás dos cards. Os cards ficam sobre `--bg-surface` (branco) com sombra difusa suave.

### Cards

Os cards são o padrão de container primário:
- **Border radius:** `--radius-xl` = 16px (cards base), 20px para modais
- **Sombra:** `0px 4px 20px rgba(0,0,0,0.08)` — suave, difusa (sem bordas rígidas)
- **Sem linhas de borda** nos cards — a profundidade é comunicada apenas pela sombra
- **Animação de hover:** `translateY(-6px)` + sombra mais profunda em cards interativos (`--transition-card: 300ms cubic-bezier(.25,.8,.25,1)`)

### Iconografia

**Novo stack (shadcn/ui + Tailwind):** **Lucide React** — ícones em SVG como componentes React. Customizar cor/tamanho via Tailwind classes.

```jsx
import { CheckCircle, AlertCircle, Settings } from 'lucide-react';
<CheckCircle className="w-5 h-5 text-green-600" />
```

Documentação: https://lucide.dev | Antigo: Material Icons via `@material-ui/icons` (MUI v4)

**Colorização de ícones da sidebar (tema google):** Cada item de navegação tem uma cor específica da marca Google aplicada ao ícone via `React.cloneElement`. Esta é uma funcionalidade intencional do tema, não uso geral.

```
Dashboard  → --google-blue   #1A73E8
Tickets    → --google-green  #1E8E3E
Contatos   → --google-orange #E8710A
Fluxos     → --google-blue   #1A73E8
Filas      → --google-yellow #F9AB00
Config.    → --google-red    #D93025
```

Para uso via CDN, carregar Material Icons Outlined:
```html
<link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet">
```

**Sem ícones SVG customizados** no core da UI — todos os ícones vêm do conjunto MUI.

**Emoji:** Nunca usado no chrome da UI. A biblioteca `emoji-mart` é usada no compositor MessageInput para inserir emoji em mensagens de chat.

### Animação e Movimento

Via `framer-motion` (v6.5.1) + cubic-bezier `--ease-spring`:

- **Hover na nav:** `whileHover={{ x: 4 }}` — itens da sidebar deslocam 4px para direita no hover
- **Press na nav:** `whileTap={{ scale: 0.98 }}` — leve encolhimento ao clicar
- **Hover em cards:** `translateY(-6px)` — cards sobem
- **Hover em botões:** `translateY(-1px)` + sombra glow
- **Transições:** `150ms ease-out` para interações rápidas de UI, `300ms spring` para elevação de cards, `200ms ease-out` para mudanças de estado padrão

### Sombras

Sem sombras fortes ou bordas. Hierarquia de profundidade:
1. **Fundo da página:** plano `--bg-default`
2. **Cards:** `0px 4px 20px rgba(0,0,0,0.08)` — sombra difusa em nuvem
3. **Sidebar:** glow `0 0 20px rgba(0,0,0,0.10)`
4. **Modais:** `0 8px 30px rgba(0,0,0,0.12)` — `--shadow-strong`
5. **Estado de hover:** `0 20px 25px -5px rgba(0,0,0,0.10)` + `0 10px 10px -5px`

### Estados de Hover e Press

- **Botões (primário):** Fundo mais escuro + `translateY(-1px)` + sombra glow em `--status-info-30`
- **Botões (ghost/outlined):** Preenchimento de fundo com `--bg-surface-alt`
- **Cards:** Elevação `translateY(-6px)`
- **Itens da sidebar:** Deslocamento `x: 4` (Framer)
- **Sem hover apenas por opacidade** — sempre uma mudança de fundo ou transform

### Bordas

- Conteúdo interno: sem borda (apenas sombra)
- Sidebar: `--border-sidebar` na borda direita
- AppBar: 1px `--border-subtle` na base
- Modais: sem borda, apenas sombra
- Campos de formulário: `--border-default` com anel de foco em `--action-primary`

### Scrollbars Customizadas

Scrollbars customizadas em toda a aplicação: 8×8px, cor do polegar `--border-default`, `box-shadow: inset 0 0 6px rgba(0,0,0,0.3)`.

### Modo Escuro

Modo escuro completo via `data-theme="dark"` no `<html>`. O tema MUI é reconstruído via `createMuiThemeBridge({ darkMode: true })` e as variáveis CSS são atualizadas via `applyThemeTokens()` em um `useEffect`. O modo escuro usa neutros muito escuros (`--bg-default: #030712`, `--bg-surface: #1E293B`) com sombras elevadas.

### Sistema Multi-Tema

O app expõe um contexto `appTheme` com valores: `default`, `google`, `apple`, `whatsapp`, `saas`. A maioria das variantes de tema afeta a colorização dos ícones e o peso da tipografia. O tema `google` usa a paleta de 8 cores Google para ícones da sidebar.

---

## Iconografia

Veja **Fundamentos Visuais → Iconografia** acima.

Assets copiados neste repositório:
- `assets/logo.png` — ícone principal do app (quadrado, azul)
- `assets/logo-completa.png` — logotipo completo com ícone
- `assets/watink-logo-letras.png` — logotipo somente com texto
- `assets/watink-sf.png` — marca do ícone alternativo
- `assets/wa-background.png` — textura de papel de parede do chat WhatsApp
- `assets/favicon.png` — favicon 32px

**Fonte dos assets no GitHub:** `frontend/src/assets/` em `alltomatos/watinkdev@main`

---

## Índice de Arquivos

### Documentação (raiz)
```
readme.md                   ← Este arquivo
SKILL.md                    ← Referência para Claude Code
CLAUDE.md                   ← Preferências de idioma (pt-BR)
MIGRATION.md                ← Guia técnico da migração MUI v4 → Tailwind + shadcn/ui
```

### Sistema de Design (MUI v4 — legado)
```
styles.css                  ← Entrada CSS global
tokens/
  colors.css
  typography.css
  spacing.css
  motion.css
components/core/
  Button.jsx / .d.ts
  Card.jsx / .d.ts
  MetricCard.jsx / .d.ts
  StatusChip.jsx / .d.ts
  Avatar.jsx / .d.ts
guidelines/
  (14 cards de especificação visual — Colors, Type, Spacing)
ui_kits/watink/index.html   ← Protótipo interativo
```

### Novo Stack (tinker/ui-and-di-refactor — ativo)
```
frontend/
  src/
    index.css               ← Variáveis CSS (HSL) para Tailwind
    components/
      ui/                   ← shadcn/ui: Button, Card, Dialog, Input, Label, Skeleton
                              (adicione com: npx shadcn-ui@latest add [name])
      BaseCard/             ← Componentes customizados Watink
      MetricCard/
      MessageInput/
      Sidebar/
      etc.
  tailwind.config.js        ← Configuração Tailwind
  package.json              ← Dependências: React 18, Tailwind 4.3, Radix UI, Lucide
```

### Assets
```
assets/
  logo.png
  logo-completa.png
  watink-logo-letras.png
  watink-sf.png
  wa-background.png
  favicon.png
```
