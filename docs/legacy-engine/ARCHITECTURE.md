# Arquitetura do Engine

## Componentes Principais

### 1. RabbitMQ Wrapper (`rabbitmq.ts`)
Responsável por estabelecer a conexão com o Message Broker.
- Mantém canais abertos para consumo e publicação.
- Declara exchanges (`wbot.commands`, `wbot.events`).
- Gerencia a fila temporária exclusiva para a instância do engine.

### 2. SessionManager (`session.ts`)
O cérebro do microsserviço.
- Mantém um `Map<sessionId, WhaileysSession>` em memória.
- Processa cada comando recebido do RabbitMQ via `handleCommand`.
- Gerencia o ciclo de vida do socket da biblioteca `whaileys`.
- Integração com **Redis** para armazenamento temporário de mensagens (`Transient Store`) garantindo persistência para mecanismos de retentativa.
- Escuta eventos do socket (`connection.update`, `messages.upsert`) e os transforma em eventos AMQP.

### 3. Sistema de Arquivos
- Credenciais de autenticação são salvas em `.sessions_auth/session-{id}/`.
- É crucial que este diretório seja persistente (Volume Docker) para evitar desconexões ao reiniciar o container.

### 4. Redis (Transient Store)
- **Função**: Persistência de curto prazo para mensagens.
- **Uso**: Quando uma mensagem chega (`messages.upsert`), ela é salva no Redis com TTL de 24h. Isso permite que o mecanismo de `retry` recupere o conteúdo da mensagem mesmo se o processo Node.js reiniciar.
- **Chave**: `wbot:msg:{jid}:{id}`.

## Fluxo de Dados

### Envio de Mensagem
1. **Comando**: Recebe `message.send.text` via RabbitMQ.
2. **Processamento**: `SessionManager` recupera a sessão ativa.
3. **Execução**: Chama `socket.sendMessage` da lib `whaileys`.
4. **Retorno**: A lib processa o envio internamente.
5. **Evento**: Quando o WhatsApp confirma o envio/entrega, o evento `messages.update` dispara, gerando um `message.ack` para o RabbitMQ.

### Recebimento de Mensagem
1. **Socket**: Recebe dados criptografados do WhatsApp.
2. **Evento**: Dispara `messages.upsert`.
3. **Processamento**: `SessionManager` verifica se é mensagem nova (não duplicada).
4. **Publicação**: Publica evento `message.upsert` na fila `wbot.events`.
