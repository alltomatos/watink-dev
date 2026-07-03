# Módulo: Plugins (Marketplace + Licenciamento)

> Documento de contexto para agentes. Descreve o **redesenho** do sistema de plugins do core (ADR 0024) — de "flag no banco" para **entitlement licenciado via Hub**. Contraparte servidora: repositório `hub` (Watink Hub), `docs/integration-clients.md` § Cliente A.

## Responsabilidade

Permitir que features **opt-in** (plugins) sejam **ativadas via Marketplace** por tenant, com gating real de licença para as pagas. O core é o **cliente** do licenciamento; a autoridade de catálogo/licença é o **Hub**, alcançado sempre pelo `plugin-manager` local — nunca direto.

**Fronteira core vs plugin (a regra que evita a fronteira derreter):** é **plugin** o que precisa ser **ativado via Marketplace** (seja `free` ou `pro`). É **core** o que está sempre-ligado e não se ativa (atendimento, CRM/Clientes, Pipeline, FlowBuilder, RAG). Foi por isso que "Clientes" virou core (ADR 0023) e o antigo `saas-plugin` foi removido (é infraestrutura de control plane, não add-on).

## Arquitetura — trilho duplo (ADR 0024 + Hub ADR 0001)

```
Hub (nuvem, autoridade) ──licença de plugin (token Ed25519)──▶ plugin-manager local :8081
                                                                      │  (verifica assinatura offline,
                                                                      │   cacheia com grace = exp do token)
                                                                      ▼
                                             business :8082  ──pull + cache ~60s──▶ status por plugin
                                                                      │
                                                       PluginInstallations (alocação por tenant)
```

- **Comercial do tenant** (mensalidade/suspensão) é do `watink-saas` — **não** se mistura com licença de plugin.
- **business nunca fala com o Hub direto**: sempre consulta o `plugin-manager` local (Decisão 2/4 do ADR 0024).
- Licença é **por instância + teto de tenants**; a **alocação nominal** (qual tenant usa) é do core (Hub ADR 0003).

## Modelo de dados

**No core (migration real — hoje `PluginInstallations` só existe em `testutil`):**
```
PluginInstallations
  id          uuid PK
  tenantId    uuid       -- alocação: qual tenant
  pluginId    text       -- = pluginSlug do catálogo do Hub
  active      bool
  activatedAt timestamptz
  activatedBy uuid       -- User que ativou (auditoria)
  UNIQUE(tenantId, pluginId)
  INDEX(tenantId)
```
**NÃO** criar tabela de licença no core: a licença vive no `plugin-manager` (cache do token do Hub). O core só guarda a **alocação**. `activatedAt/activatedBy` são para auditoria da ativação, não licença.

**No plugin-manager (cache local):** tokens de licença assinados por plugin (`{status, tenantCap, exp}` derivado), chaves públicas do Hub, `instanceId` (fingerprint `INST-{ts}-{hash}`).

## Fluxos

**Ativar plugin `free`:** Marketplace → `POST /plugins/:slug/activate` → `business` cria `PluginInstallations(active=true)`. **Não toca o Hub.**

**Ativar plugin `pro`:** Marketplace → `POST /plugins/:slug/activate` → `business` pergunta ao `plugin-manager`: a instância tem licença válida do plugin e `alocados < tenantCap`? → **sim**: aloca (`active=true`); **sem licença**: retorna `checkoutUrl` (adquirir no Hub); **teto cheio**: 402 + sugestão de upgrade.

**Gating em runtime:** toda rota de plugin passa por `PluginRegistry.GetStatus(slug, tenantId)` que cruza **licença** (plugin-manager) × **alocação** (`PluginInstallations`):
- `active` → segue; `readonly` → só GET (bloqueia escrita); `blocked`/`unlicensed` → 402.

**Expiração (após grace = `exp` do token):** aplica o `degradeMode` **do manifesto do plugin** (`readonly` ou `blocked`) — configurável por plugin. Usa os estados `StatusReadOnly`/`StatusBlocked` do SDK que hoje existem mas estão mortos.

## Contratos

- **business → plugin-manager** (interno, pull + cache ~60s): `GET /internal/licenses` → por plugin: `{status: active|readonly|blocked|unlicensed, tenantCap, exp}`. Verificação Ed25519 via `pkg/licensetoken` portado do Hub.
- **plugin-manager → Hub**: `POST /api/v1/plugins/heartbeat` e `GET /catalog` — ver `hub/docs/integration-clients.md` § A.1/A.2. Fingerprint, tokens, chaves públicas, `revocationList`.
- **Frontend → business**: `GET /plugins/catalog` (proxy do catálogo via pm — mata o 503 fixo), `GET /plugins/installed` (real: join `PluginInstallations` × status), `POST /plugins/:slug/activate|deactivate` (hoje **ausentes** — o frontend já os chama).

## Estado atual vs alvo (o que está quebrado)

