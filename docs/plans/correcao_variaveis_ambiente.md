# Plano de Correção de Variáveis de Ambiente

## 1. Contexto
A análise técnica identificou uma inconsistência crítica na configuração das variáveis de ambiente do frontend. O projeto foi migrado para Vite, passando a utilizar o prefixo `VITE_`, mas a infraestrutura Docker e os scripts de inicialização ainda referenciam o padrão antigo `REACT_APP_`. Isso pode causar falhas de conexão entre o frontend e o backend em ambientes containerizados.

## 2. Inventário de Variáveis
As seguintes variáveis foram identificadas como inconsistentes ou ausentes na configuração do Docker:

| Variável (Código) | Configuração Atual (Docker) | Status |
| :--- | :--- | :--- |
| `VITE_BACKEND_URL` | `REACT_APP_BACKEND_URL` | **Incorreto** |
| `VITE_HOURS_CLOSE_TICKETS_AUTO` | *Não configurada* | **Ausente** |

## 3. Plano de Correção

### 3.1. Padronização de Prefixos
O objetivo é padronizar todas as variáveis de ambiente do frontend para utilizar o prefixo `VITE_`, conforme exigido pelo bundler Vite.

### 3.2. Arquivos a Serem Alterados

#### A. `docker-compose.yaml`
Atualizar as definições de ambiente do serviço `frontend`.

**De:**
```yaml
    environment:
      - URL_BACKEND=backend:3000
      - REACT_APP_BACKEND_URL=${BACKEND_URL:-http://localhost}:${PROXY_PORT:-8080}/
      - FRONTEND_SERVER_NAME=${FRONTEND_SERVER_NAME}
      - BACKEND_SERVER_NAME=${BACKEND_SERVER_NAME}
```

**Para:**
```yaml
    environment:
      - URL_BACKEND=backend:3000
      - VITE_BACKEND_URL=${BACKEND_URL:-http://localhost}:${PROXY_PORT:-8080}/
      - VITE_HOURS_CLOSE_TICKETS_AUTO=${HOURS_CLOSE_TICKETS_AUTO}
      - FRONTEND_SERVER_NAME=${FRONTEND_SERVER_NAME}
      - BACKEND_SERVER_NAME=${BACKEND_SERVER_NAME}
```

#### B. `frontend/.docker/add-env-vars.sh`
Ajustar o script que injeta variáveis de ambiente no `index.html` em tempo de execução para buscar por `VITE_` em vez de `REACT_APP_`.

**De:**
```bash
ENV_JSON="$(jq --compact-output --null-input 'env | with_entries(select(.key | startswith("REACT_APP_")))')"
```

**Para:**
```bash
ENV_JSON="$(jq --compact-output --null-input 'env | with_entries(select(.key | startswith("VITE_")))')"
```

## 4. Instruções de Implementação Passo a Passo

1.  **Editar `docker-compose.yaml`**:
    *   Localizar o serviço `frontend`.
    *   Renomear `REACT_APP_BACKEND_URL` para `VITE_BACKEND_URL`.
    *   Adicionar `VITE_HOURS_CLOSE_TICKETS_AUTO`.

2.  **Editar `frontend/.docker/add-env-vars.sh`**:
    *   Alterar o padrão de filtro do `jq` de `REACT_APP_` para `VITE_`.

3.  **Reconstruir os Containers**:
    *   Executar `docker-compose up -d --build` para aplicar as mudanças.

## 5. Verificação de Impacto

*   **Frontend (Build):** O Vite injeta automaticamente variáveis `VITE_` durante o build. A mudança no Docker garante que, mesmo em produção (onde o build é estático), as variáveis sejam injetadas corretamente no `window.ENV` pelo script `add-env-vars.sh`.
*   **Backend:** Nenhuma alteração necessária.
*   **Desenvolvimento Local:** O arquivo `.env.example` do frontend já usa `VITE_`, então o ambiente local deve continuar funcionando normalmente se o desenvolvedor seguir o exemplo.

## 6. Procedimentos de Teste

Para validar a correção:

1.  **Subir o ambiente:** `docker-compose up -d frontend`
2.  **Acessar o Frontend:** Abrir `http://localhost:3000` (ou porta configurada).
3.  **Verificar Variáveis Globais:**
    *   Abrir o Console do Desenvolvedor (F12).
    *   Digitar `window.ENV`.
    *   **Resultado Esperado:** Um objeto contendo `VITE_BACKEND_URL` com o valor correto.
4.  **Teste Funcional:**
    *   Tentar fazer login ou verificar se o QR Code do WhatsApp carrega.
    *   Isso confirma que o frontend está conseguindo se comunicar com o backend usando a URL configurada.

## 7. Recomendações Futuras

*   **Linting de Env:** Adicionar uma verificação no CI/CD ou `pre-commit` para garantir que novas variáveis de ambiente sigam o padrão `VITE_`.
*   **Documentação:** Manter o `README.md` atualizado com a lista de todas as variáveis de ambiente suportadas.
