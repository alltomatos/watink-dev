# Changelog - Watink Frontend

## [0.8.0] - 2026-02-20

### Adicionado 🚀
- **Linha do Tempo (Auditoria):** Nova aba "Histórico" no chat dos tickets, exibindo eventos de transferência, troca de status e atribuição em tempo real.
- **Hierarquia de Filas:** Suporte visual para subfilas de até 2 níveis com ícones de árvore e indentação na listagem de configurações.
- **Estratégias de Distribuição:** Seletor de estratégia (Manual, Round Robin, Balanced) integrado ao modal de filas.
- **Métricas de Performance:** Novos widgets no Dashboard exibindo TMR (Tempo Médio de Resposta) e TME (Tempo Médio de Espera).
- **Pareamento por Código:** Suporte completo para conexão via Phone Code (Pareamento Numérico).

### Corrigido 🛠️
- **Gestão de Conexões:** Refatoração do fluxo de deleção de WhatsApp para evitar erros de chave estrangeira e garantir limpeza de tickets órfãos.
- **Desconexão de Sessão:** Feedback visual imediato ao solicitar a desconexão de uma instância.
- **RBAC (Segurança):** Ajuste na visibilidade de tickets para respeitar o escopo global (agentes agora só veem suas filas atribuídas).

### Técnico ⚙️
- **Go Embed:** Otimização para build compatível com embutimento no binário Go.
- **Sincronia Automática:** Implementação do script `sync-embed-go.js` no fluxo de postbuild.
