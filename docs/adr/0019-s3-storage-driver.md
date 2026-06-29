# ADR 0019 — S3 Storage Driver para arquivos de fontes da Base de Conhecimento

**Status:** Accepted  
**Data:** 2026-06-28

## Contexto
Fontes do tipo `file` (PDF/docx/...) precisam ter o conteúdo persistido e lido pelo `watink-knowledge`, que roda em outro container/nó. O `CreateSource` atual **descarta** o arquivo (só guarda nome/tipo — bug). Em Swarm multi-node, volume local não é compartilhável de forma confiável, e o time já tem `app-minio` no devops. Também há intenção de, em produção, usar Cloudflare R2 ou AWS S3.

## Decisão
Adotar um **driver de armazenamento S3-compatível** para os arquivos de fontes.

- **Portável:** o mesmo código aponta para **MinIO (dev)** ou **R2 / AWS S3 (prod)** — só muda a configuração (endpoint/credenciais).
- **Config global de sistema:** uma seção **Armazenamento S3** em Configurações (visível só a superadmin): endpoint, bucket, accessKey, secretKey, region. Não é per-tenant no MVP.
- **Isolamento por chave:** objetos com prefixo **`{tenantId}/{kbId}/{sourceId}/arquivo`** — separa tenants sem misturar.
- **Fluxo:** `business` faz upload no S3 (corrige o bug do `CreateSource`) e passa o `objectKey` no job AMQP; `watink-knowledge` baixa para parsing.

## Alternativas consideradas
- **Volume compartilhado (NFS):** simples em single-node, mas frágil e ops-pesado em Swarm multi-node.
- **`business` faz POST dos bytes para o serviço:** sem storage, mas não combina com ingestão assíncrona (bytes não cabem bem em mensagem AMQP) e sofre com arquivos grandes.
- **Per-tenant BYO-storage:** dá data-residency, mas o serviço teria de buscar credenciais por job; complexidade sem demanda atual. Documentado como Fase 2.

## Consequências
- **Robusto em Swarm/multi-node** e portável MinIO → R2 → S3 sem mudar código.
- **Corrige o descarte de arquivo** do `CreateSource`.
- **Isolamento por prefixo** é responsabilidade do código (gerar/validar a chave sempre com `tenantId`).
- **Nova dependência de infra:** `business` e `watink-knowledge` precisam de credenciais S3 + alcançar o endpoint.
