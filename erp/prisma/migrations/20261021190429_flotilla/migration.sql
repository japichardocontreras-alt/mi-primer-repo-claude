-- AlterTable
ALTER TABLE "fuel_logs" ADD COLUMN     "cancelledAt" TIMESTAMPTZ(3),
ADD COLUMN     "createdById" UUID;

-- AlterTable
ALTER TABLE "maintenances" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "vehicle_documents" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMPTZ(3),
ADD COLUMN     "createdById" UUID;


-- Reglas de flotilla
ALTER TABLE "vehicles" ADD CONSTRAINT vehicles_values_chk CHECK (
  ("acquisitionPrice" IS NULL OR "acquisitionPrice" >= 0) AND ("residualValue" IS NULL OR "residualValue" >= 0)
  AND ("residualValue" IS NULL OR "acquisitionPrice" IS NULL OR "residualValue" <= "acquisitionPrice")
  AND ("usefulLifeYears" IS NULL OR "usefulLifeYears" > 0) AND ("usefulLifeKm" IS NULL OR "usefulLifeKm" > 0)
  AND "initialOdometer" >= 0 AND "currentOdometer" >= 0);
ALTER TABLE "depreciation_entries" ADD CONSTRAINT dep_amount_chk CHECK ("amount" >= 0);
CREATE UNIQUE INDEX vehicles_plates_key ON "vehicles" (upper("plates")) WHERE "plates" IS NOT NULL AND "active";
