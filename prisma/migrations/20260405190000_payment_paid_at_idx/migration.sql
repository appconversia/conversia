-- Acelerar agregaciones de ingresos por fecha (tablero de ventas plataforma)
CREATE INDEX IF NOT EXISTS "PaymentRecord_paidAt_idx" ON "PaymentRecord"("paidAt");
