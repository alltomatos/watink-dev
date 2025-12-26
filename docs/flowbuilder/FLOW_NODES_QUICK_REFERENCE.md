# 📋 FlowBuilder - Referência Rápida de Nós

Guia compacto para consulta rápida durante a criação de fluxos.

---

## 🎨 Tipos de Nós por Categoria

### WhatsApp (Comunicação)
| Tipo | Nome | Cor | Função Principal |
|------|------|-----|------------------|
| `trigger` | Gatilho | 🟢 Verde | Iniciar por palavra-chave |
| `message` | Mensagem | 🔵 Azul | Enviar texto/mídia |
| `menu` | Menu | 🟠 Laranja | Exibir opções interativas |

### Lógica (Controle de Fluxo)
| Tipo | Nome | Cor | Função Principal |
|------|------|-----|------------------|
| `input` | Início | 🟢 Verde | Ponto de entrada |
| `switch` | Decisão | 🟣 Roxo | Bifurcação condicional |
| `output` | Fim | 🔴 Vermelho | Encerrar fluxo |

### Utilitários (Ações)
| Tipo | Nome | Cor | Função Principal |
|------|------|-----|------------------|
| `ticket` | Ticket | 🩷 Rosa | Gerenciar atendimento |
| `pipeline` | Pipeline | 🩵 Ciano | CRM/Kanban |
| `knowledge` | IA | 💖 Pink | Consultar base de conhecimento |
| `database` | Database | 🟤 Marrom | Ler/atualizar dados |
| `filter` | Filtro | 💜 Violeta | Filtrar arrays |
| `webhook` | Webhook | 🧡 Deep Orange | Enviar dados externos |
| `api` | API | 💙 Indigo | Requisitar API e usar resposta |

---

## 🔌 Handles de Conexão

### Nós com Saídas Múltiplas

**Switch Node**:
```
┌─────────────┐
│   Switch    │──► a (verde ✓) = Condição TRUE
│             │──► b (vermelho ✗) = Condição FALSE
└─────────────┘
```

**Menu Node**:
```
┌─────────────┐
│    Menu     │──► opt1 (Opção 1)
│             │──► opt2 (Opção 2)
│             │──► opt3 (Opção 3)
└─────────────┘
```

---

## 📝 Variáveis Rápidas

### Sistema
```
{{firstName}}      → Primeiro nome
{{name}}           → Nome completo
{{contactNumber}}  → Número WhatsApp
{{protocol}}       → Número ticket
{{date}}           → Data atual
{{dayOfWeek}}      → 0=Dom, 6=Sáb
{{currentHour}}    → 0-23
{{lastInput}}      → Última mensagem usuário
```

### Dinâmicas (após nós)
```
{{nomeVar}}         → Variável simples
{{nomeVar.campo}}   → Campo de objeto
{{nomeVar.0.campo}} → Primeiro item de array
```

---

## ⚡ Operadores de Condição

| Operador | Descrição | Exemplo |
|----------|-----------|---------|
| `equals` | Igual a | lastInput equals "oi" |
| `notEquals` | Diferente | status notEquals "closed" |
| `contains` | Contém | lastInput contains "ajuda" |
| `notContains` | Não contém | name notContains "bot" |
| `startsWith` | Começa com | number startsWith "55" |
| `endsWith` | Termina com | email endsWith "@gmail.com" |
| `isEmpty` | Está vazio | response isEmpty |
| `isNotEmpty` | Não vazio | contatoDB isNotEmpty |
| `greaterThan` | Maior (num) | currentHour greaterThan "18" |
| `lessThan` | Menor (num) | dayOfWeek lessThan "5" |

---

## 🔄 Comportamento de Pausa

### Nós que PAUSAM e aguardam resposta:
- ✋ `menu` - Aguarda seleção
- ✋ `message` (se waitForInput=true)

### Nós que CONTINUAM automaticamente:
- ▶️ `input/trigger` - Entrada
- ▶️ `message` (padrão) - Envia e segue
- ▶️ `switch` - Avalia e segue
- ▶️ `database/filter` - Processa
- ▶️ `webhook/api` - Requisita
- ▶️ `ticket/pipeline` - Atualiza
- ▶️ `output` - Finaliza

---

## 📊 Tabelas do Database Node

| Tabela | Campos Principais |
|--------|-------------------|
| `Contacts` | id, name, number, email |
| `Tickets` | id, status, queueId, userId |
| `Messages` | id, body, fromMe, ticketId |
| `Users` | id, name, email, profile |
| `Queues` | id, name, color |
| `Pipelines` | id, name |

---

## ⚠️ Limites Importantes

| Recurso | Limite |
|---------|--------|
| Passos por execução | 50 |
| Registros READ | 100 |
| Botões WhatsApp | 3 (acima vira lista) |
| Tamanho de valores | 500 chars |

---

## 🧩 Template Mínimo de Fluxo

```json
{
  "nodes": [
    {"id": "1", "type": "input", "position": {"x": 250, "y": 50}, "data": {"label": "Início"}},
    {"id": "2", "type": "message", "position": {"x": 250, "y": 150}, "data": {"label": "Mensagem", "content": "Olá!"}},
    {"id": "3", "type": "output", "position": {"x": 250, "y": 250}, "data": {"label": "Fim"}}
  ],
  "edges": [
    {"id": "e1-2", "source": "1", "target": "2"},
    {"id": "e2-3", "source": "2", "target": "3"}
  ]
}
```

---

## 🔗 Exemplo de Edge com Handle

```json
// Edge normal
{"id": "e1-2", "source": "1", "target": "2"}

// Edge de opção de menu
{"id": "e3-4", "source": "3", "target": "4", "sourceHandle": "opt1"}

// Edge de Switch (caminho A/B)
{"id": "e5-6", "source": "5", "target": "6", "sourceHandle": "a"}
{"id": "e5-7", "source": "5", "target": "7", "sourceHandle": "b"}
```

---

**Quick Reference v1.0** | whaticket Premium
