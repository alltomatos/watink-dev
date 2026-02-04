# Documentação Mobile - Módulo de Chat

Este documento é um guia focado para o desenvolvimento da **Tela de Conversa (Chat Window)** do WatinkApp. Ele contém apenas as especificações de UI, endpoints e eventos de socket pertinentes a essa funcionalidade.

---

## 1. Estrutura e Interface do Chat (UI/UX) 📱

### 1.1 Navegação (Inbox & Tabs) 🗂️

A tela principal de mensagens (Inbox) é dividida em abas para organizar o fluxo de trabalho:

*   **Aguardando (Pending):** Tickets que entraram na fila mas ainda não possuem dono.
    *   *Comportamento:* Lista de leitura apenas, sem interação.
    *   *Interatividade:* Botão **"Aceitar"** disponível.
*   **Atendendo (Open):** Tickets que já foram aceitos pelo usuário logado.
    *   *Comportamento:* Interação total habilitada (Responder, Mídia, etc).

### 1.2 Header (Chat Window)
O cabeçalho deve fornecer contexto imediato sobre quem é o contato e o estado do atendimento.

*   **Avatar:** `contact.profilePicUrl` (Exibir placeholder se null/empty).
*   **Nome:** `contact.name`.
*   **Ticket ID:** Exibir `ticket.id` (Ex: `#1024`) discretamente.

### 1.3 Drawer (Menu Lateral de Ações)
Menu acessível via ícone no header, contendo ações administrativas do ticket.

**Itens Obrigatórios:**
1.  **Perfil do Contato:** Foto e dados principais.
2.  **Carteira (Wallet):** Toggle switch.
    *   *Action:* `PUT /contacts/{contactId}` envio `{ walletUserId: ID (para adicionar) | null (para remover) }`.
    *   *Visualização:* Se `contact.walletUserId == myUserId` → Estrela Cheia ⭐ (Remover). Senão → Estrela Vazia ☆ (Adicionar).
3.  **Encerrar Ticket:** Botão de destaque.
    *   *Action:* `PUT /tickets/{ticketId}` envio `{ status: "closed" }`.
4.  **Devolver Ticket:**
    *   *Action:* `PUT /tickets/{ticketId}` envio `{ userId: null, status: "pending" }`.
5.  **Novo Protocolo (Helpdesk):**
    *   *Action:* Abrir modal de criação (Ver seção 3).
6.  **Assinar Mensagens:**
    *   *Componente:* Toggle Switch.
    *   *Descrição:* Habilita o prefixo de nome nas mensagens enviadas (Ver seção 2.6).

### 1.4 Área de Mensagens & Input

O comportamento desta área varia conforme o **status** do ticket (`ticket.status`):

#### A. Modo "Aguardando" (Pending) 🔒
Quando o ticket está na aba "Aguardando" ou possui `status: "pending"`:
*   **Visualização:** O atendente **PODE** ler todas as mensagens anteriores.
*   **Input Bar:** Deve estar **OCULTA** ou **DESABILITADA**.
*   **Botão de Ação:** Exibir um botão flutuante ou barra inferior fixa grande: **"ACEITAR TICKET"**.
    *   *Ação:* `PUT /tickets/{ticketId}` com `{ status: "open", userId: myUserId }`.
*   **Restrição:** Não é possível responder, enviar mídia ou gravar áudio até aceitar.

#### B. Modo "Atendendo" (Open) ✅
Quando o ticket já é do usuário (`status: "open"`):
*   **Input Bar:** Totalmente visível e interativa.
*   **Botões:** Emoji, Áudio, Anexos disponíveis.
*   **Lista:** Renderizar balões de mensagem normalmente.

---

## 2. Endpoints do Chat 💬

### 2.1 Listar Mensagens (Carga Inicial)
Carrega o histórico da conversa ao abrir a tela.
```http
GET /messages/:ticketId
Headers: Authorization: Bearer <token>
Query: ?pageNumber=1
```
**Response:** Retorna array `messages[]`, objeto `ticket` e `count`.

### 2.2 Enviar Mensagem (Texto)
```http
POST /messages/:ticketId
Content-Type: application/json

{
  "body": "Texto da mensagem"
}
```

### 2.3 Enviar Mídia (Imagem/Áudio/Doc)
```http
POST /messages/:ticketId
Content-Type: multipart/form-data

medias: [FILE]
body: "Legenda (opcional)"
```
> **Nota:** Para áudio, gravar em `.m4a` ou `.ogg`.

