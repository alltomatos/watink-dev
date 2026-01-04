# 📡 API Reference - Plugin Manager

Serviço rodando na porta `3005` (padrão).
Prefixo base: `/api/v1`

---

## 📚 Plugins

### Listar Catálogo
Retorna todos os plugins disponíveis para instalação (do Marketplace remoto).

*   **Endpoint**: `GET /plugins/catalog`
*   **Response**:
    ```json
    {
      "plugins": [
        {
          "id": "uuid",
          "name": "Helpdesk Pro",
          "slug": "helpdesk",
          "version": "1.0.0",
          "price": 0
        }
      ]
    }
    ```

### Listar Instalados
Retorna os plugins instalados na instância atual e seus status.

*   **Endpoint**: `GET /plugins/installed`
*   **Response**:
    ```json
    {
      "plugins": [
        {
          "pluginId": "uuid",
          "status": "active", // active, inactive
          "installedVersion": "1.0.0",
          "installedAt": "2024-01-01T00:00:00Z"
        }
      ]
    }
    ```

### Instalar Plugin
Registra um plugin na instância local.

*   **Endpoint**: `POST /plugins/:id/install`
*   **Body**:
    ```json
    {
      "licenseKey": "optional-license-key" // Para plugins premium
    }
    ```

### Ativar Plugin
Habilita um plugin previamente instalado.

*   **Endpoint**: `POST /plugins/:id/activate`

### Desativar Plugin
Desabilita um plugin, mantendo seus dados mas removendo acesso.

*   **Endpoint**: `POST /plugins/:id/deactivate`

### Desinstalar Plugin
Remove o registro do plugin. (Nota: Pode manter dados dependendo da configuração de retenção).

*   **Endpoint**: `DELETE /plugins/:id`

---

## ❤️ Health Check

*   **Endpoint**: `GET /health`
*   **Response**:
    ```json
    {
      "status": "healthy",
      "service": "plugin-manager"
    }
    ```
