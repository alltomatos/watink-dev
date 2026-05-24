# Configuração e Setup

## Pré-requisitos
- **Node.js**: v18+
- **Docker & Docker Compose**: Para rodar banco de dados e filas.
- **Git**: Controle de versão.

## Instalação
1. Clone o repositório:
   ```bash
   git clone <url-repo>
   cd watink/backend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```

## Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env` e ajuste conforme necessário.

### Banco de Dados (PostgreSQL)
Apesar de algumas variáveis legadas sugerirem MySQL, o projeto utiliza **PostgreSQL**.
```bash
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=watink
```

### Filas (RabbitMQ)
```bash
AMQP_URL=amqp://***REMOVED_AMQP_CREDENTIALS***@localhost:5672
```

### JWT
Defina segredos fortes para produção.
```bash
JWT_SECRET=supersecret
JWT_REFRESH_SECRET=supersecretrefresh
```

## Rodando a Aplicação
### Desenvolvimento
```bash
npm run dev
```
O servidor rodará em `http://localhost:8080`.

### Produção
```bash
npm run build
npm start
```

## Docker
Para subir todo o ambiente (Banco, RabbitMQ, Backend):
```bash
cd ..
docker-compose up -d
```
