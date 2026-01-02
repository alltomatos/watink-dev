# Arquitetura do Frontend

## Tecnologias
- **Build Tool**: Vite
- **Framework**: React 17
- **UI Library**: Material UI v4
- **State Management**: React Context API
- **Routing**: React Router DOM v5
- **HTTP Client**: Axios
- **Real-time**: Socket.io Client

## Estrutura de Diretórios
- `src/components`: Componentes reutilizáveis.
- `src/pages`: Telas da aplicação (Dashboard, Tickets, etc).
- `src/context`: Gerenciamento de estado global (Auth, Theme, Socket).
- `src/services`: Camada de API (Axios).
- `src/layout`: Estrutura base (Sidebar, Header).
- `src/routes`: Definição de rotas e proteção (RouteGuard).

## Contextos Globais
- `AuthContext`: Gerencia sessão do usuário e login.
- `WhatsAppContext`: Gerencia estado global das conexões.
- `TicketsContext`: Gerencia estado dos atendimentos.
- `DarkModeContext`: Gerencia tema (Claro/Escuro).

## Fluxo de Dados
1. **API Call**: Componente chama `src/services/api.js`.
2. **Backend**: Processa e retorna JSON.
3. **Socket**: Backend emite eventos (ex: `appMessage`, `ticket:update`).
4. **Context/Component**: Escuta eventos via `socket.on` e atualiza estado.
