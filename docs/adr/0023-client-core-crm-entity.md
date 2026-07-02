# Client como entidade core de CRM, separada de Contact por transitividade

O plugin licenciado "Gestão de Clientes" (`type: "pro"`, rota `/api/clientes`) tinha apenas
GET/POST, um model raso (`Name/Document/Email/Phone`) e nenhum vínculo com `Contact` — o
frontend (`frontend/src/pages/Clients/`) já implementava PF/PJ, múltiplos endereços e múltiplos
contatos vinculados, mas contra uma API (`/clients`) que nunca existiu no backend.

Decidimos promover `Client` para o core do business (sai do sistema de plugin, ganha RLS
automática via `auth.GetScoped`), como capability central do produto — não mais um add-on pago
opcional — refletindo a estratégia de o Watink assumir características de CRM/ERP.

`Contact` (identidade WhatsApp) e `Client` (CRM) permanecem entidades distintas e não se fundem:
um Contact pode existir e gerar Tickets sem nunca ser vinculado a um Client (alguém manda
mensagem sem estar cadastrado). O vínculo é `Contact.ClientID *int` (nullable, um Contact
pertence a no máximo um Client) — sempre feito manualmente por um agente, sem heurística
automática de matching nesta fase.

`Ticket` e `Deal` **não** ganham um `ClientID` desnormalizado — o Client de um Ticket é sempre
resolvido transitivamente via `Ticket.Contact.ClientID`. Isso é deliberado: um mesmo Client pode
ter múltiplos Contacts ao longo do tempo (ex.: contato "perdido" e o cliente retomando contato
por outro número) e o histórico consolidado do Client (`JOIN Contacts WHERE clientId = ?`) deve
incluir automaticamente os Tickets/Deals de todos os Contacts já vinculados — sem depender de
backfill toda vez que um vínculo Contact→Client for criado ou corrigido. O custo é um JOIN extra
em toda consulta "visão 360º do Client"; a alternativa (desnormalizar) foi descartada por criar
uma segunda fonte de verdade sujeita a dessincronia, o mesmo tipo de bug já visto neste projeto
com reuso indevido do `db` escopado do GORM.

Revincular um Contact que já pertence a outro Client é permitido (não bloqueado), mediante
confirmação explícita do agente — cenário legítimo e recorrente de correção de cadastro, não
um erro a ser proibido.

`Client.Document` (CPF/CNPJ) é cifrado at-rest, seguindo o mesmo padrão de
[proxy anti-ban](../agents/proxy.md) (`cryptobox`, fail-closed se a chave faltar). `Client` usa
soft-delete (`gorm.DeletedAt`) — nunca hard delete, ao contrário do `Contact.Delete()` atual.

**Consequences:**
- A rota antiga do plugin (`/api/clientes`, GET/POST) é removida — não coexiste com o novo core.
- Toda tela de "histórico do cliente" precisa fazer o JOIN via Contacts; não há atalho por
  `Ticket.ClientID`.
- Ao promover para core, `Client` deixa de ser uma feature monetizável isoladamente via
  Marketplace (ver [ADR 0003](0003-plugin-builtin-flag.md) sobre plugins built-in).
