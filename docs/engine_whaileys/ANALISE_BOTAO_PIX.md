# Análise Técnica: Botão Pix (Native Flow) - Oficial vs Baileys-Pro

Este documento detalha a análise comparativa entre o template de botão Pix oficial do WhatsApp (extraído de um JSON real) e a implementação atual no projeto `baileys-pro`.

## 1. Visão Geral

O botão de Pix utiliza o tipo de mensagem interativa `native_flow_message`. A estrutura é complexa e envolve parâmetros JSON codificados dentro da definição do botão.

## 2. Estrutura Oficial (WhatsApp)

Baseado no JSON fornecido:

```json
{
  "interactiveMessage": {
    "nativeFlowMessage": {
      "buttons": [
        {
          "name": "payment_info",
          "buttonParamsJson": {
            "reference_id": "4TWTB8AGYOD",
            "type": "physical-goods",
            "payment_configuration": "merchant_categorization_code",
            "payment_settings": [
              {
                "type": "pix_static_code",
                "pix_static_code": {
                  "merchant_name": "222",
                  "key": "+5516515151515",
                  "key_type": "PHONE"
                }
              }
            ],
            "currency": "BRL",
            "total_amount": {
              "value": 0,
              "offset": 1000
            },
            "order_request_id": "4TWTB8AGKF6",
            "order": {
              "status": "payment_requested",
              "items": [
                {
                  "quantity": 0,
                  "retailer_id": "4TWTB8AGZ42",
                  "amount": {
                    "offset": 1000,
                    "value": 0
                  },
                  "name": "",
                  "product_id": "",
                  "isCustomItem": false,
                  "isQuantitySet": false
                }
              ],
              "subtotal": {
                "value": 0,
                "offset": 1000
              },
              "tax": null,
              "shipping": null,
              "discount": null
            },
            "referral": "chat_attachment"
          }
        }
      ],
      "messageVersion": 1
    }
  }
}
```

### Pontos Chave da Estrutura Oficial:

- **Nome do Botão**: `payment_info`.
- **Parâmetros Extras**: Inclui `payment_configuration`, `order_request_id` e `referral`.
- **Status do Pedido**: Utiliza `payment_requested`.
- **Items do Pedido**: Estrutura detalhada com `retailer_id`, `isCustomItem`, etc.

## 3. Implementação Baileys-Pro

Baseado nos arquivos `Example-buttons.ts` e `messages-send.ts`:

```typescript
// Exemplo de uso no Baileys-Pro
input = {
    name: "payment_info",
    buttonParamsJson: JSON.stringify({
        currency: 'BRL',
        total_amount: { value: 1200, offset: 100 },
        reference_id: '4SE1828Q8SA',
        type: 'physical-goods',
        order: {
            status: 'pending', // Diferença aqui
            subtotal: { value: 0, offset: 100 },
            order_type: 'ORDER', // Campo extra no Baileys
            items: [{ name: 'Produto Teste', ... }]
        },
        payment_settings: [{
            type: 'pix_static_code',
            pix_static_code: {
                merchant_name: 'Matheus Filype',
                key: '...',
                key_type: 'EMAIL'
            }
        }]
    })
}
```

## 4. Análise Comparativa e Diferenças

| Campo                       | Oficial (JSON)                                    | Baileys-Pro (Código Atual)          | Impacto / Observação                                                                                                               |
| :-------------------------- | :------------------------------------------------ | :---------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| **`payment_configuration`** | `"merchant_categorization_code"`                  | ❌ Ausente                          | Pode ser necessário para categorização correta do comerciante pelo WhatsApp.                                                       |
| **`order_request_id`**      | Presente (ID único)                               | ❌ Ausente                          | Recomendado adicionar para rastreamento único da solicitação.                                                                      |
| **`referral`**              | `"chat_attachment"`                               | ❌ Ausente                          | Indica a origem da interação.                                                                                                      |
| **`order.status`**          | `"payment_requested"`                             | `"pending"`                         | `"payment_requested"` parece ser o status mais semântico para o fluxo nativo oficial.                                              |
| **`order.order_type`**      | ❌ Ausente                                        | `"ORDER"`                           | O Baileys adiciona explicitamente, pode não ser obrigatório mas ajuda na tipagem.                                                  |
| **`order.items`**           | Campos detalhados (`retailer_id`, `isCustomItem`) | Campos básicos (`name`, `quantity`) | A estrutura oficial é mais completa, o Baileys usa uma simplificada.                                                               |
| **`total_amount.offset`**   | `1000`                                            | `100`                               | O multiplicador de precisão da moeda. 1000 é padrão para algumas moedas, 100 para BRL geralmente funciona, mas o oficial usa 1000. |

