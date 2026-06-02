# Governança do Design System (Watink)

Este diretório contém a nova arquitetura de tokens do Watink, estruturada para permitir white-labeling e um modo escuro consistente.

## Estrutura (3 Níveis)

1. **Tokens Primitivos (`primitives.js`)**: Paleta base (cores brutos, espaçamentos, sombras). **Nunca** use diretamente em componentes.
2. **Tokens Semânticos (`semantic.js`)**: Camada de intenção (ex: `--action-primary`). Adaptam-se ao tema light/dark.
3. **Tokens de Componente (`components.js`)**: Definições específicas de UI.

## Adicionando novos estilos

1. Adicione o valor base em `primitives.js`.
2. Mapeie o valor para as chaves `light` e `dark` em `semantic.js`.
3. Use apenas variáveis CSS (`var(--nome-do-token)`) em componentes (via `makeStyles` ou `styled`).

## Bridge com MUI v4

O arquivo `bridge.js` atua como tradutor. Ao adicionar tokens novos que devam afetar o MUI, atualize o objeto `createMuiThemeBridge` para que as propriedades do MUI leiam as novas variáveis CSS.
