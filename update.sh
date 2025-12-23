#!/bin/bash

set -e

SERVICE=$1

if [ -z "$SERVICE" ]; then
  echo "Usage: ./update.sh <backend|engine|frontend>"
  exit 1
fi

# Configuration Mapping
if [ "$SERVICE" == "backend" ]; then
  DIR="backend"
  COMPOSE_SVC="backend"
  IMAGE_NAME="whaticket-premium/backend"
  COMPOSE_IMAGE="whaticket-premium-backend"
elif [ "$SERVICE" == "engine" ]; then
  DIR="engine-standard"
  COMPOSE_SVC="whaileys-engine"
  IMAGE_NAME="whaticket-premium/engine"
  COMPOSE_IMAGE="whaticket-premium-whaileys-engine"
elif [ "$SERVICE" == "frontend" ]; then
  DIR="frontend"
  COMPOSE_SVC="frontend"
  IMAGE_NAME="whaticket-premium/frontend"
  COMPOSE_IMAGE="whaticket-premium-frontend"
else
  echo "Invalid service. Use: backend, engine, or frontend"
  exit 1
fi

echo "🚀 Updating $SERVICE..."

# 1. Version Bump
cd $DIR
echo "incrementing version..."
# Generate version and capture output (vX.Y.Z), then strip 'v'
NEW_VERSION=$(npm version patch --no-git-tag-version)
VERSION_NUM=${NEW_VERSION#v}
echo "New version: $VERSION_NUM"
cd ..

# 2. Build
echo "🏗️ Building Docker image..."
docker compose build $COMPOSE_SVC

# 3. Tagging
echo "🏷️ Tagging images..."
docker tag $COMPOSE_IMAGE:latest $IMAGE_NAME:$VERSION_NUM
docker tag $COMPOSE_IMAGE:latest $IMAGE_NAME:latest

# 4. Update Service
echo "🔄 Updating Swarm Service..."
SERVICE_STACK_NAME="whaticket-premium_$COMPOSE_SVC"
docker service update --image $IMAGE_NAME:latest $SERVICE_STACK_NAME --force

echo "✅ $SERVICE updated to v$VERSION_NUM and deployed!"
