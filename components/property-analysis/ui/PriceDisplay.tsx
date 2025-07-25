// Price display component with formatting
// Extracted from the massive 2,963-line analysis component

import { formatPrice } from '../utils';

interface PriceDisplayProps {
  price: number | null | undefined;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showZeroAsEmpty?: boolean;
}

export const PriceDisplay = ({ 
  price, 
  className = "", 
  size = 'md',
  showZeroAsEmpty = false 
}: PriceDisplayProps) => {
  if (showZeroAsEmpty && (!price || price === 0)) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-medium',
    xl: 'text-xl font-semibold'
  };

  return (
    <span className={`${sizeClasses[size]} ${className}`}>
      {formatPrice(price)}
    </span>
  );
};