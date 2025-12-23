# 🎨 Guia de Design para Criação de Temas

Este documento serve como referência para designers e desenvolvedores que desejam criar ou modificar temas visuais no **Watic Premium**.

---

## 📁 Estrutura do Sistema de Temas

O sistema de temas está centralizado em:

```
frontend/src/context/DarkMode/index.js
```

Cada tema é um bloco condicional que retorna um objeto `createMuiTheme()` do Material-UI v4.

---

## 🎯 Anatomia de um Tema

### 1. Paleta de Cores (`palette`)

| Propriedade | Descrição | Exemplo |
|-------------|-----------|---------|
| `primary.main` | Cor principal (botões, links, ícones selecionados) | `#25D366` |
| `secondary.main` | Cor secundária | `#128C7E` |
| `success.main` | Cor de sucesso | `#22c55e` |
| `warning.main` | Cor de alerta | `#f59e0b` |
| `error.main` | Cor de erro | `#ef4444` |
| `background.default` | Fundo da aplicação | `#ECE5DD` |
| `background.paper` | Fundo de cards/modais | `#FFFFFF` |
| `text.primary` | Texto principal | `#303030` |
| `text.secondary` | Texto secundário | `#667781` |
| `divider` | Cor de divisores | `#E9EDEF` |

> [!IMPORTANT]
> Sempre defina cores para **modo claro** e **modo escuro** usando o operador ternário:
> ```javascript
> background: { default: darkMode ? "#0B141A" : "#ECE5DD" }
> ```

---

### 2. Tipografia (`typography`)

```javascript
typography: {
    fontFamily: "'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600, fontSize: "1.1rem" },
    body1: { fontSize: "0.9375rem", lineHeight: 1.5 },
    body2: { fontSize: "0.875rem", lineHeight: 1.43 },
    button: { fontWeight: 500, textTransform: "none" },
}
```

**Fontes Recomendadas:**
- **SaaS/Corporate**: `'Inter', sans-serif`
- **WhatsApp**: `'Segoe UI', 'Helvetica Neue'`
- **Padrão**: `'Roboto', 'Helvetica', 'Arial'`

---

### 3. Forma (`shape`)

```javascript
shape: { borderRadius: 8 }
```

| Tema | Border Radius |
|------|---------------|
| WhatsApp | 8px (cantos suaves) |
| SaaS Premium | 16px (muito arredondado) |
| Corporate | 8px (profissional) |
| Padrão | 8px (neutro) |

---

### 4. Overrides Obrigatórios

Todo tema **DEVE** incluir os seguintes overrides para consistência visual:

```javascript
overrides: {
    MuiCssBaseline: { /* Estilos globais do body */ },
    MuiButton: { /* Botões */ },
    MuiPaper: { /* Cards e superfícies */ },
    MuiCard: { /* Cards específicos */ },
    MuiDrawer: { /* Sidebar/Menu lateral */ },
    MuiAppBar: { /* Header/Barra superior */ },
    MuiListItem: { /* Itens de lista/menu */ },
    MuiListItemIcon: { /* Ícones de menu */ },
    MuiListItemText: { /* Textos de menu */ },
    MuiDialog: { /* Modais */ },
    MuiTableHead: { /* Cabeçalho de tabelas */ },
    MuiTableCell: { /* Células de tabelas */ },
    MuiOutlinedInput: { /* Campos de texto */ },
    MuiChip: { /* Tags/Chips */ },
    MuiTooltip: { /* Tooltips */ },
    MuiFab: { /* Botões flutuantes */ },
    MuiAvatar: { /* Avatares */ },
}
```

---

## 🔧 Passo a Passo para Criar um Novo Tema

### 1. Defina a Identidade Visual

Antes de codar, defina:
- **Cor primária** (botões, links)
- **Cor do header** (AppBar)
- **Cor da sidebar** (Drawer)
- **Cores de fundo** (claro e escuro)
- **Cores de texto** (primário e secundário)

### 2. Adicione o Tema no Código

Abra `frontend/src/context/DarkMode/index.js` e adicione após os temas existentes:

```javascript
// Meu Novo Tema
if (appTheme === "meu_tema") {
    return createMuiTheme({
        palette: {
            type: darkMode ? "dark" : "light",
            primary: { main: "#SUA_COR_PRIMARIA" },
            // ... resto da palette
        },
        typography: { /* ... */ },
        shape: { borderRadius: 8 },
        overrides: { /* ... todos os 17 overrides */ },
    }, locale);
}
```

### 3. Adicione a Opção no Seletor

Edite `frontend/src/pages/Settings/index.js`, linha ~361:

```javascript
<option value="meu_tema">Meu Tema Personalizado</option>
```

### 4. Teste o Tema

```bash
# Rebuild do frontend
docker build -t watic-premium/frontend:latest -f frontend/Dockerfile ./frontend

# Atualize o serviço
docker service update --force watic-premium_frontend
```

---

## 📋 Checklist de Qualidade

Antes de finalizar um tema, verifique:

- [ ] Todas as cores têm versão **claro** e **escuro**
- [ ] Contraste adequado para leitura (texto vs fundo)
- [ ] Todos os 17 overrides estão definidos
- [ ] Botões são visíveis e clicáveis
- [ ] Sidebar tem boa legibilidade
- [ ] Inputs focados têm destaque visual
- [ ] Modais são legíveis
- [ ] Tabelas têm cabeçalhos distinguíveis

---

## 🎨 Referência de Cores por Tema

### WhatsApp Theme
| Elemento | Light | Dark |
|----------|-------|------|
| Primary | `#25D366` | `#25D366` |
| Header | `#075E54` | `#1F2C34` |
| Background | `#ECE5DD` | `#0B141A` |
| Paper | `#FFFFFF` | `#1F2C34` |

### SaaS Premium
| Elemento | Light | Dark |
|----------|-------|------|
| Primary | `#6366f1` | `#6366f1` |
| Background | `#f1f5f9` | `#0f172a` |
| Paper | `#ffffff` | `#1e293b` |

### Corporate
| Elemento | Light | Dark |
|----------|-------|------|
| Primary | `#1e40af` | `#1e40af` |
| Drawer | `#4f46e5` | `#4f46e5` |
| Background | `#f1f5f9` | `#0f172a` |

### Padrão (Whaticket)
| Elemento | Light | Dark |
|----------|-------|------|
| Primary | `#2576d2` | `#2576d2` |
| Background | `#f7fafc` | `#1a202c` |
| Paper | `#ffffff` | `#2d3748` |

---

## 📚 Recursos

- [Material-UI v4 Themes](https://v4.mui.com/customization/theming/)
- [Material-UI Color Tool](https://material.io/resources/color/)
- [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors) (referência para paletas)
