# Git Workflow Policy (Watink)

## Objetivo
Garantir estabilidade do main, rastreabilidade de mudanças por agente e integração segura entre Robot, Groud e Tinker.

## Regras obrigatórias
1. **Proibido commit direto no main**.
2. Todo trabalho deve nascer em branch dedicada.
3. Toda branch deve virar **PR** com testes antes de merge.
4. Merge só após validação de CI/smoke e revisão humana.
5. Commits devem seguir Conventional Commits (eat:, ix:, chore:...).

## Convenção de branches
- obot/<tema>
- groud/<tema>
- 	inker/<tema>
- hotfix/<tema> (somente urgência)

Exemplos:
- obot/windows-business-runtime
- groud/rbac-tenant-fixes
- 	inker/hardening-redis-rabbit

## Fluxo padrão
1. Atualizar base: git fetch origin && git checkout main && git pull.
2. Criar branch: git checkout -b <agent>/<tema>.
3. Implementar + commits pequenos.
4. Rodar testes locais/smoke.
5. git push origin <branch>.
6. Abrir PR para develop (ou main se develop indisponível).
7. Merge após aprovação.

## Checklist de PR (obrigatório)
- [ ] Resumo técnico do que mudou
- [ ] Risco/impacto
- [ ] Evidência de teste (logs/smoke)
- [ ] Plano de rollback

## Regras para agentes
- Não sobrescrever trabalho de outro agente sem rebase/merge explícito.
- Conflitos devem ser resolvidos em branch, nunca direto em main.
- Notificar o enxame (Supabase + system event) ao abrir/atualizar PR.

## Exceções
- Hotfix crítico pode ir para hotfix/*, com PR prioritária.
- Mesmo em hotfix, manter evidência mínima de teste.
