# Guia de Temas e Design

O Watic Premium utiliza um sistema de temas flexível baseado no Material-UI v4.

## Estrutura
O arquivo central é `frontend/src/context/DarkMode/index.js`.
Cada tema retorna um objeto `createMuiTheme()`.

## Paleta de Cores
Definição de cores para modos Claro e Escuro.
- **Primary**: Botões, Links, Destaques.
- **Background**: `default` (app) e `paper` (cards).

## Componentes Premium
### BaseCard
Wrapper padrão para cards com elevação e hover.
- `src/components/BaseCard`

### Outros Cards
- `MetricCard`: Para dashboards.
- `ListItemCard`: Para listas de contatos/usuários.

## Criando um Novo Tema
1. Adicione a lógica em `DarkMode/index.js`.
2. Adicione a opção no seletor em `Settings/index.js`.
3. Recompile o frontend.
