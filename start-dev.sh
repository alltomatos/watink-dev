#!/bin/bash

# Watink Development Environment Startup Script
# Usage: ./start-dev.sh [--no-build] [--no-restart]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}🚀 Starting Watink Development Environment...${NC}"

# Parse arguments
NO_BUILD=false
NO_RESTART=false

for arg in "$@"; do
    case $arg in
        --no-build)
            NO_BUILD=true
            shift
            ;;
        --no-restart)
            NO_RESTART=true
            shift
            ;;
        *)
            echo "Unknown argument: $arg"
            exit 1
            ;;
    esac
done

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️ .env file not found. Creating from example...${NC}"
    cp .env.example .env
fi

# Start PostgreSQL, Redis, and RabbitMQ first
echo -e "${YELLOW}📦 Starting infrastructure services...${NC}"
docker compose -f docker-compose.dev.yml up -d postgres redis rabbitmq

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}⏳ Waiting for PostgreSQL...${NC}"
until docker exec watink-postgres pg_isready -U postgres; do
    sleep 1
done

# Wait for RabbitMQ to be ready
echo -e "${YELLOW}⏳ Waiting for RabbitMQ...${NC}"
until docker exec watink-rabbitmq rabbitmqctl status > /dev/null 2>&1; do
    sleep 1
done

# Build and start application services
if [ "$NO_BUILD" = false ]; then
    echo -e "${YELLOW}🔨 Building services...${NC}"
    docker compose -f docker-compose.dev.yml build --no-cache
fi

echo -e "${YELLOW}🚀 Starting application services...${NC}"
docker compose -f docker-compose.dev.yml up -d

if [ "$NO_RESTART" = false ]; then
    # Restart engine-go to ensure RabbitMQ exchanges are ready
    echo -e "${YELLOW}🔄 Restarting engine-go...${NC}"
    docker compose -f docker-compose.dev.yml restart engine-go

    # Restart plugin-manager to ensure hub is ready
    echo -e "${YELLOW}🔄 Restarting plugin-manager...${NC}"
    docker compose -f docker-compose.dev.yml restart plugin-manager
fi

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for all services...${NC}"
sleep 10

# Check connectivity
echo -e "${GREEN}✅ Checking connectivity...${NC}"

# Check Business
if curl -s http://localhost:8082/api/v1/health | grep -q '"status":"OK"'; then
    echo -e "${GREEN}✅ Business: Healthy${NC}"
else
    echo -e "${RED}❌ Business: Failed${NC}"
fi

# Check Hub
if curl -s http://localhost:8090/api/v1/hub/catalog | grep -q '"offline":false'; then
    echo -e "${GREEN}✅ Hub: Healthy${NC}"
else
    echo -e "${RED}❌ Hub: Failed${NC}"
fi

# Check Plugin Manager
if curl -s http://localhost:8081/api/v1/plugins/catalog | grep -q '"offline":false'; then
    echo -e "${GREEN}✅ Plugin Manager: Healthy${NC}"
else
    echo -e "${RED}❌ Plugin Manager: Failed${NC}"
fi

# Check Engine
if docker compose -f docker-compose.dev.yml logs engine-go --tail 5 | grep -q "Watink Engine Go started"; then
    echo -e "${GREEN}✅ Engine: Running${NC}"
else
    echo -e "${YELLOW}⚠️ Engine: Starting...${NC}"
fi

echo -e "${GREEN}🎉 Development environment is ready!${NC}"
echo ""
echo -e "${YELLOW}📋 Services:${NC}"
echo "  - Business API: http://localhost:8082"
echo "  - Marketplace Hub: http://localhost:8090"
echo "  - Plugin Manager: http://localhost:8081"
echo "  - RabbitMQ Management: http://localhost:15672 (guest/guest)"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo -e "${YELLOW}🔧 Commands:${NC}"
echo "  - View logs: docker compose -f docker-compose.dev.yml logs -f [service]"
echo "  - Stop: docker compose -f docker-compose.dev.yml down"
echo "  - Restart: docker compose -f docker-compose.dev.yml restart [service]"