# Guia de Desenvolvimento (Engine)

## Setup Local

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure as variáveis de ambiente (`.env`):
   ```bash
   AMQP_URL=amqp://***REMOVED_AMQP_CREDENTIALS***@localhost:5672
   ```

3. Execute em modo de desenvolvimento:
   ```bash
   npm run dev
   ```

## Docker

Para construir a imagem localmente:
```bash
docker build -t watink/engine .
```

## Estrutura de Pastas Importantes
- `src/contracts.ts`: Define as interfaces (Types) dos eventos e comandos. Sempre atualize este arquivo ao adicionar novas funcionalidades.
- `src/rabbitmq.ts`: Lógica de conexão com a fila.
- `src/session.ts`: Lógica principal do Baileys.

## Adicionando Novos Comandos
1. Adicione o tipo em `src/contracts.ts`.
2. Adicione o `case` no switch de `handleCommand` em `src/session.ts`.
3. Implemente o método privado correspondente em `SessionManager`.
