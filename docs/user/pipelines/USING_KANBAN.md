# Pipelines — Gestão de Oportunidades

O módulo de **Pipelines** organiza seus negócios em estágios visuais, ideal para acompanhar processos de vendas, suporte ou qualquer fluxo sequencial de atendimento.

## Tipos de visualização

| Visualização | Para que serve |
|---|---|
| **Kanban** | Colunas com cards arrastáveis — visão rápida do estágio de cada negócio |
| **Funil** | Percentual de conversão entre estágios — ideal para análise de perdas |
| **Gantt** | Linha do tempo — ideal para ver quanto tempo cada negócio ficou em cada estágio |

Use o seletor de view no topo do board para alternar entre as visualizações.

## Criando um Pipeline

1. Vá em **Pipelines** no menu lateral.
2. Clique em **Novo Pipeline**.
3. Preencha:
   - **Nome** — identifica o pipeline (ex: "Vendas Outbound")
   - **Descrição** — contexto adicional (opcional)
   - **Tipo** — Kanban ou Funil
   - **Estágios** — adicione os passos do seu processo (ex: "Prospecção", "Proposta Enviada", "Fechado")
4. Clique em **Salvar**.

### Sugestão por IA (se habilitada)

Se o administrador ativou a IA no módulo de Pipelines (**Configurações → Agente de IA → IA no Pipeline**), uma sidebar de chat aparece ao criar ou editar um pipeline. Descreva seu processo e a IA sugere os estágios automaticamente.

## Editando Estágios

1. Abra o pipeline e clique em **Editar**.
2. Renomeie, reordene ou adicione estágios.
3. **Ao remover um estágio** com negócios ativos, uma confirmação será solicitada. Os negócios desse estágio serão movidos automaticamente para o primeiro estágio do pipeline.
4. Clique em **Salvar**.

> Um pipeline precisa ter ao menos um estágio para ser salvo.

## Usando os Cards (Deals)

Cada card representa um negócio/oportunidade vinculada a um contato.

- **Mover**: arraste o card de uma coluna para outra para atualizar o estágio.
- **Detalhes**: clique no card para ver informações ou abrir a conversa no WhatsApp.
- **Alerta de estagnação** (modo Funil): cards sem atualização há mais de 7 dias aparecem com borda destacada.

## Dicas

- Use **estágios claros e sequenciais** — evite nomes genéricos como "Em andamento".
- Pipelines do tipo **Funil** incluem métricas de conversão e são indicados para acompanhamento de vendas com metas.
- Você pode **exportar** um pipeline como JSON e importá-lo em outro ambiente via menu do pipeline.
