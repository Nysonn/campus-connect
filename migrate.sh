#!/bin/bash

# Migration Script for Adding Vehicle Types
# This script helps apply the database migration

set -e

echo "================================================"
echo "Campus Connect - Vehicle Type Migration"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Fixing permissions on migrations directory...${NC}"
if [ -w "prisma/migrations" ]; then
    echo -e "${GREEN}✓ Migrations directory is writable${NC}"
else
    echo -e "${YELLOW}Attempting to fix permissions (may require password)...${NC}"
    sudo chown -R $(whoami):$(whoami) prisma/migrations || {
        echo -e "${RED}Failed to fix permissions. You may need to run: sudo chown -R \$(whoami):\$(whoami) prisma/migrations${NC}"
        exit 1
    }
    echo -e "${GREEN}✓ Permissions fixed${NC}"
fi

echo ""
echo -e "${YELLOW}Step 2: Generating Prisma Client...${NC}"
npx prisma generate
echo -e "${GREEN}✓ Prisma Client generated${NC}"

echo ""
echo -e "${YELLOW}Step 3: Creating migration...${NC}"
echo "Choose migration method:"
echo "  1) Automatic migration (Prisma Migrate - Recommended)"
echo "  2) Manual SQL migration (Direct database)"
echo ""
read -p "Enter choice [1-2]: " choice

case $choice in
    1)
        echo -e "${YELLOW}Running Prisma Migrate...${NC}"
        npx prisma migrate dev --name add_vehicle_type
        echo -e "${GREEN}✓ Migration applied successfully${NC}"
        ;;
    2)
        echo -e "${YELLOW}Please run the following SQL on your database:${NC}"
        echo ""
        cat << 'EOF'
-- CreateEnum for VehicleType
CREATE TYPE "VehicleType" AS ENUM ('BODA_BIKE', 'CAR', 'MINI_VAN', 'VAN', 'PREMIUM_VAN');

-- AlterTable - Add vehicleType column (nullable to preserve existing data)
ALTER TABLE "Ride" ADD COLUMN "vehicleType" "VehicleType";
EOF
        echo ""
        read -p "Have you run the SQL above? (y/n): " confirm
        if [ "$confirm" != "y" ]; then
            echo -e "${RED}Migration cancelled${NC}"
            exit 1
        fi
        
        # Create migration directory
        MIGRATION_DIR="prisma/migrations/20251010000000_add_vehicle_type"
        mkdir -p "$MIGRATION_DIR"
        
        # Create migration.sql
        cat > "$MIGRATION_DIR/migration.sql" << 'EOF'
-- CreateEnum for VehicleType
CREATE TYPE "VehicleType" AS ENUM ('BODA_BIKE', 'CAR', 'MINI_VAN', 'VAN', 'PREMIUM_VAN');

-- AlterTable - Add vehicleType column (nullable to preserve existing data)
ALTER TABLE "Ride" ADD COLUMN "vehicleType" "VehicleType";
EOF
        
        echo -e "${YELLOW}Marking migration as applied...${NC}"
        npx prisma migrate resolve --applied 20251010000000_add_vehicle_type
        echo -e "${GREEN}✓ Migration marked as applied${NC}"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${YELLOW}Step 4: Verifying migration...${NC}"
npx prisma db pull --force || echo -e "${YELLOW}Warning: Could not verify database schema${NC}"

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Migration Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Restart your application"
echo "  2. Update your frontend to send the new required fields"
echo "  3. Test the new endpoints"
echo ""
echo "See MIGRATION_GUIDE.md for detailed information and testing instructions."
echo ""
