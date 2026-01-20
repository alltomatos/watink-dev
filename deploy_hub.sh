#!/bin/bash
set -e

echo "🚀 Starting build and push process..."

# Backend
echo "--------------------------------------"
echo "📦 Processing Backend (v1.3.263)..."
echo "--------------------------------------"
docker compose -f docker-stack.yml build backend
docker tag watink/backend:1.3.263 watink/backend:latest
echo "Pushing version 1.3.263..."
docker push watink/backend:1.3.263
echo "Pushing latest..."
docker push watink/backend:latest

# Frontend
echo "--------------------------------------"
echo "📦 Processing Frontend (v0.7.231)..."
echo "--------------------------------------"
docker compose -f docker-stack.yml build frontend
docker tag watink/frontend:0.7.231 watink/frontend:latest
echo "Pushing version 0.7.231..."
docker push watink/frontend:0.7.231
echo "Pushing latest..."
docker push watink/frontend:latest

# Engine (whaileys-engine)
echo "--------------------------------------"
echo "📦 Processing Engine (v1.0.116)..."
echo "--------------------------------------"
docker compose -f docker-stack.yml build whaileys-engine
docker tag watink/engine:1.0.116 watink/engine:latest
echo "Pushing version 1.0.116..."
docker push watink/engine:1.0.116
echo "Pushing latest..."
docker push watink/engine:latest

# Plugin Manager
echo "--------------------------------------"
echo "📦 Processing Plugin Manager (v1.0.51)..."
echo "--------------------------------------"
docker compose -f docker-plugin.yml build plugin-manager
docker tag watink/plugin-manager:1.0.51 watink/plugin-manager:latest
echo "Pushing version 1.0.51..."
docker push watink/plugin-manager:1.0.51
echo "Pushing latest..."
docker push watink/plugin-manager:latest

# Plugin SMTP
echo "--------------------------------------"
echo "📦 Processing Plugin SMTP (v1.0.4)..."
echo "--------------------------------------"
docker compose -f docker-plugin.yml build plugin-smtp
docker tag watink/plugin-smtp:1.0.4 watink/plugin-smtp:latest
echo "Pushing version 1.0.4..."
docker push watink/plugin-smtp:1.0.4
echo "Pushing latest..."
docker push watink/plugin-smtp:latest

# Engine Webchat
echo "--------------------------------------"
echo "📦 Processing Engine Webchat (v1.0.0)..."
echo "--------------------------------------"
docker compose -f docker-plugin.yml build engine-webchat
docker tag watink/engine-webchat:1.0.0 watink/engine-webchat:latest
echo "Pushing version 1.0.0..."
docker push watink/engine-webchat:1.0.0
echo "Pushing latest..."
docker push watink/engine-webchat:latest

echo "✅ All containers pushed successfully!"
