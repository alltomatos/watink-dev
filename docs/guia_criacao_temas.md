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
docker build -t watink/frontend:latest -f frontend/Dockerfile ./frontend

# Atualize o serviço
docker service update --force watink_frontend
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

## 🃏 Cards Premium (Design System v2)

A partir da versão **0.5.31**, o sistema utiliza um novo padrão de design para componentes de Cards, seguindo as melhores práticas de UI/UX para SaaS modernos.

### Princípios de Design

| Princípio | Implementação |
|-----------|---------------|
| **Profundidade** | Substituir bordas sólidas por sombras difusas (`box-shadow`) |
| **Hierarquia** | Títulos grandes e encorpados; detalhes sutis em cinza claro |
| **Interatividade** | Efeitos hover com elevação (`translateY`) |
| **Status Dinâmico** | Indicadores visuais pulsantes para estados ativos |

---

### 📦 Componente BaseCard (Reutilizável)

O componente `BaseCard` é a base para todos os cards do sistema. Localizado em:
```
frontend/src/components/BaseCard/index.js
```

#### Props Disponíveis

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `title` | `string` | - | Título do card |
| `subtitle` | `ReactNode` | - | Subtítulo ou descrição secundária |
| `icon` | `ReactNode` | - | Ícone exibido no header |
| `iconColor` | `string` | `primary.light` | Cor de fundo do wrapper do ícone |
| `actions` | `ReactNode` | - | Botões/ações no lado direito do header |
| `hoverEffect` | `boolean` | `false` | Ativa animação de hover (elevação + sombra) |
| `onClick` | `function` | - | Handler de clique no card |
| `className` | `string` | - | Classes CSS customizadas |
| `children` | `ReactNode` | - | Conteúdo interno (corpo do card) |

#### Exemplo de Uso Básico

```jsx
import BaseCard from "../../components/BaseCard";
import { WhatsApp, MoreVert } from "@material-ui/icons";

<BaseCard
    title="Minha Conexão"
    subtitle="Atualizado em 25/12"
    icon={<WhatsApp style={{ color: "#25D366" }} />}
    iconColor="#E8F5E9"
    actions={
        <IconButton size="small">
            <MoreVert />
        </IconButton>
    }
    hoverEffect={true}
    onClick={() => handleClick(id)}
>
    {/* Conteúdo adicional do card */}
    <Chip label="Conectado" />
</BaseCard>
```

#### Variações Implementadas

| Componente | Localização | Uso Recomendado |
|------------|-------------|-----------------|
| **BaseCard** | `components/BaseCard` | Base genérica para cards customizados |
| **MetricCard** | `components/MetricCard` | Dashboards, KPIs, métricas numéricas |
| **ListItemCard** | `components/ListItemCard` | Listas de contatos, usuários, itens |
| **InfoCard** | `components/InfoCard` | Detalhes, configurações, formulários |

---

### 📊 MetricCard

Card para exibir métricas numéricas com visual premium.

```jsx
import MetricCard from "../../components/MetricCard";
import { Assignment } from "@material-ui/icons";

<MetricCard
    label="Em Atendimento"
    value={42}
    icon={<Assignment />}
    color="primary"        // primary, success, warning, error, info
    trend={{ value: "+12%", positive: true }}  // opcional
/>
```

**Props:** `label`, `value`, `icon`, `color`, `trend`

---

### 👥 ListItemCard

Card para exibir itens em formato de lista com avatar e status.

```jsx
import ListItemCard from "../../components/ListItemCard";
import { IconButton } from "@material-ui/core";
import { Edit, Delete } from "@material-ui/icons";

<ListItemCard
    avatar="https://..."
    title="João Silva"
    subtitle="joao@email.com"
    status={{ label: "Ativo", color: "success" }}
    actions={
        <>
            <IconButton size="small"><Edit /></IconButton>
            <IconButton size="small"><Delete /></IconButton>
        </>
    }
    onClick={() => handleClick(id)}
/>
```

**Props:** `avatar`, `title`, `subtitle`, `status`, `actions`, `onClick`

---

### 📋 InfoCard

Card para informações detalhadas com header, body e footer.

```jsx
import InfoCard from "../../components/InfoCard";
import { Button } from "@material-ui/core";

<InfoCard
    title="Configurações"
    subtitle="Ajuste suas preferências"
    headerColor="#4caf50"
    actions={
        <>
            <Button>Cancelar</Button>
            <Button variant="contained" color="primary">Salvar</Button>
        </>
    }
>
    {/* Conteúdo do formulário */}
</InfoCard>
```

**Props:** `title`, `subtitle`, `headerColor`, `headerActions`, `children`, `actions`, `noPadding`

---

### Especificações Técnicas do BaseCard

```javascript
// Estilos Base do Card Premium
{
    borderRadius: 16,                                    // Cantos muito arredondados
    boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.08)",      // Sombra difusa
    transition: "all 0.3s cubic-bezier(.25,.8,.25,1)",
    "&:hover": {
        transform: "translateY(-6px)",                   // Levitação
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    }
}
```

### Paleta de Cores por Status

| Status | Cor do Indicador | Fundo do Chip | Texto do Chip |
|--------|------------------|---------------|---------------|
| Conectado | `#4CAF50` | `#E8F5E9` | `#2E7D32` |
| Desconectado | `#EF5350` | `#FFEBEE` | `#C62828` |
| Pendente/QR Code | `#FF9800` | `#FFF3E0` | `#E65100` |

### Componentes de Referência

#### Avatar com Fundo Suave
```javascript
<Avatar style={{ 
    backgroundColor: "#E8F5E9",  // Fundo verde claro
    color: "#4CAF50",            // Ícone verde
    width: 48, 
    height: 48 
}}>
    <WhatsAppIcon />
</Avatar>
```

#### Chip de Status com Indicador Pulsante
```javascript
<Chip
    icon={<FiberManualRecord style={{ color: "#4CAF50" }} />}
    label="Conectado"
    style={{
        backgroundColor: "#E8F5E9",
        color: "#2E7D32",
        fontWeight: 600,
        borderRadius: 8,
    }}
/>
```

#### Animação CSS do Indicador Pulsante
```css
@keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    100% { transform: scale(2.5); opacity: 0; }
}

.pulsingDot::before {
    animation: pulse 2s infinite;
}
```

### Exemplo de Implementação Completa

Veja o arquivo: [`frontend/src/pages/Connections/index.js`](file:///c:/dev/watink/frontend/src/pages/Connections/index.js)

---

## 📚 Recursos

- [Material-UI v4 Themes](https://v4.mui.com/customization/theming/)
- [Material-UI Color Tool](https://material.io/resources/color/)
- [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors) (referência para paletas)