## 5. Recomendações de Ajuste (Meta 2025)

Para alinhar o `baileys-pro` com o padrão oficial da Meta e garantir máxima compatibilidade, sugere-se as seguintes atualizações:

### Atualizações Obrigatórias:

1.  **✅ Adicionar `payment_configuration`**: Definir como `'merchant_categorization_code'` (requerido pela Meta desde 2024)
2.  **✅ Adicionar `order_request_id`**: Gerar um ID único para rastreamento (formato: `generateID()` ou UUID)
3.  **✅ Adicionar `referral`**: Definir como `'chat_attachment'` para indicar origem da interação
4.  **✅ Atualizar `order.status`**: Mudar de `'pending'` para `'payment_requested'` (padrão oficial)
5.  **✅ Ajustar `offset`**: Usar `1000` ao invés de `100` (padrão Meta para BRL = milésimos)

### Atualizações Opcionais (Melhores Práticas):

6.  **Adicionar campos `isCustomItem` e `isQuantitySet`**: Para itens personalizados
7.  **Incluir `retailer_id`**: ID único do produto no sistema do comerciante
8.  **Definir `product_id`**: Para integração com catálogo do WhatsApp Business

### Exemplo de Payload Completo (Atualizado 2025):

```typescript
import { randomBytes } from 'crypto';

// Função para gerar IDs únicos
function generateID(): string {
    return randomBytes(8).toString('hex').toUpperCase();
}

// Payload PIX completo alinhado com Meta
const pixButtonParams = {
    reference_id: generateID(), // Ex: "4TWTB8AGYOD"
    type: 'physical-goods',
    payment_configuration: 'merchant_categorization_code', // ✅ OBRIGATÓRIO
    payment_settings: [{
        type: 'pix_static_code',
        pix_static_code: {
            merchant_name: 'Sua Empresa Ltda',
            key: 'seuemail@exemplo.com', // ou telefone, CPF, CNPJ, chave aleatória
            key_type: 'EMAIL' // 'EMAIL' | 'PHONE' | 'CPF' | 'CNPJ' | 'EVP'
        }
    }],
    currency: 'BRL',
    total_amount: {
        value: 0,      // Valor em centavos: 0 = R$ 0,00
        offset: 1000   // ✅ Meta usa 1000 para BRL (milésimos)
    },
    order_request_id: generateID(), // ✅ OBRIGATÓRIO
    order: {
        status: 'payment_requested', // ✅ Padrão oficial Meta
        items: [
            {
                name: 'Produto Exemplo',
                quantity: 1,
                retailer_id: generateID(),    // ID do produto no seu sistema
                product_id: '',                // Vazio se não usar catálogo
                amount: {
                    value: 0,
                    offset: 1000
                },
                isCustomItem: false,           // true se for produto customizado
                isQuantitySet: true            // true se quantidade foi definida
            }
        ],
        subtotal: { value: 0, offset: 1000 },
        tax: null,       // { value: 0, offset: 1000 } se houver imposto
        shipping: null,  // { value: 0, offset: 1000 } se houver frete
        discount: null   // { value: 0, offset: 1000 } se houver desconto
    },
    referral: 'chat_attachment' // ✅ OBRIGATÓRIO
};

// Uso no Baileys
const pixButton = {
    name: 'payment_info',
    buttonParamsJson: JSON.stringify(pixButtonParams)
};
```

### Tabela de Key Types (Chave PIX):

