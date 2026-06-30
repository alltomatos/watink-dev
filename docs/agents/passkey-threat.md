# Ameaça: Requisito de Passkey para Vinculação de Dispositivos (WhatsApp)

> **Status:** Monitoramento ativo · **Registrado:** 2026-06-30 · **Decisão:** adiada (não testável — conta do dono ainda não foi "flipada")
> **Pesquisa completa (workflows):** `tasks/w1afl297r.output` e `tasks/wmdej2wu0.output` na sessão.

## TL;DR

Há **dois fenômenos distintos** reportados na mesma janela:

1. **WABetaInfo / imprensa:** passkey como método **opcional/aditivo** de vincular dispositivo (Android, ainda em desenvolvimento). **Não mandatório.** Confiança alta.
2. **Reports de campo (GitHub, manhã de 2026-06-30):** mudança **server-side** que inseriu uma etapa **passkey/WebAuthn obrigatória** dentro do fluxo de QR/pairing e **quebrou simultaneamente whatsmeow, Baileys, WAHA e Evolution API** para contas "flipadas". **Mandatório, sem opt-out.** Confiança alta nos sintomas reproduzidos.

**Para o Watink importa o #2:** o `engine-go` é construído sobre whatsmeow (exatamente a lib do issue [tulir/whatsmeow#1184](https://github.com/tulir/whatsmeow/issues/1184)). Quando a conta de um tenant for flipada, **aquela conexão não poderá mais ser vinculada via engine** (QR nem pairing-code) até upstream implementar WebAuthn, a Meta reverter, ou a conexão migrar para a API oficial (BSP).

## O que mudou (fluxo)

```
Clássico (whatsmeow hoje):  QR Pair → Noise Handshake → Companion Registration → App State Sync
Novo (contas flipadas):     QR Pair → Noise → QR Accepted → [Continue] → Passkey/WebAuthn
                                                → Verification Code → Companion Registration → App State Sync
```

O whatsmeow **não expõe** `ContinueLogin()`/`LoginWithPasskey()`/WebAuthn/confirmação de código → a máquina de estados trava em `SCAN_QR_CODE` (loop de QR `qrcodeCount 1→2`).

### Mensagens on-screen (verbatim, confiança alta — capturadas em WAHA #2138 e Baileys #2672)
- *"Continue on WhatsApp Web — Keep app open on both devices. You may need to scan another QR code to use your Passkey."*
- *"Create a passkey to log in — For security reasons, your account needs a passkey to link devices."* (deletar a passkey **não** reverte — força criação)

## Rollout
- **Per-account e gradual** (contas sem passkey ainda conectam normalmente). Confiança alta.
- **Android** confirmado no telefone primário; iOS sem evidência.
- **Negócio vs pessoal:** sem distinção confirmada (confiança baixa).
- **Início:** manhã de 2026-06-30 (cluster de issues idênticas em ~8h).

## Impacto no Watink
- **Quebra onboarding de NOVAS conexões** para contas flipadas (QR e pairing-code). `.sessions_auth/` preserva sessões existentes mas não ajuda em nova vinculação.
- **Sessões já vinculadas:** provavelmente seguras no curto prazo (confiança média) — nenhuma fonte indica teardown retroativo. Risco residual: sessão que cair e precisar re-link cai sob o gate.
- **Relógio correndo:** rollout per-account degrada a base conforme a Meta flipa mais contas. Velocidade desconhecida.
- **Ortogonal ao ADR 0016:** é ameaça estrutural no **caminho de vinculação**, **não mitigável por proxy/anti-ban/jitter**. Mesma classe de ameaça ("Meta aperta a superfície não-oficial"), agora no onboarding.

## Estado upstream
- [tulir/whatsmeow#1184](https://github.com/tulir/whatsmeow/issues/1184) "Passkey support" — **aberto, sem resposta de maintainer, sem ETA, sem avaliação de viabilidade**.
- Baileys e Evolution igualmente afetados — sem fix upstream conhecido.

## Opções estratégicas
| Opção | Viabilidade | Esforço | Risco |
|---|---|---|---|
| **A** Aguardar upstream (#1184) | depende 100% do tulir | mínimo | alto se virar obrigatório antes |
| **B** Guiar usuário a criar passkey | **provavelmente NÃO contorna** o WebAuthn | baixo | falsa solução |
| **C** Pivot WhatsApp Business API/BSP | alta (oficial, imune ao linking) | alto | baixo p/ continuidade, alto p/ produto |
| **D** Híbrido (**recomendado**) | alta | médio | baixo (menor regret) |

## Recomendação: Opção D (Híbrido)
Não há ação de engenharia urgente enquanto QR clássico funcionar para a maioria, mas a ameaça é estrutural e externa. Resposta correta = **vigilância + aceleração do trilho BSP (já no roadmap, ADR 0016)**.

**Esta semana (quando reativar o tema):**
1. Subscrever/watch [#1184](https://github.com/tulir/whatsmeow/issues/1184) como blocker externo rastreado.
2. Confirmar rollout real: testar vincular número novo (pessoal Android + business) e ver se o passkey aparece e se é pulável.
3. Capturar mensagens verbatim das telas durante o teste.

**Monitorar:** WABetaInfo/changelogs para sinal de obrigatoriedade; manter BSP ativo no roadmap; especificar (sem implementar) feature-flag de degradação graciosa no onboarding quando o passkey bloquear.

**Não fazer:** investir pesado na Opção B antes de confirmar que contorna o WebAuthn — a evidência sugere que não.
