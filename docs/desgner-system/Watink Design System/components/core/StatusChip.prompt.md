Chip semântico de status — fundo colorido + texto a partir de tokens de design. Use para status de tickets, saúde de conexões, estado de filas, níveis de prioridade e qualquer rótulo binário ou baseado em estado.

```jsx
<StatusChip status="success" label="Online" />
<StatusChip status="error"   label="Desconectado" />
<StatusChip status="warning" label="Aguardando" />
<StatusChip status="info"    label="Em Atendimento" />
<StatusChip status="default" label="Fechado" size="sm" />
// Sem ponto indicador
<StatusChip status="success" label="Resolvido" dot={false} />
```

Props notáveis:
- `status`: success | error | warning | info | default
- `size`: sm | md | lg
- `dot`: boolean, exibe ponto colorido indicador (padrão true)
- Cores são 100% baseadas em tokens e se adaptam automaticamente ao modo escuro