| `key_type` | Formato da Chave | Exemplo |
|------------|------------------|---------|
| `EMAIL` | E-mail válido | `contato@empresa.com` |
| `PHONE` | Telefone com DDI | `+5511999999999` |
| `CPF` | CPF sem formatação | `12345678900` |
| `CNPJ` | CNPJ sem formatação | `12345678000100` |
| `EVP` | Chave aleatória | `123e4567-e89b-12d3-a456-426614174000` |

### Cálculo do Valor (Offset 1000):

```typescript
// Exemplos de conversão de valor real para o formato Meta
const valorReal = 49.90;           // R$ 49,90
const valorCentavos = 4990;        // 4990 centavos
const valorMeta = 49900;           // Com offset 1000: 49900 / 1000 = 49.90

// Fórmula:
// valorMeta = valorReal * 1000
// Ou: valorMeta = valorCentavos * 10

const total_amount = {
    value: Math.round(valorReal * 1000), // 49900
    offset: 1000
};
```


## 6. Validação e Testes

### ✅ Checklist de Implementação:

Antes de enviar mensagens PIX em produção, valide:

- [ ] `payment_configuration` está definido como `'merchant_categorization_code'`
- [ ] `order_request_id` é único para cada transação
- [ ] `referral` está definido como `'chat_attachment'`
- [ ] `order.status` é `'payment_requested'`
- [ ] `offset` é `1000` (não `100`)
- [ ] Chave PIX está no formato correto para o `key_type` escolhido
- [ ] `total_amount.value` está calculado corretamente (valor real × 1000)
- [ ] Todos os `items` possuem `retailer_id` único

### 🧪 Exemplo de Teste:

```typescript
// Teste básico de envio PIX
await sock.sendMessage('5511999999999@s.whatsapp.net', {
    text: 'Pagamento de teste',
    footer: 'Sua Empresa',
    interactiveButtons: [{
        name: 'payment_info',
        buttonParamsJson: JSON.stringify({
            reference_id: 'TEST' + Date.now(),
            type: 'physical-goods',
            payment_configuration: 'merchant_categorization_code',
            payment_settings: [{
                type: 'pix_static_code',
                pix_static_code: {
                    merchant_name: 'Teste Ltda',
                    key: '+5511999999999',
                    key_type: 'PHONE'
                }
            }],
            currency: 'BRL',
            total_amount: { value: 1000, offset: 1000 }, // R$ 1,00
            order_request_id: 'ORD' + Date.now(),
            order: {
                status: 'payment_requested',
                items: [{
                    name: 'Produto Teste',
                    quantity: 1,
                    retailer_id: 'PROD' + Date.now(),
                    amount: { value: 1000, offset: 1000 },
                    product_id: '',
                    isCustomItem: false,
                    isQuantitySet: true
                }],
                subtotal: { value: 1000, offset: 1000 },
                tax: null,
                shipping: null,
                discount: null
            },
            referral: 'chat_attachment'
        })
    }]
});
```

## 7. Conclusão

### Status da Implementação Baileys-Pro:

| Aspecto | Status | Ação Necessária |
|---------|--------|-----------------|
| Estrutura Base | ✅ Correta | Nenhuma |
| Campos Obrigatórios | ⚠️ Incompletos | Adicionar campos faltantes |
| Valores Enum | ⚠️ Divergentes | Atualizar para padrão Meta 2025 |
| Offset de Moeda | ⚠️ Inconsistente | Padronizar em 1000 |
| Compatibilidade | ✅ Boa | Melhorar com ajustes |

### Resumo:

A implementação atual do `baileys-pro` é **funcional** e segue a estrutura correta de mensagens interativas `native_flow`. No entanto, existem campos opcionais que se tornaram **obrigatórios** segundo a especificação Meta 2025:

- **Campos agora obrigatórios**: `payment_configuration`, `order_request_id`, `referral`
- **Valores padronizados**: `status: 'payment_requested'`, `offset: 1000`
- **Estrutura de items**: Campos adicionais como `isCustomItem`, `isQuantitySet`, `retailer_id`

A adoção dos valores do padrão oficial **aumenta a compatibilidade** e **reduz riscos de rejeição** da mensagem por versões futuras do WhatsApp ou validações mais rigorosas da API.

### Recomendação:

✅ **Atualizar imediatamente** para incluir os campos obrigatórios e evitar falhas futuras de envio.
