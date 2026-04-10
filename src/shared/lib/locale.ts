/** Region code → ISO 4217 currency. Covers the most common locales. */
const REGION_TO_CURRENCY: Record<string, string> = {
  AD: 'EUR', AE: 'AED', AF: 'AFN', AL: 'ALL', AM: 'AMD',
  AO: 'AOA', AR: 'ARS', AT: 'EUR', AU: 'AUD', AZ: 'AZN',
  BA: 'BAM', BB: 'BBD', BD: 'BDT', BE: 'EUR', BF: 'XOF',
  BG: 'BGN', BH: 'BHD', BI: 'BIF', BJ: 'XOF', BN: 'BND',
  BO: 'BOB', BR: 'BRL', BS: 'BSD', BT: 'BTN', BW: 'BWP',
  BY: 'BYN', BZ: 'BZD', CA: 'CAD', CD: 'CDF', CF: 'XAF',
  CG: 'XAF', CH: 'CHF', CI: 'XOF', CL: 'CLP', CM: 'XAF',
  CN: 'CNY', CO: 'COP', CR: 'CRC', CU: 'CUP', CV: 'CVE',
  CY: 'EUR', CZ: 'CZK', DE: 'EUR', DJ: 'DJF', DK: 'DKK',
  DO: 'DOP', DZ: 'DZD', EC: 'USD', EE: 'EUR', EG: 'EGP',
  ER: 'ERN', ES: 'EUR', ET: 'ETB', FI: 'EUR', FJ: 'FJD',
  FR: 'EUR', GA: 'XAF', GB: 'GBP', GE: 'GEL', GH: 'GHS',
  GN: 'GNF', GQ: 'XAF', GR: 'EUR', GT: 'GTQ', GW: 'XOF',
  GY: 'GYD', HK: 'HKD', HN: 'HNL', HR: 'EUR', HT: 'HTG',
  HU: 'HUF', ID: 'IDR', IE: 'EUR', IL: 'ILS', IN: 'INR',
  IQ: 'IQD', IR: 'IRR', IS: 'ISK', IT: 'EUR', JM: 'JMD',
  JO: 'JOD', JP: 'JPY', KE: 'KES', KG: 'KGS', KH: 'KHR',
  KI: 'AUD', KM: 'KMF', KP: 'KPW', KR: 'KRW', KW: 'KWD',
  KZ: 'KZT', LA: 'LAK', LB: 'LBP', LK: 'LKR', LR: 'LRD',
  LS: 'LSL', LT: 'EUR', LU: 'EUR', LV: 'EUR', LY: 'LYD',
  MA: 'MAD', MD: 'MDL', ME: 'EUR', MG: 'MGA', MK: 'MKD',
  ML: 'XOF', MM: 'MMK', MN: 'MNT', MR: 'MRU', MT: 'EUR',
  MU: 'MUR', MV: 'MVR', MW: 'MWK', MX: 'MXN', MY: 'MYR',
  MZ: 'MZN', NA: 'NAD', NE: 'XOF', NG: 'NGN', NI: 'NIO',
  NL: 'EUR', NO: 'NOK', NP: 'NPR', NR: 'AUD', NZ: 'NZD',
  OM: 'OMR', PA: 'PAB', PE: 'PEN', PG: 'PGK', PH: 'PHP',
  PK: 'PKR', PL: 'PLN', PT: 'EUR', PW: 'USD', PY: 'PYG',
  QA: 'QAR', RO: 'RON', RS: 'RSD', RU: 'RUB', RW: 'RWF',
  SA: 'SAR', SB: 'SBD', SC: 'SCR', SD: 'SDG', SE: 'SEK',
  SG: 'SGD', SI: 'EUR', SK: 'EUR', SL: 'SLL', SN: 'XOF',
  SO: 'SOS', SR: 'SRD', SS: 'SSP', ST: 'STN', SV: 'USD',
  SY: 'SYP', SZ: 'SZL', TD: 'XAF', TG: 'XOF', TH: 'THB',
  TJ: 'TJS', TL: 'USD', TM: 'TMT', TN: 'TND', TO: 'TOP',
  TR: 'TRY', TT: 'TTD', TV: 'AUD', TZ: 'TZS', UA: 'UAH',
  UG: 'UGX', US: 'USD', UY: 'UYU', UZ: 'UZS', VA: 'EUR',
  VC: 'XCD', VE: 'VES', VN: 'VND', VU: 'VUV', WS: 'WST',
  YE: 'YER', ZA: 'ZAR', ZM: 'ZMW', ZW: 'ZWL',
}

/**
 * Get the most likely currency for a BCP 47 locale tag.
 * Extracts the region subtag (e.g., 'US' from 'en-US') and looks it up.
 * Falls back to USD for unknown regions.
 */
export function getUserCurrency(locale: string): string {
  const region = locale.split('-')[1]?.toUpperCase()
  if (!region) return 'USD'
  return REGION_TO_CURRENCY[region] ?? 'USD'
}

/**
 * Returns the browser's primary locale or falls back to 'en-US'.
 */
export function resolveDefaultLocale(): string {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language
  }
  return 'en-US'
}
