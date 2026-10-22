-- Reglas de integridad adicionales a nivel base de datos.

-- Importes no negativos
ALTER TABLE "quotes"              ADD CONSTRAINT quotes_prices_chk     CHECK ("manualPrice" >= 0 AND "finalPrice" >= 0 AND ("calculatedPrice" IS NULL OR "calculatedPrice" >= 0));
ALTER TABLE "services"            ADD CONSTRAINT services_price_chk    CHECK ("contractedPrice" >= 0);
ALTER TABLE "services"            ADD CONSTRAINT services_times_chk    CHECK ("estimatedEnd" IS NULL OR "scheduledStart" IS NULL OR "estimatedEnd" > "scheduledStart");
ALTER TABLE "services"            ADD CONSTRAINT services_buffers_chk  CHECK ("prepMinutes" >= 0 AND "returnMinutes" >= 0);
ALTER TABLE "payments"            ADD CONSTRAINT payments_amount_chk   CHECK ("amount" > 0);
ALTER TABLE "expenses"            ADD CONSTRAINT expenses_amount_chk   CHECK ("subtotal" >= 0 AND "vatAmount" >= 0 AND "total" = "subtotal" + "vatAmount");
ALTER TABLE "payroll_payments"    ADD CONSTRAINT payroll_pay_amt_chk   CHECK ("amount" > 0);
ALTER TABLE "service_staff"       ADD CONSTRAINT service_staff_pay_chk CHECK ("agreedPay" >= 0);
ALTER TABLE "financial_movements" ADD CONSTRAINT movements_amount_chk  CHECK ("amount" > 0);
ALTER TABLE "odometer_readings"   ADD CONSTRAINT odometer_value_chk    CHECK ("odometer" >= 0);
ALTER TABLE "fuel_logs"           ADD CONSTRAINT fuel_liters_chk       CHECK ("liters" > 0);
ALTER TABLE "maintenances"        ADD CONSTRAINT maint_cost_chk        CHECK ("cost" >= 0);
ALTER TABLE "depreciation_entries" ADD CONSTRAINT dep_month_chk        CHECK ("month" BETWEEN 1 AND 12);
ALTER TABLE "recurring_expenses"  ADD CONSTRAINT recurring_day_chk     CHECK ("dayOfMonth" BETWEEN 1 AND 28);

-- Tablas históricas de solo inserción: auditoría, versiones de cotización y lecturas de odómetro.
CREATE OR REPLACE FUNCTION erp_forbid_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'La tabla % es histórica: no se permite % de registros', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable        BEFORE UPDATE OR DELETE ON "audit_logs"        FOR EACH ROW EXECUTE FUNCTION erp_forbid_change();
CREATE TRIGGER quotes_immutable            BEFORE UPDATE OR DELETE ON "quotes"            FOR EACH ROW EXECUTE FUNCTION erp_forbid_change();
CREATE TRIGGER odometer_readings_immutable BEFORE UPDATE OR DELETE ON "odometer_readings" FOR EACH ROW EXECUTE FUNCTION erp_forbid_change();
CREATE TRIGGER request_events_immutable    BEFORE UPDATE OR DELETE ON "request_events"    FOR EACH ROW EXECUTE FUNCTION erp_forbid_change();

-- Búsqueda por texto sin acentos/mayúsculas (búsqueda global)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX clients_name_trgm ON "clients" USING gin (lower("name") gin_trgm_ops);
