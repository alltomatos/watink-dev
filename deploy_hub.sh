#!/bin/bash
set -e

echo "🚀 Starting build and push process (Dynamic Versions)..."

get_version() {
  local dir=$1
  if [ -f "$dir/package.json" ]; then
    # Use node to extract version from package.json. 
    # We use a subshell and change directory to avoid path issues with require, 
    # or just require the absolute/relative path string.
    # Simpler: read content and parse with node.
    node -p "require('./$dir/package.json').version"
  elif [ -f "$dir/VERSION" ]; then
    cat "$dir/VERSION"
  else
    echo "Error: No version file found in $dir"
    exit 1
  fi
}

deploy_service() {
  local service_name=$1
  local dir=$2
  local image_name=$3
  local compose_file=$4
  local build_svc_name=$5

  echo "--------------------------------------"
  echo "📦 Processing $service_name..."
  # Trim whitespace just in case
  local version=$(get_version "$dir" | xargs)
  echo "   Found Version: $version"
  echo "--------------------------------------"

  echo "Building $build_svc_name..."
  docker compose -f $compose_file build $build_svc_name
  
  echo "Tagging $image_name:$version as latest..."
  docker tag $image_name:$version $image_name:latest

  echo "Pushing $image_name:$version..."
  docker push $image_name:$version
  
  echo "Pushing $image_name:latest..."
  docker push $image_name:latest
  echo "--------------------------------------"
}

# ... (Keep previous functions get_version and deploy_service) ...

SERVICE=$1

if [ -z "$SERVICE" ]; then
  echo "Usage: ./deploy_hub.sh <service_name|all>"
  echo "Services: backend, frontend, engine, plugin-manager, plugin-smtp, engine-webchat"
  exit 1
fi

# Backend
if [ "$SERVICE" == "backend" ] || [ "$SERVICE" == "all" ]; then
  deploy_service "Backend" "backend" "watink/backend" "docker-stack.yml" "backend"
fi

# Frontend
if [ "$SERVICE" == "frontend" ] || [ "$SERVICE" == "all" ]; then
  deploy_service "Frontend" "frontend" "watink/frontend" "docker-stack.yml" "frontend"
fi

# Engine (Standard)
if [ "$SERVICE" == "engine" ] || [ "$SERVICE" == "all" ]; then
  deploy_service "Engine (Standard)" "engine-standard" "watink/engine" "docker-stack.yml" "whaileys-engine"
fi

# Plugin Manager
if [ "$SERVICE" == "plugin-manager" ] || [ "$SERVICE" == "all" ]; then
  deploy_service "Plugin Manager" "plugin-manager" "watink/plugin-manager" "docker-plugin.yml" "plugin-manager"
fi

# Plugin SMTP
if [ "$SERVICE" == "plugin-smtp" ] || [ "$SERVICE" == "all" ]; then
  deploy_service "Plugin SMTP" "plugins/watink-smtp-go" "watink/plugin-smtp" "docker-plugin.yml" "plugin-smtp"
fi

# Engine Webchat
if [ "$SERVICE" == "engine-webchat" ] || [ "$SERVICE" == "all" ]; then
  deploy_service "Engine Webchat" "engine-webchat" "watink/engine-webchat" "docker-plugin.yml" "engine-webchat"
fi

# Engine PAPI
if [ "$SERVICE" == "engine-papi" ] || [ "$SERVICE" == "all" ]; then
  deploy_service "Engine PAPI" "plugins/engine-papi" "watink/engine-papi" "docker-plugin.yml" "engine-papi"
fi

# Engine Go
if [ "$SERVICE" == "engine-go" ] || [ "$SERVICE" == "all" ]; then
  deploy_service "Engine Go" "engine-go" "watink/engine-go" "docker-stack.yml" "engine-go"
fi

echo "✅ Selected containers pushed successfully!"
