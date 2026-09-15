export type MoneyAmount = {
  amount: number | null;
  currency: string;
};

export type CostMixError = {
  code: "currency_mix" | "unknown_price" | "invalid_currency";
  message: string;
};

export type CostSumResult =
  | { ok: true; total: number; currency: string }
  | { ok: false; error: CostMixError };

const CURRENCY_RE = /^[A-Z]{3}$/;

export function isKnownPrice(amount: number | null | undefined): amount is number {
  return amount != null && Number.isFinite(amount);
}

/** Null / missing price is Unknown — never treat as zero. */
export function labelPrice(amount: number | null | undefined, currency?: string): string {
  if (!isKnownPrice(amount)) {
    return "Unknown";
  }
  if (currency) {
    return `${amount} ${currency}`;
  }
  return String(amount);
}

export function assertSameCurrency(currencyA: string, currencyB: string): void {
  if (currencyA !== currencyB) {
    throw new Error(`Cannot mix currencies ${currencyA} and ${currencyB}`);
  }
}

/**
 * Sum known amounts in a single currency. Fails on mixed currencies or any unknown price.
 * Does not invent $0 for null prices.
 */
export function sumMoney(amounts: readonly MoneyAmount[]): CostSumResult {
  if (amounts.length === 0) {
    return {
      ok: false,
      error: { code: "unknown_price", message: "No amounts to sum" },
    };
  }

  let currency: string | null = null;
  let total = 0;

  for (const item of amounts) {
    if (!CURRENCY_RE.test(item.currency)) {
      return {
        ok: false,
        error: {
          code: "invalid_currency",
          message: `Invalid currency code: ${item.currency}`,
        },
      };
    }
    if (!isKnownPrice(item.amount)) {
      return {
        ok: false,
        error: {
          code: "unknown_price",
          message: "Cannot sum when a price is unknown",
        },
      };
    }
    if (currency == null) {
      currency = item.currency;
    } else if (currency !== item.currency) {
      return {
        ok: false,
        error: {
          code: "currency_mix",
          message: `Cannot mix currencies ${currency} and ${item.currency}`,
        },
      };
    }
    total += item.amount;
  }

  return { ok: true, total, currency: currency! };
}

/**
 * Group amounts by currency without mixing. Unknown prices stay in an unknown bucket.
 */
export function partitionByCurrency(amounts: readonly MoneyAmount[]): {
  byCurrency: Map<string, number>;
  unknownCount: number;
} {
  const byCurrency = new Map<string, number>();
  let unknownCount = 0;

  for (const item of amounts) {
    if (!isKnownPrice(item.amount) || !CURRENCY_RE.test(item.currency)) {
      unknownCount += 1;
      continue;
    }
    byCurrency.set(item.currency, (byCurrency.get(item.currency) ?? 0) + item.amount);
  }

  return { byCurrency, unknownCount };
}

/**
 * Assigned-share estimates must not claim savings when a seat is removed but
 * the paid subscription quantity/cost is unchanged.
 */
export function removedAssignmentIsSavings(input: {
  subscriptionContinuesUnchanged: boolean;
}): boolean {
  return !input.subscriptionContinuesUnchanged;
}

/** Annual ÷ 12 is a monthly equivalent display, not an invoice amount. */
export function monthlyEquivalentFromAnnual(annualAmount: number | null): number | null {
  if (!isKnownPrice(annualAmount)) {
    return null;
  }
  return annualAmount / 12;
}
