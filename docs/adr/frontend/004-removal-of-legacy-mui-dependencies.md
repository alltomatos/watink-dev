# ADR-FE-004: Remoção de Dependências Legadas de Layout e Ícones do MUI v4 nos Widgets do Dashboard

**Status:** Aceito  
**Data:** 2026-06-13  
**Branch:** `tinker/ui-and-di-refactor`  
**Autores:** Claude (Antigravity) + alltomatos

---

## Contexto

Embora as cascas das páginas tenham sido consolidadas em TypeScript (`.tsx`) e envolvidas pelo `PageLayout` moderno do design system utilizando caixas semânticas, alguns subcomponentes internos (widgets incorporados) persistiam utilizando elementos do Material UI v4, especificamente:
1. `<Grid>` da biblioteca `@material-ui/core`.
2. Ícones herdados de `@material-ui/icons` (`Assignment`, `HourglassEmpty`, `CheckCircle`, `Speed`, `AccessTime`).

Esta mistura mantinha o runtime do JSS do MUI v4 acoplado durante a renderização do Dashboard e poluía o pacote de bundles final.

---

## Decisão

1. Substituir todos os elementos `<Grid>` contidos nos widgets `TicketsInfo` e `PerformanceMetrics` por Grids CSS nativos do Tailwind (`grid grid-cols-1 md:grid-cols-3 gap-4`).
2. Remover os ícones legados do MUI e adotar exclusivamente o conjunto de ícones do **Lucide React** (`lucide-react`) aprovados no design system (`Gauge`, `Clock`, `ClipboardList`, `Hourglass`, `CheckCircle2`).
3. Remover todos os códigos espelhados em `.js` nas pastas de páginas do frontend que competiam em import com os novos caminhos em `.tsx` que foram consolidados.

---

## Consequências

- **Melhoria de Performance**: Redução de tempo de renderização no Dashboard por utilizar Tailwind estático (Zero-Runtime CSS) no lugar de grid dinâmico via JSS.
- **Higiene do Repositório**: A eliminação de arquivos `.js` obsoletos evita conflitos de compilação ou import no bundler do Vite e melhora a experiência com intellisense.
- **Coerência Visual**: Alinhamento estrito com as diretrizes visuais mapeadas em `docs/desgner-system/Watink Design System/`.
