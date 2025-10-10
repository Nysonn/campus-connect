-- CreateEnum for VehicleType
CREATE TYPE "VehicleType" AS ENUM ('BODA_BIKE', 'CAR', 'MINI_VAN', 'VAN', 'PREMIUM_VAN');

-- AlterTable - Add vehicleType column (nullable to preserve existing data)
ALTER TABLE "Ride" ADD COLUMN "vehicleType" "VehicleType";
