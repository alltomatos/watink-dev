# Contatos

Gestão da agenda de contatos do sistema.

## Funcionalidades
- **CRUD**: Criar, Editar, Excluir contatos.
- **Importação**: Importação de CSV/XLSX (`ImportContactsModal`).
- **Sincronização**: O Engine sincroniza foto de perfil e nome automaticamente ao receber mensagens.

## Arquitetura
- **Rota**: `/contacts`
- **Lista Virtualizada**: Utiliza paginação ou scroll infinito para suportar milhares de contatos.
- **Integração**: `GET /contacts` (com searchParam).
