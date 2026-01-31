# Guia de Solução de Problemas: Watink Engine (Whalieys)

Este documento descreve um problema comum de conexão encontrado no serviço `watink_whaileys-engine` (Engine Standard) durante novas instalações ou operação contínua, e como resolvê-lo.

## O Problema

O serviço de engine do WhatsApp entra em um loop de reinicialização ou erro contínuo, impedindo a conexão ou o envio de mensagens.

### Sintomas e Logs

Ao analisar os logs do serviço (`docker service logs watink_whaileys-engine`), você encontrará mensagens de erro repetitivas como:

```log
WARN (18): myAppStateKeyId not synced, bad link
INFO (18): connection errored
ERROR (18): Session 1 failed to connect after 0 attempts or permanent error (code: 401).
ERROR (18): unexpected error in 'processing message'
    output: {
      "statusCode": 428,
      "payload": {
        "error": "Precondition Required",
        "message": "Connection Closed"
      }
    }
```

### Causa Provável

Isso geralmente ocorre devido a uma dessincronização entre o estado da sessão armazenado localmente (na memória do container ou cache) e o estado real nos servidores do WhatsApp. O erro `428 Precondition Required` com `Connection Closed` indica que o servidor recusou a conexão devido a um estado inválido das chaves de criptografia.

## Como Resolver

Para solucionar este problema em um ambiente Docker Swarm, siga os passos abaixo:

### 1. Diagnóstico

Confirme se o erro está ocorrendo verificando os logs em tempo real:

```bash
docker service logs -f --tail 50 watink_whaileys-engine
```

Se você ver o loop de erros mencionado acima, prossiga para a solução. Pressione `Ctrl+C` para sair dos logs.

### 2. Solução: Reinício Forçado do Serviço

Na maioria dos casos, forçar a atualização do serviço é suficiente. Isso recria o container, limpando a memória RAM do processo Node.js e forçando uma nova tentativa de handshake limpo.

Execute o seguinte comando no terminal do servidor (manager do Swarm):

```bash
docker service update --force watink_whaileys-engine
```

Aguarde a confirmação `verify: Service watink_whaileys-engine converged`.

### 3. Validação

Após o reinício, monitore os logs novamente para garantir que o serviço estabilizou:

```bash
docker service logs -f --tail 50 watink_whaileys-engine
```

**Resultado Esperado:**
Você deve ver mensagens indicando sucesso na conexão com as dependências e aguardando comandos:

```log
INFO (18): Starting Watink Engine Standard...
INFO (18): Connected to RabbitMQ
INFO (18): Connected to Redis
INFO (18): Consumer setup completed, listening for commands.
```

### 4. Ação Final (Frontend)

Após estabilizar o serviço, acesse o painel web do Watink. É altamente provável que a sessão anterior tenha sido invalidada.
*   Vá para a página de conexões.
*   Se solicitado, **escaneie o QR Code novamente** para restabelecer a sessão do WhatsApp.

---

## Dicas para Novas Instalações

*   **Sempre verifique os logs:** Após a instalação inicial (`SetupWatink`), se o QR Code não aparecer ou a conexão falhar, verifique imediatamente os logs do engine.
*   **Limpeza de Redis (Avançado):** Se o reinício do serviço não resolver e os erros de `Bad MAC` ou `Key Sync` persistirem, pode ser necessário limpar as chaves de sessão no Redis antes de reiniciar o serviço.
    *   Acesse o container do Redis: `docker exec -it $(docker ps -q -f name=watink_redis) redis-cli`
    *   Execute `FLUSHALL` (Cuidado: isso limpa todas as sessões) ou delete chaves específicas da sessão problemática.
    *   Reinicie o engine novamente.
