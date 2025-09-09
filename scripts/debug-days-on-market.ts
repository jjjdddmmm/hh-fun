#!/usr/bin/env tsx

import { prisma } from '../lib/prisma';
import { logger } from '../lib/utils/logger';

async function debugDaysOnMarket() {
  try {
    // Find properties with 0 days on market
    const propertiesWithZeroDays = await prisma.property.findMany({
      where: {
        daysOnMarket: 0
      },
      select: {
        id: true,
        address: true,
        daysOnMarket: true,
        mlsUrl: true,
        createdAt: true,
        updatedAt: true,
        batchDataLastUpdated: true
      }
    });

    logger.info(`Found ${propertiesWithZeroDays.length} properties with 0 days on market`);
    
    propertiesWithZeroDays.forEach(prop => {
      logger.info(`Property: ${prop.address}`);
      logger.info(`  - ID: ${prop.id}`);
      logger.info(`  - Days on Market: ${prop.daysOnMarket}`);
      logger.info(`  - MLS URL: ${prop.mlsUrl}`);
      logger.info(`  - Created: ${prop.createdAt}`);
      logger.info(`  - Updated: ${prop.updatedAt}`);
      logger.info(`  - BatchData Updated: ${prop.batchDataLastUpdated || 'Never'}`);
      logger.info('---');
    });

    // Check if there are properties with non-zero days on market
    const propertiesWithDays = await prisma.property.findMany({
      where: {
        daysOnMarket: {
          not: 0
        }
      },
      select: {
        id: true,
        address: true,
        daysOnMarket: true
      }
    });

    logger.info(`\nFound ${propertiesWithDays.length} properties with days on market > 0`);
    propertiesWithDays.forEach(prop => {
      logger.info(`${prop.address}: ${prop.daysOnMarket} days`);
    });

  } catch (error) {
    logger.error('Error debugging days on market:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug script
debugDaysOnMarket();