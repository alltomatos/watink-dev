# Migração: Template para Native Flow (Sem Cadastro Meta)

Como você confirmou que **não possui cadastro na Meta**, o uso de `Template Messages` (Hydrated) é extremamente arriscado e provavelmente deixará de funcionar em breve (se já não estiver falhando no iOS).

A solução segura é usar **Interactive Messages com Native Flow**. Isso funciona em qualquer número (Business ou não) e não requer aprovação de template.

## Exemplo Prático de Conversão

Abaixo, o código para enviar exatamente a mesma mensagem da Kovi que você enviou, mas usando o formato moderno e seguro.

### Código para o Baileys (`Example-buttons.ts` ou seu arquivo de envio):

```typescript
// Importe o Enum se necessário, ou use string direta 'quick_reply'
import { WAWebInteractiveMessagesNativeFlowNameEnum } from "../src/Types/Message";

async function sendKoviMessage(jid: string) {
  await sock.sendMessage(jid, {
    text: "Ei, Felipe Nakamura! Imagina rodar com um *carro 0km* e aumentar seus ganhos em até 28%? 😱 \n\n*Com a Kovi, é possível!* Quer saber como? \n\n🚗 Trabalhamos com modelos aceitos na *categoria Comfort dos apps*! \n\n💰 Ao rodar nessa categoria, você aumenta seus ganhos médios! \n\n👉 Na prática: se você costuma faturar R$9.700, esse valor aumenta para R$12.416 rodando no Comfort! E o melhor: tudo com manutenção, proteção e documentação inclusos! 🤔 \n\nQuer saber mais? *Responda essa mensagem* e fale direto com nosso time!",

    footer:
      'Confira modelos disponíveis\nCaso não queira mais receber mensagem, clique em "parar".',

    interactiveButtons: [
      {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: "LIGAR PARA A KOVI",
          id: "LIGAR PARA A KOVI",
        }),
      },
      {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: "FALAR NO WHATSAPP",
          id: "FALAR NO WHATSAPP",
        }),
      },
      {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: "PARAR MENSAGENS",
          id: "PARAR MENSAGENS",
        }),
      },
    ],
  });
}
```

## Por que isso funciona sem cadastro?

1.  **Tipo de Botão**: Estamos usando `quick_reply` dentro de `native_flow`.
2.  **Native Flow**: É um recurso nativo do aplicativo WhatsApp, renderizado localmente pelo aparelho.
3.  **Sem Template**: Ao contrário dos "Template Messages" antigos, este formato é enviado como uma mensagem "raw" (comum), apenas formatada de jeito especial. O WhatsApp não valida isso contra um template pré-aprovado no servidor da Meta.

## Limitações

- **Quick Reply**: O código acima gera botões de resposta rápida. Quando o usuário clica, envia uma mensagem de texto de volta.
- **Call Button / URL Button**:

  - **Native Flow 'cta_url'**: Funciona para links (abre navegador).
  - **Native Flow 'cta_call'**: Funciona para chamadas.

  _Se você precisar que o botão "LIGAR PARA A KOVI" realmente inicie uma chamada, você deve mudar o tipo dele:_

```typescript
// Exemplo botão de chamada (pode ter restrições em alguns iOS, teste!)
{
    name: 'cta_call',
    buttonParamsJson: JSON.stringify({
        display_text: "LIGAR PARA A KOVI",
        phone_number: "+5511999999999" // Número deve ser fixo aqui
    })
}
```

**Recomendação:** Use `quick_reply` (como no exemplo principal) para _todas_ as ações inicialmente, pois é o mais compatível. Se o usuário clicar em "Ligar", seu bot recebe a mensagem e pode enviar o contato ou número de telefone em seguida.
