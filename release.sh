#!/bin/bash

# Watink Business Release Script 🦞
set -e

echo "📦 Starting Watink Business Release Process..."

# 1. Clean up old builds
rm -rf release/
mkdir -p release/linux release/windows

# 2. Build Frontend
echo "🎨 Building Frontend..."
cd frontend
npm install
npm run build
cd ..

# 3. Prepare Go Web Folder
echo "🔗 Preparing Go Embed Folder..."
rm -rf business/internal/web/build
mkdir -p business/internal/web/build
cp -r frontend/build/* business/internal/web/build/

# 4. Build for Linux (Native Binary)
echo "🐧 Building Linux Binary..."
cd business
go mod tidy
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o ../release/linux/watink-linux cmd/server/main.go
cd ..

# 5. Build for Windows (watink.exe)
echo "🪟 Building Windows Binary..."
cd business
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -o ../release/windows/watink.exe cmd/server/main.go
cd ..

# 6. Build Docker Business Image
if command -v docker &> /dev/null; then
    echo "🐳 Building Docker Business Image..."
    docker build -t watink/business:latest -f Dockerfile.business .
    echo "✅ Docker image built: watink/business:latest"
fi

# 7. Finalize
echo "✅ Release generated in /release folder!"
echo "📍 Linux: release/linux/watink-linux"
echo "📍 Windows: release/windows/watink.exe"
