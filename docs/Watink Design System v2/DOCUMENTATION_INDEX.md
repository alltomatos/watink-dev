# 📋 Índice de Documentação — Watink Design System v2.0

**Criado**: 13 de junho de 2026  
**Atualizado**: 15 de junho de 2026  
**Status**: ✅ Ativo em produção  
**Versão**: 2.0-beta (Revisão 2)

---

## 📚 5 Documentos Criados

### 1️⃣ **README_AI_AGENTS.md** (Resumo)
- **O que é**: Guia de entrada rápida
- **Para quem**: Agentes de IA (primeira leitura)
- **Tempo**: 5-10 min
- **Conteúdo**: O que fazer, por onde começar, regras básicas

### 2️⃣ **AI_AGENT_INSTRUCTIONS.md** (Regras Estritas)
- **O que é**: Instruções precisas e não-negociáveis
- **Para quem**: Agentes implementando código
- **Tempo**: 20-30 min
- **Conteúdo**: Workflow, checklist, troubleshooting, exemplos práticos

### 3️⃣ **FRONTEND_ARCHITECTURE.md** (Técnica)
- **O que é**: Arquitetura completa do frontend
- **Para quem**: Agentes que precisam entender estrutura
- **Tempo**: 30-40 min
- **Conteúdo**: Stack, tokens 3-camadas, padrões, dark mode, exemplos

### 4️⃣ **DESIGN_SYSTEM_GUIDE.md** (Componentes)
- **O que é**: Guia visual e de componentes
- **Para quem**: Agentes criando novo componente
- **Tempo**: 20-30 min
- **Conteúdo**: Paleta, componentes base, padrões Tailwind, exemplos bom/ruim

### 5️⃣ **IMPLEMENTATION_ROADMAP.md** (Planejamento)
- **O que é**: Plano de execução e tarefas
- **Para quem**: Agentes priorizando próximas tarefas
- **Tempo**: 15-20 min
- **Conteúdo**: Estado atual vs. target, gaps, 4 fases, cronograma, métricas

---

## 🎯 Como Usar Esta Documentação

### Para Um Agente NOVO no Projeto
```
1. Ler README_AI_AGENTS.md               (10 min)
2. Ler AI_AGENT_INSTRUCTIONS.md          (25 min)
3. Ler FRONTEND_ARCHITECTURE.md          (35 min)
4. Guardar DESIGN_SYSTEM_GUIDE.md como referência
5. Consultar IMPLEMENTATION_ROADMAP.md para tarefas
                                TOTAL: ~90 min
```

### Para Um Agente CRIANDO Novo Componente
```
1. Abrir AI_AGENT_INSTRUCTIONS.md       (Section 2: Implement)
2. Seguir exemplo prático de workflow
3. Validar contra DESIGN_SYSTEM_GUIDE.md
4. Submeter código
                                TOTAL: ~2-3 horas
```

### Para Um Agente REFATORANDO Legacy
```
1. Consultar IMPLEMENTATION_ROADMAP.md (Section 7: Immediate Tasks)
2. Ler FRONTEND_ARCHITECTURE.md (Section 7: Padrões)
3. Seguir checklist em AI_AGENT_INSTRUCTIONS.md
4. Validar com `npm run lint`, `npm run test`
                                TOTAL: ~4-8 horas (por componente)
```

---

## ✅ Checklist de Implementação

### Fase 1: Fundação (ATUAL)
- [x] Documentação completa criada
- [x] Tokens CSS definidos
- [x] ESLint rules configuradas
- [x] Templates de componentes prontos
- [ ] Publicar em wiki/docs do projeto

### Fase 2: Componentes Base (PRÓXIMAS 2 SEMANAS)
- [ ] Button.tsx refactor
- [ ] Card.tsx refactor
- [ ] Input/Textarea.tsx
- [ ] Dialog/Modal
- [ ] Badge/StatusChip

### Fase 3: Componentes Complexos (2-4 SEMANAS)
- [ ] ChatWindow/MessageBubble
- [ ] FlowBuilder ecosystem
- [ ] TicketCard/Kanban
- [ ] DataTable
- [ ] Forms (página completa)

### Fase 4: Testes & Deploy (1-2 SEMANAS)
- [ ] Visual regression testing
- [ ] Accessibility audit
- [ ] Performance profiling
- [ ] Storybook stories
- [ ] Deploy produção

---

## 🎓 Exemplos de Tarefas para Agentes

### Exemplo 1: Componente Simples (2-3 horas)
```markdown
**Task**: Criar novo componente Badge com 4 variantes

Arquivo: src/components/ui/badge.tsx
Variantes: success, error, warning, info
Dark mode: sim
Testes: unit + visual
Resultado: Pronto para usar em outras features
```

### Exemplo 2: Componente Médio (4-6 horas)
```markdown
**Task**: Refactor FormField pattern

Arquivo: src/components/patterns/Forms/FormField.tsx
Reqs:
  - Label com required indicator
  - Error message display
  - Helper text
  - Dark mode
  - Accessibility (ARIA)
Testes: unit + integration
```

