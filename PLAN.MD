# Plan: Remove OpenCore Branding from Business Backend

## Current State

### Business Backend (`business/`)
- **Stack**: Go 1.24 / Gin / GORM
- **Port**: 8082
- **Branding**: "Watink" (não "OpenCore")
- **Plugins**: Built-in (Helpdesk, Webchat, Clientes, SaaS)
- **Database**: PostgreSQL with RLS
- **Messaging**: RabbitMQ (commands/events via AMQP)
- **Caching**: Redis

### Frontend (`frontend/`)
- **Stack**: React 17 / Vite / MUI v4 (desatualizado)
- **Port**: 3000 (vite dev)
- **Branding**: "Watink" (consistente)
- **API**: REST + Socket.io

### Key Findings

1. **Backend já usa "Watink"** - não há referências a "OpenCore" no código Go (apenas comentário em `plan_limit_service.go`)
2. **Frontend usa "Watink"** - branding consistente em todos os arquivos
3. **README.md** ainda menciona "Watink OpenCore" - precisa ser atualizado
4. **CLAUDE.md** foi atualizado recentemente para Go 1.24, React 18, MUI v5 (ainda não commitado)

---

## Goals

1. **Remove all "OpenCore" references** from documentation
2. **Align branding** to "Watink Business" (backend) / "Watink" (frontend)
3. **Keep React frontend** as-is (não há necessidade de mudança)
4. **Document architecture** claramente

---

## Tasks

### Phase 1: Documentation Cleanup

| Task | File | Action |
|------|------|--------|
| 1.1 | `README.md` | Remove "OpenCore" from title/description |
| 1.2 | `CLAUDE.md` | Update to "Watink Business" (já está quase correto) |
| 1.3 | `SECURITY_NOTICE.md` | Review for OpenCore references |
| 1.4 | `CONTRIBUTING.md` | Review for OpenCore references |
| 1.5 | `docs/` | Search and replace in documentation files |

### Phase 2: Code Cleanup (Business Backend)

| Task | File | Action |
|------|------|--------|
| 2.1 | `business/pkg/utils/jwt.go` | Update comment about "WatinkCore" interface |
| 2.2 | `business/pkg/sdk/plugin.go` | Rename WatinkCore → WatinkBusiness (interface) |
| 2.3 | `business/internal/plugins/*.go` | Update imports if needed |
| 2.4 | `business/internal/controllers/setup.go` | Update "Watink" systemTitle (consistente) |

### Phase 3: Frontend Updates (Optional)

| Task | File | Action |
|------|------|--------|
| 3.1 | `frontend/package.json` | Update React 17 → 18, MUI v4 → v5 |
| 3.2 | `frontend/src/config.js` | Update documentation link |
| 3.3 | `frontend/public/manifest.json` | Update "Watink" branding |

### Phase 4: Infrastructure

| Task | File | Action |
|------|------|--------|
| 4.1 | `ecosystem.config.js` | Add `watink-business` name (já está) |
| 4.2 | `docker-compose.business.yml` | Update image naming |
| 4.3 | `Dockerfile.business` | Review for branding |

---

## Architecture After Refactor

```
Frontend (React/Vite) ←REST/Socket→ Backend Go (Gin/GORM) ←SQL→ PostgreSQL
                                          ↕ AMQP                              ↕
                                     RabbitMQ ←──── Engine Go (whatsmeow) → WhatsApp
                                          ↕
                              Plugin Manager · Marketplace Hub
```

### Services & Ports (local dev)

| Service | Dir | Stack | Port |
|---------|-----|-------|------|
| Backend Go | `business/` | Go 1.24 / Gin / GORM | 8082 |
| Engine Go | `engine-go/` | Go 1.24 / whatsmeow | — |
| Frontend | `frontend/` | React 18 / Vite / MUI v5 | 3000 |
| Plugin Manager | `plugin-manager/` | Go 1.24 / gorilla-mux | 8081 |
| Marketplace Hub | `marketplace-hub/` | Node/Express | 8090 |

---

## Notes

- **NÃO remover** o React frontend - ele será mantido
- **NÃO remover** o Engine Go (whatsmeow) - essencial para WhatsApp
- **NÃO remover** o Plugin System - core do modelo de negócios
- **MANTER** multitenancy via PostgreSQL RLS
- **MANTER** RabbitMQ para comunicação assíncrona

---

## Estimated Impact

- **Breaking changes**: None (branding only)
- **Database migrations**: None
- **API changes**: None
- **Frontend changes**: Minor (optional React/MUI upgrade)

---

## Next Steps

1. Review and approve this plan
2. Execute Phase 1 (documentation)
3. Execute Phase 2 (code cleanup)
4. Run tests to verify no regressions
5. Commit changes with conventional commit: `docs(branding): remove OpenCore references`