| Sintoma atual | Arquivo | Alvo |
|---|---|---|
| `GetStatus()` retorna `StatusActive` hardcoded | `business/internal/plugins/manager.go:28` | Cruzar licença (pm) × alocação (`PluginInstallations`) |
| `activate`/`deactivate` inexistem (frontend chama, dá 503) | `business/internal/routes/routes.go:91` | Implementar as rotas + alocação com teto |
| `/plugins/installed` sempre `[]` | `business/internal/controllers/plugin_manager.go:38` | Refletir `PluginInstallations` reais |
| `/plugins/catalog` sempre 503 | `plugin_manager.go` | Proxy do catálogo do Hub via pm |
| `.license_status.json` do pm nunca é lido pelo business | `plugin-manager/main.go:134` | Substituir por `GET /internal/licenses` verificado |
| `PluginInstallations` sem migration (só `testutil`) | `business/internal/testutil/db.go:73` | Migration real + índices |
| Heartbeat do pm não valida assinatura | `plugin-manager/main.go:120` | `pkg/licensetoken.Verify` (Ed25519) + grace por `exp` |
| `saas-plugin` redundante com watink-saas | `business/internal/plugins/saas.go` | **Remover** (control plane é o watink-saas) |

## Edge cases

- **Hub offline:** token vale até `exp` (grace natural). Depois, `degradeMode`. Ativar novo plugin/tenant (crescimento) é **fail-closed** se o status estiver indeterminado.
- **plugin-manager offline/reiniciando:** o business usa o cache de ~60s; sem resposta além disso, ações de crescimento fail-closed; operação corrente segue até o cache/token expirar.
- **Teto atingido:** alocação nova bloqueada (402); alocações existentes seguem.
- **Downgrade/revogação:** Hub para de renovar (lazy) → expira em ≤ TTL; ou `revocationList` (imediata).
- **Plugin `free` desativado:** `deactivate` remove a alocação; sem efeito no Hub.
- **Token adulterado/expirado:** `pkg/licensetoken.Verify` rejeita → `unlicensed` → 402. Nunca reportar válido sem verificar assinatura + `exp`.
- **Chave pública desatualizada (pós-rotação):** o heartbeat entrega o conjunto de públicas válidas; a embarcada é só bootstrap.

## Riscos

- **Chave privada do Hub** é o segredo mais crítico do ecossistema (forja qualquer licença). Não vive no core — só a pública. Ver Hub ADR 0002.
- **Paridade `pkg/licensetoken`** Hub ↔ verificador do plugin-manager: um contrato divergente invalida licenças no mundo. Invariant de release.
- **Instância adulterada** (root na VPS) pode tentar ignorar o teto/gating: a defesa é a licença assinada (carrega `cap`) + o binário do core; adulterar exige recompilar, não só editar o banco. Telemetria (contadores no heartbeat) detecta divergência.
- **Reintroduzir acoplamento**: não voltar a ler flag local como autoridade nem a chamar o Hub direto do business.

## Critério de sucesso

1. Ativar um plugin `free` no Marketplace o faz aparecer na sidebar e responder suas rotas; desativar reverte — tudo por tenant.
2. Ativar um plugin `pro` sem licença retorna `checkoutUrl`; com licença e teto livre, aloca e funciona; com teto cheio, 402.
3. Revogar a licença no Hub degrada o plugin (`readonly`/`blocked` conforme manifesto) em ≤ `LICENSE_TTL`, sem apagar dados do tenant.
4. Hub e plugin-manager offline não derrubam plugins já ativos dentro do grace; ações de crescimento ficam fail-closed.
5. Token adulterado/expirado nunca libera a rota. `pkg/licensetoken` do Hub e o verificador do core aceitam/rejeitam identicamente (teste de paridade).
6. Nenhum caminho lê `PluginInstallations.active` como autoridade de licença nem chama o Hub direto do business.

## Invariants

- Sempre `auth.GetScoped(c, "Plugins")` em controllers — nunca `c.Get("tenantId")` bruto. Escritas/agregações em `Session(NewDB:true)` (armadilha do `db` escopado do GORM).
- `business` consulta **só** o `plugin-manager`; nunca o Hub direto.
- Licença = **token assinado verificado**, nunca flag local nem "confiar no corpo do heartbeat".
- Plugin `free` não toca o Hub; `pro` exige token válido + teto.
- Teto aplicado na **alocação** (fail-closed em crescimento); alocação nominal só no core.
- `degradeMode` vem do **manifesto do plugin** (por plugin), não global.

## O que NÃO fazer

- Não ler `PluginInstallations.active` como autoridade de licença — é só alocação.
- Não chamar o Hub a partir do `business` — sempre via `plugin-manager`.
- Não reportar licença válida sem verificar assinatura Ed25519 + `exp`.
- Não montar teto/licença no frontend — o frontend só envia `slug + ticket/tenant` e reflete o status.
- Não reintroduzir `saas-plugin` (control plane é o watink-saas) nem o `marketplace-hub` Node.
- Não distribuir código de plugin dinamicamente (supply chain — ADR 0003 original mantido nesse ponto). Plugins são embarcados; o que se licencia é o direito de uso.
- Não bloquear ativação de `free` por causa do Hub.

## Referências

- ADR 0024 (redesenho) · ADR 0003 (superado no que diz respeito à flag) · ADR 0023 (Clientes → core)
- Hub: `watink-ecosistema/hub/docs/integration-clients.md` (§ A), `hub/docs/adr/0001-0003`
- watink-saas: ADR 0006 (licença de produto — trilho irmão, não confundir)