### 2.4 Ações em Mensagens
*   **Responder (Quote):** `POST /messages/:ticketId` com `{ body: "...", quotedMsg: { id: "..." } }`.
*   **Deletar:** `DELETE /messages/:messageId`.

### 2.5 Indicadores Visual de Status (Ticks) ✔️
Para mensagens enviadas pelo usuário (`fromMe: true`), exibir ícones conforme o campo `ack`:

| ACK | Status | Ícone (Ref. WhatsApp) | Cor |
|:---:|:-------|:----------------------|:----|
| **0** | Pendente (Clock) | 🕒 Relógio | Cinza (`#808080`) |
| **1** | Enviado no Servidor | ✓ 1 Tick (Check) | Cinza (`#808080`) |
| **2** | Entregue no Destino | ✓✓ 2 Ticks (Double Check) | Cinza (`#808080`) |
| **3** | Lido / Reproduzido | ✓✓ 2 Ticks (Double Check) | Azul Watink (`#2196F3`) |
| **4** | Reproduzido (Áudio) | 🎤 Microfone Azul | Azul Watink (`#2196F3`) |

> [!TIP]
> O evento `appMessage` com `action: update` informa em tempo real quando o ACK muda (ex: de 2 para 3 quando o cliente abre o WhatsApp). O app deve atualizar o ícone sem recarregar a lista.

### 2.6 Assinatura de Mensagens (Identificação) ✍️

Lógica **Client-Side** para identificar quem enviou a mensagem em filas compartilhadas.

*   **Configuração:** App deve persistir localmente a preferência `signMessage` (Default: `true`).
*   **Comportamento:** Ao enviar mensagem (`POST /messages`), se `signMessage == true`, o App deve modificar o `body`:

    ```javascript
    // Formato: *NomeUser:*\nMsg
    const body = signMessage ? `*${user.name}:*\n${text}` : text;
    ```

### 2.7 Estatísticas e KPIs de Tickets 📊

Diferente do módulo de Helpdesk, os indicadores de tickets são obtidos consultando diretamente a listagem com filtros específicos.

**Contagem de Tickets (Por Status):**
Para montar os contadores do dashboard (Aguardando vs Atendendo), o app deve realizar requisições paralelas:

1.  **Tickets Aguardando (Pending):**
    ```http
    GET /tickets?status=pending&pageNumber=1
    ```
    *   **Uso:** Obter o valor de `count` na resposta para exibir no badge da aba "Aguardando".

2.  **Tickets em Atendimento (Open):**
    ```http
    GET /tickets?status=open&pageNumber=1
    ```
    *   **Uso:** Obter o valor de `count` na resposta para exibir no badge da aba "Atendendo".

> **Nota:** A resposta inclui a lista de tickets (`tickets[]`) e o total (`count`). Para fins de KPI, utilize apenas o `count`.

### 2.8 Listar Tickets (Inbox) e Estrutura do Objeto 📋

Endpoint principal para carregar as listas da Inbox.

```http
GET /tickets
Query:
  ?pageNumber=1
  &status=open (ou pending)
  &searchParam= (busca)
  &showAll= (true/false)
  &withUnreadMessages= (true/false)
  &isGroup= (true/false)
```

**Response (Exemplo Completo):**
```json
{
  "tickets": [
    {
      "id": 1024,
      "status": "open",
      "unreadMessages": 2,
      "lastMessage": "Olá, tudo bem?",
      "updatedAt": "2026-01-27T10:00:00Z",
      "contact": {
        "id": 1,
        "name": "Cliente Exemplo",
        "number": "5511999999999",
        "profilePicUrl": "http://...",
        "isGroup": false
      },
      "queue": {
        "id": 1,
        "name": "Suporte",
        "color": "#0000FF"
      },
      "whatsapp": {
         "name": "Conexão Oficial 1"
      },
      "tags": [
         { "id": 1, "name": "VIP", "color": "#FF0000" }
      ]
    }
  ],
  "count": 50,
  "hasMore": true
}
```

> **Nota Importante:** O objeto `whatsapp` dentro do ticket contém o campo `name`, que representa o nome da conexão (instância) pela qual o ticket foi recebido.
> O App deve utilizar este valor para renderizar a **Tag de Conexão** no card do ticket (geralmente com destaque visual, ex: gradiente roxo/azul), permitindo que o atendente saiba rapidamente a origem do atendimento.

