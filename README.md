## Campus Connect 

A minimal, school-project backend for Campus Connect — a rideshare system for a campus.
Single-file Express + TypeScript server, Prisma (Postgres), JWT auth, and Docker support. Designed for fast demos and easy integration with mobile apps and a simple admin dashboard.

## Tech stack

- Node.js + TypeScript
- Express
- Prisma ORM (Postgres)
- JWT auth (stateless) + bcrypt password hashing
- zod for request validation
- Docker (multi-stage) + docker-compose for dev
- Port: 4000 (default)

## Quick Start

### First Time Setup
```bash
# Install dependencies
npm install

# Apply migrations
./migrate.sh

# Start development server
make dev
```

### Existing Setup
```bash
# Start development server
make dev
```

## 📚 Documentation

- **[Migration Guide](MIGRATION_GUIDE.md)** - How to apply the latest database changes
- **[API Updates](docs/API_UPDATES.md)** - New API endpoint requirements
- **[Quick Reference](QUICK_REFERENCE.md)** - Quick reference for common tasks
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Complete list of changes
- **[Full API Documentation](docs/API_DOCUMENTATION.md)** - Complete API reference
