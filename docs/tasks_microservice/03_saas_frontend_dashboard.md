# Fase 3: Frontend & Dashboard SaaS

Foco na criação da interface administrativa do "Super Admin" e na adaptação do frontend para o modelo SaaS.

---

## Tasks

### [FRONT-001] Design de Wireframes e Fluxos (Admin SaaS)
**Objetivo:** Planejar a interface onde os clientes serão gerenciados.
**Requisitos:**
- Wireframe: Dashboard Geral (Total de Clientes, Mensagens Trafegadas, Uso de Disco).
- Wireframe: Lista de Tenants (Criar, Bloquear, Editar Plano, Ver Faturas).
- Wireframe: Login do Cliente (com descoberta de tenant ou subdomínio).
**Critérios de Aceite:**
- PDF ou arquivos de imagem com os fluxos aprovados.
**Estimativa:** 8 horas

### [FRONT-002] Adaptação do Login e Autenticação
**Objetivo:** Permitir login multi-tenant seguro.
**Requisitos:**
- Alterar tela de login para suportar identificação da empresa (via subdomínio `empresa.chat.com` ou campo extra).
- Implementar JWT que carrega o `tenant_id` no payload.
- Frontend deve armazenar e enviar esse token em todos os requests.
**Critérios de Aceite:**
- Usuário de Empresa A não consegue logar se acessar URL da Empresa B (se usar subdomínio).
- Token decodificado mostra `tenant_id` correto.
**Estimativa:** 12 horas

### [FRONT-003] Desenvolvimento do Painel Super Admin
**Objetivo:** Implementar o dashboard para o dono do SaaS.
**Requisitos:**
- Usar framework existente (React/Material UI) ou criar novo app leve (Next.js/Vite).
- CRUD de Empresas/Tenants.
- Visualização de métricas de sistema (uso de CPU/RAM dos Engines).
**Critérios de Aceite:**
- Possível criar uma nova empresa pelo painel.
- A nova empresa é provisionada no banco de dados automaticamente.
**Estimativa:** 24 horas

### [FRONT-004] Dashboards Personalizáveis por Cliente
**Objetivo:** Permitir que cada tenant tenha sua visão customizada.
**Requisitos:**
- Criar sistema de "Widgets" no frontend.
- Permitir salvar layout do dashboard no banco (JSON settings).
- Widgets sugeridos: Atendimentos por hora, Status de conexão, Fila de espera.
**Critérios de Aceite:**
- Usuário A arrasta widget para a direita e salva. Usuário B vê dashboard padrão. Ao relogar, Usuário A vê sua customização.
**Estimativa:** 16 horas
