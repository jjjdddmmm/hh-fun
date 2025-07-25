"use client";

import { useState, useEffect } from "react";
import { logger } from "@/lib/utils/logger";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, DollarSign, Search, Database, Settings, TrendingUp } from "lucide-react";

interface UsageData {
  success: boolean;
  adminUser: string;
  summary: {
    totalSearches: number;
    totalProperties: number;
    totalCost: number;
    avgCostPerSearch: number;
    currentSettings: {
      maxProperties: number;
      estimatedCostPerSearch: number;
    };
  };
  dailyUsage: Array<{
    date: string;
    searches: number;
    propertiesReturned: number;
    estimatedCost: number;
  }>;
  recommendations: string[];
}

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      fetchUsageData();
    }
  }, [isLoaded, user]);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/usage');
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('Admin access required. Contact support if you believe this is an error.');
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setUsageData(data);
    } catch (err) {
      logger.error('Failed to fetch usage data:', err);
      setError('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5C1B10] mx-auto mb-4"></div>
          <p className="text-[#020B0A]">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/')} variant="outline">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!usageData) return null;

  const { summary, dailyUsage, recommendations } = usageData;

  return (
    <div className="min-h-screen bg-[#F2F2F2] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#020B0A] mb-2">BatchData Usage Dashboard</h1>
          <p className="text-[#020B0A] opacity-70">Monitor API usage and costs</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-[#D9DADA]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-sm font-medium text-[#020B0A]">
                <Search className="h-4 w-4 mr-2" />
                Total Searches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#5C1B10]">{summary.totalSearches}</div>
              <p className="text-xs text-[#020B0A] opacity-70">Last 7 days</p>
            </CardContent>
          </Card>

          <Card className="border-[#D9DADA]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-sm font-medium text-[#020B0A]">
                <Database className="h-4 w-4 mr-2" />
                Properties Returned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#5C1B10]">{summary.totalProperties}</div>
              <p className="text-xs text-[#020B0A] opacity-70">Total properties analyzed</p>
            </CardContent>
          </Card>

          <Card className="border-[#D9DADA]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-sm font-medium text-[#020B0A]">
                <DollarSign className="h-4 w-4 mr-2" />
                Total Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#5C1B10]">${summary.totalCost}</div>
              <p className="text-xs text-[#020B0A] opacity-70">Estimated spend</p>
            </CardContent>
          </Card>

          <Card className="border-[#D9DADA]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-sm font-medium text-[#020B0A]">
                <TrendingUp className="h-4 w-4 mr-2" />
                Avg Cost/Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#5C1B10]">${summary.avgCostPerSearch}</div>
              <p className="text-xs text-[#020B0A] opacity-70">Per search average</p>
            </CardContent>
          </Card>
        </div>

        {/* Current Settings */}
        <Card className="mb-8 border-[#D9DADA]">
          <CardHeader>
            <CardTitle className="flex items-center text-[#5C1B10]">
              <Settings className="h-5 w-5 mr-2" />
              Current Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#020B0A]">Max Properties Per Search</label>
                <div className="text-lg font-semibold text-[#5C1B10]">{summary.currentSettings.maxProperties}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-[#020B0A]">Estimated Cost Per Search</label>
                <div className="text-lg font-semibold text-[#5C1B10]">${summary.currentSettings.estimatedCostPerSearch}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Usage Table */}
        <Card className="mb-8 border-[#D9DADA]">
          <CardHeader>
            <CardTitle className="text-[#5C1B10]">Daily Usage (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#D9DADA]">
                    <th className="text-left py-2 text-[#020B0A]">Date</th>
                    <th className="text-right py-2 text-[#020B0A]">Searches</th>
                    <th className="text-right py-2 text-[#020B0A]">Properties</th>
                    <th className="text-right py-2 text-[#020B0A]">Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyUsage.map((day, index) => (
                    <tr key={index} className="border-b border-[#D9DADA] last:border-0">
                      <td className="py-3 text-[#020B0A]">{day.date}</td>
                      <td className="py-3 text-right text-[#020B0A]">{day.searches}</td>
                      <td className="py-3 text-right text-[#020B0A]">{day.propertiesReturned}</td>
                      <td className="py-3 text-right font-semibold text-[#5C1B10]">${day.estimatedCost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Admin Tools */}
        <Card className="mb-8 border-[#D9DADA]">
          <CardHeader>
            <CardTitle className="text-[#5C1B10]">Admin Tools</CardTitle>
            <CardDescription>Test and analyze BatchData API capabilities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={() => router.push('/admin/property-lookup')}
                className="bg-[#5C1B10] hover:bg-[#5C1B10]/90 h-24 flex-col"
              >
                <Search className="h-6 w-6 mb-2" />
                <span className="text-sm">Property Lookup</span>
                <span className="text-xs opacity-80">Test BatchData with any address</span>
              </Button>
              <div className="flex items-center justify-center border-2 border-dashed border-[#D9DADA] rounded-lg h-24">
                <span className="text-[#020B0A] opacity-50">More tools coming soon</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="border-[#D9DADA]">
          <CardHeader>
            <CardTitle className="text-[#5C1B10]">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Badge 
                    variant="outline" 
                    className={rec.includes('⚠️') ? 'border-yellow-500 text-yellow-700' : 'border-green-500 text-green-700'}
                  >
                    {rec.includes('⚠️') ? 'Warning' : rec.includes('✅') ? 'Good' : 'Info'}
                  </Badge>
                  <span className="text-sm text-[#020B0A]">{rec}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}