# Filas e Distribuição

O sistema utiliza o conceito de Filas para organizar o atendimento por departamentos (ex: Comercial, Suporte, Financeiro).

## Funcionalidades Principais
- **Segregação de Atendimento:** Agentes visualizam apenas os tickets das filas às quais pertencem.
- **Mensagens de Saudação Customizadas:** Cada fila pode ter sua própria mensagem de boas-vindas.
- **Horário de Atendimento:** Configuração de janelas de tempo para funcionamento da fila.
- **Estratégias de Distribuição:** 
    - **Manual:** Agente puxa o ticket.
    - **Automática:** Sistema atribui o ticket ao agente com menos carga (Round Robin).

## Integração com Canais
Uma fila pode estar vinculada a um ou mais canais (números de WhatsApp), permitindo que um único número centralize diversos departamentos ou que cada departamento tenha seu número próprio.
