# 🌊 Flow Engine - Motor de Fluxos Híbridos

Este documento detalha a arquitetura do **Flow Engine**, o sistema de automação flexível do watic Premium.

## 🏗️ Arquitetura

O Flow Engine foi desenhado para ser agnóstico à plataforma, permitindo que fluxos sejam iniciados por diversos eventos (WhatsApp, Kanban, Tickets, API Externa) e executem ações variadas.

### Principais Componentes

1.  **Flows (Definição)**: Armazena a estrutura do grafo (Nodes e Edges) em JSON.
2.  **FlowTriggers (Gatilhos)**: Mapeia eventos do sistema para Fluxos específicos.
    *   Exemplo: "Quando receber mensagem contendo 'promoção', iniciar Fluxo #12".
3.  **FlowSessions (Execução)**: Mantém o estado atual de um usuário/entidade dentro de um fluxo.
    *   Permite fluxos longos que duram dias (ex: aguardando resposta).
4.  **FlowExecutorService (Core)**: O "cérebro" que navega pelo grafo, executa nós e gerencia o estado.

---

## 🚀 Como Integrar Novos Gatilhos

Para adicionar um novo ponto de entrada (ex: "Ao mover card no Kanban"), siga os passos:

### 1. Definir o Tipo de Gatilho
Adicione uma string constante para identificar seu gatilho, ex: `kanban_card_moved`.

### 2. Inserir Ponto de Chamada (Hook)
No código onde o evento ocorre (ex: `TicketController.update`), adicione a verificação:

```typescript
import FlowTriggerService from "../services/FlowServices/FlowTriggerService";
import FlowExecutorService from "../services/FlowServices/FlowExecutorService";

// ... dentro da lógica de atualização do Kanban
const trigger = await FlowTriggerService.findTrigger("kanban_card_moved", {
    pipelineId: ticket.status, // Exemplo de contexto
    tag: "novo_lead"
}, tenantId);

if (trigger) {
    await FlowExecutorService.start(trigger.flowId, {
        ticketId: ticket.id,
        entityType: "ticket",
        // outros dados úteis para o fluxo
    });
}
```

### 3. Configurar o Fluxo (Frontend/JSON)
No nó de Início (`StartNode`), adicione a configuração do gatilho no objeto `data`:

```json
{
  "id": "1",
  "type": "input",
  "data": {
    "label": "Início Kanban",
    "trigger": {
      "type": "kanban_card_moved",
      "condition": { "pipelineId": 3 }
    }
  }
}
```

---

## 🛠️ Tipos de Nós Suportados

Atualmente o executor suporta:

*   **input (Start)**: Ponto de entrada.
*   **default (Mensagem)**: Envia mensagem de texto.
*   **textUpdater (Pergunta)**: Envia mensagem e **pausa** o fluxo aguardando resposta do usuário.
*   **output (Fim)**: Finaliza a sessão.

### Adicionando Novos Tipos de Nós
Para criar um nó de "Atualizar Ticket" (ex: mudar fila):

1.  **Frontend**: Crie o componente visual em `frontend/src/pages/FlowBuilder/Nodes`.
2.  **Backend**: Atualize o switch/case em `FlowExecutorService.ts`:

```typescript
case "updateTicket":
    await Ticket.update({ queueId: node.data.queueId }, { where: { id: session.entityId } });
    return this.proceedToNext(session, flow, node);
```

---

## 📊 Estrutura de Dados

### Tabela `FlowSessions`
| Coluna | Descrição |
|--------|-----------|
| `flowId` | ID do fluxo em execução |
| `currentStepId` | ID do nó atual (onde o fluxo parou/está) |
| `status` | `active`, `completed`, `failed` |
| `context` | JSON com variáveis acumuladas durante o fluxo |
| `entityId` | ID do Ticket, Contato ou Deal associado |

### Tabela `FlowTriggers`
| Coluna | Descrição |
|--------|-----------|
| `type` | Tipo do evento (`whatsapp_message`, etc) |
| `condition` | JSON para match (ex: `{ "keyword": "oi" }`) |

---

## 🔒 Boas Práticas

1.  **Idempotência**: Garanta que nós de ação (ex: API Call) possam ser re-executados sem efeitos colaterais graves caso o fluxo falhe e tente novamente.
2.  **Timeouts**: Fluxos pausados ("Pergunta") devem ter uma política de expiração (limpeza de sessões antigas via Cron Job).
3.  **Logs**: O `FlowExecutor` loga cada passo. Use isso para debug.

