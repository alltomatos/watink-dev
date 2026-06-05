# Event-Driven Communication via RabbitMQ

Business e Engine desacoplados por exchanges `wbot.commands` (outbound) e `wbot.events` (inbound) com routing keys `wbot.{tenantId}.{sessionId}.{domainEvent}`. Alternativa considerada: gRPC síncrono (rejeitado por acoplamento temporal e impossibilidade de retry assíncrono). Consequência:DLQ com retry exponencial (3 retries, backoff 5s–5min) para resiliência; Engine deve ser idempotente ao consumir comandos; ordenação de mensagens preservada apenas dentro da mesma routing key.

Status: accepted
