# README — Documentação para Agentes de IA

**Watink Design System v2.0** — Guia Completo para Desenvolvimento Frontend  
**Atualizado**: 15 de junho de 2026  
**Versão**: 2.0-beta (Revisão 2)

---

## 🎯 O Que É Este Projeto?

Watink é uma **plataforma open-source de atendimento no WhatsApp** com:
- Frontend: React 18 + TypeScript + Vite
- Design: shadcn/ui + Tailwind CSS v4
- Arquitetura: Componentes reutilizáveis + Design Tokens centralizados
- Objetivo: Zero hardcoded colors, 100% acessível, tema-agnóstico

---

## 📚 Documentação (Leia Nesta Ordem)

### 1. **AI_AGENT_INSTRUCTIONS.md** ⭐ COMECE AQUI
   - Regras estritas para agentes de IA
   - Workflow passo-a-passo
   - Checklist antes de commitar
   - Troubleshooting

### 2. **FRONTEND_ARCHITECTURE.md**
   - Stack técnico (React 18, Vite, Tailwind, shadcn/ui)
   - Hierarquia 3-camadas de tokens (primitivos → semânticos → componentes)
   - Anatomia de componentes (Button, Card, Input)
   - Padrões de composição e formulários
   - Dark mode implementation

### 3. **DESIGN_SYSTEM_GUIDE.md**
   - Paleta de cores (com valores RGB)
   - Componentes base disponíveis
   - Padrões Tailwind CSS (flex, grid, spacing, cores)
   - Temas Google & WhatsApp
   - Exemplos práticos (bom vs. ruim)

### 4. **IMPLEMENTATION_ROADMAP.md**
   - Estado atual vs. target
   - Gaps identificados (críticos, altos, médios)
   - Plano de 4 fases (Fundação → Refator → Testes → Deploy)
   - Cronograma (Junho → Agosto 2026)
   - Tarefas imediatas para agentes
   - Métricas de sucesso

### 5. **CLAUDE.md** (Projeto)
   - Regras gerais do projeto Watink
   - Arquitetura (Go backend + Node legacy + React frontend)
   - Comandos Docker
   - Conventions (git, commits, branches)

---

## ⚡ Quick Start (Agente de IA)

```bash
# 1. Ler documentação
cat AI_AGENT_INSTRUCTIONS.md        # Regras
cat FRONTEND_ARCHITECTURE.md        # Contexto
cat DESIGN_SYSTEM_GUIDE.md          # Componentes + cores
cat IMPLEMENTATION_ROADMAP.md       # Tarefas

# 2. Setup local
cd frontend
npm install
npm run dev                          # Vite @ localhost:3000

# 3. Criar componente novo
# Exemplo: Criar StatusBadge
# File: src/components/ui/badge.tsx

# 4. Validar
npm run lint              # ESLint (sem hardcoded colors)
npm run test             # Testes unitários
npm run build            # Vite build (production)

# 5. Commitar
git checkout -b robot/status-badge
git add src/components/ui/badge.tsx
git commit -m "feat: novo StatusBadge com variantes"
git push origin robot/status-badge
# → Abrir PR
```

---

## 🎨 Regras de Ouro (Resumidas)

| ✅ FAÇA | ❌ NÃO FAÇA |
|---------|-----------|
| `className="flex gap-4 p-2 rounded-lg bg-primary"` | `style={{ backgroundColor: "#1A73E8" }}` |
| `import { Button } from "@/components/ui/button"` | `import { Button } from "@material-ui/core"` |
| `export interface Props { title: string }` | `const Component = ({ title, ...props }) =>` |
| `var(--text-primary)` em CSS | Hardcoded `#0F172A` |
| `.tsx` com TypeScript | `.jsx` ou `.js` |
| `cn("base", condition && "mod")` | String concat |
| Dark mode automático (CSS vars) | Detectar em JS |

---

## 🏗️ Estrutura de Pastas

```
frontend/src/
├── components/
│   ├── ui/                    # shadcn/ui + Tailwind
│   ├── composite/             # Componentes de negócio
│   ├── patterns/              # Padrões reutilizáveis (Forms, Tables)
│   └── legacy/                # MUI v4 (READ-ONLY)
├── theme/tokens/
│   ├── primitives.css         # Valores brutos
│   ├── semantic.css           # Aliasing semântico
│   ├── typography.css         # Fontes
│   └── components.css         # Tokens específicos
├── hooks/                     # Custom React hooks
├── lib/utils.ts              # cn() helper
├── pages/                    # Rotas principais
├── services/                 # API calls
└── index.css                 # Tailwind entry
```

---

## 🎯 Tarefas Imediatas (Junho 2026)

### Semana 1
- [ ] Button.tsx refactor (remover makeStyles)
- [ ] Card.tsx refactor (centralizar styling)
- [ ] Input.tsx + Textarea.tsx (Tailwind)
- [ ] Validar `theme/tokens/components.css`
- [ ] ESLint no-hardcoded-colors rule

### Semana 2
- [ ] Dialog/Modal + Tabs
- [ ] Badge/StatusChip componentes
- [ ] FormField pattern
- [ ] Refactor FlowBuilder hardcoded colors

---

## 📊 Métricas de Sucesso

```
CODE:
  ☐ 0% hardcoded hex colors (ESLint + audit)
  ☐ 100% TypeScript em features novas
  ☐ 0 MUI v4 imports em código novo
  ☐ 95%+ test coverage

VISUAL:
  ☐ Lighthouse >= 90
  ☐ WCAG AA em 100% componentes
  ☐ Dark mode funcional

UX:
  ☐ Keyboard navigation em 100%
  ☐ Focus indicators visíveis
  ☐ Acessibilidade tests passando
```

---

## 🔗 Links Rápidos

- **shadcn/ui**: https://ui.shadcn.com/
- **Tailwind CSS**: https://tailwindcss.com/
- **Radix UI**: https://www.radix-ui.com/
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **Watink GitHub**: https://github.com/alltomatos/watinkdev

---

## ❓ Dúvidas Frequentes

**P: Por onde começar?**  
R: Leia `AI_AGENT_INSTRUCTIONS.md` primeiro (15 min). Depois `FRONTEND_ARCHITECTURE.md` para contexto.

**P: Posso usar MUI v4?**  
R: Não. Use shadcn/ui + Tailwind. MUI é legacy, read-only.

**P: E cores customizadas?**  
R: Sempre use tokens em `theme/tokens/`. Nunca hardcoded.

**P: Como testo dark mode?**  
R: `npm run dev` → F12 → add `class="dark"` na `<html>` → toggle.

**P: Preciso de Storybook?**  
R: Recomendado (Fase 4). Por enquanto, use snapshots + visual testing.

---

## 📞 Support

- **Documentação**: Este diretório
- **Issues**: GitHub issues com label `frontend`
- **Discord**: #watink-frontend (comunidade)

---

**Mantido por**: Equipe Watink  
**Última atualização**: 13 de junho de 2026  
**Status**: Produção (v2.0-beta)

🚀 **Pronto para começar?** Abra `AI_AGENT_INSTRUCTIONS.md` agora mesmo!
