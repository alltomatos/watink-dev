# Domain Documentation Layout

## Single-Context Repository
This repo uses a single `CONTEXT.md` at the root. No `CONTEXT-MAP.md` needed.

## Domain Vocabulary Location
- **Glossary**: `/CONTEXT.md` — canonical terms and definitions
- **ADRs**: `/docs/adr/` — architectural decision records (numbered: `0001-slug.md`)

## Rules for Using Domain Vocabulary
1. **Always consult `CONTEXT.md`** before introducing new terms in code or docs
2. **Use canonical terms only** — terms listed under `_Avoid_` must not appear in new code
3. **When a concept lacks a term**, propose one and add to `CONTEXT.md` before coding
4. **ADR gate** — only create ADRs for decisions that are hard to reverse, surprising without context, and result of a real trade-off
5. **Cross-reference** — ADRs should link to `CONTEXT.md` terms; code comments should use canonical vocabulary

## Code ↔ Vocabulary Alignment
- Domain models in `business/internal/domain/models.go` must use canonical terms from `CONTEXT.md`
- API endpoint names must match canonical terms (e.g., `/tickets` not `/cases`)
- RabbitMQ routing keys follow the pattern `wbot.{tenant}.{session}.{domainEvent}`
