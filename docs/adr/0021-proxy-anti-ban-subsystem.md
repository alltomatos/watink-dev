# ADR 0021 — Subsistema de proxy anti-ban por conexão

**Status:** Accepted  
**Data:** 2026-06-30

## Contexto
O Watink conecta no WhatsApp via whatsmeow (engine-go), approach não-oficial com
risco de ban. O ADR 0016 trata do risco ESTRUTURAL (fingerprint) e do anti-ban de
campanhas, mas não cobre o sinal de REDE/IP — múltiplas conexões saindo pelo mesmo
IP de datacenter, ou geo incoerente com o número, são um vetor independente de
banimento. O engine-go já aceitava `proxyUrl` no `session.start`, mas
business/frontend/DB nunca preenchiam.

## Decisão
Construir um subsistema de proxy **por conexão** no business (gestão em
Configurações → Proxy). Decisões arquiteturais:

1. **Senha cifrada at-rest (AES-256-GCM):** `cryptobox` com chave derivada de
   `PROXY_ENC_KEY`, campo `json:"-"`, fail-closed se a chave faltar. Escolhido
   cripto-at-rest em vez de plaintext+máscara — credencial de egress é segredo.

2. **Geo best-effort, DESACOPLADA da saúde:** o teste disca por `ip-api.com` (IP
   de saída + cidade/país numa só chamada). **Erro de transporte → proxy ruim;
   qualquer resposta HTTP → proxy OK** (mesmo 429/500 prova que o proxy roteia).
   Geo é enriquecimento; falha do `ip-api` NUNCA rebaixa um proxy — evita que um
   outage de terceiro grátis derrube o pool inteiro.

3. **SOCKS5 via `SetProxyAddress` no engine:** helper do whatsmeow que despacha
   `socks5://` ao dialer SOCKS (não só ao `http.Transport`), garantindo que o
   WEBSOCKET de controle também roteie pelo proxy (senão vaza o IP real). Schemes
   restritos a `http://`/`socks5://` (https não suportado — whatsmeow #700).

4. **Proxy mitiga o sinal de REDE/IP, não o estrutural:** complementa o ADR 0016,
   não o substitui. Não resolve o fingerprint whatsmeow nem o passkey.

## Alternativas consideradas
- **Plaintext + máscara:** mais simples, sem key-management, mas expõe a
  credencial em repouso. Rejeitado — dono pediu cripto-at-rest.
- **Teste = só "ip-api retornou ok":** acoplava saúde a um terceiro grátis sem
  SLA — `ip-api` fora rebaixaria proxies BONS, derrubando reconexões. Rejeitado.
- **`SetProxy` cru para socks5:** funciona no `http.Transport`, mas o websocket
  do whatsmeow precisa do dialer — risco de IP-leak no canal de controle. Rejeitado.
- **Echo interno de IP (sem ip-api):** mais robusto; documentado como evolução
  futura (overkill no MVP).

## Consequências
- **Anti-ban de rede:** IP sticky por número, rotação por grupo, isolamento de IP
  queimado (manual + automático no ban).
- **Nova dependência operacional:** `PROXY_ENC_KEY` obrigatório em prod (trocar
  invalida segredos); `ip-api.com` como fonte de geo (best-effort).
- **Invariante de código:** toda escrita pós-`auth.GetScoped` exige
  `Session(NewDB:true)` — codificado no CLAUDE.md por ter causado bug em produção.
- **Fail-closed sagrado:** conexão com proxy inutilizável não conecta; ao
  desvincular em modo grupo, zerar só `proxyId` (nunca `proxyMode`).
- Engine permanece **adapter burro** (cripto/geo/rotação no business).
