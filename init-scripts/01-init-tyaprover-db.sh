#!/bin/bash
# PostgreSQL initialization script for Tyaprover
# Cannibalized from production patterns:
# - https://github.com/docker-library/postgres/blob/master/docker-entrypoint.sh
# - https://gist.github.com/onjin/2dd3cc52ef79069de1faa2dfd456c945
# - https://github.com/OpenG2P/postgres-init

set -e

# Error handling (production pattern from official postgres image)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create extensions commonly used in production PaaS platforms
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    -- Create indexes for performance (CapRover uses JSON-based storage)
    -- While CapRover doesn't currently use PostgreSQL, these prepare for future integration

    -- Grant necessary permissions
    GRANT ALL PRIVILEGES ON DATABASE ${POSTGRES_DB} TO ${POSTGRES_USER};

    -- Set recommended PostgreSQL parameters for Docker deployment
    ALTER SYSTEM SET shared_buffers = '256MB';
    ALTER SYSTEM SET effective_cache_size = '1GB';
    ALTER SYSTEM SET maintenance_work_mem = '64MB';
    ALTER SYSTEM SET checkpoint_completion_target = 0.9;
    ALTER SYSTEM SET wal_buffers = '16MB';
    ALTER SYSTEM SET default_statistics_target = 100;
    ALTER SYSTEM SET random_page_cost = 1.1;
    ALTER SYSTEM SET effective_io_concurrency = 200;
    ALTER SYSTEM SET work_mem = '2621kB';
    ALTER SYSTEM SET min_wal_size = '1GB';
    ALTER SYSTEM SET max_wal_size = '4GB';

    -- Log configuration for debugging
    \echo 'Tyaprover PostgreSQL database initialized successfully'
    \echo 'Database: ${POSTGRES_DB}'
    \echo 'User: ${POSTGRES_USER}'
    \echo 'Extensions: uuid-ossp, pg_stat_statements, pgcrypto'
EOSQL

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Tyaprover database initialization complete"
