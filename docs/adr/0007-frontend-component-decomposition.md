# ADR 0007 — Política de Decomposição de Componentes Frontend

**Status:** Aceito  
**Data:** 2026-06-20  
**Autor:** Watink Engineering

---

## Contexto

Os componentes `MessagesList/index.tsx` (799 linhas) e `MessageInput/index.tsx` (682 linhas) ultrapassam o limite de ~250 linhas estabelecido em `CLAUDE.md` (regra Anti-God File). Isso causa:

- **Cegueira de contexto**: Claude Code e IDEs perdem linhas além do read window, gerando edições cegas.
- **Testabilidade zero**: Funções render embutidas no componente não podem ser testadas isoladamente.
- **Risco de regressão**: Qualquer edição futura no arquivo inteiro pode afetar comportamentos distantes.
- **Onboarding lento**: Novos contribuidores precisam ler 700+ linhas para entender um fluxo simples.

---

## Decisão

Componentes React com mais de ~250 linhas devem ser decompostos seguindo a estrutura padrão abaixo. Cada extração deve ser verificada com `npm run typecheck` antes de prosseguir para a próxima.

### Estrutura Padrão

```
ComponentName/
  index.tsx                      # Orquestrador — < 250 linhas
  hooks/
    use<ComponentName>.ts        # Estado, effects, handlers
  utils/
    <componentName>Helpers.ts    # Funções puras, constantes
  components/
    <SubFeature>.tsx             # Blocos JSX reutilizáveis ou complexos
    <SubFeature>.tsx
    ...
```

### Critérios para extração

| Candidato | Extrair quando |
|---|---|
| Custom hook | O componente possui 3+ `useState` ou 2+ `useEffect` |
| Arquivo de utils | Existem funções puras (sem JSX, sem hooks) com mais de 10 linhas |
| Sub-componente | Um bloco JSX tem > 30 linhas e recebe props bem definidas |

---

## Consequências

**Positivas:**
- Cada arquivo fica dentro do limite de leitura seguro (~250 linhas).
- Hooks extraídos são testáveis com `renderHook` do Testing Library.
- Sub-componentes são testáveis isoladamente com `render` simples.
- Claude Code pode usar `Read` com `offset`/`limit` sem perder contexto.

**Negativas:**
- Mais arquivos por componente (custo de navegação).
- Imports internos adicionais no `index.tsx`.

**Mitigação:** A estrutura de diretório (`hooks/`, `utils/`, `components/`) torna a localização previsível — o custo de navegação é baixo.

---

## Componentes Alvo (jun/2026)

| Componente | Linhas | Branch |
|---|---|---|
| `MessagesList/index.tsx` | 799 | `refactor/decompose-messages` |
| `MessageInput/index.tsx` | 682 | Sprint seguinte |
| `ContactDrawer/index.tsx` | 456 | Sprint seguinte |

---

## Referências

- `CLAUDE.md` — Seção "Modularidade (Anti-God File)"
- [ADR 0006](0006-go-service-interfaces.md) — Interfaces em Go (padrão análogo de separação de responsabilidades)
