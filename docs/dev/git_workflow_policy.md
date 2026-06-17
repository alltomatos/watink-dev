# Git Workflow Policy (Watink)

## Regras obrigatórias

1. **Proibido commit direto em `main`** — todo trabalho via PR.
2. Toda branch deve virar PR com testes antes de merge.
3. Merge só após CI/smoke e revisão humana.
4. Commits seguem **Conventional Commits**.

## Convenção de Branches

Baseada no tipo de mudança (espelha o prefixo do commit):

| Prefixo | Uso | Exemplo |
|---|---|---|
| `feat/<tema>` | Nova funcionalidade | `feat/helpdesk-kanban` |
| `fix/<tema>` | Correção de bug | `fix/ticket-status-update` |
| `refactor/<tema>` | Refatoração sem nova feature | `refactor/frontend-shadcn-migration` |
| `chore/<tema>` | Manutenção, tooling, deps | `chore/update-go-deps` |
| `docs/<tema>` | Somente documentação | `docs/adr-di-backend` |
| `hotfix/<tema>` | Correção urgente em produção | `hotfix/rabbitmq-reconnect` |

## Conventional Commits

```
feat:      nova funcionalidade
fix:       correção de bug
refactor:  mudança de código sem alterar comportamento
chore:     manutenção, tooling, deps
docs:      somente documentação
hardening: segurança, resiliência
test:      adição ou correção de testes
```

## Fluxo Padrão

```bash
git fetch origin && git checkout main && git pull
git checkout -b feat/<tema>
# implementar + commits pequenos
git push origin feat/<tema>
# abrir PR → develop (ou main se develop indisponível)
```

## Checklist de PR (obrigatório)

- [ ] Resumo técnico do que mudou
- [ ] Risco/impacto
- [ ] Evidência de teste (logs/smoke/build)
- [ ] Plano de rollback

## Merge Flow

```
feat/* / fix/* / refactor/* → develop → main (release)
hotfix/*                    → main → back-merge para develop
```
