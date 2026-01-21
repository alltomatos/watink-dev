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

# Backend
deploy_service "Backend" "backend" "watink/backend" "docker-stack.yml" "backend"

# Frontend
deploy_service "Frontend" "frontend" "watink/frontend" "docker-stack.yml" "frontend"

# Engine (Standard)
deploy_service "Engine (Standard)" "engine-standard" "watink/engine" "docker-stack.yml" "whaileys-engine"

# Plugin Manager
deploy_service "Plugin Manager" "plugin-manager" "watink/plugin-manager" "docker-plugin.yml" "plugin-manager"

# Plugin SMTP
deploy_service "Plugin SMTP" "plugins/watink-smtp-go" "watink/plugin-smtp" "docker-plugin.yml" "plugin-smtp"

# Engine Webchat
deploy_service "Engine Webchat" "engine-webchat" "watink/engine-webchat" "docker-plugin.yml" "engine-webchat"

echo "✅ All containers pushed successfully!"
