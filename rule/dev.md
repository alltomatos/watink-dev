# Guia de Desenvolvimento e Arquitetura - Watink

Este documento unifica as regras mandatórias, as diretrizes para o agente de IA e a documentação técnica detalhada da arquitetura do projeto Watink.

---

## 1. Regras Mandatórias
> ⚠️ **Atenção**: Estas regras têm precedência sobre qualquer outra documentação.

### 1.1 Ambiente e Configuração
- **Tenants**: O sistema pode operar em modo Single ou Multi-Tenant.
    - Sempre verifique `process.env.TENANTS === 'true'` antes de aplicar lógica restritiva.
- **Docker**: Utilize sempre o `docker-stack.yml` para orquestração local e produção.

### 1.2 Padrões Multi-Tenant (SaaS)
#### Banco de Dados
- **Isolamento**: Todas as queries críticas (Users, Whatsapps, Contacts, Tickets, etc.) **DEVEM** filtrar pelo `tenantId` no `WHERE`.
- **Transações com RLS**: Ao usar transações no Sequelize, confie nos hooks globais (`beforeFind`, `beforeCreate`, etc.) para injetar o contexto:
  ```typescript
  // O hook define automaticamente: SET app.current_tenant = 'uuid'
  await sequelize.transaction(async (t) => {
      // operações aqui estarão protegidas se o RLS estiver ativo no banco
  });
  ```
- **Modificação de Tenants**: Nunca altere a tabela `Tenants` diretamente pelo backend Node.js, exceto para leitura. A "fonte da verdade" é o **Watink-Guard** (Agente Go).

#### Agente de Infraestrutura (Watink-Guard)
- O provisionamento de novos inquilinos é feito exclusivamente via `POST /manage/v1/tenants` no serviço Go.
- Não bypassar o agente inserindo manualmente no banco.

#### Limites (Enforcement)
- **Status**: Respeite o campo `status` ('active'/'inactive'). Usuários de tenants inativos não devem conseguir logar ou usar a API.
- **Cotas**: Respeite os campos `maxUsers` e `maxConnections`. Valide antes de criar novos recursos.

### 1.3 Padrões de Código
- **Backend (Node.js)**:
  - Services devem ser funções puras ou Classes com injeção de dependência quando possível.
  - Use `AppError` para erros de negócio.
- **Frontend (React)**:
  - Utilize componentes funcionais e Hooks.
  - Evite lógica de negócio complexa nos componentes; use Context ou Services.

### 1.4 Segurança
- Nunca commite chaves privadas ou senhas hardcoded.
- Use variáveis de ambiente para segredos (`.env`).
- A comunicação com o Painel SaaS deve ser protegida pela `WATINK_MASTER_KEY`.

---

## 2. Diretrizes do Agente (AI Instructions)
> [!CAUTION]
> **AI_INSTRUCTION**: Re-read the "[!IMPORTANT]

A partir de agora, não se limite a ser um executor de comandos. Sua função é atuar como um Mentor Técnico. Eu sou um desenvolvedor experiente, mas quero garantir que minhas decisões arquiteturais e de código sigam os padrões da indústria (Best Practices).

### Suas Diretrizes de Comportamento:

1. **Pensamento Crítico Obrigatório**: Antes de gerar qualquer código ou comando, analise o meu pedido. Se a minha abordagem for insegura, obsoleta, não performática ou promover "code smells" (maus hábitos), PAUSE.
2. **Obrigação de Discordar**: Você tem permissão e o dever de discordar da minha abordagem se houver uma maneira técnica superior de resolver o problema. Não aceite "gambiarras" sem alertar sobre os riscos.

### Estrutura de Resposta:

1. **Análise**: Breve avaliação do que eu pedi.
2. **Alerta (se necessário)**: "Sua abordagem funciona, MAS traz o risco X, Y, Z."
3. **Recomendação de Mentor**: A solução ideal/padrão de mercado (ex: "Em vez de liberar root no SSH, use chaves RSA e um usuário sudoer").
4. **Execução**: O código ou comando para a melhor solução (e, opcionalmente, o que eu pedi originalmente, se eu insistir).

**Foco em Pilares**: Sempre priorize Segurança, Escalabilidade, Manutenibilidade (Clean Code) e Idempotência (em infraestrutura).

---

