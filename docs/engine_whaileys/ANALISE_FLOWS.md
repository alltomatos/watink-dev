# Análise Técnica: WhatsApp Flows (galaxy_message)

Este documento analisa a estrutura de mensagens interativas para uso de **WhatsApp Flows**, identificadas pelo nome chave `galaxy_message`.

---

## 1. O que é `galaxy_message`?

No contexto da API do WhatsApp, `galaxy_message` refere-se a um tipo de botão nativo (Native Flow) que dispara um **Fluxo (Flow)**. Fluxos são telas interativas personalizadas (construídas em JSON/React-like) que abrem dentro do WhatsApp para coletar dados, agendar horários, etc.

## 2. Estrutura Oficial (Fornecida)

```json
{
  "interactiveMessage": {
    "body": {
      "text": "Por favor, envie-nos seus dados."
    },
    "nativeFlowMessage": {
      "buttons": [
        {
          "name": "galaxy_message",
          "buttonParamsJson": "{\"flow_message_version\":\"4\",\"flow_id\":\"4290182081238215\",\"flow_action_payload\":{\"screen\":\"contact_details\",\"data\":{\"full_name_visible\":true,\"phone_number_visible\":true,\"email_visible\":true,\"offer_name\":\"jj\",\"offer_description\":\"teste\"}},\"well_version\":\"V700\",\"flow_cta\":\"__localize:FLOWS_SIGN_UP_BUTTON_TITLE\",\"flow_action\":\"navigate\",\"flow_token\":\"T0ZGRVJfU0lHTlVQ\"}"
        }
      ],
      "messageVersion": 3,
      "messageParamsJson": "{}"
    }
  }
}
```

### Componentes Chave:

1.  **`name: "galaxy_message"`**: Identificador obrigatório para botões de fluxo.
2.  **`flow_message_version`**: Versão da mensagem do fluxo (ex: "4").
3.  **`flow_id`**: O ID único do fluxo criado no Meta Business Manager.
4.  **`flow_action`**: Ação inicial, geralmente `navigate` (navegar para uma tela).
5.  **`flow_action_payload`**:
    - `screen`: ID da tela inicial do fluxo (ex: `contact_details`).
    - `data`: Dados iniciais passados para o fluxo.
6.  **`flow_cta`**: Texto do botão. Pode ser uma string fixa ou uma chave de localização como `__localize:FLOWS_SIGN_UP_BUTTON_TITLE` (vira "Cadastrar-se" ou similar).
7.  **`flow_token`**: Um token opcional para rastrear ou validar a sessão do fluxo.

## 3. Implementação no Baileys-Pro

O Baileys já possui suporte básico para isso através do enum `WAWebInteractiveMessagesNativeFlowNameEnum.GALAXY_MESSAGE`.

### Como Enviar um Flow:

Para replicar o JSON oficial fornecido, utilize o `sendMessage` da seguinte forma:

```typescript
import { WAWebInteractiveMessagesNativeFlowNameEnum } from "../src/Types/Message";

await sock.sendMessage(jid, {
  text: "Por favor, envie-nos seus dados.",
  interactiveButtons: [
    {
      name: WAWebInteractiveMessagesNativeFlowNameEnum.GALAXY_MESSAGE, // ou 'galaxy_message'
      buttonParamsJson: JSON.stringify({
        flow_message_version: "3", // Versão do protocolo
        flow_id: "SEU_FLOW_ID_AQUI",
        flow_action: "navigate",
        flow_token: "SEU_TOKEN_DE_RASTREAMENTO", // Opcional
        flow_cta: "Cadastrar", // Texto do botão
        flow_action_payload: {
          screen: "contact_details", // Nome da tela inicial do seu fluxo
          data: {
            // Dados dinâmicos para seu fluxo
            full_name_visible: true,
            offer_name: "Oferta Especial",
          },
        },
      }),
    },
  ],
});
```

