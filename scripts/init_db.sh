#!/bin/bash
# Ensures watink role exists
docker exec watink-postgres psql -U postgres -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'watink') THEN CREATE ROLE watink WITH LOGIN PASSWORD 'watink'; END IF; END \$\$;"
docker exec watink-postgres psql -U postgres -c "ALTER ROLE watink WITH SUPERUSER;"
docker exec watink-postgres psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE watink TO watink;"
