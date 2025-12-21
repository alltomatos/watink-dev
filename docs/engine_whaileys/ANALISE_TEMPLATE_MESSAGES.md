# Análise Técnica: Template Messages (Legacy)

Este documento analisa a estrutura de `templateMessage` fornecida, que utiliza `hydratedTemplate` e `hydratedFourRowTemplate`.

## 1. O que é este Template?

O JSON fornecido representa o formato **antigo** de botões do WhatsApp (Template Buttons), que foi amplamente substituído por `interactiveMessage` (Native Flow).

```json
{
  "templateMessage": {
    "hydratedTemplate": {
      "hydratedButtons": [...],
      "hydratedContentText": "..."
    },
    "hydratedFourRowTemplate": { ... }
  }
}
```

### Características:

- **`hydratedButtons`**: Lista de botões (`quickReplyButton`, `urlButton`, `callButton`).
- **`hydratedContentText`**: O corpo da mensagem.
- **Duplicidade**: O JSON mostra o mesmo conteúdo em `hydratedTemplate` e `hydratedFourRowTemplate`. O WhatsApp geralmente usa o `fourRowTemplate` para renderização.

## 2. Situação Atual no WhatsApp

⚠️ **IMPORTANTE**: O suporte para `templateMessage` (Botões de Template não cadastrados) está **depreciado** e instável para muitos números, especialmente no IOS.

- **Android**: Ainda renderiza, mas com frequência converte para texto clicável ou falha.
- **iOS**: Frequentemente não exibe os botões ou exibe como texto simples.
- **WhatsApp Web**: Funcionalidade reduzida.

## 3. Implementação Baileys-Pro

O Baileys ainda possui código para gerar essas mensagens (arquivo `src/Utils/messages.ts`):

```typescript
if ("templateButtons" in message && !!message.templateButtons) {
  const msg: proto.Message.TemplateMessage.IHydratedFourRowTemplate = {
    hydratedButtons: message.templateButtons,
  };
  // ... mapeamento de texto/caption ...
  m = {
    templateMessage: {
      fourRowTemplate: msg,
      hydratedTemplate: msg, // Baileys preenche ambos por compatibilidade
    },
  };
}
```

O código do Baileys está alinhado com o JSON fornecido (preenche ambos os campos), mas o **problema não é o código, é o protocolo**.

## 4. Risco de Parar de Funcionar

Como o usuário mencionou "evitar que a função pare de funcionar", o diagnóstico é claro: **Templates Hídricos (Hydrated Templates) não são mais confiáveis para envio ad-hoc (sem cadastro no Meta).**

### Sintomas de falha:

1.  Botões não aparecem para o destinatário.
2.  Mensagem chega apenas com o texto.
3.  Mensagem falha no envio.
4.  **iOS**: Botões são completamente removidos ou aparecem apenas como texto simples.
5.  **Android**: Renderização inconsistente, botões podem aparecer como links clicáveis ou não aparecer.

### ⚠️ IMPORTANTE - Status Atual (Meta 2025):

- **Template Messages (Hydrated)**: DEPRECIADO oficialmente pela Meta
- **Suporte iOS**: REMOVIDO desde WhatsApp v2.24.x
- **Suporte Android**: Em fase de descontinuação gradual
- **WhatsApp Web**: Funcionalidade limitada ou ausente

### ✅ Solução Recomendada: Native Flow

A única solução estável e compatível é migrar para `interactiveMessage` com `nativeFlowMessage`. Este formato:

- **Funciona sem cadastro Meta**: Não requer WhatsApp Business API aprovado
- **Compatível com todos os dispositivos**: iOS, Android, Web
- **Não expira**: Não está sujeito à depreciação como templates
- **Bypass 24h**: Funciona fora da janela de atendimento de 24 horas

## 5. Migração: Template para Native Flow (Sem Cadastro Meta)

### ⚠️ Confirmação Importante

Se você **NÃO possui cadastro na Meta/WhatsApp Business API**, o uso de Template Messages é arriscado e provavelmente já está falhando (principalmente no iOS).

### ✅ Solução Segura: Interactive Messages com Native Flow

Este formato funciona em qualquer número (Business ou não) e não requer aprovação de template.

### Exemplo Prático de Conversão

#### ❌ ANTES (Template Legacy - DEPRECIADO):

```json
{
  "templateMessage": {
    "hydratedFourRowTemplate": {
      "hydratedContentText": "Ei, Felipe! Imagina rodar com um carro 0km?",
      "hydratedButtons": [
        {
          "quickReplyButton": {
            "id": "LIGAR PARA NAKAMURA",
            "displayText": "LIGAR PARA A NAKAMURA"
          }
        },
        {
          "quickReplyButton": {
            "id": "FALAR NO WHATSAPP",
            "displayText": "FALAR NO WHATSAPP"
          }
        },
        {
          "quickReplyButton": {
            "id": "PARAR MENSAGENS",
            "displayText": "PARAR MENSAGENS"
          }
        }
      ]
    }
  }
}
```

