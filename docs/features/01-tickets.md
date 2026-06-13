# Gerenciamento de Tickets

O módulo de Tickets é o coração do sistema, responsável pela orquestração de todas as conversas entre agentes e clientes finais.

## Funcionalidades Principais
- **Listagem de Tickets:** Visualização em tempo real de conversas pendentes, abertas e fechadas.
- **Atribuição de Agentes:** Suporte a atribuição manual e automática de usuários a conversas.
- **Histórico de Mensagens:** Persistência completa de mensagens enviadas e recebidas (texto, áudio, imagens e documentos).
- **Transferência de Filas:** Possibilidade de mover um ticket entre diferentes departamentos (filas).
- **Respostas Rápidas:** Atalhos para mensagens predefinidas para agilizar o atendimento.

## Arquitetura de Dados
- **Entidade Principal:** `Ticket` (vinculado a um `Contact`, `User`, `Queue` e `Tenant`).
- **Estados:** `pending` (aguardando triagem), `open` (em atendimento), `closed` (finalizado).
- **Persistência:** Mensagens são armazenadas com referência ao ID do ticket e ao provedor de canal (ex: WhatsApp).

## Fluxo de Vida de um Ticket
1. **Entrada:** Uma mensagem chega via canal (WhatsApp) e cria um ticket `pending`.
2. **Triagem:** O sistema verifica se há um Flow (Chatbot) ativo para roteamento.
3. **Atendimento:** Um agente assume o ticket, movendo-o para `open`.
4. **Resolução:** O atendimento é concluído e o ticket é movido para `closed`.
