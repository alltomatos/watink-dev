# Componentes de Chat

## Estruturais
- `Ticket/index.js`: Wrapper principal da tela de chat.
- `TicketsManager`: Sidebar gerenciadora de listas de tickets.
- `TicketHeader`: Cabeçalho do chat (foto, nome, botões de ação).
- `TicketInfo`: Exibe informações clicáveis para abrir o Drawer.

## Interativos
- `MessageInput`: Campo de texto, emojis, anexo, gravação de áudio.
  - Lida com `typing` status (socket).
  - Lida com gravação (mic-recorder-to-mp3).
- `MessagesList`: Renderiza a lista de mensagens.
  - Scroll automático para o final (`useRef`).
  - Paginação (load more on scroll up).
- `TicketActionButtons`: Botões para Resolver, Reabrir, Devolver fila.

## Auxiliares
- `ContactDrawer`: Sidebar direita com detalhes do contato e edição.
- `ReplyMessageProvider`: Contexto para saber qual mensagem o usuário está respondendo.
