# 🧩 Plugin Manager (Service) - Documentação Oficial

## 🎯 Visão Geral

O **Plugin Manager** é um microserviço desenvolvido em **Go (Golang)** responsável pela orquestração do ciclo de vida dos plugins dentro de uma instância do Watink. Ele atua como uma ponte entre o `watink-backend` (Node.js) e o repositório central de plugins.

> **Função Principal**: Gerenciar instalação, ativação, desativação e remoção de módulos adicionais sem a necessidade de recompilar o core do sistema.

---

## 🏗️ Arquitetura Técnica

### Stack
*   **Linguagem**: Go (1.21+)
*   **Framework Web**: [Gin](https://github.com/gin-gonic/gin) (Alta performance HTTP)
*   **Banco de Dados**: PostgreSQL (Compartilhado com o ecossistema Watink, schemas dedicados)
*   **Docker**: Containerizado como `plugin-manager` na stack do Swarm.

### Responsabilidades
1.  **Catálogo**: Consulta o "Marketplace Central" (via API externa) para listar plugins disponíveis.
2.  **Gestão Local**: Mantém o estado dos plugins instalados na instância atual (tabela `PluginInstallations`).
3.  **Controle de Licenças**: Valida chaves de ativação antes de permitir o uso de plugins premium.
4.  **Injeção de Assets**: (Futuro) Gerencia o download e posicionamento de assets estáticos (JS/CSS) dos plugins no volume do frontend.

---

## 🚀 Como Executar

O serviço é executado automaticamente via Docker Swarm no arquivo `docker-stack.yml`.

### Variáveis de Ambiente
| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `PORT` | Porta do servidor HTTP | `3005` |
| `DATABASE_URL` | String de conexão Postgres | `postgres://user:pass@db:5432/watink` |

> **Nota**: As credenciais de acesso ao Marketplace (`MARKETPLACE_URL` e Key) são internas e pré-configuradas no binário, apontando sempre para o ambiente oficial Watink.

### Desenvolvimento Local
```bash
cd plugin-manager
go mod download
go run cmd/server/main.go
```

---

## 📂 Estrutura de Código

*   `/cmd/server`: Ponto de entrada (`main.go`).
*   `/internal`: Código privado da aplicação.
    *   `/config`: Carregamento de variáveis de ambiente.
    *   `/database`: Conexão com Postgres.
    *   `/handlers`: Controladores HTTP (lógica de endpoints).
    *   `/models`: Estruturas de dados (Structs).
    *   `/services`: Regras de negócio complexas.
