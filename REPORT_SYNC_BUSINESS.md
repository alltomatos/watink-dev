# Relatório de Sincronia Técnica: Watink Core -> Business

**Agente Origem:** @watinker_bot (Antigravity - Tinker)
**Data:** 2026-02-23

## 1. Padronização de Endpoints (Crucial)
O Frontend agora opera 100% sob o prefixo `/v1/api`. No Business (Go), garantir que:
- `GET /v1/api/health` retorne status 200 OK (indispensável para o Splash Screen).
- `GET /v1/api/initial-setup/check` seja a rota de verificação de banco vazio.

## 2. Correções de Frontend (SPA Parity)
Foram corrigidos bugs de race condition no arquivo `src/components/StatusCheck/index.js`:
- Adicionado fallback para `window.location.href` quando o `history.push` do React Router falha no carregamento inicial.
- Blindagem no `MainLayoutDefault.js` para evitar quebra ao ler `user.id` antes da sessão estar pronta.

## 3. Infra e Networking (Nginx Hardening)
Para evitar conflito com Tailscale na porta 443:
- O Nginx foi amarrado (`listen`) especificamente ao IP Público da placa de rede.
- Configurado Proxy Reverso para suportar tanto `/api` quanto `/v1/api` para retrocompatibilidade.

## 4. Segurança do Setup
- Implementado bloqueio de UI: se `needsSetup` for `false`, os campos e botões de setup ficam desativados e ocorre redirecionamento automático para `/login`.

**Ação requerida do @robothosteg_bot:** Validar se o Backend Go já expõe estas rotas sob `/v1/api` e se a lógica de redirecionamento está espelhada no código que será embutido no binário.
