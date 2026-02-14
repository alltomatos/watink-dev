# Release Ops Governance (GitHub + Docker Hub + Linux)

## Objetivo

Padronizar fluxo de branch, release e publicação de imagens para reduzir risco operacional.

## Estrutura

- Branches: `main`, `develop`, `feature/*`, `fix/*`, `hotfix/*`
- Merge: somente via PR
- Versionamento: SemVer (`vX.Y.Z`)
- Publicação: Docker Hub via workflows/pipeline

## Proteção de branch (recomendado)

Aplicar em `main` e `develop`:

- PR obrigatório
- 1 aprovação mínima
- Dismiss stale reviews
- Conversas resolvidas obrigatórias
- Linear history
- Sem force-push
- Sem delete da branch

> Observação: requer permissão de admin no repositório.

## Política de deploy

- `develop`: ambiente dev/homolog
- `main`: produção
- `hotfix/*`: correção urgente em produção, seguida de back-merge para `develop`

## Checklist de release

1. CI verde no PR `develop -> main`
2. Aprovação e merge
3. Criar tag `vX.Y.Z`
4. Confirmar build/push no Docker Hub
5. Deploy no ambiente alvo
6. Verificar healthcheck e logs