## 4. Diferenças e Atenção (Meta 2025)

### Versões do Protocolo:

| Campo | Versão Oficial (Meta) | Baileys Atual | Recomendação |
|-------|----------------------|---------------|--------------|
| `flow_message_version` | `"4"` | `"3"` | ✅ Atualizar para `"4"` |
| `messageVersion` | `3` | `1` | ✅ Atualizar para `3` |
| `well_version` | `"V700"` | Ausente | ⚠️ Adicionar (opcional) |

### Campos Críticos:

1. **`flow_message_version: "4"`**
   - Versão atual do protocolo de flows da Meta (2025)
   - Suporta novos recursos de validação e navegação
   - Backward compatible com v3, mas v4 é recomendado

2. **`messageVersion: 3`**
   - Versão da mensagem interativa nativa
   - Necessário para flows com múltiplas telas
   - Versão 1 não suporta alguns recursos avançados

3. **`well_version: "V700"`**
   - Versão do "WELL" (WhatsApp Encryption Layer)
   - Opcional mas recomendado para compatibilidade
   - V700 é a versão mais recente

4. **`flow_token`**
   - Token base64 para rastreamento de sessão
   - Exemplo: `"T0ZGRVJfU0lHTlVQ"` = base64("OFFER_SIGNUP")
   - Útil para analytics e validação server-side

### Validações Importantes:

- **JSON Stringify**: É **CRÍTICO** que `buttonParamsJson` seja uma **string JSON**, não um objeto direto. Use `JSON.stringify()` sempre.
- **Flow ID**: Deve ser um ID válido de flow criado no Meta Business Manager
- **Screen ID**: O valor de `screen` deve existir no flow configurado
- **Encriptação**: Flows com dados sensíveis podem exigir encriptação adicional via WELL

### Exemplo Atualizado (2025):

```typescript
await sock.sendMessage(jid, {
  text: "Por favor, envie-nos seus dados.",
  footer: "Formulário seguro",
  interactiveButtons: [{
    name: WAWebInteractiveMessagesNativeFlowNameEnum.GALAXY_MESSAGE,
    buttonParamsJson: JSON.stringify({
      flow_message_version: "4", // ✅ Versão atualizada
      flow_id: "SEU_FLOW_ID_AQUI",
      flow_action: "navigate",
      flow_token: btoa("CUSTOM_TRACKING_ID"), // Base64 encode
      flow_cta: "Preencher Dados",
      flow_action_payload: {
        screen: "contact_details",
        data: {
          full_name_visible: true,
          phone_number_visible: true,
          email_visible: true,
          offer_name: "Promoção Especial",
          offer_description: "Desconto de 20%"
        }
      },
      well_version: "V700" // ✅ Versão WELL
    })
  }],
  // Configuração adicional para messageVersion
  nativeFlowMessageVersion: 3 // ✅ Se suportado pelo Baileys
});
```

## 5. Requisitos para Usar Flows

### ⚠️ IMPORTANTE - Limitações sem Cadastro Meta:

**Galaxy Message (Flows) REQUER cadastro no Meta Business Manager!**

Diferente de `quick_reply` e `cta_url` que funcionam sem cadastro, os **Flows são recursos exclusivos do WhatsApp Business API** e possuem os seguintes requisitos:

1. **✅ Conta WhatsApp Business API**
   - Não funciona com WhatsApp Business App comum
   - Requer aprovação da Meta

2. **✅ Flow Configurado no Meta Business Manager**
   - Acessar: https://business.facebook.com/wa/manage/flows/
   - Criar flow com telas interativas (JSON Schema)
   - Copiar `flow_id` gerado

3. **✅ Número Verificado**
   - Número deve estar vinculado à conta Business
   - Passar por verificação da Meta

### Alternativa para Usuários sem Cadastro:

Se você **NÃO possui cadastro Meta**, use os seguintes tipos de botão ao invés de `galaxy_message`:

