#!/bin/bash

# Configuration
CONTAINER_NAME="whaticket-community_mysql_1" # Adjust if needed or use docker-compose
DB_USER="postgres"
DB_NAME="whaticket"
BACKUP_DIR="./backups"

# Ensure backup directory exists
mkdir -p $BACKUP_DIR

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="$BACKUP_DIR/backup_$TIMESTAMP.sql"

echo "Starting backup of $DB_NAME from container..."

# Try using docker-compose first if available in path
if command -v docker-compose &> /dev/null; then
    docker-compose exec -T mysql pg_dump -U $DB_USER $DB_NAME > $FILENAME
else
    # Fallback to docker exec
    # We need to find the actual container name if it differs
    CONTAINER_ID=$(docker ps -qf "name=mysql")
    if [ -z "$CONTAINER_ID" ]; then
        echo "Error: Database container not found."
        exit 1
    fi
    docker exec -t $CONTAINER_ID pg_dump -U $DB_USER $DB_NAME > $FILENAME
fi

if [ $? -eq 0 ]; then
    echo "Backup successful: $FILENAME"
else
    echo "Backup failed!"
    rm -f $FILENAME
    exit 1
fi
