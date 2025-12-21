# Configuração do API Gateway (Traefik)

O Traefik foi escolhido como API Gateway e Proxy Reverso devido à sua integração nativa com Docker Swarm e facilidade de configuração dinâmica.

## 1. Arquitetura
O Traefik atua como o ponto único de entrada (Edge Router) para o cluster. Ele roteia o tráfego com base no Host header para os serviços apropriados:
- `api.seudominio.com` -> Backend Service (Load Balanced)
- `seudominio.com` -> Frontend Service
- `*.seudominio.com` -> Frontend Service (para identificação de tenant via subdomínio)

## 2. Configuração no docker-stack.yml

```yaml
  traefik:
    image: traefik:v2.10
    command:
      # Habilita Dashboard (inseguro, apenas para dev/teste)
      - "--api.insecure=true"
      # Provedor Docker Swarm
      - "--providers.docker=true"
      - "--providers.docker.swarmMode=true"
      # Entrypoints
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      # Configuração de Logs
      - "--log.level=INFO"
```

## 3. Roteamento de Serviços
Para expor um serviço, utilizamos `labels` na definição do serviço no `docker-stack.yml`.

### Exemplo Backend:
```yaml
    deploy:
      labels:
        - "traefik.enable=true"
        # Roteia requisições para api.localhost
        - "traefik.http.routers.backend.rule=Host(`api.localhost`)"
        - "traefik.http.routers.backend.entrypoints=web"
        # Porta interna do container
        - "traefik.http.services.backend.loadbalancer.server.port=3000"
```

### Exemplo Frontend (Multi-tenant):
Para suportar `cliente1.saas.com` e `cliente2.saas.com`:
```yaml
    deploy:
      labels:
        - "traefik.enable=true"
        # Aceita o domínio principal E qualquer subdomínio
        - "traefik.http.routers.frontend.rule=Host(`saas.com`) || HostRegexp(`{subdomain:[a-z0-9-]+}.saas.com`)"
        - "traefik.http.services.frontend.loadbalancer.server.port=80"
```

## 4. SSL/TLS (Produção)
Para produção, recomenda-se habilitar o Let's Encrypt no comando do Traefik:

```yaml
    command:
      # ... outros comandos ...
      - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
      - "--certificatesresolvers.myresolver.acme.email=seu-email@exemplo.com"
      - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
```

E adicionar o resolver nos routers:
`- "traefik.http.routers.backend.tls.certresolver=myresolver"`
