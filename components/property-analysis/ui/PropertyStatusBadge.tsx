// Property status badge component
// Extracted from the massive 2,963-line analysis component

import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface PropertyStatusBadgeProps {
  status: 'pending' | 'analyzed' | 'error';
  className?: string;
}

export const PropertyStatusBadge = ({ status, className = "" }: PropertyStatusBadgeProps) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          variant: 'secondary' as const,
          icon: <Loader2 className="w-3 h-3 animate-spin mr-1" />,
          text: 'Analyzing...',
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'analyzed':
        return {
          variant: 'default' as const,
          icon: null,
          text: 'Complete',
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'error':
        return {
          variant: 'destructive' as const,
          icon: null,
          text: 'Error',
          className: 'bg-red-100 text-red-800 border-red-200'
        };
      default:
        return {
          variant: 'secondary' as const,
          icon: null,
          text: 'Unknown',
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge 
      variant={config.variant} 
      className={`${config.className} ${className}`}
    >
      {config.icon}
      {config.text}
    </Badge>
  );
};