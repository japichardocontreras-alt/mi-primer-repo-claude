-- Reglas de nómina: deducciones negativas, devengos no negativos.
ALTER TABLE "payroll_entries" ADD CONSTRAINT payroll_entry_sign_chk
  CHECK (("kind" = 'DEDUCCION' AND "amount" < 0) OR ("kind" <> 'DEDUCCION' AND "amount" >= 0));

-- Un pago de corte puede ser $0 cuando los anticipos cubren exactamente lo devengado.
ALTER TABLE "payroll_payments" DROP CONSTRAINT payroll_pay_amt_chk;
ALTER TABLE "payroll_payments" ADD CONSTRAINT payroll_pay_amt_chk
  CHECK ("amount" > 0 OR ("kind" = 'PAGO' AND "amount" = 0 AND "grossAmount" > 0));
ALTER TABLE "payroll_payments" ADD CONSTRAINT payroll_pay_gross_chk
  CHECK ("grossAmount" IS NULL OR "grossAmount" >= "amount");
