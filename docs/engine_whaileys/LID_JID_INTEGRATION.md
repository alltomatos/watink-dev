# Integração LID e JID no Envio de Mensagens

Este documento detalha a implementação do fluxo de envio de mensagens no Watink, focando no tratamento robusto de identificadores do WhatsApp (JID e LID) para garantir a entrega e a consistência dos dados de contato.

## Conceitos Fundamentais

*   **JID (Jabber ID):** Identificador baseado no número de telefone (ex: `5511999998888@s.whatsapp.net`). É o endereço principal para envio de mensagens. No Brasil, sofre variações devido ao 9º dígito.
*   **LID (Linked Device ID):** Identificador único e imutável associado à conta do WhatsApp, independente do número de telefone. É crucial para manter a rastreabilidade do contato mesmo se o número mudar ou for formatado incorretamente.

## Fluxo de Envio de Mensagens

O sistema foi atualizado para utilizar uma estratégia de **Validação Cruzada** entre o Backend e o Engine.

### 1. Backend (`SendWhatsAppMessage`)
Ao criar uma mensagem para envio:
1.  O sistema sanitiza o número do contato (remove caracteres não numéricos).
2.  Verifica se o contato já possui um **LID** armazenado.
3.  Envia o comando para o RabbitMQ incluindo:
    *   `to`: O JID construído com o número atual (ex: `551199998888@s.whatsapp.net`).
    *   `lid`: O LID do contato, se disponível (ex: `123456789@lid`).

### 2. Engine (`SessionManager`)
Ao receber o comando de envio (`sendText` ou `sendMedia`), o Engine executa o método `validateAndCorrectJid`:

1.  **Verificação de Grupo:** Se o destino for um grupo (`@g.us`), o JID é usado diretamente.
2.  **Validação Individual (`onWhatsApp`):**
    *   O Engine consulta a API do WhatsApp para verificar se o número (`to`) é válido.
    *   A API retorna o **JID Oficial** (JID Real) associado àquela conta.
3.  **Detecção de Divergência (9º Dígito):**
    *   Se o `JID Oficial` for diferente do `JID Solicitado` (ex: enviou com 9 dígitos, mas a conta é registrada sem, ou vice-versa), o Engine detecta o erro.
4.  **Auto-Correção e Atualização:**
    *   O Engine utiliza o **JID Oficial** para realizar o envio, garantindo que a mensagem chegue.
    *   Se o payload continha um `lid`, o Engine emite um evento `contact.update` para o Backend:
        *   **Payload:** `{ lid: "...", number: "novo_numero" }`
        *   **Ação no Backend:** O Backend localiza o contato pelo LID (imutável) e atualiza o número de telefone para o formato correto retornado pelo WhatsApp.

## Benefícios da Implementação

1.  **Garantia de Entrega:** Mensagens não falham mais silenciosamente devido a inconsistências de formatação (9º dígito).
2.  **Auto-Saneamento:** O banco de dados do Backend é progressivamente corrigido à medida que mensagens são enviadas, sem necessidade de varreduras em massa.
3.  **Robustez:** O uso do LID como chave de atualização impede a criação de contatos duplicados ou a atualização do contato errado.

## Estrutura de Dados (Payloads)

Os contratos de envio foram atualizados para suportar o campo opcional `lid`.

```typescript
export interface SendTextPayload {
  sessionId: number;
  messageId?: string;
  to: string;       // JID (Número)
  lid?: string;     // LID (Opcional, mas recomendado)
  body: string;
  // ...
}
```

## Exemplo de Fluxo de Correção

1.  **Backend:** Contato salvo como `5511988887777` (Com 9º dígito). LID: `123@lid`.
2.  **Envio:** Backend envia msg para `5511988887777@s.whatsapp.net` com LID `123@lid`.
3.  **Engine:** Consulta `onWhatsApp("5511988887777@s.whatsapp.net")`.
4.  **WhatsApp:** Retorna "Este usuário existe, mas o JID real é `551188887777@s.whatsapp.net`" (Sem 9º dígito).
5.  **Engine:**
    *   Envia mensagem para `551188887777@s.whatsapp.net` (Sucesso).
    *   Publica evento `contact.update` -> `{ lid: "123@lid", number: "551188887777" }`.
6.  **Backend:** Recebe evento, busca contato com LID `123@lid` e atualiza número para `551188887777`.
7.  **Próximo Envio:** Backend já envia para `551188887777@s.whatsapp.net` (Correto).