## 3. Detalhamento Técnico e Arquitetura

Este documento serve como referência técnica detalhada para a stack tecnológica, arquitetura de microserviços e padrões de projeto.

> [!IMPORTANT]
> **Leitura Complementar Obrigatória**: Consulte também [dev_micro.md](./dev_micro.md) para microserviços e [dev_plugin.md](./dev_plugin.md) para desenvolvimento de plugins.
> **Sempre responda e crie documentos em Português do Brasil.**
> **Ambiente de Execução**: Todo o desenvolvimento e execução do projeto deve ser feito via **Docker Swarm**. Não rode os serviços localmente (fora de containers).

### 3.1 Arquitetura de Microserviços

O projeto evoluiu de um monolito para uma arquitetura distribuída orientada a eventos, rodando exclusivamente em containers orquestrados.

- [Arquitetura de Microserviços e Topologia](../docs/microservices/ARCHITECTURE.md)
- [Multitenancy e Isolamento](../docs/microservices/MULTITENANCY.md)

#### Componentes Principais

1.  **Traefik (Edge Router)**: Reverse Proxy dinâmico e Load Balancer. Gerencia todo o tráfego de entrada (HTTP/HTTPS) e roteia para os serviços baseados em labels do Docker Swarm.
2.  **Frontend (SPA)**: Interface do usuário construída com React e Vite. Servido internamente por Nginx, mas exposto via Traefik.
3.  **Backend (API + Orchestrator)**: Gerencia regras de negócio, banco de dados e orquestra comandos.
4.  **Plugin Manager**: Serviço dedicado ao gerenciamento, instalação e proxy de plugins do Marketplace.
5.  **Engine (WhatsApp Worker)**:
    *   **Engine Standard/Pro**: Node.js com **Whaileys** (Wrapper otimizado do Baileys).
    *   **Engine Enterprise**: Go com **WhatsMeow** (Alta performance).
6.  **Message Broker**: **RabbitMQ** para comunicação assíncrona entre Backend e Engines.
7.  **Transient Store & Cache**: **Redis** para persistência de curto prazo (retentativas de mensagens), cache de sessões e lock distribuído.
8.  **Database**: PostgreSQL com extensões **PostGIS** e **pgvector**.
9.  **RBAC**: Sistema de controle de acesso granular baseado em Grupos e Permissões.

### 3.2 Controle de Acesso (RBAC)

O sistema utiliza um modelo de RBAC (Role-Based Access Control) granular e multi-tenant.

#### Estrutura
1.  **Users**: Pertencem a um `Group` e podem ter `UserPermissions` individuais.
2.  **Groups**: Conjunto de `Permissions` atribuídas a múltiplos usuários.
3.  **Permissions**: Ações atômicas (ex: `view_tickets`, `user-modal:editProfile`).

#### Implementação
*   **Backend**: Middleware `checkPermission` verifica as permissões combinadas (Grupo + Individuais) do usuário autenticado.
*   **Frontend**: Componente `<Can perform="permissao" />` e hook `useAuth` controlam a renderização de elementos protegidos.
*   **Super Admin**: Usuários com `profile: "admin"` possuem acesso irrestrito (fallback).

#### 🛡️ Guia: Criando um Novo Módulo com Permissões

- [Guia Completo de Desenvolvimento de Plugins](./dev_plugin.md)

Ao criar um novo recurso (ex: "Relatórios"), siga este fluxo para garantir a integração ao RBAC:

1.  **Migration (Backend)**:
    Crie uma migration (`npx sequelize migration:create --name seed-permissions-reports`) para inserir as permissões na tabela `Permissions`.
    *   Sempre use `ignoreDuplicates: true` nos seeds.
2.  **Categorização (Frontend)**:
    No arquivo `frontend/src/pages/Groups/GroupModal.js`, adicione as novas permissões ao objeto `categories` dentro da função `categorizePermissions`.
3.  **Proteção de Rotas (Backend)**:
    Adicione o middleware `checkPermission` nas rotas do novo recurso.
4.  **Proteção de Interface (Frontend)**:
    Use o componente `<Can>` para esconder botões ou menus.

### 3.3 Tecnologias Frontend

Containerizado e servido via Nginx interno, exposto via Traefik.

- [Arquitetura do Frontend](../docs/frontend/ARCHITECTURE.md)
- [Guia de Temas e Design](../docs/frontend/THEMING.md)

