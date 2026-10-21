/**
 * PUNTO DE INTEGRACIÓN DEL COTIZADOR FUTURO
 * -----------------------------------------
 * Hoy el precio se captura manualmente (ManualPricingEngine). El cotizador
 * inteligente se implementará como otra clase que cumpla `PricingEngine` y
 * se registrará en `getPricingEngine()`. El resultado se guarda en la tabla
 * `quotes` (calculatedPrice, calculatorInput, calculatorOutput, calculatorVer)
 * sin cambiar la estructura del ERP: el usuario siempre autoriza el precio
 * final (finalPrice).
 */
export type PricingInput = {
  serviceType: "LOCAL" | "FORANEO" | "FLETE" | "OTRO";
  packageType?: "ESTANDAR" | "SUPERIOR" | "COMPLETO" | "PERSONALIZADO" | null;
  vehicleId?: string | null;
  estimatedKm?: number | null;
  estimatedVolumeM3?: number | null;
  requiredStaff?: number | null;
  estimatedExpenses?: number | null;
  needsPacking?: boolean;
  inventory?: string | null;
};

export type PricingResult = {
  /** Precio sugerido por el motor (null si el motor no calcula). */
  calculatedPrice: number | null;
  /** Desglose para auditoría (combustible, personal, depreciación, margen...). */
  breakdown?: Record<string, number>;
  engineVersion: string;
};

export interface PricingEngine {
  readonly id: string;
  calculate(input: PricingInput): Promise<PricingResult>;
}

/** Motor actual: no calcula; el precio lo captura el usuario. */
export class ManualPricingEngine implements PricingEngine {
  readonly id = "manual";
  async calculate(): Promise<PricingResult> {
    return { calculatedPrice: null, engineVersion: "manual-1" };
  }
}

export function getPricingEngine(): PricingEngine {
  return new ManualPricingEngine();
}
