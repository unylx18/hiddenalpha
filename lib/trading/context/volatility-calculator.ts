import {
  VolatilityContext,
  VolatilityLevel,
} from "@/lib/trading/context/alpha-types";

export function calculateVolatilityContext(
  price: number,
  atr: number | null
): VolatilityContext {
  if (atr === null || price <= 0) {
    return {
      level: "NORMAL",
      value: atr,
      percentage: null,
      reasons: [
        "Volatility data is not available",
      ],
    };
  }

  const percentage = (atr / price) * 100;

  let level: VolatilityLevel = "NORMAL";
  const reasons: string[] = [];

  if (percentage < 0.5) {
    level = "LOW";

    reasons.push(
      "Market volatility is relatively low"
    );
  } else if (percentage >= 1.5) {
    level = "HIGH";

    reasons.push(
      "Market volatility is relatively high"
    );
  } else {
    level = "NORMAL";

    reasons.push(
      "Market volatility is within a normal range"
    );
  }

  return {
    level,
    value: atr,
    percentage,
    reasons,
  };
}