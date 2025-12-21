# Plano de Implementação: Layout SaaS Premium

## Descrição do Objetivo
Implementar um comportamento de layout distinto quando o tema "SaaS Premium" estiver ativo. O objetivo é abandonar o estilo "Material Drawer" padrão (menu retrátil sobreposto) em favor de um layout de **Dashboard Moderno** (Sidebar fixa lateral, Header flutuante/transparente), típico de aplicações SaaS (como Stripe, Linear, Intercom).

## Revisão do Usuário Necessária
*   **Aprovação Visual**: O novo layout terá uma barra lateral fixa que reduz a largura útil do conteúdo em telas menores (< 1280px)? (Assumiremos que sim, padrão em SaaS).
*   **Mobile**: Como deve se comportar no Mobile? (Manter o Drawer padrão ou adaptar o SaaS layout?) -> *Proposta: Manter Drawer padrão em mobile, Sidebar fixa apenas em Desktop.*

## Alterações Propostas

### 1. Refatoração da Estrutura de Layout (`frontend/src/layout/`)

Atualmente, `LoggedInLayout` mistura lógica de estado global, websocket e UI. Vamos separar a "Casca" (Shell) da lógica.

#### [NOVO] `frontend/src/layout/MainLayoutDefault.js`
*   Mover a implementação visual atual (Drawer, AppBar com cor primária, comportamento retrátil) para este componente.
*   Isso preserva a experiência original para quem não usar o tema SaaS.

#### [NOVO] `frontend/src/layout/MainLayoutSaaS.js`
*   **Sidebar Fixa**: Um `div` ou `aside` lateral fixo (width: 260px), sem a lógica de "Drawer" (não sobrepõe, empurra o conteúdo).
    *   Estilo: Borda sutil à direita, fundo claro/escuro dependendo do modo, sem sombra (elevation 0).
*   **Header (AppBar)**:
    *   Posição: `sticky` ou `fixed` no topo da área de conteúdo (offset left: 260px).
    *   Estilo: Fundo transparente com *blur* (`backdrop-filter`), sem sombra, borda sutil inferior.
    *   Conteúdo: Apenas Título, Toggle de Tema e Perfil. Sem botão de "Menu Hamburger" (Desktop).
*   **Área de Conteúdo**:
    *   Fundo: Cor de fundo da página (`background.default`).
    *   Padding aumentado para dar ar de "respiro".

#### [MODIFICAR] `frontend/src/layout/index.js`
*   Transformar `LoggedInLayout` em um **LayoutSwitcher**.
*   Lógica:
    ```javascript
    const { appTheme } = useThemeContext();
    const isSaaS = appTheme === "saas";
    // ... lógicas comuns (Sockets, Modais de Usuário) ...
    
    return isSaaS ? (
       <MainLayoutSaaS>{children}</MainLayoutSaaS>
    ) : (
       <MainLayoutDefault>{children}</MainLayoutDefault>
    );
    ```

### 2. Estilização Específica (CSSinJS / makeStyles)

No `MainLayoutSaaS.js`:
*   **Glassmorphism**: Aplicar nas modais e headers.
    ```css
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    ```
*   **Bordas Finas**: Substituir sombras (`box-shadow`) por bordas (`border: 1px solid theme.palette.divider`).

## Plano de Verificação

### Verificação Manual
1.  **Troca de Tema**: Ir em Configurações > Aparência.
    *   Selecionar "Padrão": Deve carregar o layout antigo (Menu Hamburger, AppBar Azul).
    *   Selecionar "SaaS Premium": Deve carregar o novo layout (Sidebar Fixa, Header Clean).
2.  **Responsividade**: Testar em resolução mobile. O Layout SaaS deve "degradar" graciosamente para um Drawer ou voltar ao Default em telas pequenas.
3.  **Persistência**: Recarregar a página (F5) e garantir que o layout correto permanece.

