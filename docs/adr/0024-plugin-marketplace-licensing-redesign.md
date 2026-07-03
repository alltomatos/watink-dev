# Redesenho do sistema de plugins: de flag no banco para entitlement licenciado via Hub

O sistema de plugins do core era, na prática, um arcabouço vazio. A documentação prometia
"validação de licença server-side é autoridade", mas o código não validava nada: `GetStatus()`
retornava `StatusActive` hardcoded (`business/internal/plugins/manager.go:28`), os endpoints
`POST /plugins/:slug/activate|deactivate` que o frontend chama **não existiam** (503),
`/plugins/installed` sempre devolvia `[]`, `PluginInstallations` não tinha migration (só existia
em `testutil`), e o `plugin-manager` local escrevia um `.license_status.json` que o `business`
nunca lia. A flag local — que também não era lida — seria a única "autoridade" se fosse. Para
software que roda em VPS de terceiros, isso não sustenta um modelo comercial.

Decidimos redesenhar o sistema em torno de um **Hub central** (novo projeto `watink-ecosistema/hub`,
ADR 0001 de lá) como autoridade única de catálogo e licença, com o core no papel de **cliente**.
As decisões estruturais:

**Fronteira core vs plugin = ativação.** É plugin o que precisa ser **ativado via Marketplace**
(`free` ou `pro`); é core o que está sempre-ligado. Isso dá a regra geral que faltava desde o
ADR 0023 (por que "Clientes" virou core) e determina que o `saas-plugin` — ponte de control
plane, sempre-ligada — **sai do sistema de plugins** (é redundante com o `watink-saas`, e por
isso removido). Plugins reais que restam: `helpdesk` e `webchat`.

**Trilho duplo.** O comercial do tenant (mensalidade, suspensão) continua no `watink-saas` via
push+snapshot. A licença de **plugin** é domínio do Hub, entregue por Hub → `plugin-manager`
local → `business`. O `watink-saas` não intermedia licença de plugin. Consequência boa: o
`plugin-manager` local, hoje um esqueleto morto, vira o elo real que faltava.

**Licença de instância + alocação por tenant.** O Hub licencia a **instalação** (`instanceId`)
com um **teto** de tenants; o core decide **quais** tenants recebem o plugin (`PluginInstallations`),
respeitando `alocados < tenantCap`. O Hub nunca conhece os `tenantId` de uma instalação — só
contadores agregados (Hub ADR 0003).

**Licença = token assinado, não flag.** O Hub emite um token Ed25519 de curta duração
(`exp = iat + TTL`, default 48h) que o `plugin-manager` valida **offline** pela chave pública
(Hub ADR 0002); o `business` consulta o `plugin-manager` (pull + cache ~60s), **nunca o Hub
direto**. O TTL é o grace: Hub offline mantém o plugin até `exp`; depois, degradação. Fail-closed
nas ações de crescimento (ativar novo plugin/tenant) quando o status é indeterminado após o grace.

**Degradação configurável por plugin.** Quando a licença `pro` expira, o plugin entra em
`readonly` (vê dados, não escreve) ou `blocked` (402) conforme o `degradeMode` declarado no
**manifesto do plugin** — reativando os estados `StatusReadOnly`/`StatusBlocked` do SDK, hoje
mortos. Preserva dados (coerente com "suspensão nunca apaga" do watink-saas).

Este ADR **supera o ADR 0003** (`plugin-builtin-flag`) no que toca à autoridade: a ativação
continua sem download de código (plugins seguem embarcados na imagem — o ponto anti-supply-chain
do 0003 permanece válido), mas a **flag no banco deixa de ser autoridade** — ela é apenas o
registro de **alocação**; a autoridade de licença é o token assinado do Hub.

**Consequences:**
- `PluginInstallations` ganha migration real (`unique(tenantId, pluginId)`, `activatedAt/By`),
  deixando de existir só em `testutil`. **Não** se cria tabela de licença no core — a licença
  vive no `plugin-manager`.
- Implementar as rotas ausentes `POST /plugins/:slug/activate|deactivate`, tornar
  `/plugins/installed` e `/catalog` reais, e trocar `GetStatus()` hardcoded por cruzamento
  licença × alocação.
- `pkg/licensetoken` (verificador Ed25519) é portado do Hub para o `plugin-manager`; manter
  paridade com o Hub é um invariant de release.
- O `saas-plugin` é removido; o `marketplace-hub` (Node) embrionário é descontinuado (absorvido
  pelo Hub).
- Contexto completo e plano de tarefas em [`docs/agents/plugins.md`](../agents/plugins.md);
  contrato servidor em `watink-ecosistema/hub/docs/integration-clients.md` § A.
