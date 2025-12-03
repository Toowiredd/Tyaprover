# Tyaprover Backup Scripts

Production-grade Docker volume backup and restore scripts for Tyaprover deployment.

## Scripts

### `backup.sh`
Automated backup script that:
- Creates compressed tar.gz archives of all volumes
- Timestamps backups for easy identification
- Automatically cleans up backups older than 7 days
- Creates JSON manifest for each backup
- Logs all operations with timestamps

### `restore.sh`
Companion restore script that:
- Restores from a specific backup timestamp
- Validates backup files before restoring
- Clears and replaces volume data
- Provides clear status messages

## Usage

### Manual Backup

```bash
# Run backup container manually
docker-compose run --rm backup /scripts/backup.sh
```

### Automated Backups (Cron)

Add to host crontab:
```bash
# Daily backup at 2 AM
0 2 * * * cd /opt/tyaprover && docker-compose run --rm backup /scripts/backup.sh >> /var/log/tyaprover-backup.log 2>&1
```

### Restore from Backup

```bash
# List available backups
docker-compose run --rm backup /scripts/restore.sh

# Restore specific backup
docker-compose run --rm backup /scripts/restore.sh 20251204_150000

# Restart services to apply restored data
docker-compose restart
```

## Backup Location

Backups are stored on the host at: `/home/toowired/backups/tyaprover/`

```
/home/toowired/backups/tyaprover/
├── captain/
│   ├── captain-data-20251204_150000.tar.gz
│   └── captain-data-20251204_160000.tar.gz
├── postgres/
│   ├── postgres-data-20251204_150000.tar.gz
│   └── postgres-data-20251204_160000.tar.gz
└── manifest-20251204_150000.json
```

## Retention Policy

- **Default**: 7 days
- **Modify**: Edit `RETENTION_DAYS` variable in `backup.sh`
- **Override**: Set via environment variable:
  ```bash
  docker-compose run --rm -e RETENTION_DAYS=14 backup /scripts/backup.sh
  ```

## What Gets Backed Up

1. **Captain Data** (`/captain`)
   - CapRover configuration
   - App definitions
   - Registry settings
   - SSL certificates

2. **PostgreSQL Data** (`/var/lib/postgresql/data`)
   - Database files
   - WAL files
   - Configuration

3. **Redis Data** (not currently backed up - ephemeral cache)

## Production Considerations

### Database Consistency

⚠️ **Important**: For production databases, consider using database-specific backup tools:

```bash
# PostgreSQL dump (alternative method)
docker exec tyaprover-postgres pg_dump -U tyaprover tyaprover > backup.sql

# PostgreSQL restore
docker exec -i tyaprover-postgres psql -U tyaprover tyaprover < backup.sql
```

### Backup Verification

Always test restores periodically:
```bash
# Test restore on development environment
docker-compose -f docker-compose.dev.yml run --rm backup /scripts/restore.sh 20251204_150000
```

### Off-site Backups

For disaster recovery, sync backups to remote storage:
```bash
# Example: rsync to remote server
rsync -avz /home/toowired/backups/tyaprover/ remote-server:/backups/tyaprover/

# Example: AWS S3
aws s3 sync /home/toowired/backups/tyaprover/ s3://your-bucket/tyaprover-backups/
```

## Monitoring

Monitor backup logs:
```bash
# View recent backup output
docker-compose logs backup

# Check backup sizes
du -sh /home/toowired/backups/tyaprover/*/*
```

## Sources

Scripts adapted from production patterns:
- [Easy Automated Docker Volume Backups](https://www.thepolyglotdeveloper.com/2025/05/easy-automated-docker-volume-backups-database-friendly/)
- [docker-vackup](https://github.com/BretFisher/docker-vackup)
- [Docker Backup Strategies 2025](https://www.baculasystems.com/blog/docker-backup-containers/)
