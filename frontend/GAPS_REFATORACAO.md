# Relatório de Gaps de Funcionalidade: Migração MUI v4 ➡️ shadcn/ui

Este documento detalha as funcionalidades perdidas ou incompletas identificadas durante a migração da branch `main` para `tinker/ui-and-di-refactor`.

## 1. Visão Geral da Mudança Estrutural
A refatoração não apenas alterou componentes visuais, mas também atualizou a infraestrutura core:
- **Roteamento:** Transição de `react-router-dom` v5 (`Switch`, `useHistory`) para v6 (`Routes`, `useNavigate`).
- **Ponto de Entrada:** Migração de `.js` para `.tsx` (TypeScript), resultando em arquivos duplicados e referências de importação quebradas.
- **Estilização:** Remoção de `makeStyles` (MUI) em favor de Tailwind CSS (shadcn), porém muitos componentes internos ainda dependem do motor legando JSS.

---

## 2. Análise por Página

### 📊 Dashboard
- **Estado na Main:** Utiliza `makeStyles` e widgets complexos (`TicketsInfo`, `AttendanceChart`, `PerformanceMetrics`). Possui modal de personalização (`Modal` do MUI).
- **Estado na Tinker:** Nova `PageContainer` com `MetricCards` (shadcn).
- **GAP IDENTIFICADO:** 
  - **Lógica de Dados:** Os `MetricCards` estão com valores **hardcoded** (mock). Na main, eles consumiam dados reais da API.
  - **Widgets Perdidos:** Widgets de gráficos e métricas de performance foram envelopados mas podem apresentar erros de renderização devido à falta de contexto de tema MUI v4 no novo layout.
  - **Customização:** O botão de configurações e a lógica de exibir/esconder widgets não foi portada.

### 🎫 Tickets (Atendimento)
- **Estado na Main:** Grid MUI v4 complexo, integrando `TicketsManager` e `Ticket`.
- **Estado na Tinker:** Layout de 3 colunas em Tailwind.
- **GAP IDENTIFICADO:**
  - **Gerenciamento de Estado:** A troca de branch introduziu arquivos `.jsx` e `.tsx` simultâneos. O `TicketsManager` atualizado na Tinker ainda importa componentes MUI v4 que conflitam com as variáveis de cor CSS do novo tema.
  - **Responsividade:** A lógica de `Hidden` (MUI) para mobile foi substituída por classes Tailwind, mas precisa de validação de eventos de toque e transições.

### 👥 Usuários (Users)
- **Estado na Main:** Tabela MUI v4 completa com paginação e busca.
- **Estado na Tinker:** Migrado para `src/pages/Users/index.jsx` usando `Table` do shadcn.
- **GAP IDENTIFICADO:**
  - **Paginação:** A lógica de paginação e o "Infinite Scroll" (se existente) da tabela MUI v4 não foi totalmente implementada na nova tabela shadcn.
  - **Modais:** O `UserModal` ainda é baseado em MUI v4, criando uma inconsistência visual e funcional quando disparado de dentro de um container shadcn.

### ⚙️ Configurações (Settings)
- **Estado na Tinker:** Em grande parte intocado no nível de página, mas as rotas apontam para arquivos que podem ter sido renomeados.

---

## 3. Gaps Sistêmicos (Infraestrutura)

1.  **Dualidade de Extensões:** A presença de `index.js`, `index.jsx` e `index.tsx` no mesmo diretório está confundindo o bundler (Vite) e causando carregamento de versões desatualizadas do código.
2.  **Breadcrumbs e Títulos:** O sistema de títulos dinâmicos da `MainHeader` (MUI) foi substituído pela `PageHeader`, mas a injeção dinâmica de títulos por rota foi perdida em várias telas secundárias.
3.  **Toasts e Notificações:** A configuração global do `ToastContainer` precisa ser validada no novo `index.tsx` para garantir que mensagens de erro da API ainda cheguem ao usuário.

## 4. Próximos Passos (Plano de Restauração)

1.  [ ] **Cleanup de Arquivos:** Remover todos os arquivos `.js` que possuem duplicatas `.tsx` ou `.jsx`.
2.  [ ] **Reconexão de API no Dashboard:** Restaurar os hooks `useEffect` e chamadas `api.get` nos `MetricCards`.
3.  [ ] **Ponte de Tema (Theme Bridge):** Garantir que o `StylesProvider` do MUI v4 ainda envolva a aplicação para que modais legados não quebrem.
4.  [ ] **Validação de Rotas:** Revisar o `Suspense` no `src/routes/index.tsx` para garantir que todas as páginas carreguem sem erro de "File not found".
