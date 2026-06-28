"""Cliente MinIO (S3-compatível) para baixar arquivos de fontes.

Lê a configuração das variáveis de ambiente S3_* (espelham o business). O client
é um singleton lazy — só conecta na primeira leitura, para não exigir S3 nos
caminhos que só processam texto.
"""

import os

from minio import Minio

_client: Minio | None = None


def _bucket() -> str:
    return os.getenv("S3_BUCKET", "watink-knowledge")


def get_client() -> Minio:
    global _client
    if _client is None:
        endpoint = os.getenv("S3_ENDPOINT", "minio:9000")
        access_key = os.getenv("S3_ACCESS_KEY", "minioadmin")
        secret_key = os.getenv("S3_SECRET_KEY", "minioadmin")
        secure = os.getenv("S3_USE_SSL", "false").lower() in ("1", "true", "yes")
        _client = Minio(
            endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure,
        )
    return _client


def download_bytes(object_key: str) -> bytes:
    """Baixa o objeto inteiro como bytes. Levanta em erro de rede/objeto ausente."""
    client = get_client()
    response = client.get_object(_bucket(), object_key)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()