---

## 3. Integração Helpdesk (Protocolos) 🎫

Funcionalidade para gerar tickets de suporte nível 2 diretamente do chat.

### 3.1 Fluxo de Criação
1.  Usuário clica em **"Novo Protocolo"** no Drawer.
2.  Preenche: Assunto, Descrição, Prioridade.
3.  **Request:**
    ```http
    POST /contacts/{contactId}/protocols
    Body:
    {
      "subject": "Erro no sistema",
      "description": "Detalhes...",
      "priority": "high",
      "ticketId": 123
    }
    ```

### 3.2 Feedback no Chat
Após sucesso (201 Created), o App deve renderizar uma **Mensagem de Sistema** localmente na lista de mensagens, seguindo rigorosamente o template do backend para consistência visual:

> **Template da Mensagem:**
> ```
> *Olá! Seu protocolo de atendimento foi criado com sucesso.*
>
> *Protocolo:* #{protocolNumber}
> *Assunto:* {subject}
> *Prioridade:* {priority}
>
> 🔗 Acompanhe seu protocolo clicando aqui:
> {frontendUrl}/public/protocols/{token}
> ```

*Obs: O App deve utilizar a `frontendUrl` obtida no endpoint `/mobile/v1/branding`.*
*Obs: A prioridade deve ser traduzida (Ex: high -> Alta).*

---

## 4. Módulo de Suporte (Helpdesk) 🎫

Tela dedicada para visualizar e gerenciar os tickets de suporte (Protocolos) atribuídos ao usuário ou filas.

### 4.1 Dashboard (KPIs)
Resumo rápido para o cabeçalho da tela de suporte.

```http
GET /protocols/dashboard
```
**Response:**
```json
{
  "statusCounts": [
    { "status": "open", "count": "5" },
    { "status": "closed", "count": "12" }
  ],
  "priorityCounts": [
    { "priority": "high", "count": "3" },
    { "priority": "medium", "count": "10" }
  ],
  "categoryCounts": [
    { "category": "Financeiro", "count": "8" }
  ],
  "slaStatus": {
    "onTime": 15,
    "overdue": 2
  }
}
```

### 4.2 Listar Protocolos
```http
GET /protocols
Query:
  ?pageNumber=1
  &searchParam= (busca por título/ID)
  &status=open (ou closed)
  &priority= (high, medium, low)
```

**Response:**
```json
{
  "protocols": [
    {
      "id": 1024,
      "protocolNumber": "202601250001",
      "subject": "Erro de Impressão",
      "status": "open",
      "priority": "high",
      "createdAt": "2026-01-25T10:00:00Z",
      "contact": { "name": "Cliente Exemplo" },
      "user": { "name": "Atendente Atual" }
    }
  ],
  "count": 50,
  "hasMore": true
}
```

### 4.3 Detalhes do Protocolo
Visualização completa do ticket, incluindo histórico de interações.

```http
GET /protocols/:protocolId
```

**Response:**
```json
{
    "id": 1024,
    "subject": "Erro de Impressão",
    "description": "Detalhes completos...",
    "status": "open",
    "priority": "high",
    "contact": { ... },
    "histories": [
        {
            "id": 1,
            "body": "Protocolo criado",
            "createdAt": "...",
            "user": { "name": "Sistema" }
        }
    ]
}
```

### 4.4 Atualizar Protocolo (Comentários e Anexos)
Endpoint único para adicionar comentários, alterar status ou anexar arquivos.

```http
PUT /protocols/:protocolId
Content-Type: multipart/form-data
```

**Body (FormData):**
```
status: "open" | "resolved" | "closed" (Opcional)
priority: "low" | "medium" | "high" (Opcional)
comment: "Texto do comentário ou nota de atualização" (Opcional)
files: [FILE1, FILE2, ...] (Opcional - Max 10)
```

**Exemplo de uso:**
1. **Apenas Comentar:** Enviar `comment` com o texto.
2. **Anexar Arquivos:** Enviar array de `files` (pode ir junto com `comment`).
3. **Mudar Status:** Enviar `status` (ex: "closed").

**Response (200 OK):**
Retorna o objeto `Protocol` atualizado.

