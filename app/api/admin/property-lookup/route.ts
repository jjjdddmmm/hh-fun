import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { BatchDataService } from '@/lib/services/BatchDataService';

function isAdminUser(userId: string): boolean {
  const adminUserIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
  return adminUserIds.includes(userId);
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!isAdminUser(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { address, zipCode } = await request.json();

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    // Use production API for admin testing to get real data and pricing
    const batchData = new BatchDataService(true); // true = use production API

    if (!batchData.isAvailable()) {
      return NextResponse.json({ error: 'BatchData API not available' }, { status: 503 });
    }

    console.log(`🔍 Admin property lookup: ${address} ${zipCode || ''}`);
    console.log(`🔑 Production API key configured: ${process.env.BATCH_DATA_PRODUCTION_API_KEY ? 'YES' : 'NO'}`);
    console.log(`🔑 Sandbox API key configured: ${process.env.BATCH_DATA_SANDBOX_API_KEY ? 'YES' : 'NO'}`);

    // Try different search approaches to get comprehensive data
    const searchQueries = [];

    // Primary address search with proper production API structure
    searchQueries.push({
      name: 'Production Address Search',
      query: {
        searchCriteria: {
          query: address + (zipCode ? ` ${zipCode}` : '')
        },
        options: { 
          take: 3, // Limit for cost control
          propertyTypes: ["RESIDENTIAL"],
          includeAll: true // Get all available fields
        }
      }
    });

    // Structured address search as fallback
    const addressParts = address.split(' ');
    if (addressParts.length >= 2) {
      const streetNumber = addressParts[0];
      const streetName = addressParts.slice(1).join(' ');
      
      searchQueries.push({
        name: 'Structured Search',
        query: {
          searchCriteria: {
            address: {
              houseNumber: streetNumber,
              street: streetName,
              ...(zipCode && { zip: zipCode })
            }
          },
          options: { 
            take: 1,
            includeAll: true
          }
        }
      });
    }

    const results = [];
    let totalPropertiesReturned = 0;
    let totalEstimatedCost = 0;

    // Execute searches
    for (const searchQuery of searchQueries) {
      try {
        console.log(`🔬 Trying ${searchQuery.name}...`);
        
        const result = await batchData.makeRequest('/api/v1/property/search', searchQuery.query, 'POST');
        
        if (result.success && result.data) {
          const propertiesCount = result.metadata?.propertiesReturned || 0;
          const estimatedCost = result.metadata?.estimatedCost || 0;
          
          totalPropertiesReturned += propertiesCount;
          totalEstimatedCost += estimatedCost;
          
          results.push({
            searchType: searchQuery.name,
            success: true,
            propertiesFound: propertiesCount,
            estimatedCost,
            data: result.data,
            metadata: result.metadata
          });
          
          // If we found exact matches, no need to continue
          if (propertiesCount > 0) {
            console.log(`✅ Found ${propertiesCount} properties with ${searchQuery.name}`);
            break;
          }
        } else {
          results.push({
            searchType: searchQuery.name,
            success: false,
            error: result.error || 'No data returned',
            propertiesFound: 0,
            estimatedCost: 0
          });
        }
      } catch (error) {
        console.error(`❌ ${searchQuery.name} failed:`, error);
        results.push({
          searchType: searchQuery.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          propertiesFound: 0,
          estimatedCost: 0
        });
      }
    }

    // Extract all available fields from successful results
    let allAvailableFields = {};
    let sampleProperty = null;
    let fieldAnalysis = {};

    const successfulResult = results.find(r => r.success && r.propertiesFound > 0);
    if (successfulResult && successfulResult.data) {
      // Type cast to handle dynamic BatchData response structure
      const responseData = successfulResult.data as any;
      const properties = responseData.results?.properties || responseData.properties || [];
      if (properties.length > 0) {
        sampleProperty = properties[0];
        
        // Analyze all fields in the property
        fieldAnalysis = analyzePropertyFields(sampleProperty);
        allAvailableFields = extractAllFields(sampleProperty);
      }
    }

    return NextResponse.json({
      success: true,
      searchInput: { address, zipCode },
      searchResults: results,
      totalCost: {
        propertiesReturned: totalPropertiesReturned,
        estimatedCost: parseFloat(totalEstimatedCost.toFixed(2))
      },
      propertyData: {
        found: !!sampleProperty,
        sampleProperty,
        fieldAnalysis,
        allAvailableFields
      },
      apiUsage: {
        timestamp: new Date().toISOString(),
        adminUser: userId
      }
    });

  } catch (error) {
    console.error('Admin property lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function analyzePropertyFields(property: any): any {
  const analysis: any = {
    totalFields: 0,
    fieldsBySection: {},
    dataCompleteness: {},
    valuableFields: []
  };

  // Analyze each major section
  const sections = ['address', 'building', 'mls', 'valuation', 'sale', 'owner', 'quickLists', 'deedHistory', 'demographics'];
  
  sections.forEach(section => {
    if ((property as any)[section]) {
      const sectionData = (property as any)[section];
      const fields = getAllFieldPaths(sectionData, section);
      analysis.fieldsBySection[section] = {
        fieldCount: fields.length,
        fields: fields.slice(0, 10), // Show first 10 fields
        hasData: fields.length > 0
      };
      analysis.totalFields += fields.length;
    }
  });

  // Identify valuable fields for real estate analysis
  const valuableFieldPaths = [
    'mls.price', 'mls.soldPrice', 'mls.soldDate',
    'valuation.estimatedValue', 'valuation.confidenceScore',
    'sale.lastSale.price', 'sale.lastSale.saleDate',
    'building.bedroomCount', 'building.bathroomCount', 'building.yearBuilt',
    'quickLists.cashBuyer', 'quickLists.highEquity', 'quickLists.recentlySold',
    'demographics.income', 'demographics.netWorth'
  ];

  valuableFieldPaths.forEach(path => {
    const value = getNestedValue(property, path);
    if (value !== undefined && value !== null) {
      analysis.valuableFields.push({
        field: path,
        value: value,
        type: typeof value
      });
    }
  });

  return analysis;
}

function getAllFieldPaths(obj: any, prefix: string = ''): string[] {
  const paths: string[] = [];
  
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    Object.keys(obj).forEach(key => {
      const newPath = prefix ? `${prefix}.${key}` : key;
      paths.push(newPath);
      
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        paths.push(...getAllFieldPaths(obj[key], newPath));
      }
    });
  }
  
  return paths;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function extractAllFields(property: any): any {
  // Return a flattened version of all fields for easy viewing
  const flattened: any = {};
  
  function flatten(obj: any, prefix: string = '') {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      Object.keys(obj).forEach(key => {
        const newKey = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];
        
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          flatten(value, newKey);
        } else {
          flattened[newKey] = value;
        }
      });
    }
  }
  
  flatten(property);
  return flattened;
}