```typescript
// ❌ NÃO FUNCIONA sem cadastro Meta:
{ name: 'galaxy_message', ... }

// ✅ FUNCIONA sem cadastro Meta:
{ name: 'quick_reply', ... }      // Resposta rápida
{ name: 'cta_url', ... }           // Link
{ name: 'cta_call', ... }          // Chamada (limitações iOS)
{ name: 'single_select', ... }     // Lista de opções
```

### Como Criar um Flow no Meta Business Manager:

Se você possui cadastro Meta, siga estes passos:

1. **Acessar o Painel de Flows**
   ```
   https://business.facebook.com/wa/manage/flows/
   ```

2. **Criar Novo Flow**
   - Clique em "Create Flow"
   - Escolha template ou crie do zero

3. **Configurar Telas**
   ```json
   {
     "version": "4.0",
     "screens": [
       {
         "id": "contact_details",
         "title": "Seus Dados",
         "layout": {
           "type": "SingleColumnLayout",
           "children": [
             {
               "type": "TextInput",
               "name": "full_name",
               "label": "Nome Completo",
               "required": true
             },
             {
               "type": "TextInput",
               "name": "phone_number",
               "label": "Telefone",
               "input-type": "phone",
               "required": true
             },
             {
               "type": "TextInput",
               "name": "email",
               "label": "E-mail",
               "input-type": "email",
               "required": true
             },
             {
               "type": "Footer",
               "label": "Enviar",
               "on-click-action": {
                 "name": "complete",
                 "payload": {}
               }
             }
           ]
         }
       }
     ]
   }
   ```

4. **Publicar e Copiar ID**
   - Após salvar, copie o `flow_id`
   - Exemplo: `"4290182081238215"`

5. **Usar no Baileys**
   ```typescript
   flow_id: "4290182081238215"
   ```

### Recebendo Dados do Flow:

Quando o usuário completa o flow, você recebe uma mensagem do tipo `nativeFlowResponseMessage`:

```typescript
// Listener para respostas de flow
sock.ev.on('messages.upsert', ({ messages }) => {
  const msg = messages[0];

  if (msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage) {
    const flowResponse = msg.message.interactiveResponseMessage.nativeFlowResponseMessage;
    const paramsJson = flowResponse.paramsJson;

    // Parse dos dados enviados pelo flow
    const formData = JSON.parse(paramsJson);

    console.log('Dados recebidos do flow:', {
      full_name: formData.full_name,
      phone_number: formData.phone_number,
      email: formData.email
    });

    // Processar dados conforme necessário
    // Ex: salvar no banco, enviar confirmação, etc.
  }
});
```

## 6. Conclusão

A estrutura `galaxy_message` é **extremamente poderosa** para criar experiências ricas de coleta de dados, agendamento, formulários complexos, etc.

### Pontos-Chave:

- ✅ **Flows funcionam apenas com WhatsApp Business API** (cadastro Meta obrigatório)
- ✅ **Versão recomendada**: `flow_message_version: "4"` e `messageVersion: 3`
- ✅ **Flow deve ser criado** previamente no Meta Business Manager
- ✅ O Baileys atua como **transportador**; a lógica está no flow configurado
- ✅ Para usuários sem cadastro, use **`quick_reply`**, **`cta_url`** ou **`single_select`** ao invés de flows

### Compatibilidade:

| Tipo de Botão | Sem Cadastro Meta | Com Cadastro Meta |
|---------------|-------------------|-------------------|
| `quick_reply` | ✅ Funciona | ✅ Funciona |
| `cta_url` | ✅ Funciona | ✅ Funciona |
| `cta_call` | ⚠️ Funciona (limitações iOS) | ✅ Funciona |
| `single_select` | ✅ Funciona | ✅ Funciona |
| `galaxy_message` | ❌ NÃO funciona | ✅ Funciona |
| `payment_info` | ⚠️ Funciona (validação limitada) | ✅ Funciona |
