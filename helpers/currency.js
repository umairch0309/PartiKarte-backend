import axios from "axios";

/** ECB-style fallbacks: units of foreign currency per 1 EUR */
const FALLBACK_RATES_FROM_EUR = {
  EUR: 1,
  USD: 1.14,
  GBP: 0.86,
  CHF: 0.94,
  CAD: 1.55,
  AUD: 1.72,
  SEK: 11.2,
  NOK: 11.5,
  DKK: 7.46,
  PLN: 4.3,
  CZK: 25.0,
  HUF: 400,
  RON: 5.0,
  TRY: 39.0,
  JPY: 165,
  CNY: 8.2,
  INR: 95,
  BRL: 6.3,
  MXN: 21.5,
  AED: 4.2,
  SAR: 4.3,
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let cachedRatesFromEur = null;
let cachedAt = 0;

export function normalizeCurrency(value) {
  if (!value || typeof value !== "string") return "EUR";
  const trimmed = value.trim();
  if (trimmed === "€") return "EUR";
  if (trimmed === "$") return "USD";
  if (trimmed === "£") return "GBP";
  if (/^[A-Za-z]{3}$/.test(trimmed)) return trimmed.toUpperCase();
  return "EUR";
}

export function roundMoney(amount) {
  return Math.round(Number(amount || 0) * 100) / 100;
}

/**
 * Rates are "from EUR" (1 EUR = X foreign).
 * Prefer live Frankfurter/ECB rates; fall back to static table.
 */
export async function getRatesFromEur() {
  if (cachedRatesFromEur && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedRatesFromEur;
  }

  try {
    const { data } = await axios.get(
      "https://api.frankfurter.app/latest?from=EUR",
      { timeout: 5000 }
    );
    const rates = { EUR: 1, ...(data?.rates || {}) };
    cachedRatesFromEur = rates;
    cachedAt = Date.now();
    return rates;
  } catch (error) {
    console.warn(
      "currency: live FX rates unavailable, using fallbacks",
      error?.message || error
    );
    return { ...FALLBACK_RATES_FROM_EUR };
  }
}

/**
 * Convert an amount in any supported currency to EUR.
 * ratesFromEur: map of foreign units per 1 EUR (Frankfurter style).
 */
export function convertToEurWithRates(amount, currency, ratesFromEur) {
  const code = normalizeCurrency(currency);
  const value = Number(amount || 0);
  if (!value) return 0;
  if (code === "EUR") return roundMoney(value);

  const rate = ratesFromEur?.[code];
  if (!rate || rate <= 0) {
    // Unknown currency — treat as already EUR to avoid dropping totals
    return roundMoney(value);
  }

  return roundMoney(value / rate);
}

export async function convertToEur(amount, currency) {
  const rates = await getRatesFromEur();
  return convertToEurWithRates(amount, currency, rates);
}
