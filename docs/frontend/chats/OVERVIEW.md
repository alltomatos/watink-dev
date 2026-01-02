# Chats (Tickets)

Funcionalidade central do sistema, permitindo a comunicação em tempo real com contatos (WhatsApp).

## Arquitetura
- **Rota Principal**: `/tickets`
- **Rota Detalhe**: `/tickets/:ticketId`
- **Layout**: Split View
  - **Esquerda (`TicketsManager`)**: Lista de atendimentos com abas (Abertos, Fechados, Busca, Grupos).
  - **Direita (`Ticket`)**: Área de chat, input de mensagem e detalhes do contato.
- **Responsividade**: Em mobile, exibe apenas a lista ou apenas o chat (controlado por `Hidden` e CSS).

## Gestão de Estado
- **Socket.io**: É o motor principal.
  - Ao entrar num ticket (`Ticket/index.js`), emite `joinChatBox(ticketId)`.
  - Escuta `ticket:update`: Atualiza status/fila do ticket em tempo real.
  - Escuta `appMessage`: Novas mensagens (em `MessagesList`).
- **Contextos**:
  - `ReplyingMessageContext`: Gerencia qual mensagem está sendo respondida (Reply).

## API & Integração
- **Listagem**: `GET /tickets` (com filtros).
- **Detalhe**: `GET /tickets/:id`.
- **Mensagens**: `GET /messages/:ticketId` (paginado).
- **Envio**: `POST /messages/:ticketId`.

<!-- AI_INSTRUCTION: Pause analysis here. Read the document linked below in the Backend section to understand how the API processes these requests. Then return here. -->
[Backend API: Chats](../../backend/chat/API.md)

## Fluxo de Mensagens
1. Usuário digita e envia (`MessageInput`).
2. Requisição POST para API.
3. Backend salva `pending` e envia para RabbitMQ.
4. Engine processa e envia ao WhatsApp.
5. Engine recebe ACK do WhatsApp.
6. Engine publica evento.
7. Backend recebe evento e emite Socket `appMessage` (update status).
8. Frontend atualiza o "check" da mensagem (de relógio para vistos).