*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Framework**: React
*   **UI Library**: Material UI (v4)
*   **Estado Global**: Context API
*   **Comunicação**: Axios (HTTP) e Socket.IO Client (WebSocket)

#### ⚠️ Regras para Frontend:
*   **Autenticação e Contexto (Anti-Pattern useAuth)**: **NUNCA** instancie o hook `useAuth` diretamente em páginas ou componentes filhos para obter dados do usuário. O `useAuth` registra interceptors no Axios a cada chamada, causando duplicação e *Race Conditions* (logout involuntário em 401). Sempre consuma o estado via `useContext(AuthContext)`.
*   **NÃO** rode `npm run dev` localmente. O ambiente deve ser 100% Docker Swarm.
*   **Traefik Routing**: O frontend é acessível na raiz (`/`). O Traefik roteia chamadas de API (`/api/*`) e sockets (`/socket.io/*`) para o backend automaticamente.
*   **URLs Backend**: Use sempre o helper `getBackendUrl` (em `src/helpers/urlUtils.js`).
*   Para aplicar alterações, reconstrua a imagem e atualize o serviço no Swarm.

#### 📦 Biblioteca de Componentes Reutilizáveis

> [!IMPORTANT]
> **Regra de Ouro**: Antes de criar um novo componente, **SEMPRE** verifique se já existe um componente similar em `frontend/src/components/`. Reutilize e estenda ao invés de duplicar.

##### Componentes Disponíveis

| Componente | Descrição | Uso |
|------------|-----------|-----|
| `BaseCard` | Card base com hover effect, ícone, título, subtítulo e ações | Wrapper genérico |
| `MetricCard` | Card de métricas com ícone, valor grande e trend | Dashboards |
| `InfoCard` | Card com header colorido, body e footer | Formulários, detalhes |
| `ListItemCard` | Card para itens de lista com avatar, status e ações | Listas |
| `ButtonWithSpinner` | Botão com loading spinner integrado | Forms assíncronos |
| `BackdropLoading` | Overlay de carregamento fullscreen | Loading states |
| `ConfirmationModal` | Modal de confirmação padronizado | Ações destrutivas |
| `TabPanel` | Container para conteúdo de abas | Tabs |
| `MainContainer` | Container principal de páginas | Layout de páginas |
| `MainHeader` | Header padrão para páginas | Layout de páginas |
| `Can` | Componente de permissão (RBAC) | Proteção de UI |

##### Regras de Criação de Componentes

1. **Verificar antes de criar**: Execute `ls frontend/src/components/` ou busque por componentes similares.
2. **Nome descritivo**: Use PascalCase e nomes que descrevam a função (`MetricCard`, não `Card2`).
3. **Documentação inline**: Todo componente deve ter JSDoc com descrição de props.
4. **Documentar aqui**: Após criar um componente reutilizável, adicione-o à tabela acima.
5. **Props consistentes**: Siga o padrão de props existentes (`className`, `onClick`, `...rest`).

##### Exemplo de Uso

```jsx
import BaseCard from "../../components/BaseCard";
import MetricCard from "../../components/MetricCard";
import { Assignment } from "@material-ui/icons";

<MetricCard
    label="Total de Tickets"
    value="1,234"
    icon={<Assignment />}
    color="primary"
    trend={{ value: "+12%", positive: true }}
/>
```

### 3.4 Tecnologias Backend

O backend orquestra o sistema e roda isolado em container.

- [Arquitetura do Backend](../docs/backend/ARCHITECTURE.md)
- [Documentação da API](../docs/backend/API.md)

*   **Runtime**: Node.js (TypeScript)
*   **Framework**: Express
*   **ORM**: Sequelize (TypeScript)
*   **Documentação**: **Swagger** (`/docs`)
*   **Mensageria**: RabbitMQ (amqplib)

#### ⚠️ Regras para Backend:
*   **NUNCA** adicione lógica de conexão com WhatsApp (WWebJS/Baileys) diretamente no Backend.
*   Use o **Service Layer Pattern**: Controllers chamam Services.
*   Para ações no WhatsApp, publique mensagens no RabbitMQ.
*   **Logs devem ser direcionados para `stdout`/`stderr`.
*   **Cookies em Desenvolvimento**: Em ambiente `localhost`, assegure que cookies de autenticação (`jrt`) tenham flags `SameSite: 'Lax'` e `Secure: false` para garantir persistência e renovação de tokens.

