# Canais de Comunicação

Este módulo gerencia a integração com provedores externos de mensagens, com foco primário em WhatsApp via multi-device.

## Funcionalidades Principais
- **Gerenciamento de Sessões:** Criação e manutenção de sessões de comunicação.
- **QR Code Autenticação:** Interface para pareamento de dispositivos via WhatsApp Web.
- **Monitoramento de Status:** Verificação em tempo real se a conexão está ativa, desconectada ou carregando.
- **Sincronização de Histórico:** Capacidade de importar mensagens passadas para a base local.
- **Múltiplos Números:** Suporte para múltiplos canais dentro de um mesmo Tenant (conforme plano).

## Detalhes Técnicos
- **Motores (Engines):** Suporte modular para diferentes implementações de conexão (ex: Baileys, Go-WhatsApp).
- **Tratamento de Eventos:** Webhooks para recebimento de mensagens e atualizações de status de entrega (ack).
- **Isolamento:** Cada sessão é isolada por TenantID, garantindo que os dados não se misturem em ambiente multitenant.
