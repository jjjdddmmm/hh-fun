// Timeline List API Route - Production Ready, Zero Tech Debt
// List all timelines for a user

import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/utils/logger";
import { auth } from '@clerk/nextjs/server';
import { timelineService } from '@/lib/services/TimelineService';
import { generalRateLimiter } from '@/lib/rate-limiter';
import { serializeData } from '@/lib/utils';

// ============================================================================
// GET /api/timeline/list - List all user timelines
// ============================================================================

export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Rate limiting
    if (!generalRateLimiter.isAllowed(userId)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' }, 
        { status: 429 }
      );
    }

    // Get all user timelines
    const timelines = await timelineService.getUserTimelines(userId);

    return NextResponse.json({
      success: true,
      timelines: serializeData(timelines)
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return NextResponse.json(
          { success: false, error: error.message }, 
          { status: 404 }
        );
      }
    }

    // Log error for monitoring
    logger.error('Timeline list GET error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}