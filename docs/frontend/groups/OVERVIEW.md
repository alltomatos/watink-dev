# Grupos

Gestão de Grupos do WhatsApp e Listas de Transmissão (se suportado).

## Funcionalidades
- **Listagem**: Exibe grupos onde o número conectado participa.
- **Ações**: Sair do grupo, ver participantes (dependendo da implementação).
- **Importação**: Sincronização automática via Engine (`groups.update`).

## Arquitetura
- **Rota**: `/groups`
- **Integração**: `GET /groups`.
- **Eventos**: Escuta atualizações de grupo em tempo real.
