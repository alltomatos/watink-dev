# Proxy (Anti-Ban) — Contexto para Agentes

## Responsabilidade
Dar a cada conexão WhatsApp (`Whatsapps`) um IP de saída próprio via proxy,
mitigando o sinal de REDE/IP do anti-ban (complementa o ADR 0016, que trata do
risco ESTRUTURAL do fingerprint whatsmeow). Gestão em **Configurações → Proxy**;
atrelar à conexão no `WhatsAppModal` (página de Conexões).

## Arquitetura / fluxo
- **Gestão (business):** CRUD de `Proxy` (senha cifrada), grupos
  (`ProxyGroup`/`ConnectionGroup`), import Webshare, teste/test-all,
  isolar/ativar, assign-group, filtros. UI em
  `frontend/src/pages/Settings/components/ProxySection.tsx`.
- **Uso (business→engine):** `StartWhatsAppSession` resolve o proxy
  (`composeProxyURL`/`resolveProxy`/`pickGroupProxy`) e injeta `proxyUrl` no
  payload AMQP `session.start`. O `engine-go` recebe pronto e chama `SetProxyAddress`.
- **Auto-isolação:** engine emite status `BANNED` (whatsmeow
  `ConnectFailureUnknownLogout`=406 / `*events.TemporaryBan`=402) →
  `handleSessionStatus` isola o proxy da conexão.

## Modelo de dados
- `Proxy`: host, port, username, `passwordEnc` (AES-GCM, json:"-"), scheme
  (http|socks5), status (active|isolated|disabled|banned), healthy,
  country/countryCode/city (geo), proxyGroupId.
- `ProxyGroup`: name, rotationStrategy (sticky|rotate). `ConnectionGroup`: name.
- `Whatsapps`: proxyMode (none|single|group), proxyId, proxyGroupId, connectionGroupId.

## Contratos
- **Rotação (`pickGroupProxy`):** `sticky` reusa o `proxyId` atual se ainda
  `active` e no grupo, senão LRU atômico e persiste; `rotate` sempre LRU atômico
  (`UPDATE ... FOR UPDATE SKIP LOCKED RETURNING`). Não-`active` são excluídos.
- **Teste (`probeProxy`):** **erro de transporte → proxy ruim** (rebaixa);
  **qualquer resposta HTTP → proxy OK** (geo é enriquecimento best-effort; falha
  do serviço de geo NÃO rebaixa).
- **`session.start` payload:** carrega `proxyUrl` (scheme://user:pass@host:port)
  — credencial em claro, NUNCA logar.
- **Endpoints:** /proxies (CRUD), /proxies/import, /proxies/test-all,
  /proxies/assign-group, /proxies/:id/{test,isolate,activate}; /proxy-groups,
  /connection-groups. Todos sob `protected` + `auth.GetScoped(c,"Whatsapps")`.

## Edge cases
- **Proxy single isolado:** conexão NÃO reconecta (fail-closed) — erro acionável
  orienta reatribuir/reativar. Comportamento DESEJADO (não reconectar em IP queimado).
- **Grupo todo isolado:** `pickGroupProxy` falha-closed.
- **Delete de proxy em modo group:** zerar SÓ `proxyId` (não `proxyMode`) — senão
  fail-OPEN/vaza IP.
- **ip-api fora:** não rebaixar proxies (só dial real rebaixa).
- **403 MainDeviceGone:** ambíguo (ban OU troca de aparelho) → DISCONNECTED
  (sub-detecção consciente de bans 403).

## Limites (o que NÃO resolve)
Mitiga o sinal de rede/IP — não elimina o risco ESTRUTURAL do fingerprint
whatsmeow (ADR 0016) nem o passkey (docs/agents/passkey-threat.md).

## Ops
- `PROXY_ENC_KEY` (env) obrigatório em prod (`openssl rand -base64 32`). Trocar
  invalida segredos gravados.
- Migração via GORM AutoMigrate.

## Critério de sucesso (invariantes verificáveis)
Senha nunca vaza · toda escrita pós-GetScoped usa `Session(NewDB:true)` ·
fail-closed sempre · geo best-effort não invalida proxy bom · SOCKS5 roteia de
fato (`SetProxyAddress` + smoke test no engine).