### 4.5 Listar Anexos
```http
GET /protocols/:protocolId/attachments
```
Retorna lista de arquivos anexados ao protocolo.

---

## 5. Gestão de Atividades (RDO) 🏗️

Módulo para execução e registro de atividades de campo (Relatório Diário de Obra).

### 5.1 Listar Atividades do Protocolo
Obtém todas as atividades vinculadas a um protocolo específico.

```http
GET /protocols/:protocolId/activities
```

**Response:**
```json
[
  {
    "id": 10,
    "title": "Instalação de Fibra",
    "status": "pending", // pending, in_progress, done, cancelled
    "description": "Realizar passagem de cabo...",
    "createdAt": "2026-02-04T10:00:00Z"
  }
]
```

### 5.2 Detalhar Atividade
Carrega os dados completos de uma atividade, incluindo checklist, materiais e ocorrências já registrados.

```http
GET /activities/:activityId
```

**Response:**
```json
{
  "id": 10,
  "title": "Instalação de Fibra",
  "status": "in_progress",
  "items": [
    { "id": 1, "label": "Verificar poste", "isDone": true, "inputType": "checkbox" }
  ],
  "materials": [],
  "occurrences": []
}
```

### 5.3 Atualizar Execução (RDO)
Endpoint principal para salvar o progresso, registrar materiais gastos e apontar ocorrências.

```http
PUT /activities/:activityId
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "status": "done", // ou "in_progress"
  "items": [ // Atualização do checklist (opcional)
    { "id": 1, "isDone": true, "value": "OK" }
  ],
  "materials": [ // Lista de materiais gastos
    {
      "materialName": "Cabo UTP",
      "quantity": 30,
      "unit": "m", // m, kg, un, etc.
      "isBillable": true // Se deve ser cobrado do cliente
    }
  ],
  "occurrences": [ // Diário de Ocorrências/Impedimentos
    {
      "type": "impediment", // 'info', 'impediment', 'delay'
      "description": "Cliente sem senha do Wi-Fi",
      "timeImpact": 45 // Inteiro (Minutos)
    }
  ]
}
```

> **Nota:** O campo `timeImpact` deve ser enviado sempre como **inteiro (minutos)**. O App deve converter inputs visuais (ex: "01:30") para minutos (90) antes de enviar.

---

## 6. Real-time (Socket.io) 🔌

Eventos necessários para manter o chat vivo.

### 6.1 Conexão
```javascript
const socket = io(URL, { query: { token } });
socket.emit("joinChatBox", ticketId); // Entrar na sala do ticket
```

### 6.2 Ouvir Eventos
| Evento | Ação no App |
|--------|-------------|
| `appMessage` (action: create) | Adicionar mensagem nova na lista (scroll to bottom). |
| `appMessage` (action: update) | Atualizar status (ACK) de mensagem existente (ex: de enviado p/ lido). |
| `ticket` (action: update) | Verificar se status mudou (ex: fechado por outro admin) para travar input. |

---

## 7. Notificações (Push) 🔔

Para mensagens recebidas com o app em background.

*   **Identificação:** Payload contém `type: "CHAT_MESSAGE"` e `ticketId`.
*   **Comportamento:** Ao clicar na notificação, abrir diretamente a **Chat Window** do `ticketId` correspondente.

---

## 8. Gestão de Perfil (User Profile) 👤

Funcionalidades para o usuário visualizar e editar seus próprios dados.

### 8.1 Visualizar Dados
Carrega os dados atuais do usuário logado.

```http
GET /users/:userId
Headers: Authorization: Bearer <token>
```
> **Nota:** O `userId` é obtido no momento do login (Objeto `user`).

**Response:**
```json
{
  "id": 1,
  "name": "Admin User",
  "email": "admin@watink.com",
  "profile": "admin",
  "profileImage": "filename.jpg",
  "super": false,
  "permissions": [
    "ticket:read",
    "ticket:update",
    "contact:read"
  ]
}
```

> **Nota:** O campo `permissions` retorna a lista combinada de permissões (Diretas + Grupos) no formato `resource:action`. Utilize para controle de acesso na UI.

### 8.2 Atualizar Perfil
Permite alterar nome, email, senha e foto de perfil.

```http
PUT /users/:userId
Content-Type: multipart/form-data
```

**Body (FormData):**
```
name: "Novo Nome" (Opcional)
email: "novo@email.com" (Opcional)
password: "nova_senha" (Opcional - Min 6 chars)
profileImage: [FILE] (Opcional - Imagem para avatar)
```

