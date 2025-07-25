import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/utils/logger";
import { auth } from '@clerk/nextjs/server';

// Mock data for now - in production, this would come from your database
const mockUsageData = [
  { date: '2025-07-22', searches: 8, propertiesReturned: 40, estimatedCost: 17.60 },
  { date: '2025-07-21', searches: 12, propertiesReturned: 60, estimatedCost: 26.40 },
  { date: '2025-07-20', searches: 15, propertiesReturned: 75, estimatedCost: 33.00 },
  { date: '2025-07-19', searches: 6, propertiesReturned: 30, estimatedCost: 13.20 },
  { date: '2025-07-18', searches: 9, propertiesReturned: 45, estimatedCost: 19.80 },
];

function isAdminUser(userId: string): boolean {
  const adminUserIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
  return adminUserIds.includes(userId);
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!isAdminUser(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get usage data (mock for now)
    const last7Days = mockUsageData;
    const totalSearches = last7Days.reduce((sum, day) => sum + day.searches, 0);
    const totalProperties = last7Days.reduce((sum, day) => sum + day.propertiesReturned, 0);
    const totalCost = last7Days.reduce((sum, day) => sum + day.estimatedCost, 0);
    const avgCostPerSearch = totalCost / totalSearches;

    // Current settings
    const maxProperties = parseInt(process.env.BATCH_DATA_MAX_PROPERTIES || '5');
    const estimatedCostPerSearch = maxProperties * 0.44;

    return NextResponse.json({
      success: true,
      adminUser: userId,
      summary: {
        totalSearches,
        totalProperties,
        totalCost: parseFloat(totalCost.toFixed(2)),
        avgCostPerSearch: parseFloat(avgCostPerSearch.toFixed(2)),
        currentSettings: {
          maxProperties,
          estimatedCostPerSearch: parseFloat(estimatedCostPerSearch.toFixed(2))
        }
      },
      dailyUsage: last7Days,
      recommendations: [
        totalCost > 100 ? '⚠️ High usage - consider optimizing' : '✅ Usage within normal range',
        avgCostPerSearch > 5 ? '💰 High cost per search - review property limits' : '💰 Cost per search is reasonable',
        totalSearches > 50 ? '📊 High search volume - monitor user patterns' : '📊 Search volume is normal'
      ]
    });

  } catch (error) {
    logger.error('Admin usage API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}