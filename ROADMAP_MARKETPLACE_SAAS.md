# ROADMAP — Marketplace Hub + Plugin SaaS

Atualizado em: 2026-02-18
Owner: Ronaldo + Antigravity

## Objetivos

1. Unificar versão exibida (instância x hub).
2. Hub com gestão de assets de plugin (imagem + pacote de instalação).
3. Distribuição de plugins via repositório `watink-bussines`.
4. Garantir fluxo SaaS multi-tenant: licença na instância + ativação por tenant com quota.
5. Melhorar UX operacional do painel do Hub.

---

## Fase 1 — Correções críticas (curto prazo)

### 1.1 Versão única entre Watink e Hub
- [ ] Definir **source of truth** da versão do core (release tag `vX.Y.Z` do `watink-bussines`).
- [ ] Backend enviar versão real no heartbeat/register (não usar fallback estático `2.0.0-business`).
- [ ] Hub exibir:
  - versão reportada da instância,
  - última versão disponível,
  - status (atualizado / desatualizado).

### 1.2 Setup inicial protegido
- [x] Bloquear setup quando já existir tenant/user.
- [ ] Tarefa de saneamento em dev: remover `Default Tenant` quando vazio (script seguro).

---

## Fase 2 — Gestão de plugins no Hub (médio prazo)

### 2.1 Imagens de plugin
- [ ] Adicionar upload de imagem no admin do hub (`/api/v1/admin/plugins/:id/image`).
- [ ] Armazenar em diretório persistente (`data/plugins-assets/images`).
- [ ] Expor URL pública estável para frontend da instância.

### 2.2 Arquivos de plugin (bundle)
- [ ] Adicionar upload de pacote (`zip/tgz`) por plugin no hub.
- [ ] Armazenar metadata: versão, hash SHA256, tamanho, data.
- [ ] Endpoint de download autenticado/assinado para instalação.
- [ ] Endpoint de catálogo com `artifact_url` + `sha256`.

### 2.3 Onde guardar os plugins
- [ ] Estruturar pasta no repo `alltomatos/watink-bussines`:
  - `plugins/<slug>/<version>/artifact.zip`
  - `plugins/<slug>/manifest.json`
- [ ] Integrar publish automático via GitHub Release/Assets.

---

## Fase 3 — Plugin SaaS multi-tenant (regra de negócio)

### 3.1 Entitlements da instância
- [x] Hub já retorna `entitlements` (`plan_name`, `premium_limit`, `saas_enabled`, etc.).
- [ ] Versionar payload de entitlement para evitar drift futuro.

### 3.2 Ativação por tenant
- [ ] No plugin SaaS, implementar quota por tenant (`premium_limit`).
- [ ] Regra operacional:
  - licença de plugin na instância habilita plugin no catálogo dos tenants,
  - cada tenant ativa localmente até o limite do plano,
  - `unlock_all` mantém exceção operacional.
- [ ] Retorno padronizado de erro (`QUOTA_EXCEEDED`, `PLAN_REQUIRED`, etc.).

### 3.3 Sincronização de estado
- [ ] Job de reconciliação diária entre licenças da instância e ativações por tenant.
- [ ] Painel de inconsistências no Hub.

---

## Fase 4 — UX do Hub (melhoria contínua)

- [ ] Dashboard de instâncias com filtros (versão, status, plano, SaaS ativo).
- [ ] Coluna de ação rápida: "abrir instância".
- [ ] Cartão por instância com:
  - URL,
  - super admin,
  - plano,
  - versão,
  - saúde de heartbeat.
- [ ] Melhorar visual de tabela e estados vazios.

---

## Entregáveis sugeridos (sprints)

### Sprint A (rápida)
- versão unificada,
- saneamento de tenant default,
- UX de versão no Hub.

### Sprint B
- upload de imagem de plugin,
- upload/download de artifact,
- persistência de metadados + hash.

### Sprint C
- enforcement completo no plugin SaaS por tenant,
- reconciliação e observabilidade.

---

## Critérios de aceite

1. Nova instalação não apresenta erro de setup/boot.
2. Hub mostra a mesma versão do core exibida no monitor da instância.
3. Admin consegue cadastrar plugin com imagem e arquivo instalável.
4. Tenant só ativa plugin dentro da quota do plano quando SaaS ativo.
5. Operação consegue auditar e resolver inconsistências sem acesso manual ao banco.
