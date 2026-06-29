import os


class Config:
    """Configuração do serviço watink-knowledge, lida de variáveis de ambiente.

    O serviço NÃO carrega credencial de IA global: o modelo/baseURL/apiKey de
    embedding são lidos por-tenant da tabela Settings (omniroute), por job.
    """

    DB_HOST = os.getenv("DB_HOST", "postgres")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASS = os.getenv("DB_PASS", "watink_secret_pass")
    DB_NAME = os.getenv("DB_NAME", "watink")

    AMQP_URL = os.getenv("AMQP_URL", "amqp://guest:guest@rabbitmq:5672")

    # Segredo compartilhado business <-> knowledge (header X-Internal-Token).
    INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "dev_internal_token_change_in_prod")

    # Em dev, o aiCustomBaseURL do tenant aponta p/ localhost:20128 (gateway no host).
    # De dentro do container isso precisa virar host.docker.internal.
    OMNIROUTE_HOST_REWRITE = os.getenv("OMNIROUTE_HOST_REWRITE", "host.docker.internal")

    # Dimensão fixa global do embedding (halfvec). Espelha o modelo plugado no omniroute.
    EMBED_DIM = int(os.getenv("EMBED_DIM", "2048"))

    # Quando > 0, envia `dimensions` no payload de embedding (truncagem Matryoshka/MRL).
    # Usado para encaixar modelos de dimensão nativa diferente no índice halfvec atual
    # — ex.: qwen3-embedding:4b (nativo 2560) → 2048 para casar com halfvec(2048).
    # 0 = não envia o parâmetro (modelos de dimensão nativa, ex. nemotron 2048).
    EMBED_DIMENSIONS = int(os.getenv("EMBED_DIMENSIONS", "0"))

    # Embedding em SUB-LOTES: evita um request gigante que estoura timeout em gateways
    # lentos (ex.: Ollama em CPU embedando dezenas de chunks). Timeout é POR lote.
    EMBED_BATCH_SIZE = int(os.getenv("EMBED_BATCH_SIZE", "16"))
    EMBED_TIMEOUT = int(os.getenv("EMBED_TIMEOUT", "120"))

    # Firecrawl (web scraping → markdown) para fontes do tipo `url`. Em prod (swarm),
    # o serviço é alcançável em http://firecrawl:3002 na rede overlay; em dev, via o
    # domínio público (Traefik). O deploy self-hosted do devops não exige autenticação,
    # então FIRECRAWL_API_KEY é opcional (o header só é enviado se estiver setado).
    FIRECRAWL_URL = os.getenv("FIRECRAWL_URL", "")
    FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY", "")
    FIRECRAWL_TIMEOUT = int(os.getenv("FIRECRAWL_TIMEOUT", "60"))

    # Chunking (~512 tokens, overlap ~15%).
    CHUNK_TOKENS = int(os.getenv("CHUNK_TOKENS", "512"))
    CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "77"))

    @classmethod
    def dsn(cls) -> str:
        return (
            f"host={cls.DB_HOST} port={cls.DB_PORT} user={cls.DB_USER} "
            f"password={cls.DB_PASS} dbname={cls.DB_NAME}"
        )


config = Config()
