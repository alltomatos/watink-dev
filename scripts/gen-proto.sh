#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROTO_DIR="$REPO_ROOT/business/proto/wbot"
GO_OUT_BUSINESS="$REPO_ROOT/business/proto/wbot"
GO_OUT_ENGINE="$REPO_ROOT/engine-go/proto/wbot"

echo "Generating Go code from protobuf schemas..."

for proto_file in "$PROTO_DIR"/*.proto; do
  echo "  Processing: $(basename "$proto_file")"
  protoc \
    --go_out="$GO_OUT_BUSINESS" \
    --go_opt=paths=source_relative \
    --go_out="$GO_OUT_ENGINE" \
    --go_opt=paths=source_relative \
    -I"$PROTO_DIR" \
    "$proto_file"
done

echo "Proto generation complete."
echo "  -> $GO_OUT_BUSINESS"
echo "  -> $GO_OUT_ENGINE"
