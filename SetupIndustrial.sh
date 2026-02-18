#!/bin/bash

# Watink Industrial Installer 🦞
# Suporte: Ubuntu 20.04+, Debian 11+
set -e

echo "🦞 Iniciando Instalador Industrial Watink..."

# 1. Instalação do Docker se não existir
if ! command -v docker &> /dev/null; then
    echo "🐳 Docker não encontrado. Instalando..."
    curl -fsSL https://get.docker.com | bash
    systemctl enable docker
    systemctl start docker
fi

# 2. Preparação do ambiente
echo "📁 Preparando diretórios..."
mkdir -p watink-industrial
cd watink-industrial

# 3. Download do Compose Industrial
echo "🔗 Baixando orquestrador de infraestrutura..."
# Nota: Em produção aqui você usaria um link fixo para o arquivo no seu repo principal
cat <<EOF > docker-compose.yml
version: '3.8'

services:
  watink:
    image: watink/industrial:latest
    ports:
      - "80:8082"
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=postgres
      - DB_PASS=watink_secure_pass_2026
      - DB_NAME=watink
      - AMQP_URL=amqp://***REMOVED_AMQP_CREDENTIALS***@rabbitmq:5672
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=watink_industrial_secret
    depends_on:
      - postgres
      - redis
      - rabbitmq
    networks:
      - watink_net
    restart: always

  postgres:
    image: ronaldodavi/pgvectorgis:latest
    environment:
      - POSTGRES_DB=watink
      - POSTGRES_PASSWORD=watink_secure_pass_2026
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - watink_net
    restart: always

  rabbitmq:
    image: rabbitmq:3-management-alpine
    networks:
      - watink_net
    restart: always

  redis:
    image: redis:alpine
    networks:
      - watink_net
    restart: always

networks:
  watink_net:
    driver: bridge

volumes:
  postgres_data:
EOF

# 4. Início dos serviços
echo "🚀 Subindo ambiente industrial..."
docker compose up -d

echo "✅ Instalação concluída com sucesso!"
echo "📍 Acesse seu servidor via navegador no IP da máquina."
echo "🦞 Watink: Pronto para o Atendimento."
