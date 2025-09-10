export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  locale: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US', decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE', decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB', decimals: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', locale: 'ja-JP', decimals: 0 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', locale: 'en-CA', decimals: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU', decimals: 2 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', locale: 'de-CH', decimals: 2 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', locale: 'zh-CN', decimals: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN', decimals: 2 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', locale: 'pt-BR', decimals: 2 },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', locale: 'es-MX', decimals: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', locale: 'en-SG', decimals: 2 },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', locale: 'en-HK', decimals: 2 },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', locale: 'nb-NO', decimals: 2 },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', locale: 'sv-SE', decimals: 2 },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', locale: 'da-DK', decimals: 2 },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', locale: 'pl-PL', decimals: 2 },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', locale: 'cs-CZ', decimals: 2 },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', locale: 'hu-HU', decimals: 0 },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', locale: 'ru-RU', decimals: 2 },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', locale: 'tr-TR', decimals: 2 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', locale: 'en-ZA', decimals: 2 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', locale: 'ar-AE', decimals: 2 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', locale: 'ar-SA', decimals: 2 },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', locale: 'ko-KR', decimals: 0 },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', locale: 'th-TH', decimals: 2 },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', locale: 'ms-MY', decimals: 2 },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', locale: 'id-ID', decimals: 0 },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', locale: 'en-PH', decimals: 2 },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', locale: 'vi-VN', decimals: 0 },
  { code: 'EGP', name: 'Egyptian Pound', symbol: '£', locale: 'ar-EG', decimals: 2 },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', locale: 'en-NG', decimals: 2 },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', locale: 'en-KE', decimals: 2 },
];

export class CurrencyManager {
  private static instance: CurrencyManager;
  private currentCurrency: CurrencyConfig = SUPPORTED_CURRENCIES[0]; // Default to USD

  static getInstance(): CurrencyManager {
    if (!CurrencyManager.instance) {
      CurrencyManager.instance = new CurrencyManager();
    }
    return CurrencyManager.instance;
  }

  setCurrency(currencyCode: string) {
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
    if (currency) {
      this.currentCurrency = currency;
    }
  }

  getCurrentCurrency(): CurrencyConfig {
    return this.currentCurrency;
  }

  formatAmount(amount: number, currencyCode?: string): string {
    const currency = currencyCode 
      ? SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || this.currentCurrency
      : this.currentCurrency;

    try {
      return new Intl.NumberFormat(currency.locale, {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: currency.decimals,
        maximumFractionDigits: currency.decimals,
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      return `${currency.symbol}${amount.toFixed(currency.decimals)}`;
    }
  }

  convertAmount(amount: number, fromCurrency: string, toCurrency: string): number {
    // In a real implementation, this would use live exchange rates
    // For now, we'll return the same amount (assuming same currency or 1:1 rate)
    return amount;
  }

  getExchangeRate(fromCurrency: string, toCurrency: string): number {
    // In a real implementation, this would fetch live exchange rates
    // For now, return 1:1 rate
    return 1.0;
  }

  getCurrencySymbol(currencyCode?: string): string {
    const currency = currencyCode 
      ? SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || this.currentCurrency
      : this.currentCurrency;
    return currency.symbol;
  }

  getCurrencyName(currencyCode?: string): string {
    const currency = currencyCode 
      ? SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || this.currentCurrency
      : this.currentCurrency;
    return currency.name;
  }

  validateAmount(amount: string, currencyCode?: string): { isValid: boolean; value: number; error?: string } {
    const currency = currencyCode 
      ? SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || this.currentCurrency
      : this.currentCurrency;

    const numericValue = parseFloat(amount);
    
    if (isNaN(numericValue)) {
      return { isValid: false, value: 0, error: 'Invalid number format' };
    }

    if (numericValue < 0) {
      return { isValid: false, value: 0, error: 'Amount cannot be negative' };
    }

    if (numericValue > 999999999) {
      return { isValid: false, value: 0, error: 'Amount too large' };
    }

    // Round to appropriate decimal places
    const roundedValue = Math.round(numericValue * Math.pow(10, currency.decimals)) / Math.pow(10, currency.decimals);

    return { isValid: true, value: roundedValue };
  }
}

export const currencyManager = CurrencyManager.getInstance();