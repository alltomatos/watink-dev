# Watink Windows + Linux Compatibility (OpenCore + Business)

## Objetivo
Deixar o ambiente **100% organizado** para execução em dois cenários oficiais:

1. **Windows**
   - Watink OpenCore (Node)
   - Watink Business Server (Windows + Docker)
2. **Linux Docker**
   - Watink OpenCore (Node em host Linux)
   - Watink Business (Docker via compose)

Sem quebrar os fluxos atuais de produção e desenvolvimento.

---

## Arquitetura-alvo

### A) Windows
- **OpenCore (Node):** via `start.bat`
- **Business Server (Docker):** via `start-business-windows.bat`
- **Pré-checks:** via `scripts/windows-business-check.ps1`

### B) Linux
- **Business Docker:** via `scripts/linux-docker-business.sh`
- Comandos: `up | down | rebuild | logs | status`

---

## Scripts NPM padronizados (raiz)

- `npm run windows:check`
- `npm run windows:opencore`
- `npm run windows:business:server`
- `npm run windows:stack`
- `npm run linux:docker:business`
- `npm run linux:docker:business:down`
- `npm run linux:docker:business:rebuild`

---

## Matriz de compatibilidade

| Camada | OpenCore | Business | Windows | Linux Docker |
|---|---|---|---|---|
| Rotas/API | ✅ | ✅ | ✅ alvo | ✅ alvo |
| Auth/Sessão | ✅ | ✅ | ✅ alvo | ✅ alvo |
| Queue/Ticket | ✅ | ✅ | ✅ alvo | ✅ alvo |
| Inicialização | Node | Docker/Node | ✅ scripts dedicados | ✅ script dedicado |
| Operação | Manual guiada | Manual guiada | ✅ | ✅ |

---

## Sequência recomendada (hoje)

### Windows (Operação)
1. `npm run windows:check`
2. `npm run windows:opencore` (quando quiser OpenCore local)
3. `npm run windows:business:server` (quando quiser Business server)

### Linux (Docker Business)
1. `npm run linux:docker:business`
2. `npm run linux:docker:business:down` (parar)
3. `npm run linux:docker:business:rebuild` (rebuild limpo)

---

## Próximos passos técnicos (M2)
1. Smoke tests automáticos de rota (OpenCore + Business)
2. Teste de fluxo de autenticação e sessão
3. Teste de queue/ticket fim-a-fim
4. Gate de compatibilidade antes de release
