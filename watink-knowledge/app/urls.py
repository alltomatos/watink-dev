"""URL helpers para alcançar serviços em dev."""


def rewrite_host(base_url: str, replacement: str) -> str:
    """Reescreve localhost/127.0.0.1 no host de uma URL para `replacement`.

    Usado em dev para o container alcançar o gateway de IA (omniroute) rodando no
    host. No-op quando a URL é vazia, o replacement é vazio, ou o host é um domínio
    real (produção).
    """
    if not base_url or not replacement:
        return base_url
    out = base_url
    for host in ("localhost", "127.0.0.1"):
        out = out.replace(host, replacement)
    return out
