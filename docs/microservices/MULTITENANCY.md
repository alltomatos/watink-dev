# Multitenancy (Multi-inquilino)

O sistema foi projetado para suportar múltiplos clientes (Tenants) simultaneamente, compartilhando a mesma infraestrutura mas mantendo isolamento lógico de dados.

## Estratégia de Isolamento

### 1. Banco de Dados (Row-Level Security)
O isolamento é garantido nativamente pelo PostgreSQL (RLS).
- **Implementação**: Migration `20251220132350-enable-rls-policies.ts`.
- **Mecanismo**: Políticas (`CREATE POLICY`) validam o `tenantId` da sessão atual. Se um Service tentar ler dados de outro tenant, o banco retornará zero resultados, mesmo se a cláusula `WHERE` for omitida no código.
- **Segurança**: Isso fornece uma camada de defesa em profundidade caso a aplicação falhe em filtrar os dados.

### 2. Autenticação (JWT)
O `tenantId` é inserido no Payload do token JWT no momento do login.
- O Middleware `isAuth` extrai este ID e o anexa à requisição.
- Isso previne que um usuário autenticado acesse rotas ou dados de outro tenant, pois o ID não vem do corpo da requisição (modificável), mas do token assinado.

### 3. Engine & Mensageria (RabbitMQ)
O isolamento no processamento de mensagens é garantido pelas chaves de roteamento (Routing Keys):
- **Comandos**: `wbot.{tenantId}.{sessionId}.command`
- **Eventos**: `wbot.{tenantId}.{sessionId}.event`

Isso permite que workers específicos possam, teoricamente, ser escalados para atender apenas determinados tenants, ou que um pool genérico de workers atenda a todos, sabendo sempre a origem/destino da mensagem.

### 4. Real-Time (Socket.io)
**Ponto de Atenção**: Atualmente, eventos globais de sistema (ex: `io.emit("whatsappSession")`) podem ser transmitidos em broadcast.
- **Melhoria Recomendada**: Implementar "Rooms" por Tenant (`io.to(tenantId).emit(...)`) para garantir que eventos de criação de usuários, filas e conexões sejam entregues estritamente para usuários do mesmo tenant.
- **Status Atual**: O envio de mensagens de chat (`appMessage`) já é isolado por Salas de Ticket (`io.to(ticketId)`), garantindo privacidade nas conversas.

## Desafios e Considerações
- **Vazamento de Dados**: A segurança depende estritamente da implementação correta do filtro `where: { tenantId }` em todos os Services.
- **Escalabilidade**: O modelo de banco compartilhado é eficiente para custos, mas pode exigir sharding (separação de DBs) para tenants Enterprise com alto volume.
