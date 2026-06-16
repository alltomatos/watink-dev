Card de conteúdo base — fundo branco/surface, radius 16px, sombra difusa suave. Use como wrapper para qualquer conteúdo em nível de seção: listas, formulários, gráficos, painéis de configurações, etc.

```jsx
// Card simples com header
<Card title="Filas de Atendimento" subtitle="3 filas ativas">
  {/* conteúdo */}
</Card>

// Com ícone e ações
<Card
  title="Conexões WhatsApp"
  icon={<span className="material-icons-outlined" style={{color:'var(--google-teal)'}}>sync_alt</span>}
  iconColor="rgba(0,137,123,0.1)"
  actions={<Button variant="outlined" size="sm">Gerenciar</Button>}
>
  {/* conteúdo */}
</Card>

// Hover com elevação (para cards clicáveis)
<Card hoverEffect onClick={() => navigate('/contatos')}>
  {/* conteúdo */}
</Card>
```

Props notáveis:
- `hoverEffect`: ativa animação de elevação translateY(-6px) no hover
- `icon` + `iconColor`: renderiza quadrado arredondado 48×48 com o ícone dentro
- `actions`: React node renderizado no canto superior direito do header
- `padding`: sobrescreve o padding padrão de 24px do conteúdo