### 3.5 Cache e Transient Store (Redis)

Introduzido para resolver limitações de escalabilidade e confiabilidade do armazenamento em memória (RAM).

#### Motivação Técnica
1.  **Persistência de Retentativa**: O Redis, com persistência AOF, garante que mensagens sobrevivam a reinicializações.
2.  **Statelessness**: Remove o estado local dos containers do Engine.
3.  **Performance**: Evita I/O excessivo no PostgreSQL.

#### Implementação
*   **Serviço**: `redis` (imagem `redis:alpine` com `--appendonly yes`).
*   **Uso Atual**: Retentativas de mensagens (TTL 24h) e Cache de Sessão.

### 3.6 WhatsApp Engines (Microserviços)

Workers independentes que se conectam ao WhatsApp.

- [Documentação do Engine (Whaileys)](../docs/engine-standard/README.md)
- [Arquitetura de Eventos Engine](../docs/engine-standard/ARCHITECTURE.md)

#### Engine Standard (`whaileys-engine`)
*   **Tecnologia**: Node.js / TypeScript
*   **Lib Core**: **Whaileys**
*   **Função**: Processamento padrão.

#### Engine Go (`engine-go`)
*   **Tecnologia**: Go 1.21+
*   **Lib Core**: **WhatsMeow** (High Performance)
*   **Escudo**: `wbot_go_commands` (RabbitMQ)
*   **Verificação**: Idempotência nativa via PostgreSQL e Memória.

#### Recursos de Mensagem (Botões Interativos)
O Engine Standard suporta o envio de mensagens interativas nativas (Bubbles com botões de URL).

### 3.7 Flow Engine (Automação)

Sistema de automação híbrido e agnóstico à plataforma.

- [Visão Geral do Flow Builder](../docs/frontend/flowbuilder/OVERVIEW.md)
- [Componentes do Flow Builder](../docs/frontend/flowbuilder/COMPONENTS.md)

*   **Arquitetura**: Baseada em Grafos, Gatilhos e Sessões.
*   **Componentes Chave**: `FlowExecutorService`, `FlowTriggerService`, `FlowSessions`.

### 3.8 Banco de Dados: PostgreSQL + Extensions

Imagem customizada rodando em serviço dedicado no Swarm.

- [Multitenancy e RLS](../docs/microservices/MULTITENANCY.md)

*   **Imagem Docker**: `ronaldodavi/pgvectorgis:latest`
*   **Extensões**: **PostGIS** (Geolocalização) e **pgvector** (Busca Semântica/IA).
*   **Migrações**: Executadas automaticamente pelo container do backend.

### 3.9 Fluxo de Desenvolvimento (Swarm Only)

Todo o ciclo de vida da aplicação é gerenciado via Docker Swarm.

#### 1. Inicialização (Deploy Completo)
```bash
docker stack deploy -c docker-stack.yml watink
```

> [!TIP]
> **Clean Deploy**: Use `docker stack rm watink` se precisar limpar volumes.

#### 2. Aplicando Alterações (Update Script)
> [!IMPORTANT]
> **Obrigatório**: Para aplicar mudanças de código, utilize **exclusivamente** o script de automação `./update.sh`. Nunca execute `docker stack deploy` manualmente após um build, pois o script garante que a imagem foi construída e a tag foi atualizada no `docker-stack.yml` antes de disparar o deploy, evitando condições de corrida.

Sintaxe: `./update.sh <service> [type]`

**O que o script faz:**
1.  Incrementa versão no `package.json`.
2.  Gera tags docker.
3.  **Atualiza o `docker-stack.yml`**.
4.  Executa `docker stack deploy`.

exemplos:
```bash
./update.sh backend
./update.sh engine-go
```

#### 2.1 Atualização de Variáveis e Stack
Se você alterou o `docker-stack.yml`:
```bash
docker stack deploy -c docker-stack.yml watink
```

#### 3. Debug & Logs
*   **Logs**: `docker service logs -f watink_backend`
*   **Swagger**: `http://localhost:8080/docs`
*   **RabbitMQ**: `http://localhost:15672`

