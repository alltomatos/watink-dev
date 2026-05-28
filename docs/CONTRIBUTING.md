# Contributing

## Branching Model

- `main`: produção (protegida, sem push direto)
- `develop`: integração de desenvolvimento
- `feature/<scope>-<resumo>`: novas funcionalidades
- `fix/<scope>-<resumo>`: correções não urgentes
- `hotfix/<scope>-<resumo>`: correções urgentes em produção
- `chore/<scope>-<resumo>`: manutenção técnica

## Regras obrigatórias

1. Nunca fazer push direto em `main`.
2. Todo merge via Pull Request.
3. PR com descrição objetiva, checklist e evidências de teste.
4. Commits seguindo Conventional Commits (`feat:`, `fix:`, `chore:`, etc.).
5. Branch deve estar atualizada com `develop` (ou `main` em hotfix) antes do merge.

## Fluxo recomendado

### Feature

1. Criar branch a partir de `develop`
2. Implementar + testar
3. Abrir PR para `develop`
4. Merge squash

### Release para produção

1. Abrir PR `develop -> main`
2. Após merge em `main`, criar tag semântica `vX.Y.Z`
3. Pipeline publica imagem no Docker Hub

### Hotfix

1. Criar `hotfix/*` a partir de `main`
2. PR para `main`
3. Após merge, fazer back-merge de `main` para `develop`

## Nomenclatura

- Exemplo feature: `feature/tickets-filtro-tenant`
- Exemplo fix: `fix/backend-timeout-rabbitmq`
- Exemplo hotfix: `hotfix/login-null-pointer`
