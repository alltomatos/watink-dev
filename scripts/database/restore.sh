#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_file.sql>"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: File $BACKUP_FILE not found."
    exit 1
fi

DB_USER="postgres"
DB_NAME="whaticket"

echo "WARNING: This will overwrite the database '$DB_NAME'."
echo "Press Ctrl+C to cancel or wait 5 seconds..."
sleep 5

echo "Restoring from $BACKUP_FILE..."

# Try using docker-compose first
if command -v docker-compose &> /dev/null; then
    cat "$BACKUP_FILE" | docker-compose exec -T postgres psql -U $DB_USER $DB_NAME
else
    CONTAINER_ID=$(docker ps -qf "name=postgres")
    if [ -z "$CONTAINER_ID" ]; then
        echo "Error: Database container not found."
        exit 1
    fi
    cat "$BACKUP_FILE" | docker exec -i $CONTAINER_ID psql -U $DB_USER $DB_NAME
fi

if [ $? -eq 0 ]; then
    echo "Restore completed successfully."
else
    echo "Restore failed."
    exit 1
fi
