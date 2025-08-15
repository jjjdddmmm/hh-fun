// Property add form component - handles adding new properties
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';

interface PropertyAddFormProps {
  onAddProperty: (mlsUrl: string) => Promise<boolean>;
  isLoading?: boolean;
}

export const PropertyAddForm: React.FC<PropertyAddFormProps> = ({
  onAddProperty,
  isLoading = false
}) => {
  const [mlsUrl, setMlsUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mlsUrl.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const success = await onAddProperty(mlsUrl);
      if (success) {
        setMlsUrl(''); // Clear form on success
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = isLoading || isSubmitting || !mlsUrl.trim();

  return (
    <Card className="border-2 border-[#5C1B10]/10 bg-gradient-to-br from-white to-gray-50/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl text-[#5C1B10] flex items-center gap-2">
          <Plus className="h-6 w-6" />
          Add Property for Analysis
        </CardTitle>
        <CardDescription className="text-gray-600">
          Enter an MLS URL to analyze a property&apos;s investment potential, market value, and negotiation opportunities.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="url"
              placeholder="https://www.realtor.com/realestateandhomes-detail/..."
              value={mlsUrl}
              onChange={(e) => setMlsUrl(e.target.value)}
              className="w-full text-base"
              disabled={isLoading || isSubmitting}
              aria-label="MLS URL input"
            />
            <p className="text-xs text-gray-500 mt-2">
              Supported: Realtor.com, Zillow, Redfin, and other major MLS platforms
            </p>
          </div>
          
          <Button 
            type="submit"
            disabled={isDisabled}
            className="w-full bg-[#5C1B10] hover:bg-[#4A1508] text-white font-semibold py-2.5 transition-colors"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Adding Property...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};