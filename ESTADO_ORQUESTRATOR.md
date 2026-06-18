# ESTADO_ORQUESTRATOR.md

> Arquivo de estado vivo do Orchestrator.
> **Última atualização**: 2026-06-17
> **Branch**: `main` (próxima: `test/e2e-playwright`)
> **Epic**: Epic 4 — E2E Tests (Playwright)

---

## Contexto da Sessão

Com Epic 2 (DI/refactor), Epic 3 (security/lint) e cobertura unitária do backend mergeados em `main`, o próximo investimento é **testes E2E** com Playwright para cobrir os fluxos críticos de usuário que os testes unitários não alcançam.

O projeto já tem:
- `scripts/playwright-smoke.js` — smoke de navegação básico (8 rotas, login)
- `scripts/smoke_test.py` — smoke de API via Python/requests (usado no CI)
- Job `smoke-test` no CI com Postgres + Redis + RabbitMQ reais

---

## GAPs Identificados (Epic 4)

| ID | GAP | Prioridade |
|----|-----|-----------|
| E1 | Sem suite E2E estruturada (Playwright Test) — só smoke script ad-hoc | P1 |
| E2 | Fluxos críticos sem cobertura: login, criação de ticket, resposta de ticket | P1 |
| E3 | Sem fixtures/factories para estado inicial de testes | P1 |
| E4 | Smoke CI usa Playwright CLI imperativo — difícil expandir e ver relatório | P2 |
| E5 | Sem cobertura E2E de multitenancy (dois usuários, dois tenants isolados) | P2 |
| E6 | Sem cobertura E2E de fluxos admin (filas, usuários, conexões) | P2 |

---

## Análise de Arquitetura E2E

### Stack escolhida
- **Playwright Test** (`@playwright/test`) — runner nativo com fixtures, paralelismo, relatórios HTML
- **Localização**: `e2e/` na raiz do monorepo (não dentro de `frontend/`)
- **Ambiente**: usa o backend Go real + Postgres (mesmo do CI `smoke-test`)
- **Autenticação**: `storageState` (salva cookies/localStorage após login, reutiliza sem re-login)

### Estrutura de diretórios
```
e2e/
├── playwright.config.ts
├── fixtures/
│   ├── auth.fixture.ts      # login + storageState por usuário
│   └── api.fixture.ts       # helpers para seed de dados via API
├── tests/
│   ├── auth/
│   │   └── login.spec.ts    # login válido, inválido, logout
│   ├── tickets/
│   │   └── tickets.spec.ts  # criar, aceitar, responder, fechar ticket
│   ├── admin/
│   │   ├── queues.spec.ts   # CRUD de filas
│   │   └── users.spec.ts    # CRUD de usuários
│   └── multitenancy/
│       └── isolation.spec.ts # tenant A não vê dados de tenant B
└── global-setup.ts           # seed do banco (admin + tenant) antes da suite
```

### Integração com CI
- Novo job `e2e-tests` no `ci.yml`, depende de `build-backend` e `build-frontend`
- Usa os mesmos services (Postgres, Redis, RabbitMQ)
- Artefato: relatório HTML Playwright (`playwright-report/`)
- Variáveis de ambiente: `E2E_BASE_URL`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASS`

---

## DAG de Tarefas

### Legenda
- `pending` ⏳
- `in_progress` 🔄
- `done` ✅

### Bloco F — Fundação (sem dependências entre si)

| ID | Tarefa | Arquivo(s) | Status | Depende de |
|----|--------|-----------|--------|-----------|
| F1 | Instalar `@playwright/test` e configurar `playwright.config.ts` | `e2e/`, `package.json` da raiz | ⏳ | — |
| F2 | `global-setup.ts` — seed inicial via API (cria admin + tenant) | `e2e/global-setup.ts` | ⏳ | F1 |
| F3 | `auth.fixture.ts` — login + `storageState` reutilizável | `e2e/fixtures/auth.fixture.ts` | ⏳ | F1 |
| F4 | `api.fixture.ts` — helpers de seed (criar ticket, fila, usuário via API) | `e2e/fixtures/api.fixture.ts` | ⏳ | F1 |

### Bloco T — Testes (dependem de F)

| ID | Tarefa | Arquivo(s) | Status | Depende de |
|----|--------|-----------|--------|-----------|
| T1 | `login.spec.ts` — login válido, inválido, persistência de sessão, logout | `e2e/tests/auth/login.spec.ts` | ⏳ | F2, F3 |
| T2 | `tickets.spec.ts` — criar ticket, aceitar, enviar mensagem, fechar | `e2e/tests/tickets/tickets.spec.ts` | ⏳ | F3, F4 |
| T3 | `queues.spec.ts` — listar, criar, editar, remover fila | `e2e/tests/admin/queues.spec.ts` | ⏳ | F3, F4 |
| T4 | `users.spec.ts` — listar, convidar, desativar usuário | `e2e/tests/admin/users.spec.ts` | ⏳ | F3, F4 |
| T5 | `isolation.spec.ts` — tenant A não enxerga tickets/filas de tenant B | `e2e/tests/multitenancy/isolation.spec.ts` | ⏳ | F2, F3, F4 |

### Bloco C — CI (depende de T)

| ID | Tarefa | Arquivo(s) | Status | Depende de |
|----|--------|-----------|--------|-----------|
| C1 | Job `e2e-tests` no CI com Playwright + upload de relatório | `.github/workflows/ci.yml` | ⏳ | T1–T5 |
| C2 | Migrar `playwright-smoke.js` para spec Playwright Test | `e2e/tests/smoke/navigation.spec.ts` | ⏳ | F3 |

---

## Checkpoints de Sanidade

- [ ] **CP-F** — Após Bloco F: `npx playwright test --list` mostra 0 testes (infra ok, ainda sem specs)
- [ ] **CP-T** — Após T1–T3: `npx playwright test` passa localmente com Postgres real
- [ ] **CP-C** — Após C1: CI verde com job `e2e-tests`; relatório HTML disponível como artefato

---

## Histórico de Ações

| Data | Ação | Status |
|------|------|--------|
| 2026-06-17 | Branch `hardening/epic3-security-lint` — Bloco S + L concluídos | ✅ |
| 2026-06-17 | PR #59 mergeado — security + lint | ✅ |
| 2026-06-17 | PR #60 mergeado — 12 testes unitários + fix UpdateQueue | ✅ |
| 2026-06-17 | Epic 4 planejada — E2E com Playwright Test | ✅ |
