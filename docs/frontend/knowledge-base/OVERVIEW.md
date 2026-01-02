# Base de Conhecimento (Knowledge Base)

Repositório de informações utilizado pela IA para responder perguntas.

## Funcionalidades
- **Upload**: Envio de arquivos de texto (.txt, .md, .pdf) para treinamento.
- **Gerenciamento**: Listagem e exclusão de documentos.
- **RAG**: O backend utiliza estes textos para Retrieval Augmented Generation.

## Arquitetura
- **Rota**: `/knowledge-bases`
- **Tabelas**: `KnowledgeBases` (provável)
- **Engine IA**: Os arquivos são processados (embedding) e armazenados em banco vetorial (pgvector) pelo backend.
