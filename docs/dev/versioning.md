# Versionamento e Release

## Semantic Versioning (SemVer)

| Tipo | Quando usar |
|---|---|
| `PATCH (0.0.x)` | Correções de bug sem alteração de API |
| `MINOR (0.x.0)` | Novas funcionalidades retrocompatíveis |
| `MAJOR (x.0.0)` | Mudanças que quebram compatibilidade |

## Script de Release

```bash
node scripts/release.js <tipo> "<mensagem>"
# Exemplo:
node scripts/release.js patch "corrige bug de reconexão do engine"
node scripts/release.js minor "adiciona módulo de relatórios"
```

O script atualiza automaticamente:
- `package.json` — fonte primária da versão
- `CHANGELOG.md` — registro legível (padrão [Keep a Changelog](https://keepachangelog.com/))
- `version.json` — exposto via HTTP para monitoramento e dashboard

## Build do Backend Go

Sempre que o frontend for atualizado, o backend Go deve ser recompilado para embutir o novo build:

```bash
cd business && go build -o backend-go cmd/server/main.go
```

## Conventional Commits (obrigatório)

```
feat:       nova funcionalidade
fix:        correção de bug
refactor:   refatoração sem alterar comportamento
chore:      manutenção, tooling, dependências
docs:       somente documentação
hardening:  segurança, resiliência
test:       adição ou correção de testes
```

## Branches por tipo de mudança

→ Detalhes em [`git_workflow_policy.md`](./git_workflow_policy.md)

| Branch | Uso |
|---|---|
| `feat/<tema>` | Nova funcionalidade |
| `fix/<tema>` | Correção de bug |
| `refactor/<tema>` | Refatoração |
| `chore/<tema>` | Manutenção/tooling |
| `docs/<tema>` | Documentação |
| `hotfix/<tema>` | Urgência em produção |
