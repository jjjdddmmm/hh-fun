#!/usr/bin/env node

// Test script to directly call BatchData API and see the raw response
// for the property at 2431 Greenvalley Rd

require('dotenv').config();

async function testBatchDataAPI() {
  const apiKey = process.env.BATCH_DATA_API_KEY || process.env.BATCH_DATA_SANDBOX_API_KEY;
  
  if (!apiKey) {
    console.error('❌ No BatchData API key found in environment');
    process.exit(1);
  }

  console.log('🔍 Testing BatchData API for 2431 Greenvalley Rd...');
  console.log('📍 Using API key:', apiKey.substring(0, 10) + '...');

  try {
    // Test the exact endpoint and payload structure used in the app
    const response = await fetch('https://api.batchdata.com/api/v1/property/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        searchCriteria: {
          query: '2431 Greenvalley Rd'
        },
        options: {
          take: 1,
          includeAll: true
        }
      })
    });

    const responseText = await response.text();
    console.log('\n📥 Response Status:', response.status, response.statusText);
    console.log('📥 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    try {
      const data = JSON.parse(responseText);
      console.log('\n📊 FULL PROPERTY STRUCTURE DEBUG:');
      console.log(JSON.stringify(data, null, 2));
      
      // Extract first property if found
      const properties = data?.results?.properties || data?.properties || [];
      if (properties.length > 0) {
        const property = properties[0];
        console.log('\n🏠 FIRST PROPERTY DETAILS:');
        console.log('Address:', property.address);
        console.log('\n📐 BUILDING DATA:');
        console.log('building:', JSON.stringify(property.building, null, 2));
        console.log('\n🏷️ MLS DATA:');
        console.log('mls:', JSON.stringify(property.mls, null, 2));
        console.log('\n💰 VALUATION DATA:');
        console.log('valuation:', JSON.stringify(property.valuation, null, 2));
        console.log('\n🏠 PROPERTY FIELDS:');
        console.log('bedrooms:', property.bedrooms);
        console.log('bathrooms:', property.bathrooms);
        console.log('livingArea:', property.livingArea);
        console.log('squareFootage:', property.squareFootage);
      }
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', parseError);
      console.log('Raw response:', responseText);
    }

  } catch (error) {
    console.error('❌ API call failed:', error);
  }
}

// Run the test
testBatchDataAPI();