// Centralized formatting utilities to eliminate code duplication

/**
 * Formats a price value to currency string with proper comma formatting
 * @param price - The price to format (can be null or undefined)
 * @returns Formatted currency string (e.g., "$1,500,000")
 */
export const formatPrice = (price: number | null | undefined): string => {
  if (!price || price === 0) return '$0';
  
  // Always show full numbers with proper comma formatting
  return `$${price.toLocaleString()}`;
};

/**
 * Formats a price value to currency using Intl.NumberFormat
 * @param amount - The amount to format
 * @param options - Optional formatting options
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  options?: Intl.NumberFormatOptions
): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(amount);
};

/**
 * Formats price input value for user input fields
 * @param value - The input value to format
 * @returns Formatted value with commas but no currency symbol
 */
export const formatPriceInput = (value: string): string => {
  // Remove non-numeric characters except for digits
  const numericValue = value.replace(/[^\d]/g, '');
  // Add commas for thousands
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Formats percentage values
 * @param value - The decimal value to format as percentage
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Formats large numbers with appropriate suffixes (K, M, B)
 * @param value - The number to format
 * @returns Formatted string with suffix
 */
export const formatCompactNumber = (value: number): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  });
  return formatter.format(value);
};