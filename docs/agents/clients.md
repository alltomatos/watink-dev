# Clientes (CRM) — Contexto para Agentes

## Responsabilidade
Entidade de CRM (`Client`, Pessoa Física ou Jurídica) no core do business —
agrega Contacts e Addresses, aproximando o Watink de um CRM/ERP. Substitui o
antigo plugin licenciado "Gestão de Clientes" (`type: "pro"`, rota
`/api/clientes`), que expunha apenas GET/POST e não tinha vínculo real com
`Contact`. Ver ADR 0023 para a decisão de promoção a core e o contrato de
transitividade.

## Arquitetura / fluxo
- **Backend:** `business/internal/models/client.go` (core, `AutoMigrate` no
  bootstrap principal — não mais no plugin). Controller usa
  `auth.GetScoped(c, "Clients")`, nunca `c.Get("tenantId")` bruto.
- **Endereço:** CEP preenchido pelo usuário → backend chama ViaCEP (URL
  configurável em Settings do tenant, pré-preenchida com o default) para
  resolver `street/neighborhood/city/state` → ao salvar o Client, o backend
  chama Nominatim/OpenStreetMap para geocoding e grava `geog` (PostGIS). O
  frontend NUNCA chama ViaCEP diretamente (era o comportamento antigo,
  client-side — descontinuado).
- **Frontend:** tela `Clientes` segue o padrão visual em abas da Central de
  Acessos (Dados Básicos / Contatos / Endereços), substituindo a versão atual
  desconectada do backend.
- **Vínculo com outros módulos:** Ticket/Deal continuam referenciando só
  `Contact` — Client é sempre alcançado transitivamente
  (`Ticket.Contact.ClientID`). FlowBuilder enriquece contexto de nós
  `agent`/`knowledge` com dados do Client quando o `subjectType=contact`
  resolver um `ClientID` não-nulo.

## Modelo de dados
- `Client`: `id`, `type` (pf|pj), `name` (nome civil/razão social),
  `socialName *string` (exclusivo PF, LGPD — Decreto 8.727/2016), `document`
  (CPF/CNPJ, **cifrado at-rest**, mesmo padrão `cryptobox` do módulo Proxy),
  `email`, `phone`, `notes`, `tenantId`, `deletedAt` (soft-delete).
- `ClientAddress`: `clientId`, `label`, `zipCode`, `street`, `number`,
  `complement`, `neighborhood`, `city`, `state`, `isPrimary`,
  `geog geography(Point,4326)` (PostGIS, nullable — preenchido best-effort).
- `Contact.ClientID *int` (nullable, FK) — um Contact pertence a no máximo um
  Client. Vínculo sempre manual (UI "Vincular Existente" / "Tornar Cliente").

## Contratos
- **Transitividade (ADR 0023):** histórico do Client (`GET
  /clients/:id/history` ou equivalente) é `SELECT ... WHERE contactId IN
  (SELECT id FROM Contacts WHERE clientId = ?)` sobre Tickets/Deals — nunca um
  `ClientID` desnormalizado em Ticket/Deal.
- **Vínculo Contact→Client:** sempre manual, nunca heurística automática
  nesta fase. Revincular um Contact já vinculado a outro Client é permitido
  mediante confirmação explícita do agente (não é bloqueado).
- **Nome Social:** quando `Client.SocialName` está preenchido, toda
  superfície que hoje exibe `Contact.Name`/`Client.Name` (lista de Tickets,
  bolha de chat, cabeçalho do Ticket, notificações, Pipeline/Deal,
  Protocol/Helpdesk, relatórios) passa a exibir o nome social. Nome civil só
  aparece em documento fiscal (quando existir) e na própria tela de edição do
  cadastro, nunca lado a lado com o nome social.
- **Endereço/CEP:** lookup via `GET /addresses/lookup?cep=` no backend
  (nunca client-side); URL do provedor configurável em Settings
  (`addressLookupProvider`/`addressLookupBaseUrl`), pré-preenchida com
  ViaCEP.
- **Geocoding:** Nominatim/OpenStreetMap, disparado no momento do save do
  Client. **Best-effort** — falha de geocoding nunca bloqueia o salvamento
  (`geog` fica `NULL`), seguindo o mesmo padrão de "falha de geo não invalida"
  já usado no módulo Proxy.
- **Documento:** CPF/CNPJ cifrado at-rest (`cryptobox`), nunca em log nem em
  resposta de API em texto plano fora do necessário.
- **Delete:** sempre soft-delete (`DeletedAt`) — nunca hard delete.

## Edge cases
- **Contato "perdido" reaparecendo por outro número:** o agente vincula
  manualmente o novo Contact ao Client existente — o histórico consolidado
  passa a incluir automaticamente os Tickets/Deals do Contact antigo e do
  novo, via transitividade. Não requer nenhuma migração/backfill de dado.
- **Revincular Contact já vinculado a outro Client:** permitido, com
  confirmação explícita ("Este contato pertence a Cliente Y. Deseja mover
  para Cliente X?") — nunca um bloqueio duro.
- **E-mail duplicado entre Contacts de Clients diferentes:** não é uma
  violação — não há unicidade de e-mail a validar entre Clients.
- **Geocoding indisponível/CEP não localizado pelo Nominatim:** Client salva
  normalmente, `geog = NULL`.
- **ViaCEP retorna erro/CEP inexistente:** UI informa erro, mas os demais
  campos do endereço continuam editáveis manualmente (usuário pode preencher
  à mão).

## Limites (o que NÃO resolve nesta fase)
- Sem matching automático de Contact→Client (por e-mail/documento) — roadmap
  futuro, se necessário.
- Sem anonimização automática por política de retenção, sem fluxo
  self-service de "direito ao esquecimento", sem exportação/portabilidade de
  dados estruturada — LGPD cobre soft-delete + documento cifrado +
  tratamento de nome social nesta fase; o restante é roadmap.
- Consultas por raio geográfico (PostGIS `ST_DWithin` etc.) ficam preparadas
  no schema (`geog`) mas a feature de busca por raio em si não é objeto desta
  fase.

## Ops
- Rota antiga do plugin (`GET/POST /api/clientes`) é removida — não deve
  coexistir com o novo core.
- Migração via GORM AutoMigrate, incluído no bootstrap principal
  (`database.Migrate()`), não mais em `ClientesPlugin.OnInstall`.
- Nominatim tem rate-limit público agressivo (~1 req/s) — geocoding no save
  deve ser assíncrono/tolerante a lentidão, nunca no caminho crítico que
  bloqueia a resposta ao usuário por muito tempo.

## Critério de sucesso (invariantes verificáveis)
`POST/PUT /clients` persiste PF/PJ com nome social e documento cifrado ·
endereço resolve via ViaCEP configurável + geocoding Nominatim best-effort ·
vínculo Contact→Client sempre manual, com confirmação ao revincular ·
histórico do Client agrega Tickets/Deals de todos os Contacts vinculados via
transitividade · nome social substitui o nome civil em toda superfície de
exibição · delete é soft-delete · rota antiga `/api/clientes` removida · tela
`Clientes` funcional ponta a ponta com o mesmo padrão visual em abas da
Central de Acessos.
