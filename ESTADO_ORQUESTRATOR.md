# ESTADO_ORQUESTRATOR.md

> Arquivo de estado vivo do Orchestrator.
> **Última atualização**: 2026-06-18
> **Branch**: `main`
> **Epic**: Epic 5 — Dependabot Go deps upgrade

---

## Histórico de Epics

| Epic | Descrição | Status |
|------|-----------|--------|
| Epic 1 | Migração MUI → shadcn/ui + TypeScript | ✅ Mergeado |
| Epic 2 | DI Backend Go + TS Strict Frontend | ✅ Mergeado (PR #58) |
| Epic 3 | Security (filippo.io upgrade) + Lint governance | ✅ Mergeado (PR #59) |
| Epic 3.5 | Backend test coverage + fix UpdateQueue | ✅ Mergeado (PR #60) |
| Epic 4 | E2E Playwright — 21 testes + CI job | ✅ Mergeado (PR #61) |
| Epic 5 | Dependabot Go deps upgrade (crypto/net) | ✅ Mergeado (PR #62) |
| Epic 6 | Lint zero frontend + cobertura Go +5pp + fix UpdateFlow | ✅ Mergeado (PR #63) |

---

## GAPs Identificados (P1 — Segurança)

Os 3 alertas Dependabot que aparecem em cada push para `main`:

| ID | Pacote | Versão atual | Versão latest | Severidade |
|----|--------|-------------|--------------|-----------|
| D1 | `golang.org/x/crypto` | v0.51.0 | v0.53.0 | High |
| D2 | `golang.org/x/net` | v0.55.0 | v0.56.0 | Moderate |
| D3 | (terceiro — a confirmar via GitHub UI) | — | — | Low |

> `golang.org/x/crypto` e `golang.org/x/net` são frequentemente alertados juntos (net depende de crypto via transport).

---

## DAG de Tarefas — Epic 5

| ID | Tarefa | Status |
|----|--------|--------|
| D1 | `go get golang.org/x/crypto@latest` + `go mod tidy` | ⏳ |
| D2 | `go get golang.org/x/net@latest` + verificar se resolve D3 | ⏳ |
| D3 | Confirmar 3º alerta e atualizar se necessário | ⏳ |
| D4 | `go build ./...` + `go test ./...` — sem regressão | ⏳ |
| D5 | PR `hardening/epic5-go-deps` → main | ⏳ |

---

## Checkpoints

- [ ] `go build ./...` verde após upgrades
- [ ] CI verde (build-backend + smoke-test)
- [ ] 0 alertas Dependabot após merge
