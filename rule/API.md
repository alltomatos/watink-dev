# Watink Manager API para Plugin Manager

Esta API é consumida pelo serviço `plugin-manager` (lado Watink/instância) para consultar o catálogo e validar licenças.

## Base

- Base URL: definida pelo domínio do deploy (ex.: `https://watink.com`)
- Versão: v1 implícita (rotas estáveis sob `/api`)
- Formato: JSON

## Autenticação

- `GET /api/marketplace_plugins`: público de leitura
- `POST /api/verify_license`: server-to-server; o cliente envia `licenseKey` e `tenantId`. A validação ocorre no backend do Watink Manager contra o banco Supabase.

Observação: não enviar chaves sensíveis no frontend dos clientes; chamadas devem ocorrer a partir do backend da instância Watink ou do `plugin-manager` com HTTPS.

## Endpoints

### GET /api/marketplace_plugins

Retorna o catálogo de plugins ordenado por nome.

Resposta 200:
```json
{
  "plugins": [
    {
      "id": "uuid",
      "created_at": "2026-01-03T10:00:00Z",
      "name": "Helpdesk",
      "description": "Sistema de tickets",
      "category": "Helpdesk",
      "price": 29.9,
      "status": "active",
      "version": "1.0.0",
      "icon_url": "🧩",
      "zip_url": "https://cdn.example/plugins/helpdesk.zip",
      "developer_id": null
    }
  ]
}
```

Erros:
- 500: `{ "error": "<mensagem do servidor>" }`

Exemplo:
```bash
curl -s https://watink.com/api/marketplace_plugins
```

### POST /api/verify_license

Verifica se a licença informada é válida para o `tenantId`.

Body:
```json
{
  "licenseKey": "LIC-ABC-123",
  "tenantId": "tenant-001"
}
```

Resposta 200:
```json
{ "status": "VALID" }
```
ou
```json
{ "status": "INVALID" }
```
Opcionalmente, em casos de não encontrado:
```json
{ "status": "INVALID", "reason": "NOT_FOUND" }
```

Erros:
- 400: body inválido ou campos obrigatórios ausentes
- 405: método não permitido
- 500: erro interno ao consultar fonte de dados

Exemplo:
```bash
curl -s -X POST https://watink.com/api/verify_license \
  -H "Content-Type: application/json" \
  -d '{ "licenseKey": "LIC-ABC-123", "tenantId": "tenant-001" }'
```

## Contratos de Dados

Tabela `marketplace_plugins` (Supabase):
- `id`: string (uuid)
- `created_at`: string (ISO)
- `name`: string
- `description`: string
- `category`: string
- `price`: number
- `status`: enum `active | draft | beta`
- `version`: string
- `icon_url`: string
- `zip_url`: string|null
- `developer_id`: string|null

Tabela `license_keys` (Supabase) — sugerida:
- `license_key`: string (única)
- `tenant_id`: string
- `status`: enum `active | revoked | expired`
- `expires_at`: string (ISO)|null

## Considerações Operacionais

- HTTPS obrigatório
- Rate limiting recomendado no edge (Vercel) para proteger endpoints públicos
- Logs e auditoria: registrar verificações de licença para rastreabilidade

## Referências

- Implementação: [marketplace_plugins.ts](file:///c:/dev/watink-manager/api/marketplace_plugins.ts), [verify_license.ts](file:///c:/dev/watink-manager/api/verify_license.ts)
