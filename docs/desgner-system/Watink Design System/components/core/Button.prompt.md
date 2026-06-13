Botão de ação principal da UI Watink — suporta variantes primary/outlined/ghost/danger e tamanhos sm/md/lg.

```jsx
// CTA principal
<Button variant="primary" size="md">Entrar</Button>

// Secundário outlined
<Button variant="outlined">Cancelar</Button>

// Com ícone
<Button variant="primary" icon={<span className="material-icons-outlined" style={{fontSize:18}}>add</span>}>
  Nova Conversa
</Button>

// Ação destrutiva
<Button variant="danger" size="sm">Excluir</Button>

// Largura total (ex: formulário de login)
<Button variant="primary" fullWidth>Confirmar</Button>
```

Variantes e props notáveis:
- `variant`: primary | outlined | ghost | danger
- `size`: sm (32px) | md (40px) | lg (48px)
- `fullWidth`: ocupa 100% do container
- `icon` / `trailingIcon`: elemento React na frente / atrás do rótulo
- `disabled`: reduz opacidade para 0.45, bloqueia eventos de ponteiro
