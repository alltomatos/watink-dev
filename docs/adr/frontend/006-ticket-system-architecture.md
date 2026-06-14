# ADR-006: Arquitetura do Sistema de Tickets (Real-time & Performance)

**Status:** Proposto
**Data:** 2026-06-13
**Contexto:** O sistema de chat atual (`MessagesList.js`) é um componente monolítico com problemas de performance e gerenciamento de estado manual complexo.

## Decisão

Refatorar o Sistema de Tickets seguindo os padrões:
1. **Virtualização**: Utilizar `react-virtuoso` para renderizar o histórico de mensagens, garantindo 60fps mesmo em chats com milhares de itens.
2. **Data Layer**: Migrar do `useEffect` manual para **TanStack Query**. O histórico será uma `useInfiniteQuery`.
3. **Real-time**: Integrar Socket.io com o cache do Query. Eventos `appMessage:create` farão `setQueryData` otimista.
4. **Composição Atômica**:
   - `MessageList`: Gerencia scroll e virtualização.
   - `MessageItem`: Renderiza o balão e metadados.
   - `MessageMedia`: Switch case para renderizar fotos, áudios, etc.

## Consequências

- **Positivas**: Performance escalável, código testável, remoção de race conditions no histórico.
- **Negativas**: Complexidade inicial na configuração do `useInfiniteQuery` com Socket.io.
