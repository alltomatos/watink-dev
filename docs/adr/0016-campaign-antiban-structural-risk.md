# ADR 0016 — Campanhas: Risco Estrutural de Ban e Decisão de Produto

**Status:** Accepted
**Data:** 2026-06-27

## Contexto

A Fase 4 do FlowBuilder (ver sequência de fases no plano travado) introduz **Campanhas**:
disparo em massa de mensagens a partir de conexões `whatsmeow` (WhatsApp Web não-oficial),
onde cada destinatário é modelado como `CampaignRecipient` ancorado num `FlowRun`
não-interativo. O envio real continua passando pelo engine-go como adapter burro
(`send-by-sessionId` via contrato AMQP `wbot.<tenant>.<session>.<cmd>`); todo o
pacing/rotação/orquestração vive no business.

O ponto central — e que este ADR existe para registrar — é que o risco de banimento das
conexões usadas em campanha é **ESTRUTURAL**, não apenas comportamental:

- **Sinal estrutural (fingerprint):** o cliente `whatsmeow` reimplementa o protocolo
  do WhatsApp Web e expõe um fingerprint (handshake, versão de cliente, padrões de
  tráfego, ausência de app oficial) que a Meta detecta **independentemente do
  comportamento de envio**. Observação de campo: contas usadas para disparo são
  flagradas tipicamente em **2 a 8 semanas**, mesmo com volume baixo e cadência
  conservadora.
- **Sinal comportamental:** volume, velocidade, taxa de bloqueio/denúncia por
  destinatários, repetição de conteúdo. Este sim é mitigável por técnicas anti-ban.

A consequência é dura e precisa estar escrita: **anti-ban é MITIGAÇÃO do sinal
comportamental, não ELIMINAÇÃO do risco.** Nenhuma estratégia de rotação, jitter ou
warm-up remove o sinal estrutural do `whatsmeow`. Vender "anti-ban" como garantia de
não-banimento seria desonesto com o cliente e expõe o produto a churn e dano de marca
quando os chips caírem — o que vão cair.

Estamos em DEV, sem dado de produção. O caminho zero-risco real existe e tem nome:
**WhatsApp Business API oficial (Cloud API / On-Premises) via BSP**, que é sancionada
pela Meta e não usa fingerprint de cliente não-oficial. Ela tem custo por conversa,
exige templates aprovados e opt-in, e não cobre 100% dos casos de uso de hoje — mas é
o destino correto para disparo em escala.

## Decisão

Construir Campanhas **com o risco assumido e exposto**, nunca escondido. A decisão tem
duas faces: a de produto (como apresentar e cercar o risco) e a técnica (como mitigar o
sinal comportamental sem prometer o impossível).

### 1. Decisão de produto — risco explícito + guard-rails obrigatórios

- **Aviso explícito na UI:** a tela de criação/disparo de campanha exibe um aviso de
  risco **não-dispensável de forma silenciosa** — texto claro de que o uso de conexões
  não-oficiais (`whatsmeow`) pode levar ao banimento da conexão em semanas,
  independentemente da cadência, e que o caminho sancionado é a WhatsApp Business API
  oficial. O aviso é parte do fluxo, não um asterisco em rodapé.
- **Opt-in obrigatório:** só é destinatário válido de campanha quem tem registro de
  consentimento. Sem opt-in, o `CampaignRecipient` não é criado.
- **Suppression list obrigatória:** opt-out (PARAR/STOP/SAIR e equivalentes) suprime o
  contato de **todas** as campanhas do tenant de forma permanente, e a precedência
  "opt-out vence sempre" (Decisão A do plano) se aplica — um `FlowRun` ativo é abortado
  se o contato pedir saída. A suppression é consultada antes de qualquer enfileiramento.
- **Roadmap declarado para BSP:** a documentação do módulo e a própria UI declaram a
  WhatsApp Business API oficial como o caminho **zero-risco** e o destino de produto.
  Campanhas via `whatsmeow` são posicionadas como ponte, não como solução final.

### 2. Decisão técnica — mitigação do sinal comportamental

Estratégia de orquestração de envio (toda no business; engine-go permanece burro):

- **Rotação Reputation-weighted LRU:** o pool de conexões do tenant é selecionado por
  uma fila LRU ponderada por reputação — conexões com sinais saudáveis recentes têm
  maior probabilidade de uso; conexões recém-usadas vão para o fim da fila. Isso
  distribui carga sem concentrar disparo numa única conexão.
- **Token-bucket + jitter + batch-pause por conexão:** cada conexão tem seu próprio
  token-bucket (limite de taxa), com jitter aleatório entre envios e pausas entre lotes
  (batch-pause) para evitar cadência robótica. Os limites são **por conexão**, não
  globais.
- **Circuit-breaker por conexão:** uma conexão que apresenta sinais de degradação
  (erros de envio, queda de status, denúncias) é **retirada do pool automaticamente**
  pelo breaker, deixando de receber novos destinatários até reavaliação. Chip degradado
  não continua queimando.
