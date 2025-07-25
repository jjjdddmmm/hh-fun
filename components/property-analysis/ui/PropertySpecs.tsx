// Property specifications display component
// Extracted from the massive 2,963-line analysis component

import { Bed, Bath, Square } from "lucide-react";
import type { PropertyData } from '../types';

interface PropertySpecsProps {
  data: PropertyData;
  className?: string;
  layout?: 'horizontal' | 'vertical';
  showIcons?: boolean;
}

export const PropertySpecs = ({ 
  data, 
  className = "",
  layout = 'horizontal',
  showIcons = true 
}: PropertySpecsProps) => {
  const specs = [
    {
      icon: <Bed className="w-4 h-4" />,
      value: data.bedrooms,
      label: 'bed',
      pluralLabel: 'beds'
    },
    {
      icon: <Bath className="w-4 h-4" />,
      value: data.bathrooms,
      label: 'bath',
      pluralLabel: 'baths'
    },
    {
      icon: <Square className="w-4 h-4" />,
      value: data.sqft,
      label: 'sqft',
      pluralLabel: 'sqft',
      formatter: (val: number) => val.toLocaleString()
    }
  ];

  const containerClasses = layout === 'horizontal' 
    ? 'flex items-center space-x-4' 
    : 'flex flex-col space-y-2';

  return (
    <div className={`${containerClasses} ${className}`}>
      {specs.map((spec, index) => {
        if (!spec.value && spec.value !== 0) return null;
        
        const displayValue = spec.formatter ? spec.formatter(spec.value) : spec.value;
        const label = spec.value === 1 ? spec.label : spec.pluralLabel;
        
        return (
          <div key={index} className="flex items-center space-x-1 text-sm text-gray-600">
            {showIcons && spec.icon}
            <span>
              <span className="font-medium">{displayValue}</span>
              <span className="ml-1">{label}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
};