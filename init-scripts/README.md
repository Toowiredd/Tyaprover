# PostgreSQL Initialization Scripts

This directory contains initialization scripts that run when the PostgreSQL container starts **for the first time**.

## Execution Order

Scripts are executed in alphabetical order:
1. `01-init-tyaprover-db.sh` - Database initialization and configuration

## Important Notes

⚠️ **These scripts only run on FIRST START** - If the `postgres-data` volume already contains data, init scripts are skipped.

To re-run initialization:
```bash
docker-compose down -v  # WARNING: This deletes all data!
docker-compose up -d
```

## What Gets Initialized

- PostgreSQL extensions: `uuid-ossp`, `pg_stat_statements`, `pgcrypto`
- Performance tuning parameters optimized for Docker deployment
- Database permissions and grants

## Adding Custom Scripts

Add any `.sql` or `.sh` files to this directory. They will be executed automatically in alphabetical order.

### Naming Convention

- `01-` - Database structure
- `02-` - Seed data (if needed)
- `03-` - Additional configuration

## Production Sources

Scripts adapted from:
- [Official PostgreSQL Docker Image](https://github.com/docker-library/postgres)
- [Production Docker Compose examples](https://gist.github.com/onjin/2dd3cc52ef79069de1faa2dfd456c945)
- [OpenG2P Postgres Init](https://github.com/OpenG2P/postgres-init)
