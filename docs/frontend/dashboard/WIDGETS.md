# Widget: TicketsInfo

## Descrição
Exibe cards com contadores de atendimentos (Abertos, Pendentes, Fechados).

## Componente
`src/components/Dashboard/Widgets/TicketsInfo.js`

## Funcionamento
Utiliza o hook `useTickets` para buscar a contagem.

### Chamadas de API
Não existe um endpoint dedicado de estatísticas para este widget. Ele reutiliza a rota de listagem de tickets com filtros:

1. **Atendendo**:
   - `GET /tickets`
   - Parâmetros: `status=open`, `showAll=true`
2. **Aguardando**:
   - `GET /tickets`
   - Parâmetros: `status=pending`, `showAll=true`
3. **Finalizados**:
   - `GET /tickets`
   - Parâmetros: `status=closed`, `showAll=true`

## Pontos de Atenção
- O componente realiza 3 requisições simultâneas ao carregar.
- Reutiliza a lógica de listagem, o que pode ser pesado se existirem milhares de tickets.
