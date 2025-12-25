#!/bin/bash

echo "🚀 Building images..."
docker compose build

echo "📦 Deploying to Swarm..."
docker stack deploy -c docker-stack.yml watic-premium

echo "✅ Done!"
