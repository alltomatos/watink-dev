# Conexões (WhatsApp)

Gerenciamento das sessões (devices) do WhatsApp.

## Funcionalidades
- **QR Code**: Exibe QR Code gerado pelo Engine (`QRCode`).
- **Pairing Code**: Exibe código de pareamento para WhatsApp Web (alternativa ao QR Code).
- **Ações**:
  - `Disconnect`: Encerra a sessão.
  - `Restart`: Reinicia o processo no Engine.
  - `Delete`: Remove a conexão e dados associados.

## Arquitetura
- **Rota**: `/connections`
- **Socket**: Escuta eventos `session.status` para atualizar o card de conexão em tempo real (Cor verde/vermelha/laranja).
- **API**: `GET /whatsapp`, `POST /whatsapp`, `DELETE /whatsapp/:id`.
- **Engine**: A comunicação de QR Code e Status vem via RabbitMQ -> Backend -> Socket -> Frontend.
