Avatar circular de usuário — foto com fallback de iniciais e ponto opcional de status online/offline. Use em itens da lista de tickets, cabeçalhos de mensagem, menus de usuário, drawers de contato e listas de atendentes.

```jsx
// Com foto
<Avatar src="/perfil.jpg" name="Ana Lima" size="md" />

// Fallback de iniciais
<Avatar name="Carlos Mendes" size="lg" />

// Com status de presença
<Avatar name="Beatriz" size="md" online={true}  />
<Avatar name="Rafael"  size="md" online={false} />

// Tamanhos
<Avatar name="A" size="xs" />  {/* 24px */}
<Avatar name="A" size="sm" />  {/* 32px */}
<Avatar name="A" size="md" />  {/* 40px — padrão */}
<Avatar name="A" size="lg" />  {/* 48px */}
<Avatar name="A" size="xl" />  {/* 64px */}
```

Comportamento notável:
- `src` + `name`: exibe imagem, cai para iniciais se a imagem falhar ao carregar
- Iniciais são as primeiras letras das duas primeiras palavras, em maiúsculas
- Ponto `online` posicionado no canto inferior direito, com borda `--bg-surface` para sobreposição limpa