#### ✅ DEPOIS (Native Flow - RECOMENDADO):

```typescript
// Código para Baileys-Pro (Example-buttons.ts)
import { WAWebInteractiveMessagesNativeFlowNameEnum } from '../src/Types/Message';

async function sendKoviMessage(jid: string) {
    await sock.sendMessage(jid, {
        text: "Ei, Felipe Nakamura! Imagina rodar com um *carro 0km* e aumentar seus ganhos em até 28%? 😱 \n\n*Com a Kovi, é possível!* Quer saber como? \n\n🚗 Trabalhamos com modelos aceitos na *categoria Comfort dos apps*! \n\n💰 Ao rodar nessa categoria, você aumenta seus ganhos médios! \n\n👉 Na prática: se você costuma faturar R$9.700, esse valor aumenta para R$12.416 rodando no Comfort! E o melhor: tudo com manutenção, proteção e documentação inclusos! 🤔 \n\nQuer saber mais? *Responda essa mensagem* e fale direto com nosso time!",

        footer: "Confira modelos disponíveis\nCaso não queira mais receber mensagem, clique em \"parar\".",

        interactiveButtons: [
            {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: "LIGAR PARA A NAKAMURA",
                    id: "LIGAR PARA NAKAMURA"
                })
            },
            {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: "FALAR NO WHATSAPP",
                    id: "FALAR NO WHATSAPP"
                })
            },
            {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: "PARAR MENSAGENS",
                    id: "PARAR MENSAGENS"
                })
            }
        ]
    });
}
```

### Por que isso funciona sem cadastro?

1. **Tipo de Botão**: Usamos `quick_reply` dentro de `native_flow`
2. **Native Flow**: É um recurso nativo do WhatsApp, renderizado localmente pelo aparelho
3. **Sem Template**: Ao contrário dos "Template Messages" antigos, este formato é enviado como mensagem "raw" (comum), apenas formatada de jeito especial
4. **Sem Validação Meta**: O WhatsApp não valida isso contra um template pré-aprovado no servidor da Meta

### Tipos de Botões Disponíveis

#### 1. Quick Reply (Resposta Rápida) - RECOMENDADO

```typescript
{
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({
        display_text: "TEXTO DO BOTÃO",
        id: "ID_UNICO"
    })
}
```

#### 2. Call Button (Botão de Chamada)

```typescript
{
    name: 'cta_call',
    buttonParamsJson: JSON.stringify({
        display_text: "LIGAR PARA NAKAMURA",
        phone_number: "+5511999999999" // Número deve ser fixo
    })
}
```

⚠️ **Atenção**: Botões de chamada podem ter restrições em alguns dispositivos iOS. Teste antes de usar em produção.

#### 3. URL Button (Botão de Link)

```typescript
{
    name: 'cta_url',
    buttonParamsJson: JSON.stringify({
        display_text: "ACESSAR SITE",
        url: "https://exemplo.com",
        merchant_url: "https://exemplo.com" // Campo obrigatório para compatibilidade
    })
}
```

### Recomendação de Implementação

Para máxima compatibilidade, use **quick_reply** para todas as ações inicialmente. Se o usuário clicar em "Ligar", seu bot recebe a mensagem e pode:

1. Enviar o contato (VCard)
2. Enviar o número formatado
3. Instruir o usuário a ligar

Exemplo de fluxo seguro:

```typescript
// Usuário clica em "LIGAR PARA NAKAMURA"
// Bot recebe: message.interactiveResponseMessage com id="LIGAR PARA NAKAMURA"

// Resposta do bot:
await sock.sendMessage(jid, {
    text: "📞 Ligue para: +55 11 99999-9999\n\nOu clique no contato abaixo:",
    contacts: {
        displayName: "Nakamura - Kovi",
        contacts: [{
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:Nakamura\nTEL;type=CELL;type=VOICE;waid=5511999999999:+55 11 99999-9999\nEND:VCARD`
        }]
    }
});
```

### Vantagens do Native Flow

| Característica | Template (Legacy) | Native Flow |
|----------------|-------------------|-------------|
| Requer cadastro Meta | ❌ Sim | ✅ Não |
| Funciona iOS | ❌ Não (2024+) | ✅ Sim |
| Funciona Android | ⚠️ Inconsistente | ✅ Sim |
| Funciona WhatsApp Web | ❌ Limitado | ✅ Sim |
| Expira/Deprecia | ❌ Sim | ✅ Não |
| Bypass janela 24h | ❌ Não | ✅ Sim |

### Conclusão

A estrutura `interactiveMessage` com `nativeFlowMessage` é a substituta oficial e estável para os botões de resposta rápida e ações. **Migre imediatamente** para evitar falhas de entrega.
