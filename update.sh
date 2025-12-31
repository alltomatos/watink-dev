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
  IMAGE_NAME="watink/backend"
  COMPOSE_IMAGE="watink/backend"
elif [ "$SERVICE" == "engine" ]; then
  DIR="engine-standard"
  COMPOSE_SVC="whaileys-engine"
  IMAGE_NAME="watink/engine"
  COMPOSE_IMAGE="watink/engine"
elif [ "$SERVICE" == "frontend" ]; then
  DIR="frontend"
  COMPOSE_SVC="frontend"
  IMAGE_NAME="watink/frontend"
  COMPOSE_IMAGE="watink/frontend"
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
echo "🏗️ Building Docker image (no-cache)..."
docker compose build --no-cache $COMPOSE_SVC

# 3. Tagging
echo "🏷️ Tagging images..."
docker tag $COMPOSE_IMAGE:latest $IMAGE_NAME:$VERSION_NUM
docker tag $COMPOSE_IMAGE:latest $IMAGE_NAME:latest

# 4. Update Service
# 4. Update docker-stack.yml (Source of Truth)
echo "📝 Updating docker-stack.yml version references..."

if [ "$SERVICE" == "backend" ]; then
  sed -i "s|image: watink/backend:.*|image: watink/backend:$VERSION_NUM|g" docker-stack.yml
elif [ "$SERVICE" == "frontend" ]; then
  sed -i "s|image: watink/frontend:.*|image: watink/frontend:$VERSION_NUM|g" docker-stack.yml
elif [ "$SERVICE" == "engine" ]; then
  sed -i "s|image: watink/engine:.*|image: watink/engine:$VERSION_NUM|g" docker-stack.yml
  # Also update the ENGINE_VERSION env var used by backend
  sed -i "s|ENGINE_VERSION=.*|ENGINE_VERSION=$VERSION_NUM|g" docker-stack.yml
fi

# 5. Redeploy Stack
echo "🔄 Redeploying Stack via docker stack deploy..."
# This ensures the running service matches the docker-stack.yml definition exactly
docker stack deploy -c docker-stack.yml watink

echo "✅ $SERVICE updated to v$VERSION_NUM, recorded in docker-stack.yml, and deployed!"
