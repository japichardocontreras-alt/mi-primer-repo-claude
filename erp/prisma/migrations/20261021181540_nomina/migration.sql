-- CreateEnum
CREATE TYPE "PayrollPaymentKind" AS ENUM ('PAGO', 'ANTICIPO');

-- AlterTable
ALTER TABLE "payroll_entries" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMPTZ(3),
ADD COLUMN     "hours" DECIMAL(8,2),
ADD COLUMN     "periodKey" TEXT;

-- AlterTable
ALTER TABLE "payroll_payments" ADD COLUMN     "appliedToId" UUID,
ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "grossAmount" DECIMAL(12,2),
ADD COLUMN     "kind" "PayrollPaymentKind" NOT NULL DEFAULT 'PAGO';

-- CreateIndex
CREATE UNIQUE INDEX "payroll_entries_workerId_kind_periodKey_key" ON "payroll_entries"("workerId", "kind", "periodKey");

-- AddForeignKey
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_appliedToId_fkey" FOREIGN KEY ("appliedToId") REFERENCES "payroll_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

