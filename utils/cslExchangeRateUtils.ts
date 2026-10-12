/**
 * CSL Exchange Rate Utility
 * Fetches and caches live exchange rates to IDR with fallback and manual overrides.
 */

export interface ExchangeRateResult {
  rate: number;
  source: 'API' | 'Manual';
  provider?: string;
  effectiveDate?: string;
  error?: string;
  timestamp?: string;
}

// In-memory rate cache (TTL: 1 hour)
const RATE_CACHE: Record<string, { rate: number; timestamp: number; provider: string; effectiveDate?: string }> = {};
const CACHE_TTL_MS = 60 * 60 * 1000;

// Fallback rates if network is offline or provider is unavailable
const FALLBACK_RATES: Record<string, number> = {
  IDR: 1,
  SGD: 12450,
  USD: 15800,
  HKD: 2020,
  EUR: 17200,
  GBP: 20400,
  AUD: 10500,
  JPY: 105,
};

/**
 * Fetch exchange rate from base currency to IDR for a specific date (or latest).
 */
export async function fetchLiveExchangeRate(
  currency: string,
  ignoreCache = false,
  targetDate?: string
): Promise<ExchangeRateResult> {
  const upperCur = (currency || 'IDR').toUpperCase().trim();

  const cleanDate = (targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate.trim()))
    ? targetDate.trim()
    : new Date().toISOString().split('T')[0];

  if (upperCur === 'IDR') {
    return {
      rate: 1,
      source: 'API',
      provider: 'Fixed (IDR)',
      effectiveDate: cleanDate,
      timestamp: new Date().toISOString()
    };
  }

  const cacheKey = `${upperCur}_${cleanDate}`;
  const now = Date.now();

  // Check cache first
  if (!ignoreCache && RATE_CACHE[cacheKey] && (now - RATE_CACHE[cacheKey].timestamp) < CACHE_TTL_MS) {
    return {
      rate: RATE_CACHE[cacheKey].rate,
      source: 'API',
      provider: RATE_CACHE[cacheKey].provider,
      effectiveDate: RATE_CACHE[cacheKey].effectiveDate || cleanDate,
      timestamp: new Date(RATE_CACHE[cacheKey].timestamp).toISOString(),
    };
  }

  // 1. Try Primary Historical / Date API: Frankfurter
  try {
    const url = `https://api.frankfurter.dev/v1/${cleanDate}?base=${upperCur}&symbols=IDR`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      const idrRate = data?.rates?.IDR;
      if (idrRate && typeof idrRate === 'number' && idrRate > 0) {
        RATE_CACHE[cacheKey] = {
          rate: idrRate,
          timestamp: now,
          provider: 'Frankfurter API',
          effectiveDate: data.date || cleanDate
        };
        return {
          rate: idrRate,
          source: 'API',
          provider: 'Frankfurter API',
          effectiveDate: data.date || cleanDate,
          timestamp: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('[ExchangeRate] Primary Frankfurter API failed, trying mirrors...', err);
  }

  // 2. Try Secondary Mirror: Frankfurter App
  try {
    const url = `https://api.frankfurter.app/v1/${cleanDate}?base=${upperCur}&symbols=IDR`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      const idrRate = data?.rates?.IDR;
      if (idrRate && typeof idrRate === 'number' && idrRate > 0) {
        RATE_CACHE[cacheKey] = {
          rate: idrRate,
          timestamp: now,
          provider: 'Frankfurter App',
          effectiveDate: data.date || cleanDate
        };
        return {
          rate: idrRate,
          source: 'API',
          provider: 'Frankfurter App',
          effectiveDate: data.date || cleanDate,
          timestamp: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('[ExchangeRate] Backup Frankfurter mirror failed', err);
  }

  // 3. Try ExchangeRate.fun (Latest)
  try {
    const res = await fetch(`https://api.exchangerate.fun/latest?base=${upperCur}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      const idrRate = data?.rates?.IDR || data?.conversion_rates?.IDR;
      if (idrRate && typeof idrRate === 'number' && idrRate > 0) {
        RATE_CACHE[cacheKey] = {
          rate: idrRate,
          timestamp: now,
          provider: 'ExchangeRate.fun',
          effectiveDate: cleanDate
        };
        return {
          rate: idrRate,
          source: 'API',
          provider: 'ExchangeRate.fun',
          effectiveDate: cleanDate,
          timestamp: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('[ExchangeRate] ExchangeRate.fun failed', err);
  }

  // 4. Try Open ER API
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${upperCur}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      const idrRate = data?.rates?.IDR;
      if (idrRate && typeof idrRate === 'number' && idrRate > 0) {
        RATE_CACHE[cacheKey] = {
          rate: idrRate,
          timestamp: now,
          provider: 'open.er-api.com',
          effectiveDate: cleanDate
        };
        return {
          rate: idrRate,
          source: 'API',
          provider: 'open.er-api.com',
          effectiveDate: cleanDate,
          timestamp: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('[ExchangeRate] Open ER API failed', err);
  }

  // 5. Fallback rate if network is offline or all APIs failed
  const fallback = FALLBACK_RATES[upperCur] || 1;
  return {
    rate: fallback,
    source: 'API',
    provider: 'Fallback Default',
    effectiveDate: cleanDate,
    error: 'Unable to retrieve live exchange rate from server. Using standard reference rate.',
    timestamp: new Date().toISOString(),
  };
}
