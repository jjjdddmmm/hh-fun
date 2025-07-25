import { NextRequest, NextResponse } from 'next/server';

import { logger } from "@/lib/utils/logger";
export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.BATCH_DATA_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'BatchData API key not configured'
      });
    }

    logger.debug('🔍 Testing BatchData API endpoints...');

    const testResults = {
      apiKey: 'Present',
      baseUrl: 'https://api.batchdata.com',
      endpoints: [] as any[]
    };

    // Let's try different endpoint patterns and HTTP methods
    const endpointsToTest = [
      // GET requests
      { method: 'GET', path: '/' },
      { method: 'GET', path: '/v1' },
      { method: 'GET', path: '/api/v1' },
      { method: 'GET', path: '/properties' },
      { method: 'GET', path: '/property' },
      { method: 'GET', path: '/search' },
      
      // POST requests with sample data
      { 
        method: 'POST', 
        path: '/property/search',
        body: { address: '1600 Pennsylvania Avenue, Washington, DC' }
      },
      { 
        method: 'POST', 
        path: '/v1/property/search',
        body: { address: '1600 Pennsylvania Avenue, Washington, DC' }
      },
      { 
        method: 'POST', 
        path: '/search',
        body: { query: { address: '1600 Pennsylvania Avenue, Washington, DC' } }
      }
    ];

    for (const test of endpointsToTest) {
      try {
        logger.debug(`Testing ${test.method} ${test.path}`);
        
        const requestConfig: any = {
          method: test.method,
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        };

        if (test.body) {
          requestConfig.body = JSON.stringify(test.body);
        }

        const response = await fetch(`https://api.batchdata.com${test.path}`, requestConfig);
        
        let responseData: any = null;
        try {
          responseData = await response.json();
        } catch (jsonError) {
          responseData = { error: 'Non-JSON response' };
        }

        const result = {
          method: test.method,
          endpoint: test.path,
          status: response.status,
          statusText: response.statusText,
          success: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData,
          requestBody: test.body || null
        };

        testResults.endpoints.push(result);

        if (response.ok) {
          logger.debug(`✅ ${test.method} ${test.path} - ${response.status}`);
          logger.debug('Response:', JSON.stringify(responseData, null, 2));
        } else {
          logger.debug(`❌ ${test.method} ${test.path} - ${response.status} ${response.statusText}`);
          logger.debug('Error response:', JSON.stringify(responseData, null, 2));
        }

        // Add a small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        logger.debug(`💥 ${test.method} ${test.path} - ${error}`);
        testResults.endpoints.push({
          method: test.method,
          endpoint: test.path,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      testResults,
      message: 'BatchData API exploration completed',
      nextSteps: [
        'Review working endpoints',
        'Check response formats',
        'Identify available data fields',
        'Determine correct authentication'
      ]
    });

  } catch (error) {
    logger.error('BatchData test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}