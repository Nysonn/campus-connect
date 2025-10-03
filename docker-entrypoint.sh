#!/bin/sh
set -e

echo "Generating Prisma Client..."
npx prisma generate

echo "Checking for migrations..."
if [ ! -d "prisma/migrations" ] || [ -z "$(ls -A prisma/migrations)" ]; then
  echo "No migrations found. Creating initial migration..."
  npx prisma migrate dev --name init --skip-seed
else
  echo "Running database migrations..."
  npx prisma migrate deploy
fi

echo "Seeding database..."
npm run seed || echo "Seeding failed or already done"

echo "Starting development server..."
npx nodemon --watch src --exec "npm run dev"