- **Status via cache de evento, nunca DB stale:** as decisões de rotação e
  circuit-breaker consultam o status real da conexão a partir do **cache de
  `session.status` alimentado por evento** (mesmo backbone real-time do ADR 0010), e
  **nunca** a partir de uma leitura potencialmente desatualizada do banco. Rotear para
  uma conexão que o DB diz "conectada" mas que já caiu desperdiça e contamina métricas.
- **Um contato, uma conexão em disparos próximos:** o **mesmo contato nunca é dividido
  entre conexões diferentes em disparos temporalmente próximos**. Receber a mesma
  campanha de dois números distintos em curto intervalo é um sinal de spam óbvio para a
  Meta e para o próprio destinatário. A afinidade contato→conexão é mantida dentro da
  janela de proximidade.

### 3. Invariantes herdadas do plano (aplicáveis a Campanhas)

- `auth.GetScoped` / `WHERE tenantId` manual no worker — RLS Postgres é inerte aqui.
- `Session(NewDB:true)` em escritas.
- **Dedup por `env.ID`** (Redis TTL 24h, padrão `wbot:msg:`) antes de qualquer envio
  real — protege contra disparo duplicado em retry/replay.
- **Nunca `time.Sleep` para delays longos:** a fonte da verdade do tempo é `resumeAt`
  varrido pelo scheduler com leader-lock Redis (Fase 3). Batch-pause longo é agendamento,
  não bloqueio de goroutine.

## Alternativas consideradas

- **Não construir Campanhas via `whatsmeow` (esperar só a BSP):** elimina o risco
  estrutural, mas adia indefinidamente um caso de uso que o mercado demanda hoje e que a
  BSP não cobre por inteiro (custo por conversa, templates aprovados, latência de
  onboarding). Rejeitada como única via; mantida como destino declarado.
- **Construir e prometer "anti-ban" como garantia:** vender mitigação como eliminação.
  Rejeitada por ser tecnicamente falsa (não remove o fingerprint estrutural) e por
  gerar churn e dano de marca quando os chips caírem.
- **Aviso de risco apenas em ToS/letras miúdas:** cumpre o jurídico mas falha o ético e
  o prático — o usuário toma a decisão de risco sem entender. Rejeitada: o aviso vive no
  fluxo de criação da campanha.
- **Rotação simples round-robin sem reputação/breaker:** mais barata de implementar, mas
  espalha disparo igualmente por conexões já degradadas, acelerando a queda do pool
  inteiro. Rejeitada em favor de LRU ponderada por reputação + circuit-breaker.
- **Status de conexão lido do banco:** simples, mas usa dado potencialmente stale para
  decisões de roteamento em tempo real, roteando para conexões já caídas. Rejeitada em
  favor do cache de evento.
- **Pacing/rotação dentro do engine-go:** acoplaria orquestração de campanha ao adapter
  de transporte, quebrando a separação "engine-go é adapter burro". Rejeitada — toda a
  orquestração fica no business.

## Consequências

- **Honestidade de produto vira invariante:** o risco estrutural está documentado e
  exposto na UI. Quem dispara campanha via `whatsmeow` faz uma escolha informada; o
  produto não promete o que não pode entregar.
- **Conformidade por construção:** opt-in e suppression obrigatórios reduzem denúncias
  (o principal acelerador do sinal comportamental) e alinham o produto a boas práticas
  de mensageria — além de serem pré-requisito natural para a futura migração à BSP.
- **Degradação graciosa do pool:** circuit-breaker + rotação por reputação fazem o
  sistema retirar chips degradados sozinho, em vez de queimar o pool inteiro. A campanha
  perde capacidade gradualmente, não de forma catastrófica.
- **Acoplamento ao real-time:** as decisões de roteamento dependem do cache de
  `session.status` alimentado por evento (ADR 0010). Se esse cache estiver indisponível,
  a rotação deve **falhar fechada** (não disparar) em vez de cair para leitura de DB
  stale — registrar como requisito de implementação.
- **Caminho declarado para zero-risco:** o roadmap para a WhatsApp Business API oficial
  (BSP) fica registrado como ADR de produto. A arquitetura de Channel Adapters
  (`OutboundChannelAdapter`) já comporta um adapter BSP futuro sem reescrever a camada de
  orquestração — `whatsapp-whatsmeow` e `whatsapp-bsp` seriam adapters intercambiáveis.
- **Débito declarado:** afinidade contato→conexão precisa de uma estrutura de
  proximidade temporal (janela + índice por contato); a definição exata da janela e da
  política de reputação (pesos, decaimento) fica para a fase de implementação da Fase 4.
- **Sem produção, sem back-compat pesado:** estamos em DEV; o schema de
  `CampaignRecipient`/reputação pode evoluir livremente até a Fase 4 estabilizar.

## Referências

- [ADR 0010](0010-realtime-sse-over-socketio.md) — backbone real-time / cache de evento (status de sessão)
- [ADR 0002](0002-rabbitmq-event-driven.md) — contrato AMQP `wbot.<tenant>.<session>.<cmd>`
- [ADR 0001](0001-multitenancy-rls-jwt.md) — multitenancy / escopo de tenant no worker
- Plano travado do FlowBuilder — Fase 4 (Campanhas), Decisão A (precedência sessão/opt-out), Channel Adapters
