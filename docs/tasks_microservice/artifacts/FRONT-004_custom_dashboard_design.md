# FRONT-004: Dashboards Personalizáveis por Cliente

## 1. Conceito e Objetivo
A ideia central é transformar o Dashboard estático atual (`/frontend/src/pages/Dashboard/index.js`) em uma área dinâmica composta por "Widgets". Isso permite que cada usuário (ou tenant) decida quais métricas são relevantes para o seu dia a dia.

**Problema Atual**: O dashboard é "hardcoded". Se um cliente não usa "Tickets Pendentes", ele vê um gráfico vazio ou irrelevante.
**Solução**: Um sistema modular onde o usuário pode ativar/desativar e reordenar componentes (widgets).

## 2. Arquitetura Técnica

### 2.1. Estrutura de Widgets
Cada Widget será um componente React independente que recebe props padronizadas (ex: `data`, `loading`, `fullWidth`).

**Diretório Sugerido**: `frontend/src/components/Dashboard/Widgets/`

**Widgets Iniciais Sugeridos**:
1.  **AttendanceChart**: Gráfico de atendimentos por dia/hora (já existe).
2.  **TicketsInfo**: Cards com contadores (Abertos, Pendentes, Finalizados).
3.  **ConnectionStatus**: Lista resumida das conexões WhatsApp e bateria.
4.  **UserStatus**: Lista de usuários online/offline.
5.  **QueueStatus**: Contadores por fila.

### 2.2. Persistência de Preferências
Precisamos salvar como o usuário quer ver o dashboard.

**Onde salvar?**
- Opção A: `Settings` (Configuração global do Tenant). Todos os usuários do tenant veem igual.
- Opção B: `User.preferences` (Configuração por usuário). Cada usuário tem seu layout.

*Decisão*: Vamos implementar na tabela `Users` (ou uma tabela `UserPreferences` se o JSON ficar grande) para permitir personalização individual. Como MVP, podemos usar um campo JSON na tabela `Users` chamado `configs` ou similar. O Whaticket já tem `Settings`, mas é global.

**Schema do JSON**:
```json
{
  "dashboard": {
    "widgets": [
      { "id": "tickets_info", "visible": true, "width": 12, "order": 1 },
      { "id": "attendance_chart", "visible": true, "width": 12, "order": 2 },
      { "id": "connection_status", "visible": false, "width": 6, "order": 3 }
    ]
  }
}
```

### 2.3. Frontend (React)
Usaremos o Grid System do Material UI (`Grid`).
- Um componente `DashboardManager` lerá as preferências do usuário.
- Renderizará os Widgets com base na ordem e visibilidade.
- Terá um botão "Personalizar Dashboard" que abre um Drawer/Modal para togglear widgets.

## 3. Plano de Implementação

1.  **Backend**:
    - Adicionar coluna `configs` (JSON) na tabela `Users` (Migration).
    - Atualizar `User` model.
    - Atualizar `AuthService` e `SessionController` para retornar esse campo no login.
    - Criar endpoint `PUT /users/:id/configs` para salvar preferências.

2.  **Frontend**:
    - Refatorar `Dashboard/index.js` para quebrar os gráficos atuais em componentes menores (Widgets).
    - Criar componente `WidgetContainer`.
    - Criar modal de "Personalizar Dashboard" (Lista de checkboxes e reordenação simples).
    - Integrar com API para salvar/carregar.

## 4. Benefícios para o SaaS
- **Valor Percebido**: O cliente sente que o sistema se adapta a ele.
- **Performance**: Se o usuário desativar widgets pesados, o dashboard carrega mais rápido (podemos não fazer o fetch dos dados se o widget estiver oculto).
