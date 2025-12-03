#!/bin/sh
# Production Docker Volume Restore Script for Tyaprover
# Companion to backup.sh

set -e

BACKUP_DIR="/backups"

usage() {
    echo "Usage: $0 <backup-timestamp>"
    echo ""
    echo "Available backups:"
    ls -1 ${BACKUP_DIR}/manifest-*.json 2>/dev/null | sed 's/.*manifest-/  /' | sed 's/.json//' || echo "  No backups found"
    exit 1
}

if [ -z "$1" ]; then
    usage
fi

TIMESTAMP=$1

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting Tyaprover restore from backup ${TIMESTAMP}"

# Verify backup files exist
if [ ! -f "${BACKUP_DIR}/captain/captain-data-${TIMESTAMP}.tar.gz" ]; then
    echo "✗ Captain backup not found: captain-data-${TIMESTAMP}.tar.gz"
    exit 1
fi

if [ ! -f "${BACKUP_DIR}/postgres/postgres-data-${TIMESTAMP}.tar.gz" ]; then
    echo "✗ PostgreSQL backup not found: postgres-data-${TIMESTAMP}.tar.gz"
    exit 1
fi

# Function to restore from backup
restore_backup() {
    local SOURCE=$1
    local DEST=$2
    local NAME=$3

    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Restoring ${NAME}..."

    # Clear destination directory
    rm -rf "${DEST}"/*

    # Extract backup
    tar xzf "${SOURCE}" -C "${DEST}"

    if [ $? -eq 0 ]; then
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✓ ${NAME} restored successfully"
    else
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✗ ${NAME} restore failed"
        return 1
    fi
}

# Restore captain data
restore_backup "${BACKUP_DIR}/captain/captain-data-${TIMESTAMP}.tar.gz" "/captain" "captain-data"

# Restore PostgreSQL data
restore_backup "${BACKUP_DIR}/postgres/postgres-data-${TIMESTAMP}.tar.gz" "/postgres-data" "postgres-data"

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Restore complete from backup ${TIMESTAMP}"
echo ""
echo "⚠️  Remember to restart containers for changes to take effect:"
echo "   docker-compose restart"

exit 0
