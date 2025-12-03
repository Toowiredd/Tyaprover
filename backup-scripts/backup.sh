#!/bin/sh
# Production Docker Volume Backup Script for Tyaprover
# Cannibalized from production patterns:
# - https://www.thepolyglotdeveloper.com/2025/05/easy-automated-docker-volume-backups-database-friendly/
# - https://github.com/BretFisher/docker-vackup
# - https://www.baculasystems.com/blog/docker-backup-containers/

set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting Tyaprover backup"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}/captain" "${BACKUP_DIR}/postgres" "${BACKUP_DIR}/redis"

# Function to create compressed backup
create_backup() {
    local SOURCE=$1
    local DEST=$2
    local NAME=$3

    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Backing up ${NAME}..."
    tar czf "${DEST}/${NAME}-${TIMESTAMP}.tar.gz" -C "${SOURCE}" .

    if [ $? -eq 0 ]; then
        SIZE=$(du -h "${DEST}/${NAME}-${TIMESTAMP}.tar.gz" | cut -f1)
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✓ ${NAME} backup complete (${SIZE})"
    else
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✗ ${NAME} backup failed"
        return 1
    fi
}

# Backup captain data (CapRover state)
create_backup "/captain" "${BACKUP_DIR}/captain" "captain-data"

# Backup PostgreSQL data
create_backup "/postgres-data" "${BACKUP_DIR}/postgres" "postgres-data"

# Clean up old backups (keep last RETENTION_DAYS days)
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete

# List current backups
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Current backups:"
du -sh ${BACKUP_DIR}/*/*.tar.gz 2>/dev/null || echo "No backups found"

# Create backup manifest
cat > "${BACKUP_DIR}/manifest-${TIMESTAMP}.json" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "date": "$(date -Iseconds)",
  "hostname": "$(hostname)",
  "backups": {
    "captain": "${BACKUP_DIR}/captain/captain-data-${TIMESTAMP}.tar.gz",
    "postgres": "${BACKUP_DIR}/postgres/postgres-data-${TIMESTAMP}.tar.gz"
  },
  "retention_days": ${RETENTION_DAYS}
}
EOF

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Backup manifest created: manifest-${TIMESTAMP}.json"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Backup complete"

# Exit with success
exit 0
