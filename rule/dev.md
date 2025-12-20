### Projeto Whaticket Community

Sempre responder e ou criar planos documentos em portugues do brasil

Repositorio: https://github.com/alltomatos/whaticket-community.git

O projeto e um Fork do projeto original Whaticket.

Repositorio Original: https://github.com/canove/whaticket-community.git

### Roadmap de Design Premium (SaaS)

Documento de Referência: [Plano de Tema SaaS Premium](docs/plans/theme_saas_premiun.md)

Este roadmap visa transformar o visual do Whaticket para um estilo SaaS moderno (Flat/Bordered).

#### Etapas de Implementação:

1.  **Configuração Inicial**:
    *   [x] Instalar a fonte **Inter** (Google Fonts) em `public/index.html`.
    *   [x] Criar/Atualizar o tema Material UI em `src/layout/MainLayout.js` com a nova paleta de cores, tipografia e bordas (ver documento de referência).

2.  **Estrutura (Layout)**:
    *   [x] Substituir o Drawer retrátil por uma **Sidebar Fixa** à esquerda.
    *   [x] Limpar o Header (AppBar) removendo a cor primária sólida (usar branco/transparente).

3.  **Refatoração de Componentes**:

    *   [x] **Lista de Chats**: Aumentar padding, destacar nome do contato em negrito, usar "dot" para status.
    *   [x] **Janela de Chat**: Modernizar balões de mensagem (cantos arredondados, cores sólidas vs cinza claro), input de texto flutuante.

4.  **Acabamento**:
    *   [x] Adicionar efeitos de "Glassmorphism" (blur) em elementos flutuantes.
