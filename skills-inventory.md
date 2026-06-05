# Skills Inventory — /opt/skills

Gerado em: 2026-06-04

| # | Nome | Bucket | Descrição curta | Arquivos auxiliares |
|---|------|--------|-----------------|---------------------|
| 1 | obsidian-vault | personal | Search, create, and manage notes in the Obsidian vault with wikilinks and index notes | — |
| 2 | edit-article | personal | Edit and improve articles by restructuring sections, improving clarity, and tightening prose | — |
| 3 | grill-me | productivity | Interview the user relentlessly about a plan or design until reaching shared understanding | — |
| 4 | caveman | productivity | Ultra-compressed communication mode — cuts token usage ~75% dropping filler, articles, pleasantries | — |
| 5 | write-a-skill | productivity | Create new agent skills with proper structure, progressive disclosure, and bundled resources | — |
| 6 | localize-pt-br | productivity | Configure the agent to respond in Brazilian Portuguese (pt-BR), adapting terminology and style | — |
| 7 | handoff | productivity | Compact the current conversation into a handoff document for another agent to pick up | — |
| 8 | git-guardrails-claude-code | misc | Set up Claude Code hooks to block dangerous git commands (push, reset --hard, clean, branch -D, etc.) | scripts/block-dangerous-git.sh |
| 9 | setup-pre-commit | misc | Set up Husky pre-commit hooks with lint-staged (Prettier), type checking, and tests | — |
| 10 | scaffold-exercises | misc | Create exercise directory structures with sections, problems, solutions, and explainers | — |
| 11 | migrate-to-shoehorn | misc | Migrate test files from `as` type assertions to @total-typescript/shoehorn | — |
| 12 | improve-codebase-architecture | engineering | Find deepening opportunities in a codebase, informed by domain language and ADRs | DEEPENING.md, HTML-REPORT.md, INTERFACE-DESIGN.md, LANGUAGE.md |
| 13 | orchestrator | engineering | Master orchestration — analyzes repo state, enforces compliance, delegates to specialized skills | — |
| 14 | prototype | engineering | Build a throwaway prototype to flesh out a design — routes between terminal app or UI variations | LOGIC.md, UI.md |
| 15 | diagnose | engineering | Disciplined diagnosis loop: reproduce → minimise → hypothesise → instrument → fix → regression-test | scripts/hitl-loop.template.sh |
| 16 | to-issues | engineering | Break a plan, spec, or PRD into independently-grabbable issues using tracer-bullet vertical slices | — |
| 17 | grill-with-docs | engineering | Grilling session that challenges plan against domain model, sharpens terminology, updates docs inline | ADR-FORMAT.md, CONTEXT-FORMAT.md |
| 18 | to-prd | engineering | Turn the current conversation context into a PRD and publish it to the project issue tracker | — |
| 19 | tdd | engineering | Test-driven development with red-green-refactor loop — tests verify behavior through public interfaces | deep-modules.md, interface-design.md, mocking.md, refactoring.md, tests.md |
| 20 | triage | engineering | Triage issues through a state machine driven by triage roles | AGENT-BRIEF.md, OUT-OF-SCOPE.md |
| 21 | setup-skills | engineering | Sets up AGENTS.md/CLAUDE.md skills block and docs/agents/ so engineering skills know repo context | domain.md, issue-tracker-github.md, issue-tracker-gitlab.md, issue-tracker-local.md, triage-labels.md |
| 22 | zoom-out | engineering | Zoom out and give broader context or higher-level perspective on an unfamiliar code area | — |
| 23 | writing-fragments | in-progress | Grilling session that mines the user for fragments — raw material for a future article | — |
| 24 | writing-beats | in-progress | Shape an article as a journey of beats, choose-your-own-adventure style, beat by beat | — |
| 25 | review | in-progress | Two-axis review (Standards + Spec) of the diff between HEAD and a user-supplied fixed point | — |
| 26 | teach | in-progress | Teach the user a new skill or concept within a stateful multi-session workspace | GLOSSARY-FORMAT.md, LEARNING-RECORD-FORMAT.md, MISSION-FORMAT.md, RESOURCES-FORMAT.md |
| 27 | writing-shape | in-progress | Take raw material and shape it into an article through conversational drafting session | — |
| 28 | design-an-interface | deprecated | Generate multiple radically different interface designs for a module using parallel sub-agents | — |
| 29 | ubiquitous-language | deprecated | Extract a DDD-style ubiquitous language glossary from conversation, flagging ambiguities | — |
| 30 | qa | deprecated | Interactive QA session — user reports bugs conversationally, agent files GitHub issues | — |
| 31 | request-refactor-plan | deprecated | Create a detailed refactor plan with tiny commits via user interview, filed as GitHub issue | — |

---

## Resumo por bucket

| Bucket | Qtd | Skills |
|--------|-----|--------|
| engineering | 11 | improve-codebase-architecture, orchestrator, prototype, diagnose, to-issues, grill-with-docs, to-prd, tdd, triage, setup-skills, zoom-out |
| productivity | 5 | grill-me, caveman, write-a-skill, localize-pt-br, handoff |
| in-progress | 5 | writing-fragments, writing-beats, review, teach, writing-shape |
| misc | 4 | git-guardrails-claude-code, setup-pre-commit, scaffold-exercises, migrate-to-shoehorn |
| personal | 2 | obsidian-vault, edit-article |
| deprecated | 4 | design-an-interface, ubiquitous-language, qa, request-refactor-plan |

## Skills com arquivos auxiliares

| Skill | Arquivos |
|-------|----------|
| improve-codebase-architecture | DEEPENING.md, HTML-REPORT.md, INTERFACE-DESIGN.md, LANGUAGE.md |
| prototype | LOGIC.md, UI.md |
| diagnose | scripts/hitl-loop.template.sh |
| grill-with-docs | ADR-FORMAT.md, CONTEXT-FORMAT.md |
| tdd | deep-modules.md, interface-design.md, mocking.md, refactoring.md, tests.md |
| triage | AGENT-BRIEF.md, OUT-OF-SCOPE.md |
| setup-skills | domain.md, issue-tracker-github.md, issue-tracker-gitlab.md, issue-tracker-local.md, triage-labels.md |
| git-guardrails-claude-code | scripts/block-dangerous-git.sh |
| teach | GLOSSARY-FORMAT.md, LEARNING-RECORD-FORMAT.md, MISSION-FORMAT.md, RESOURCES-FORMAT.md |
