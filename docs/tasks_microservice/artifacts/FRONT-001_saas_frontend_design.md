# FRONT-001: Design de Wireframes e Fluxos (Admin SaaS)

## 1. Visão Geral
Este documento define o design da interface e os fluxos de usuário para o painel administrativo do SaaS (Super Admin) e as adaptações necessárias no frontend existente para suportar múltiplos inquilinos (Tenants).

**Objetivo**: Permitir que o administrador do sistema gerencie empresas (tenants), planos e monitore o uso da plataforma.

## 2. Arquitetura de Frontend

### 2.1. Estratégia de Roteamento
O frontend atual será adaptado para suportar dois "modos" de operação baseados no nível de acesso do usuário:
1.  **Tenant App**: A aplicação padrão como existe hoje (Atendimento, Tickets, Contatos).
2.  **Super Admin App**: Um conjunto de novas rotas exclusivas para usuários com flag `superAdmin: true`.

**Novas Rotas Sugeridas:**
- `/admin` (Redirect para Dashboard se logado como Super Admin)
- `/admin/dashboard` (Visão Geral)
- `/admin/tenants` (Gestão de Empresas)
- `/admin/plans` (Gestão de Planos - Futuro)
- `/admin/settings` (Configurações Globais do SaaS)

### 2.2. Adaptação do Login
A tela de login precisará identificar o contexto do tenant.
- **Cenário A (Subdomínio)**: `empresa.whaticket.com` -> O frontend captura o subdomínio e envia ao backend para validar o tenant antes do login.
- **Cenário B (Domínio Único)**: O login solicita o "Alias da Empresa" ou "CNPJ" além de email/senha, ou o email é único globalmente.
    - *Decisão*: Manteremos simples inicialmente. O usuário loga com email/senha. Se o email pertencer a um Super Admin, ele vê o menu Admin. Se for usuário comum, o backend resolve o tenant pelo email (assumindo email único no sistema por enquanto) ou pelo domínio de origem.

## 3. Wireframes (Descritivo)

### 3.1. Dashboard Geral (Super Admin)
**Rota**: `/admin/dashboard`
**Layout**: `MainLayout` com Menu Lateral expandido contendo opções de Admin.

**Componentes:**
1.  **Cards de Métricas (Topo)**:
    - `Total de Tenants`: [Número] (Ativos/Inativos)
    - `Mensagens Hoje`: [Número] (Global)
    - `Conexões WhatsApp`: [Número] (Conectadas/Total)
    - `Uso de Disco`: [XX] GB / [YY] GB
2.  **Gráfico Principal**:
    - "Crescimento de Tenants" (Linha temporal) ou "Mensagens por Dia".
3.  **Lista de Alertas/Atividades Recentes**:
    - "Tenant X criado"
    - "Tenant Y bloqueado por falta de pagamento"

### 3.2. Lista de Tenants (Gerenciamento)
**Rota**: `/admin/tenants`

**Elementos de Interface:**
- **Barra de Ações**:
    - Botão `+ Novo Tenant`
    - Campo de Busca (Nome, Email, Documento)
- **Tabela de Tenants**:
    - Colunas:
        - ID
        - Nome da Empresa
        - Email do Admin
        - Plano (Basic/Pro/Enterprise)
        - Status (Ativo/Inativo/Bloqueado)
        - Data de Criação
        - Ações (Editar, Logar como, Excluir)
- **Modal de Criação/Edição de Tenant**:
    - Campos:
        - Nome da Empresa
        - Email do Administrador (cria o usuário admin inicial)
        - Senha Inicial
        - Plano Selecionado
        - Vencimento da Fatura
        - Limite de Conexões (Opcional, override do plano)
        - Limite de Usuários (Opcional, override do plano)

### 3.3. Detalhes do Tenant
**Rota**: `/admin/tenants/:id`

**Abas:**
1.  **Visão Geral**: Dados cadastrais, status.
2.  **Assinatura**: Plano atual, histórico de pagamentos, data de renovação.
3.  **Recursos**: Uso atual vs Limites (Users, Connections, Queues).
4.  **Configurações**: Webhooks globais, Tokens de API.

## 4. Fluxos de Usuário

### 4.1. Fluxo: Provisionamento de Novo Cliente
1.  Super Admin acessa `/admin/tenants`.
2.  Clica em "Novo Tenant".
3.  Preenche formulário (Nome: "Padaria do João", Email: "joao@padaria.com", Plano: "Gold").
4.  Clica em "Salvar".
5.  **Sistema**:
    - Cria registro na tabela `Tenants`.
    - Cria usuário Admin vinculado a este Tenant.
    - Cria configurações padrão (Settings).
    - Envia email de boas-vindas (opcional/futuro).
6.  Novo Tenant aparece na lista com status "Ativo".

### 4.2. Fluxo: Bloqueio de Cliente (Inadimplência)
1.  Super Admin localiza o tenant na lista.
2.  Clica no ícone de "Editar" ou "Status".
3.  Altera status para "Inativo" ou "Bloqueado".
4.  **Sistema**:
    - Invalida sessões ativas deste tenant.
    - Pausa processamento de mensagens no RabbitMQ para este tenant (ou rejeita no consumidor).
    - Desconecta sessões do WhatsApp.

## 5. Componentes Necessários (React)

Reutilizaremos a biblioteca `@material-ui/core` já instalada.

- `AdminLayout`: Wrapper que verifica `user.profile === 'superadmin'`.
- `TenantModal`: Formulário com validação Yup.
- `StatsCard`: Componente visual para métricas.
- `TenantTable`: DataGrid ou Table com paginação server-side.

## 6. Integração com Backend

Novos endpoints necessários no Backend (serão implementados no FRONT-003, mas definidos aqui):

- `GET /api/admin/tenants`: Listar tenants (paginado).
- `POST /api/admin/tenants`: Criar tenant.
- `PUT /api/admin/tenants/:id`: Atualizar tenant.
- `DELETE /api/admin/tenants/:id`: Deletar tenant.
- `GET /api/admin/dashboard`: Métricas globais.

## 7. Próximos Passos (Implementação)

1.  **FRONT-002**: Implementar lógica de Login e Contexto de Auth para suportar Tenant ID.
2.  **FRONT-003**: Criar as páginas e componentes descritos acima.