### 3.10 Manutenção da Documentação

A documentação é parte integrante e vital do sistema.

#### Regras de Ouro
1.  **Manual do Usuário (`userguide/`)**: Sincronize PRs com atualizações aqui.
2.  **Documentação Técnica (`docs/`)**: Documente novas arquiteturas e serviços.

### 3.11 Controle de Versão (Git)

#### Padrão de Branches
*   **`devel_developer`**: Staging.
*   **`main`**: Produção (estável).
*   **`feature/...`**, **`fix/...`**, **`chore/...`**.

#### Fluxo de Trabalho
1.  **Branching** (from `devel_developer`)
2.  **Desenvolvimento** (no Swarm)
3.  **Preparação para Merge** (`./update.sh`)
4.  **Commit & Push** (Conventional Commits)
5.  **Pull Request**

### 3.12 Versionamento e Release

Seguimos estritamente o **Semantic Versioning (SemVer)**.

#### Política de Atualização
⚠️ **REGRA OBRIGATÓRIA**: Sempre incremente a versão antes de gerar builds.

1.  **Analise as Mudanças** (Major/Minor/Patch).
2.  **Atualize o `package.json`** (`npm version ...`).
3.  **Build e Tag Docker**.
4.  **Atualize o Serviço**.

### 3.13 Diretrizes de Design Premium

O Watink deve oferecer uma experiência visual de alta qualidade. Todas as interfaces devem seguir os princípios de design premium abaixo.

#### Filosofia de Design
- **Primeira impressão impactante**: O usuário deve ser "WOWed" ao ver a interface pela primeira vez.
- **Modernidade**: Utilize tendências atuais de UI/UX (glassmorphism, gradientes sutis, micro-animações).
- **Consistência**: Mantenha padrões visuais em todas as telas.

#### Cores e Paleta
- ❌ **Evite cores genéricas** (vermelho puro, azul padrão, verde básico).
- ✅ **Use paletas curadas** com cores HSL personalizadas e harmoniosas.
- ✅ **Dark mode elegante**: Fundos com gradientes sutis (#0f0f23 → #1a1a2e).
- ✅ **Accent colors**: Tons vibrantes para CTAs (ex: gradiente azul-roxo para botões principais).

#### Tipografia
- Use fontes modernas do Google Fonts: **Inter**, **Outfit**, **Roboto**, **Poppins**.
- Nunca use fontes padrão do browser (Arial, Times New Roman).
- Hierarquia clara: títulos em bold, corpo em regular, captions em light.

#### Componentes Visuais
- **Cards**: Bordas arredondadas (8-16px), sombras suaves, efeito hover com scale/elevation.
- **Botões**: Gradientes, transições suaves (0.2s ease), estados hover/active distintos.
- **Inputs**: Focus states com glow colorido, placeholders elegantes.
- **Modais**: Backdrop blur (glassmorphism), animação de entrada fade+scale.

#### Micro-Animações
- **Obrigatórias** em: transições de página, hover em cards/botões, loading states.
- **Bibliotecas sugeridas**: Framer Motion, react-spring.
- **Timing**: Duração de 150-300ms, easing `ease-out` ou `cubic-bezier`.

#### Anti-Patterns (O que NÃO fazer)
- ❌ Interfaces "flat" e sem profundidade visual.
- ❌ Espaçamentos inconsistentes.
- ❌ Botões genéricos sem hover effects.
- ❌ Placeholders de imagem (use AI para gerar assets se necessário).
- ❌ MVPs visuais básicos - cada tela deve parecer pronta para produção.

#### Exemplo de Implementação CSS

```css
/* Card Premium */
.premium-card {
  background: linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.premium-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.3);
}

/* Botão Gradiente */
.btn-primary {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 8px;
  color: white;
  padding: 12px 24px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  transform: scale(1.02);
}
```

#### Checklist de Qualidade Visual
Antes de entregar qualquer interface, verifique:
- [ ] Dark mode implementado e elegante
- [ ] Todos os botões têm estados hover/active
- [ ] Cards têm sombras e bordas arredondadas
- [ ] Tipografia usa fonte moderna (não padrão)
- [ ] Espaçamentos consistentes (múltiplos de 4px ou 8px)
- [ ] Micro-animações em elementos interativos
- [ ] Cores não são genéricas (HSL customizado)