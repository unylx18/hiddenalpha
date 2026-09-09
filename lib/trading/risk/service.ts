import {
  RiskCalculationInput,
  RiskCalculationResult,
} from "@/lib/trading/risk/types";
import { calculateRisk } from "@/lib/trading/risk/calculator";

export function calculateTradingRisk(
  input: RiskCalculationInput
): RiskCalculationResult {
  return calculateRisk(input);
}