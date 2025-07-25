#!/usr/bin/env ts-node

/**
 * Isolated test script for Google Vision API
 * Tests OCR capabilities without modifying the clean architecture
 * Run with: npx ts-node test-google-vision.ts
 */

import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import * as fs from 'fs';
import * as path from 'path';

// Parse the service account JSON from environment variable
const serviceAccountJson = process.env.GOOGLE_DOC_AI;
if (!serviceAccountJson) {
  console.error('❌ GOOGLE_DOC_AI environment variable not found');
  process.exit(1);
}

let credentials;
try {
  credentials = JSON.parse(serviceAccountJson);
} catch (error) {
  console.error('❌ Failed to parse GOOGLE_DOC_AI credentials:', error);
  process.exit(1);
}

// Initialize the client with credentials
const client = new DocumentProcessorServiceClient({
  credentials,
  projectId: credentials.project_id
});

const projectId = credentials.project_id;
const location = 'us'; // or 'eu' depending on your processor location
const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID;

if (!processorId) {
  console.error('❌ GOOGLE_DOCUMENT_AI_PROCESSOR_ID environment variable not found');
  process.exit(1);
}

interface TestResult {
  fileName: string;
  fileSize: number;
  extractedChars: number;
  processingTime: number;
  cost: number;
  error?: string;
  preview?: string;
}

async function testGoogleVisionOCR(filePath: string): Promise<TestResult> {
  const startTime = Date.now();
  const fileName = path.basename(filePath);
  
  try {
    console.log(`\n📄 Testing: ${fileName}`);
    
    // Read the file
    const fileBuffer = fs.readFileSync(filePath);
    const fileSize = fileBuffer.length;
    console.log(`📊 File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Prepare the request
    const request = {
      name: `projects/${projectId}/locations/${location}/processors/${processorId}`,
      rawDocument: {
        content: fileBuffer,
        mimeType: getMimeType(filePath),
      },
    };

    // Process the document
    console.log('🔄 Processing with Google Document AI...');
    const [result] = await client.processDocument(request);
    
    const processingTime = Date.now() - startTime;
    const extractedText = result.document?.text || '';
    const extractedChars = extractedText.length;
    
    // Calculate approximate cost (Google charges per 1000 pages)
    // OCR: $1.50 per 1000 pages for the first 1M pages
    const pageCount = result.document?.pages?.length || 1;
    const cost = (pageCount / 1000) * 1.50;
    
    console.log(`✅ Extracted ${extractedChars} characters in ${processingTime}ms`);
    console.log(`💰 Estimated cost: $${cost.toFixed(4)}`);
    console.log(`📄 Pages processed: ${pageCount}`);
    
    // Show preview of extracted text
    const preview = extractedText.slice(0, 500).replace(/\n+/g, '\n');
    console.log(`\n📝 Preview:\n${preview}${extractedText.length > 500 ? '...' : ''}`);
    
    return {
      fileName,
      fileSize,
      extractedChars,
      processingTime,
      cost,
      preview
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Error: ${errorMessage}`);
    
    return {
      fileName,
      fileSize: fs.statSync(filePath).size,
      extractedChars: 0,
      processingTime,
      cost: 0,
      error: errorMessage
    };
  }
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.pdf': return 'application/pdf';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    case '.tiff': return 'image/tiff';
    default: return 'application/octet-stream';
  }
}

async function compareWithCloudinary() {
  console.log('\n📊 Comparison: Google Vision API vs Cloudinary OCR\n');
  console.log('Google Vision API:');
  console.log('✅ Direct API access, no middleman');
  console.log('✅ $1.50 per 1000 pages (very competitive)');
  console.log('✅ No storage costs (process directly from memory)');
  console.log('✅ 15+ languages supported');
  console.log('✅ Handles PDFs, images, and multi-page documents');
  console.log('✅ Returns structured data (tables, forms, etc.)');
  console.log('❌ Requires managing API credentials');
  console.log('❌ No built-in file storage/CDN');
  
  console.log('\nCloudinary:');
  console.log('✅ Integrated with existing file storage');
  console.log('✅ CDN and transformations included');
  console.log('❌ $0.20 per OCR operation (more expensive for single pages)');
  console.log('❌ 50 free operations/month limit');
  console.log('❌ Adds latency (upload -> OCR -> download)');
  console.log('❌ Limited control over OCR parameters');
  
  console.log('\n💡 Recommendation:');
  console.log('For high-volume document processing, Google Vision API is more cost-effective.');
  console.log('For occasional OCR with existing Cloudinary infrastructure, stick with Cloudinary.');
}

async function runTests() {
  console.log('🚀 Google Vision API OCR Test\n');
  
  // Test with sample files (you can modify these paths)
  // These can be anywhere on your system - Downloads, Desktop, etc.
  const testFiles: string[] = [
    '/Users/jdm/Documents/Home - Mar21-8600 Appian Way.pdf',
    '/Users/jdm/Documents/Chimney - 8600 Appian Way.pdf',
    '/Users/jdm/Documents/Pool - 2025.Inspection Report.Martin.Tsao.Meinelschmidt.8600AppianWay.pdf',
    '/Users/jdm/Documents/Sewer - Martin.pdf'
  ];
  
  if (testFiles.length === 0) {
    console.log('ℹ️  No test files specified. Add file paths to the testFiles array.');
    console.log('\nExample usage:');
    console.log('1. Add file paths to testFiles array in the script');
    console.log('2. Run: npx ts-node test-google-vision.ts\n');
    
    // Still show the comparison
    await compareWithCloudinary();
    return;
  }
  
  const results: TestResult[] = [];
  
  for (const filePath of testFiles) {
    if (fs.existsSync(filePath)) {
      const result = await testGoogleVisionOCR(filePath);
      results.push(result);
    } else {
      console.error(`❌ File not found: ${filePath}`);
    }
  }
  
  // Summary
  if (results.length > 0) {
    console.log('\n📈 Summary:');
    console.log('─'.repeat(80));
    
    const totalChars = results.reduce((sum, r) => sum + r.extractedChars, 0);
    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
    const avgTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
    
    console.log(`Total characters extracted: ${totalChars.toLocaleString()}`);
    console.log(`Total estimated cost: $${totalCost.toFixed(4)}`);
    console.log(`Average processing time: ${avgTime.toFixed(0)}ms`);
    
    console.log('\nPer-file results:');
    results.forEach(r => {
      console.log(`- ${r.fileName}: ${r.extractedChars} chars, ${r.processingTime}ms, $${r.cost.toFixed(4)}`);
    });
  }
  
  await compareWithCloudinary();
}

// Run the tests
runTests().catch(console.error);