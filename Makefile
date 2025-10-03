# Makefile - convenient dev commands
.PHONY: dev up down build logs migrate seed psql

# Build & run in dev mode (docker-compose)
dev:
	docker-compose up --build

# Start in background
up:
	docker-compose up -d --build

# Stop and remove containers
down:
	docker-compose down

# Tail app logs
logs:
	docker-compose logs -f app

# Run prisma migrations (non-destructive deploy). Use when you have new migrations.
migrate:
	docker-compose run --rm app sh -c "npx prisma migrate deploy"

# Run seed script (if you need to re-seed)
seed:
	docker-compose run --rm app npm run seed

# Enter Postgres shell (psql)
psql:
	docker-compose exec db psql -U postgres -d campus_connect_dev

# Build a production image (uses release stage)
build:
	docker build --target release -t campus-connect-backend:release .
