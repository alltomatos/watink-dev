# 📱 Documentação - Estrutura de Mensagens WhatsApp

> **Versão:** 1.0.0  
> **Data:** 20/12/2024  
> **Arquivo Base:** `electron/whatsapp.ts`

Este documento explica como implementar botões, listas, enquetes e carrosséis no WhatsApp usando a biblioteca Whaileys (fork do Baileys).

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Imports Necessários](#imports-necessários)
3. [Tipos de Dados](#tipos-de-dados)
4. [Botões Simples](#1-botões-simples)
5. [Botões com Imagem](#2-botões-com-imagem)
6. [Botões Template](#3-botões-template)
7. [Mensagem Interativa (Native Flow)](#4-mensagem-interativa-native-flow)
8. [Lista de Opções](#5-lista-de-opções)
9. [Enquete (Poll)](#6-enquete-poll)
10. [Carrossel Nativo](#7-carrossel-nativo)
11. [Recebendo Respostas](#recebendo-respostas)
12. [Análise Técnica - Engenharia Reversa](#análise-técnica---engenharia-reversa)

---

## Visão Geral

O sistema suporta 7 tipos de mensagens interativas:

| Tipo | Método | Uso Principal |
|------|--------|---------------|
| Botões Simples | `sendButtons` | Respostas rápidas (até 3 botões) |
| Botões + Imagem | `sendButtonsWithImage` | Produto com opções |
| Template | `sendTemplateMessage` | URL, Ligação, Resposta |
| Interativo | `sendInteractiveMessage` | Bypassa restrição 24h |
| Lista | `sendList` | Menu com seções |
| Enquete | `sendPoll` | Votação/Quiz |
| Carrossel | `sendNativeCarousel` | Catálogo de produtos |

---

## Imports Necessários

```typescript
import * as BaileysRaw from 'whaileys'

// Extração robusta dos exports (ESM/CJS)
const Baileys = (BaileysRaw as any).default || BaileysRaw
const makeWASocket = Baileys.default || Baileys
const useMultiFileAuthState = Baileys.useMultiFileAuthState
const DisconnectReason = Baileys.DisconnectReason
const generateWAMessageFromContent = Baileys.generateWAMessageFromContent
const prepareWAMessageMedia = Baileys.prepareWAMessageMedia
const jidNormalizedUser = Baileys.jidNormalizedUser
```

---

## Tipos de Dados

```typescript
// Definição de botão
type ButtonDef = { 
  buttonId: string
  buttonText: { displayText: string }
  type: number  // 1 = resposta rápida
}

// Linha de lista
type ListRow = { 
  rowId: string
  title: string
  description?: string 
}

// Seção de lista
type ListSection = { 
  title: string
  rows: ListRow[] 
}
```

---

## 1. Botões Simples

Envia mensagem com até 3 botões de resposta rápida.

### Estrutura

```typescript
async sendButtons(
  instanceId: string,    // ID da instância WhatsApp
  toNumber: string,      // Número destino (ex: "5511999999999")
  text: string,          // Texto da mensagem
  footer: string,        // Rodapé (opcional)
  buttons: ButtonDef[]   // Array de botões (máx 3)
)
```

### Exemplo de Uso

```typescript
await sendButtons(
  'instancia-1',
  '5511999999999',
  'Olá! Como posso ajudar?',
  'Escolha uma opção',
  [
    { buttonId: 'btn_1', buttonText: { displayText: '📦 Ver Produtos' }, type: 1 },
    { buttonId: 'btn_2', buttonText: { displayText: '💬 Falar com Atendente' }, type: 1 },
    { buttonId: 'btn_3', buttonText: { displayText: '❌ Sair' }, type: 1 }
  ]
)
```

### Estrutura Enviada ao WhatsApp

```javascript
{
  text: "Olá! Como posso ajudar?",
  footer: "Escolha uma opção",
  buttons: [
    { buttonId: "btn_1", buttonText: { displayText: "📦 Ver Produtos" }, type: 1 },
    { buttonId: "btn_2", buttonText: { displayText: "💬 Falar com Atendente" }, type: 1 },
    { buttonId: "btn_3", buttonText: { displayText: "❌ Sair" }, type: 1 }
  ]
}
```

---

## 2. Botões com Imagem

Envia imagem com botões abaixo.

### Estrutura

```typescript
async sendButtonsWithImage(
  instanceId: string,
  toNumber: string,
  imageUrl: string,      // URL da imagem
  caption: string,       // Legenda da imagem
  footer: string,        // Rodapé
  buttons: ButtonDef[]   // Botões
)
```

### Exemplo de Uso

```typescript
await sendButtonsWithImage(
  'instancia-1',
  '5511999999999',
  'https://exemplo.com/produto.jpg',
  '🎁 *Produto Especial*\n\nR$ 99,90',
  'Promoção válida hoje',
  [
    { buttonId: 'comprar', buttonText: { displayText: '🛒 Comprar' }, type: 1 },
    { buttonId: 'info', buttonText: { displayText: 'ℹ️ Mais Info' }, type: 1 }
  ]
)
```

### Estrutura Enviada

```javascript
{
  image: { url: "https://exemplo.com/produto.jpg" },
  caption: "🎁 *Produto Especial*\n\nR$ 99,90",
  footer: "Promoção válida hoje",
  buttons: [...],
  headerType: 4  // 4 = imagem
}
```

---

## 3. Botões Template

Suporta 3 tipos de botões: URL, Ligação e Resposta Rápida.

### Estrutura

```typescript
async sendTemplateMessage(
  instanceId: string,
  toNumber: string,
  text: string,
  footer: string,
  buttons: Array<{
    type: 'url' | 'call' | 'reply'
    text: string
    url?: string           // Para type='url'
    phoneNumber?: string   // Para type='call'
    buttonId?: string      // Para type='reply'
  }>,
  mediaUrl?: string        // Imagem ou vídeo opcional
)
```

### Exemplo de Uso

```typescript
await sendTemplateMessage(
  'instancia-1',
  '5511999999999',
  'Confira nossa loja!',
  'Loja Virtual',
  [
    { type: 'url', text: '🌐 Acessar Site', url: 'https://minhaloja.com' },
    { type: 'call', text: '📞 Ligar', phoneNumber: '+5511999999999' },
    { type: 'reply', text: '💬 Responder', buttonId: 'responder' }
  ],
  'https://exemplo.com/banner.jpg'
)
```

### Estrutura Enviada

```javascript
{
  image: { url: "https://exemplo.com/banner.jpg" },
  caption: "Confira nossa loja!",
  footer: "Loja Virtual",
  templateButtons: [
    { index: 1, urlButton: { displayText: "🌐 Acessar Site", url: "https://minhaloja.com" } },
    { index: 2, callButton: { displayText: "📞 Ligar", phoneNumber: "+5511999999999" } },
    { index: 3, quickReplyButton: { displayText: "💬 Responder", id: "responder" } }
  ]
}
```

---

## 4. Mensagem Interativa (Native Flow)

**⚠️ IMPORTANTE:** Esta estrutura usa o formato `nativeFlowMessage` que é baseado na estrutura de pagamentos do WhatsApp Business.

### Estrutura

```typescript
async sendInteractiveMessage(
  instanceId: string,
  toNumber: string,
  text: string,
  footer: string,
  buttons: Array<{
    type: 'url' | 'call' | 'reply'
    text: string
    url?: string
    phoneNumber?: string
    buttonId?: string
  }>,
  mediaUrl?: string
)
```

### Exemplo de Uso

```typescript
await sendInteractiveMessage(
  'instancia-1',
  '5511999999999',
  'Escolha como deseja pagar:',
  'Pagamento Seguro',
  [
    { type: 'reply', text: '💳 PIX', buttonId: 'pix' },
    { type: 'reply', text: '💳 Cartão', buttonId: 'cartao' },
    { type: 'url', text: '🔗 Pagar Online', url: 'https://pagamento.com/xyz' }
  ]
)
```

### Estrutura Enviada (Native Flow)

```javascript
{
  interactiveMessage: {
    body: { text: "Escolha como deseja pagar:" },
    footer: { text: "Pagamento Seguro" },
    nativeFlowMessage: {
      buttons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "💳 PIX",
            id: "pix"
          })
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "💳 Cartão",
            id: "cartao"
          })
        },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "🔗 Pagar Online",
            url: "https://pagamento.com/xyz",
            merchant_url: "https://pagamento.com/xyz"
          })
        }
      ]
    }
  }
}
```

---

## 5. Lista de Opções

Menu com seções e itens clicáveis.

### Estrutura

```typescript
async sendList(
  instanceId: string,
  toNumber: string,
  text: string,           // Texto principal
  footer: string,         // Rodapé
  title: string,          // Título da lista
  buttonText: string,     // Texto do botão "Ver opções"
  sections: ListSection[] // Seções com itens
)
```

### Exemplo de Uso

```typescript
await sendList(
  'instancia-1',
  '5511999999999',
  'Bem-vindo à nossa loja! Escolha uma categoria:',
  'Loja Virtual 2025',
  'Catálogo',
  '📋 Ver Categorias',
  [
    {
      title: '🍕 Pizzas',
      rows: [
        { rowId: 'pizza_marg', title: 'Margherita', description: 'R$ 45,00' },
        { rowId: 'pizza_pepperoni', title: 'Pepperoni', description: 'R$ 55,00' }
      ]
    },
    {
      title: '🍔 Hambúrgueres',
      rows: [
        { rowId: 'burger_classic', title: 'Clássico', description: 'R$ 25,00' },
        { rowId: 'burger_bacon', title: 'Bacon', description: 'R$ 32,00' }
      ]
    }
  ]
)
```

### Estrutura Enviada

```javascript
{
  text: "Bem-vindo à nossa loja! Escolha uma categoria:",
  footer: "Loja Virtual 2025",
  title: "Catálogo",
  buttonText: "📋 Ver Categorias",
  sections: [
    {
      title: "🍕 Pizzas",
      rows: [
        { rowId: "pizza_marg", title: "Margherita", description: "R$ 45,00" },
        { rowId: "pizza_pepperoni", title: "Pepperoni", description: "R$ 55,00" }
      ]
    },
    // ...
  ]
}
```

---

## 6. Enquete (Poll)

Cria votação ou quiz.

### Estrutura

```typescript
async sendPoll(
  instanceId: string,
  toNumber: string,
  name: string,              // Pergunta
  options: string[],         // Opções (2-12)
  selectableCount: number,   // Quantas podem ser selecionadas
  pollType: 'poll' | 'quiz', // Tipo
  correctAnswerIndex?: number // Índice da resposta correta (quiz)
)
```

### Exemplo de Uso

```typescript
// Enquete simples
await sendPoll(
  'instancia-1',
  '5511999999999',
  'Qual seu sabor favorito?',
  ['🍫 Chocolate', '🍓 Morango', '🍦 Baunilha'],
  1,  // Pode escolher 1
  'poll'
)

// Quiz
await sendPoll(
  'instancia-1',
  '5511999999999',
  'Qual a capital do Brasil?',
  ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador'],
  1,
  'quiz',
  2  // Índice da resposta correta (Brasília)
)
```

### Estrutura Enviada

```javascript
{
  poll: {
    name: "Qual seu sabor favorito?",
    values: ["🍫 Chocolate", "🍓 Morango", "🍦 Baunilha"],
    selectableCount: 1
  }
}
```

---

## 7. Carrossel Nativo

Catálogo de produtos com navegação horizontal.

### Estrutura

```typescript
async sendNativeCarousel(
  instanceId: string,
  toNumber: string,
  cards: Array<{
    name: string
    price: string
    stock: string
    description: string
    imageUrl: string
    colors?: string[]
    sizes?: string[]
    unit?: string
    showStock?: boolean
  }>,
  carouselTitle?: string,
  carouselSubtitle?: string,
  buttons?: {
    button1?: string  // Texto botão 1 (padrão: "🛒 Adicionar")
    button2?: string  // Texto botão 2 (padrão: "ℹ️ Detalhes")
  }
)
```

### Exemplo de Uso

```typescript
await sendNativeCarousel(
  'instancia-1',
  '5511999999999',
  [
    {
      name: 'Camiseta Básica',
      price: '49.90',
      stock: '50',
      description: 'Camiseta 100% algodão',
      imageUrl: 'https://exemplo.com/camiseta.jpg',
      colors: ['Branco', 'Preto', 'Azul'],
      sizes: ['P', 'M', 'G', 'GG']
    },
    {
      name: 'Calça Jeans',
      price: '129.90',
      stock: '30',
      description: 'Calça jeans slim fit',
      imageUrl: 'https://exemplo.com/calca.jpg',
      sizes: ['38', '40', '42', '44']
    }
  ],
  'Confira nossos produtos!',
  'Loja • Catálogo 2025',
  {
    button1: '🛒 Comprar',
    button2: '📋 Ver Mais'
  }
)
```

### Estrutura Enviada (Complexa)

```javascript
{
  viewOnceMessage: {
    message: {
      interactiveMessage: {
        body: { text: "Confira nossos produtos!" },
        footer: { text: "Loja • Catálogo 2025" },
        header: { hasMediaAttachment: false },
        carouselMessage: {
          cards: [
            {
              header: {
                hasMediaAttachment: true,
                imageMessage: { /* dados da imagem */ }
              },
              body: { text: "*Camiseta Básica*\n\nCamiseta 100% algodão\n\nCores: Branco, Preto, Azul\nTamanhos: P, M, G, GG" },
              footer: { text: "R$ 49.90" },
              nativeFlowMessage: {
                buttons: [
                  {
                    name: "quick_reply",
                    buttonParamsJson: '{"display_text":"🛒 Comprar","id":"add_0"}'
                  },
                  {
                    name: "quick_reply",
                    buttonParamsJson: '{"display_text":"📋 Ver Mais","id":"info_0"}'
                  }
                ]
              }
            },
            // ... mais cards
          ],
          messageVersion: 1
        }
      }
    }
  }
}
```

### Funções Auxiliares Necessárias

```typescript
// Preparar imagem para o carrossel
const mediaMessage = await prepareWAMessageMedia(
  { image: { url: product.imageUrl } },
  { upload: sock.waUploadToServer }
)

// Gerar mensagem do carrossel
const msg = generateWAMessageFromContent(jid, messageContent, {
  userJid: sock.user?.id,
  quoted: undefined
})

// Enviar via relay (método preferido)
await sock.relayMessage(jid, msg.message!, {
  messageId: msg.key.id
})
```

---

## Recebendo Respostas

### Resposta de Botão

```typescript
// buttonsResponseMessage
if (msg.message.buttonsResponseMessage) {
  const buttonId = msg.message.buttonsResponseMessage.selectedButtonId
  const buttonText = msg.message.buttonsResponseMessage.selectedDisplayText
  console.log(`Botão clicado: ${buttonId} - ${buttonText}`)
}

// templateButtonReplyMessage
if (msg.message.templateButtonReplyMessage) {
  const buttonId = msg.message.templateButtonReplyMessage.selectedId
  const buttonText = msg.message.templateButtonReplyMessage.selectedDisplayText
  console.log(`Template clicado: ${buttonId} - ${buttonText}`)
}
```

### Resposta de Lista

```typescript
if (msg.message.listResponseMessage) {
  const rowId = msg.message.listResponseMessage.singleSelectReply?.selectedRowId
  const title = msg.message.listResponseMessage.title
  console.log(`Lista selecionada: ${rowId} - ${title}`)
}
```

### Resposta de Enquete

```typescript
if (msg.message.pollUpdateMessage) {
  const vote = msg.message.pollUpdateMessage.vote
  const selectedOptions = vote?.selectedOptions || []
  console.log(`Voto na enquete:`, selectedOptions)
}
```

### Resposta de Native Flow (Carrossel/Interativo)

```typescript
if (msg.message.interactiveResponseMessage) {
  const nativeFlow = msg.message.interactiveResponseMessage.nativeFlowResponseMessage
  if (nativeFlow) {
    const paramsJson = nativeFlow.paramsJson
    const params = JSON.parse(paramsJson)
    const buttonId = params.id
    const buttonText = params.display_text
    console.log(`Native Flow clicado: ${buttonId} - ${buttonText}`)
  }
}
```

---

## Análise Técnica - Engenharia Reversa

### ❓ A estrutura usa engenharia reversa dos botões de pagamento do WhatsApp?

### ✅ Resposta: **SIM, parcialmente.**

A estrutura `nativeFlowMessage` usada em mensagens interativas e carrosséis é **baseada na estrutura de pagamentos do WhatsApp Business**, mas **não é engenharia reversa ilegal**. Explicação:

### 📊 Origem da Estrutura

1. **WhatsApp Business API** (oficial) introduziu o formato `nativeFlowMessage` para:
   - Botões de pagamento
   - Catálogos de produtos
   - Mensagens interativas de negócios

2. **Baileys/Whaileys** (biblioteca open-source) implementou suporte a essa estrutura através de:
   - Análise do protocolo WebSocket do WhatsApp Web
   - Documentação da comunidade
   - Testes de compatibilidade

### 🔍 O que usamos

| Estrutura | Origem | Status |
|-----------|--------|--------|
| `buttons` | WhatsApp padrão | ✅ Oficial |
| `templateButtons` | WhatsApp Business | ✅ Oficial |
| `listMessage` | WhatsApp padrão | ✅ Oficial |
| `poll` | WhatsApp padrão | ✅ Oficial |
| `nativeFlowMessage` | WhatsApp Business | ⚠️ Não-oficial |
| `interactiveMessage` | WhatsApp Business | ⚠️ Não-oficial |
| `carouselMessage` | WhatsApp Business | ⚠️ Não-oficial |

### ⚠️ Riscos

1. **Estruturas oficiais** (`buttons`, `list`, `poll`): Baixo risco de banimento
2. **Estruturas não-oficiais** (`nativeFlow`, `carousel`): Risco moderado

### 🛡️ Mitigações Implementadas

1. **viewOnceMessage wrapper** - Encapsula carrosséis para parecer mensagem efêmera
2. **Delays entre mensagens** - Evita detecção de automação
3. **Verificação de blacklist** - Respeita opt-out
4. **Fallbacks** - Se `relayMessage` falhar, tenta `sendMessage`

### 📝 Conclusão

A estrutura **não é engenharia reversa maliciosa**, mas sim uma **implementação baseada em protocolos observados** da API do WhatsApp Business. O Baileys/Whaileys é uma biblioteca open-source amplamente usada que implementa essas estruturas de forma compatível.

**Recomendação:** Para uso comercial em larga escala, considere usar a **API oficial do WhatsApp Business** (via Meta) para evitar riscos de banimento.

---

## 📁 Arquivos Relacionados

| Arquivo | Descrição |
|---------|-----------|
| `electron/whatsapp.ts` | Implementação principal |
| `electron/campaignWorker.ts` | Usa carrossel em campanhas |
| `electron/chatbotEngine.ts` | Usa botões/listas no chatbot |
| `electron/main.ts` | Handlers IPC |
| `BACKUP_WHATSAPP_MESSAGING_STRUCTURE.md` | Backup do código |

---

## 📚 Referências

- [Baileys GitHub](https://github.com/WhiskeySockets/Baileys)
- [Whaileys (fork)](https://github.com/AliAryanTech/whaileys)
- [WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp)
