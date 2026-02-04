#!/bin/bash
# update.sh - Automates version bump, build, tag, and deploy for Docker Swarm
# Usage: ./update.sh <service> [version_type]

SERVICE=$1
TYPE=${2:-patch} # Default to patch if not specified

if [ -z "$SERVICE" ]; then
  echo "Usage: ./update.sh <service> [patch|minor|major]"
  echo "Services: backend, frontend, engine-standard, etc."
  exit 1
fi

echo "🚀 Starting update process for $SERVICE ($TYPE)..."

# Map service name to directory
case $SERVICE in
  "backend")
    DIR="backend"
    IMAGE="watink/backend"
    STACK_SERVICE="backend"
    ;;
  "frontend")
    DIR="frontend"
    IMAGE="watink/frontend"
    STACK_SERVICE="frontend"
    ;;
  "engine-standard" | "whaileys-engine")
    DIR="engine-standard"
    IMAGE="watink/engine"
    STACK_SERVICE="whaileys-engine"
    ;;
  *)
    echo "⚠️ Unknown service mapping for '$SERVICE'. Assuming directory=$SERVICE and image=watink/$SERVICE"
    DIR=$SERVICE
    IMAGE="watink/$SERVICE"
    STACK_SERVICE=$SERVICE
    ;;
esac

if [ ! -d "$DIR" ]; then
  echo "❌ Directory '$DIR' not found!"
  exit 1
fi

# 1. Increment Version
echo "📦 bumping version in $DIR..."
cd $DIR
# Check if package.json exists
if [ -f "package.json" ]; then
  npm version $TYPE --no-git-tag-version
  VERSION=$(node -p "require('./package.json').version")
else
  echo "❌ No package.json found in $DIR"
  exit 1
fi
cd ..

echo "✅ New version: $VERSION"

# 2. Build and Tag
echo "🔨 Building Docker image..."
docker build -t $IMAGE:$VERSION ./$DIR
docker tag $IMAGE:$VERSION $IMAGE:latest

# 3. Update docker-stack.yml
echo "📝 Updating docker-stack.yml..."
# This sed regex looks for "image: <image_name>:.*" and replaces it with "image: <image_name>:<new_version>"
# We use a temporary file to avoid issues with sed in-place on some systems, then move it back.
sed "s|image: $IMAGE:.*|image: $IMAGE:$VERSION|g" docker-stack.yml > docker-stack.yml.tmp && mv docker-stack.yml.tmp docker-stack.yml

# 4. Deploy
echo "🚀 Deploying to Swarm..."
docker stack deploy -c docker-stack.yml watink

echo "✅ Update complete! Service $SERVICE is now at version $VERSION"
