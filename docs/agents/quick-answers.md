# Módulo: QuickAnswers (Respostas Rápidas)

## Responsabilidade

Biblioteca de templates de mensagem pré-escritos, usados por agentes no chat manual
(via autocomplete `/`) e por fluxos automáticos (via dispatch backend).

---

## Tipos suportados

| `type`                | Descrição                                         | Suporte whatsmeow      |
|-----------------------|---------------------------------------------------|------------------------|
| `text`                | Texto puro com formatação WhatsApp                | ✅ SendText            |
| `interactive_buttons` | Até 3 botões quick_reply (NativeFlow)             | ✅ SendInteractive     |
| `list`                | Seções + linhas, botão de abertura                | ✅ SendList            |
| `media`               | Imagem/vídeo/doc/áudio com legenda opcional       | ✅ SendMedia           |
| `poll`                | Enquete com opções e captura de resultado opcional| ✅ SendPoll            |
| `carousel`            | Múltiplos cards com mídia + botões                | ⚠️ pendente validação  |

---

## Modelo de dados

```go
type QuickAnswer struct {
    ID        int
    Shortcut  string    // atalho digitado após "/"
    Title     string    // nome exibível na UI
    Type      string    // enum: text | interactive_buttons | list | media | poll | carousel
    Content   JSONB     // payload específico por tipo (ver schemas abaixo)
    TenantID  uuid.UUID
}
```

### Schemas de `content` por tipo

**text**
```json
{ "body": "Olá *{{contact_name}}*, como posso ajudar?" }
```

**interactive_buttons**
```json
{
  "body": "Escolha uma opção:",
  "footer": "Watink",
  "buttons": [
    { "id": "s1", "label": "Suporte" },
    { "id": "v1", "label": "Vendas" }
  ]
}
```

**list**
```json
{
  "body": "Selecione o departamento:",
  "button_text": "Ver opções",
  "footer": "Watink",
  "sections": [
    {
      "title": "Suporte",
      "rows": [{ "id": "r1", "title": "Técnico", "description": "Problemas no sistema" }]
    }
  ]
}
```

**media**
```json
{
  "media_type": "image",
  "url": "https://...",
  "caption": "Veja o tutorial em anexo"
}
```

**poll**
```json
{
  "question": "Como avalia o atendimento?",
  "options": ["Ótimo", "Bom", "Regular"],
  "max_selections": 1,
  "capture_results": true,
  "on_answer": null
}
```

---

## Variáveis de interpolação

Resolvidas pelo backend no momento do dispatch. Nunca expostas ao contato.

| Variável           | Fonte                         |
|--------------------|-------------------------------|
| `{{contact_name}}` | `ticket.contact.name`         |
| `{{agent_name}}`   | agente assignado ao ticket    |
| `{{ticket_id}}`    | `ticket.id`                   |
| `{{company_name}}` | configuração do tenant        |

Variável sem valor → string vazia. Envio nunca é bloqueado por variável ausente.

---

## Contrato de dispatch

O frontend nunca monta o payload de envio. Chama:

```
POST /api/v1/quickAnswers/:id/send
Body: { ticketId: number, variables?: Record<string, string> }
```

O backend resolve variáveis, monta o payload por tipo e despacha ao engine via RabbitMQ.
Reutilizável por fluxos automáticos sem UI.

---

## Captura de resultado de enquete

Controlada pelo campo `capture_results` no content da enquete.

- `false` — engine envia, resultados ignorados
- `true` + `on_answer: null` — resultados gravados em `PollResults`, exibidos no chat
- `true` + `on_answer: { type, ... }` — registra + dispara gatilho (fase futura)

Tabela: `PollResults { poll_message_id, contact_jid, option_selected, answered_at }`

---

## Preview de criação

A página de criação/edição de QuickAnswer exibe um **preview visual que simula a bolha do WhatsApp** — o agente vê exatamente o que o contato vai receber antes de salvar.

- Preview atualiza em tempo real conforme o agente preenche os campos
- Renderiza formatação WhatsApp (`*bold*`, `_italic_`, `~strike~`, `` `code` ``)
- Para `interactive_buttons`: exibe botões clicáveis (sem ação real)
- Para `list`: exibe botão "Ver opções" com seções colapsadas
- Para `media`: exibe miniatura/ícone do tipo de mídia com legenda
- Para `poll`: exibe as opções como radio buttons visuais
- Variáveis `{{contact_name}}` etc. exibidas destacadas (ex: fundo amarelo) — não substituídas no preview
- Carrossel: preview com scroll horizontal de cards

## Critérios de sucesso por tipo

| Tipo                  | Critério                                                                 |
|-----------------------|--------------------------------------------------------------------------|
| `text`                | Formatação WhatsApp renderizada no dispositivo do contato               |
| `interactive_buttons` | Botões clicáveis no contato; resposta aparece no chat do agente          |
| `list`                | Seleção do contato aparece no chat do agente                             |
| `media`               | Arquivo entregue com legenda; miniatura visível no chat do agente        |
| `poll`                | Contato vota; resultado agregado exibido no chat (se capture_results)    |
| `carousel`            | A definir após validação de suporte nativo no whatsmeow                  |

---

## Invariants

- Sempre usar `auth.GetScoped(c, "QuickAnswers")` — nunca `c.Get("tenantId")` bruto
- `UNIQUE(tenantId, shortcut)` — shortcuts duplicados são rejeitados
- Dispatch é sempre backend-side — frontend envia apenas `quickAnswerId + ticketId`
- Variáveis são resolvidas no backend, nunca no frontend
- `capture_results` é opt-in por enquete, não global

## O que NÃO fazer

- Não montar payload de envio no frontend — toda lógica de tipo fica no backend
- Não bloquear envio por variável ausente — usar string vazia
- Não usar `MediaType`/`DataJson` legados — migrar para `type`/`content`
- Não implementar carrossel antes de confirmar suporte no whatsmeow
- Não expor placeholder `{{variavel}}` ao contato em caso de valor ausente
