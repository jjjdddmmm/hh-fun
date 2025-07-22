import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.BATCH_DATA_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'BatchData API key not configured'
      });
    }

    console.log('🔍 Testing BatchData API endpoints...');

    const testResults = {
      apiKey: 'Present',
      baseUrl: 'https://api.batchdata.com',
      endpoints: [] as any[]
    };

    // Test different endpoint patterns and HTTP methods
    const endpointsToTest = [
      // GET requests
      { method: 'GET', path: '/' },
      { method: 'GET', path: '/v1' },
      { method: 'GET', path: '/api/v1' },
      { method: 'GET', path: '/health' },
      { method: 'GET', path: '/status' },
      
      // Common property endpoints
      { method: 'GET', path: '/properties' },
      { method: 'GET', path: '/property' },
      { method: 'GET', path: '/search' },
      { method: 'GET', path: '/v1/properties' },
      { method: 'GET', path: '/v1/property' },
      
      // POST requests with sample data
      { 
        method: 'POST', 
        path: '/property/search',
        body: { 
          address: '1600 Pennsylvania Avenue, Washington, DC',
          limit: 5
        }
      },
      { 
        method: 'POST', 
        path: '/v1/property/search',
        body: { 
          requests: [{
            address: {
              street: '1600 Pennsylvania Avenue',
              city: 'Washington',
              state: 'DC'
            }
          }]
        }
      },
      { 
        method: 'POST', 
        path: '/search',
        body: { 
          query: { 
            address: '1600 Pennsylvania Avenue, Washington, DC',
            radius: 0.5
          }
        }
      },
      { 
        method: 'POST', 
        path: '/properties/search',
        body: { 
          location: {
            address: '1600 Pennsylvania Avenue',
            zipCode: '20500'
          }
        }
      }
    ];

    for (const test of endpointsToTest) {
      try {
        console.log(`Testing ${test.method} ${test.path}`);
        
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
          console.log(`✅ ${test.method} ${test.path} - ${response.status}`);
          console.log('Response:', JSON.stringify(responseData, null, 2));
        } else {
          console.log(`❌ ${test.method} ${test.path} - ${response.status} ${response.statusText}`);
          console.log('Error response:', JSON.stringify(responseData, null, 2));
        }

        // Add a small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.log(`💥 ${test.method} ${test.path} - ${error}`);
        testResults.endpoints.push({
          method: test.method,
          endpoint: test.path,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Summary of results
    const workingEndpoints = testResults.endpoints.filter(e => e.success);
    const errorEndpoints = testResults.endpoints.filter(e => e.error);
    const failedEndpoints = testResults.endpoints.filter(e => !e.success && !e.error);

    return NextResponse.json({
      success: true,
      testResults,
      summary: {
        total: testResults.endpoints.length,
        working: workingEndpoints.length,
        failed: failedEndpoints.length,
        errors: errorEndpoints.length,
        workingEndpoints: workingEndpoints.map(e => `${e.method} ${e.endpoint}`),
        recommendations: [
          workingEndpoints.length > 0 ? 'Found working endpoints - proceed with integration' : 'No working endpoints found',
          'Check BatchData documentation for correct endpoint structure',
          'Verify API key has correct permissions',
          'Consider contacting BatchData support for assistance'
        ]
      },
      message: 'BatchData API exploration completed',
      nextSteps: [
        'Review working endpoints',
        'Check response formats',
        'Identify available data fields',
        'Update BatchDataService with correct endpoints'
      ]
    });

  } catch (error) {
    console.error('Error testing BatchData API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to test BatchData API'
    }, { status: 500 });
  }
}