### Exemplo 3: Refator Complexo (8-12 horas)
```markdown
**Task**: Migrar FlowBuilder para Tailwind

Files:
  - src/pages/FlowBuilder/NodesSidebar.tsx
  - src/pages/FlowBuilder/CustomNodes/BaseNode.tsx
  - src/pages/FlowBuilder/ContentModal.tsx

Reqs:
  - Remover hardcoded colors
  - Converter .js → .tsx
  - Tailwind styling
  - Testes completos
  - Dark mode

Esforço: 8-12 dev-hours
```

---

## 📊 Estrutura de Decisão (Para Agentes)

```
┌─ Devo usar MUI v4?
│  └─ NÃO ❌ → Use shadcn/ui + Tailwind
│
├─ Posso hardcoded hex color?
│  └─ NÃO ❌ → Use var(--...) ou Tailwind semantic
│
├─ Qual formato de arquivo?
│  └─ .tsx com TypeScript (obrigatório)
│
├─ Como estilizar?
│  └─ Tailwind classes + cn() helper
│
├─ Como adicionar nova cor?
│  └─ 1. Verificar tokens/ existentes
│     2. Se nova, adicionar em tokens/
│     3. Nunca hardcoded no componente
│
├─ Como suportar dark mode?
│  └─ CSS Custom Properties fazem automaticamente
│     (nenhuma ação necessária)
│
└─ Como testar?
   └─ npm run lint   (ESLint)
      npm run test   (Vitest)
      npm run build  (Vite)
      npm run dev    (Visual)
```

---

## 🚀 Próximos Passos

### Imediato (Hoje)
- [x] Criar documentação (DONE)
- [ ] Publicar em `frontend/docs/` ou `docs/frontend/`
- [ ] Notificar equipe no Slack/Discord

### Curto Prazo (1-2 semanas)
- [ ] Começar Fase 2 (componentes base)
- [ ] Primeira PR com Button.tsx refactor
- [ ] Validar workflow com agente real

### Médio Prazo (3-6 semanas)
- [ ] Fase 3 (componentes complexos)
- [ ] Integrar Chromatic (visual regression)
- [ ] Storybook stories

### Longo Prazo (Q3 2026)
- [ ] Remover MUI v4 completamente
- [ ] 100% teste coverage
- [ ] Deploy em produção
- [ ] Feedback loop + iterações

---

## 💡 Dicas para Agentes

### Ao Começar Uma Tarefa
1. ✅ Ler a tarefa completa
2. ✅ Consultar DESIGN_SYSTEM_GUIDE.md para referência visual
3. ✅ Verificar se componente base já existe
4. ✅ Reutilizar padrões de `components/patterns/`
5. ✅ Criar tipos TypeScript primeiro (interface Props)

### Ao Implementar
1. ✅ Escrever tipos antes de código
2. ✅ Usar `cn()` para classes condicionais
3. ✅ Nunca hardcoded colors
4. ✅ Sempre export interface + function
5. ✅ Adicionar comentários JSDoc

### Ao Validar
1. ✅ `npm run lint` sem warnings
2. ✅ `npm run test` passando
3. ✅ `npm run build` sem errors
4. ✅ `npm run dev` visual check (light + dark)
5. ✅ Keyboard navigation funciona

### Ao Submeter
1. ✅ Branch: `robot/feature-name`
2. ✅ Commit: `feat: descrição clara`
3. ✅ PR com descrição técnica
4. ✅ Screenshot light + dark mode
5. ✅ Referenciar esta documentação

---

## 🎯 Métricas de Qualidade

```
CODE QUALITY:
  Lint errors:          0
  TypeScript errors:    0
  Test coverage:        >= 95%
  Hardcoded colors:     0

VISUAL QUALITY:
  Lighthouse score:     >= 90
  WCAG AA contrast:     100%
  Dark mode:            100% funcional

PERFORMANCE:
  Bundle size delta:    < 5kb
  Runtime performance:  >= 60fps
  Load time:            < 3s (3G slow)
```

---

## 📖 Referências Rápidas

| Tópico | Consultar |
|--------|-----------|
| Como criar componente? | AI_AGENT_INSTRUCTIONS.md §2 |
| Qual cor usar? | DESIGN_SYSTEM_GUIDE.md §1 |
| Padrão de formulário? | FRONTEND_ARCHITECTURE.md §5 |
| Próximas tarefas? | IMPLEMENTATION_ROADMAP.md §7 |
| Regras estritas? | AI_AGENT_INSTRUCTIONS.md §7 |
| Exemplo completo? | AI_AGENT_INSTRUCTIONS.md §8 |

---

## 📝 Histórico de Documentação

| Data | Evento |
|------|--------|
| 13 jun 2026 | ✅ v2.0-beta documentação criada |
| 14 jun 2026 | 📅 Fase 1 (Fundação) - Esperado |
| 28 jun 2026 | 📅 Fase 2 (Componentes base) |
| 21 jul 2026 | 📅 Fase 3 (Componentes complexos) |
| 31 jul 2026 | 📅 Fase 4 (Testes + Deploy) |

---

**Criado com ❤️ para a equipe Watink**  
**Mantido por**: Equipe Frontend + Agentes de IA  
**Status**: Ativo em produção  
**Versão**: 2.0-beta (junho 2026)

🚀 **Comece pelo README_AI_AGENTS.md!**
