# Implementação de Suporte a LID (Local ID) do WhatsApp

## Objetivo
Adaptar o sistema para suportar corretamente os LIDs (Local IDs) do WhatsApp, conforme detalhado no relatório de correções. Isso evitará que LIDs sejam salvos incorretamente no campo de número de telefone e garantirá a exibição correta na interface.

## User Review Required
> [!IMPORTANT]
> Esta mudança envolve uma alteração no esquema do banco de dados (adição da coluna `lid` na tabela `Contacts`).

## Arquitetura e Conformidade (Microservices)
O plano respeita estritamente a arquitetura definida em `rule/dev_micro.md`:
- **Protocolo**: Todas as trocas de informação (Mensagens, Status, Qrcode) continuam via RabbitMQ (AMQP).
- **Contratos**: As mensagens de fila serão tipadas em `microservice/contracts.ts` (backend) e `contracts.ts` (engine).
- **Desacoplamento**: O Engine (`whaileys`) permanece agnóstico de regras de negócio; ele apenas transmite o payload bruto (incluindo participantes e LIDs) para o Backend processar.

## Alterações Propostas

### Backend

#### Banco de Dados
- **Migration**: Criar migration para adicionar a coluna `lid` (String, Unique, AllowNull) na tabela `Contacts`.
- **Migration**: Alterar coluna `number` para permitir valores Nulos (`AllowNull: true`). Isso é crucial para contatos que possuem apenas LID. A constraint Unique deve permitir múltiplos nulos (comportamento padrão do Postgres).

#### Models
- [MODIFY] [Contact.ts](file:///c:/dev/whaticket-community/backend/src/models/Contact.ts)
    - Adicionar propriedade `lid`.
    - Alterar propriedade `number` para `AllowNull(true)`.
    - Remover `@Default("")` se existir para evitar violação de unicidade com strings vazias em massa.

#### Services
- [MODIFY] [CreateOrUpdateContactService.ts](file:///c:/dev/whaticket-community/backend/src/services/ContactServices/CreateOrUpdateContactService.ts)
    - Aceitar `lid` na interface `Request`.
    - Lógica de determinação de `number` vs `lid`:
        - **Grupo** (`isGroup`): Manter comportamento atual (usar `number` fornecido).
        - **LID** (`lid` presente): Gravar `lid`, deixar `number` NULL.
        - **Regular**: Gravar `number` (limpar não-dígitos), `lid` NULL.
    - Lógica de lookup (busca):
        - Se `lid` fornecido: Buscar `where: { lid }`.
        - Se não: Buscar `where: { number }`.
- [MODIFY] [UpdateContactService.ts](file:///c:/dev/whaticket-community/backend/src/services/ContactServices/UpdateContactService.ts)
    - Aceitar `lid` na atualização.

#### Services
- [MODIFY] [ListTicketsService.ts](file:///c:/dev/whaticket-community/backend/src/services/TicketServices/ListTicketsService.ts)
    - Adicionar suporte a filtro de grupos.
    - Se parâmetro `isGroup` for `true`: Filtrar onde `Contact.isGroup = true`.
    - Se parâmetro `isGroup` for `false`: Filtrar onde `Contact.isGroup = false` (para abas Open/Pending não mostrarem grupos).

#### Listeners
- [MODIFY] [EventListener.ts](file:///c:/dev/whaticket-community/backend/src/services/WbotServices/EventListener.ts)
    - Atualizar `handleMessageReceived` para identificar LIDs e lidar com Grupos/Participantes.
    - Lógica de ID de Contato:
        - **Grupo**: `message.from` é o JID do grupo. A mensagem deve ser vinculada a um contato *Participante* (`message.participant`).
        - **Individual**: `message.from` é o contato.
    - Lógica de Avatar:
        - Recuperar avatar tanto do Grupo quanto do Participante (se disponível no payload).
        - Atualizar `profilePicUrl` do contato.
    - Lógica LID (mantida): Identificar se o remetente (ou participante) é LID.

### Engine (Standard)

#### Contracts
- [MODIFY] [contracts.ts](file:///c:/dev/whaticket-community/engine-standard/src/contracts.ts)
    - Verificado: `MessageReceivedPayload` já possui campo `participant`.
    - Adicionar campos `profilePicUrl` e `pushName` ao payload `MessageReceivedPayload`.
    - Adicionar campo `groupMetadata` (opcional) ou apenas `groupSubject` se for viável extrair.

#### Session Logic
- [MODIFY] [session.ts](file:///c:/dev/whaticket-community/engine-standard/src/session.ts)
    - **Extração de Nomes**:
        - Extrair `msg.pushName` e enviar no payload.
        - Se for grupo (`isGroup`), tentar obter o `subject` (Nome do Grupo). *Nota: Baileys armazena dados de grupo em cache store, ver se acessível ou fazer `sock.groupMetadata` sob demanda (com retries/cache para performance).*
        - Se for LID, o `pushName` é essencial.
    - **Participante**: Mapear `msg.key.participant` -> `payload.message.participant`.
    - **Avatar**: Extrair URL do avatar (`profilePicUrl`).

### Frontend

#### Components
- [MODIFY] [ContactDrawer/index.js](file:///c:/dev/whaticket-community/frontend/src/components/ContactDrawer/index.js)
    - Implementar lógica de fallback: se `number` for vazio ou começar executando validação de LID, exibir o campo "LID".
    - Melhorar formatação para não tentar aplicar máscara de telefone em LIDs.
- [MODIFY] [ContactModal/index.js](file:///c:/dev/whaticket-community/frontend/src/components/ContactModal/index.js)
    - Ao abrir modal, se `number` parecer um LID, limpar campo `number` (visual) e exibir LID em campo separado (disabled).
- [MODIFY] [TicketsManager/index.js](file:///c:/dev/whaticket-community/frontend/src/components/TicketsManager/index.js)
    - Adicionar nova Tab "Grupos" (`groups`).
    - Ajustar `TicketsList` para aceitar prop `isGroup`.
    - Lógica de Abas:
        - Aba "Abertos" (Open): Passar status="open" e `isGroup="false"`.
        - Aba "Aguardando" (Pending): Passar status="pending" e `isGroup="false"`.
        - Aba "Grupos": Passar status="open" (ou pending também?) e `isGroup="true"`. *Conversar com usuário se Grupos deve mostrar open+pending juntos ou separar.* Assumiremos Open+Pending misturados ou apenas Open por enquanto, focando em segregar do fluxo principal.

## Plano de Verificação

### Testes Manuais
1. **Recebimento de Mensagem (LID)**: Enviar mensagem de uma conta que use LID (ex: conta comercial oculta ou cenário específico de privacidade). Verificar se no banco de dados o contato é criado com `lid` preenchido e `number` correto (ou vazio se não disponível).
2. **Contact Drawer**: Abrir o drawer desse contato e verificar se o LID é exibido corretamente.
3. **Contact Modal**: Tentar editar esse contato e verificar se o campo de número e LID se comportam como esperado.
4. **Grupos Tab**: Verificar se mensagens de grupos (`@g.us`) aparecem *exclusivamente* na aba Grupos e somem das abas principais.