> **Regras:**
> *   O usuário comum só pode editar o **próprio** perfil.
> *   Para alterar senha, enviar o campo `password`. Se não enviado, a senha atual é mantida.

---

## 9. Sistema de Tags 🏷️

O sistema de tags permite categorizar contatos e tickets para organização e filtragem avançada.

### 9.1 Listar Tags Disponíveis
Obtém todas as tags configuradas para uso em filtros e seleção.

```http
GET /tags
Headers: Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "VIP",
    "color": "#4CAF50",
    "usageCount": 15
  },
  {
    "id": 2,
    "name": "Urgente",
    "color": "#F44336",
    "usageCount": 8
  }
]
```

### 9.2 Filtrar Contatos por Tags
Utilize o parâmetro `tags` na listagem de contatos para filtrar por uma ou mais tags.

```http
GET /contacts?tags=1,2&pageNumber=1
```
*Filtra contatos que possuem a tag de ID 1 **OU** ID 2.*

### 9.3 Filtrar Tickets por Tags
Utilize o parâmetro `tags` na listagem de tickets.

```http
GET /tickets?status=open&tags=1&pageNumber=1
```

### 9.4 Exibição de Tags na UI

*   **Contatos/Tickets (Listas):** Renderize as tags como "bolinhas" (dots) coloridas. Use `Tooltip` para exibir o nome ao passar o mouse/toque longo.
    ```jsx
    // Exemplo React Native (pseudo-código)
    {item.tags?.map(tag => (
      <View key={tag.id} style={{ backgroundColor: tag.color, width: 10, height: 10, borderRadius: 5 }} />
    ))}
    ```
*   **Drawer de Contato/Ticket:** Exiba as tags como `Chips` completos com nome e cor.

### 9.5 Aplicar/Remover Tags (Contatos)
As tags de um contato são gerenciadas via atualização do contato.

```http
PUT /contacts/{contactId}
Content-Type: application/json

{
  "tags": [1, 3]
}
```
*Este endpoint **sincroniza** as tags: adiciona as novas e remove as ausentes. O payload deve conter o array `tags` com os IDs.*

### 9.6 Aplicar/Remover Tags (Tickets)
As tags de um ticket específico também podem ser gerenciadas diretamente.

```http
PUT /tickets/{ticketId}
Content-Type: application/json

{
  "tags": [2, 4]
}
```
*Similar aos contatos, este endpoint **sincroniza** as tags do ticket.*

---

## 10. Status de Implementação (Changelog)

| Versão | Data       | Mudança                                                                 |
|--------|------------|-------------------------------------------------------------------------|
| 2.12   | 2026-02-04 | Inclusão de endpoints de Atividades e Estrutura de RDO (Materiais/Ocorrências) |
| 2.11   | 2026-01-27 | Adicionado documentação da estrutura completa de Ticket (campo `whatsapp`) |
| 2.10   | 2026-01-27 | Correção de payload de Tags (tagIds -> tags) e inclusão de Tags em Tickets e Permissions no User Profile |
| 2.9    | 2026-01-26 | Adicionado documentação do Sistema de Tags (Listagem, Filtros, UI)      |
| 2.8    | 2026-01-25 | Adicionado documentação de KPIs de Tickets (Contagem por Status)        |
| 2.7    | 2026-01-25 | Adicionado Módulo de Gestão de Perfil (User Profile)                    |
| 2.6    | 2026-01-25 | Adicionado documentação completa do Módulo de Suporte (Helpdesk)        |
|--------|------------|-------------------------------------------------------------------------|
| 2.5    | 2026-01-25 | Documentada lógica Client-Side de Assinatura de Mensagens (Prefixo)     |
| 2.4    | 2026-01-24 | Adicionado tabela de mapeamento de ACK (Ticks/Leitura)                  |
| 2.3    | 2026-01-24 | Inclusão de `frontendUrl` no template de protocolo e endpoint de branding |
| 2.2    | 2026-01-24 | Adicionado detalhamento de Abas (Inbox) e Estados (Atendendo vs Aguardando) |
| 2.1    | 2026-01-24 | Documento especializado: Módulo Chat (UI, Sockets, Actions, Helpdesk)   |
| 2.0    | 2026-01-24 | Separação da documentação Chat da API completa Standard             |
