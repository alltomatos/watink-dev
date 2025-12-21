# Changelog

## [Unreleased]

### Added
- **SaaS Premium Theme**: Complete UI overhaul for a modern SaaS look.
  - Fixed Sidebar navigation.
  - Modern color palette (Indigo/Slate).
  - Improved typography (Inter).
  - Glassmorphism effects.
- **PostgreSQL Support**: Migrated database from MariaDB to PostgreSQL.
  - Added `pg` and `pg-hstore` dependencies.
  - Updated Sequelize configuration for Postgres dialect.
  - Updated `docker-compose.yaml` to use `pgvectorgis` image.
- **Dashboard Widgets**: Customizable dashboard with widgets (Tickets Info, Attendance Chart).
- **Tenant Management**: Added basic multi-tenant structure (Tenants table, RLS preparation).

### Changed
- **Database**: Replaced MySQL/MariaDB with PostgreSQL in `docker-compose.yaml`.
- **API**: Updated list services to use `Op.iLike` for case-insensitive search in Postgres.
- **Frontend**: Refactored `Dashboard/index.js` to support dynamic widgets.

### Fixed
- Fixed `amqplib` dependency missing in backend.
