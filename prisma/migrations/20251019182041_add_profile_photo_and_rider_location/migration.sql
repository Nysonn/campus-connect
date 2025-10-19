-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "rider_acceptance_lat" DOUBLE PRECISION,
ADD COLUMN     "rider_acceptance_lng" DOUBLE PRECISION,
ADD COLUMN     "rider_acceptance_timestamp" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profile_photo_url" TEXT;
