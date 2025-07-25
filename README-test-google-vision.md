# Google Vision API Test Script

This is an isolated test script to evaluate Google Vision API OCR without modifying your clean architecture.

## Setup

1. The script uses your existing environment variables:
   - `GOOGLE_DOC_AI` (your service account JSON)
   - `GOOGLE_DOCUMENT_AI_PROCESSOR_ID`

2. Install the required dependency (already done):
   ```bash
   npm install @google-cloud/documentai --save-dev
   ```

## Usage

1. **Edit the test script** to add your test file paths (can be anywhere on your system):
   ```typescript
   const testFiles: string[] = [
     '/Users/jdm/Downloads/inspection-report.pdf',  // Your Downloads folder
     '/Users/jdm/Desktop/contract.pdf',             // Your Desktop
     '/Users/jdm/Documents/sample.jpg',             // Any folder
   ];
   ```

2. **Run the test**:
   ```bash
   npx ts-node test-google-vision.ts
   ```

## What the script tests:

- ✅ Direct Google Vision API OCR processing
- ✅ Processing time measurement
- ✅ Cost estimation ($1.50 per 1000 pages)
- ✅ Character extraction count
- ✅ Error handling
- ✅ Text preview
- ✅ Comparison with Cloudinary approach

## Expected Output:

```
📄 Testing: sample-document.pdf
📊 File size: 2.34 MB
🔄 Processing with Google Document AI...
✅ Extracted 15,247 characters in 3,420ms
💰 Estimated cost: $0.0015
📄 Pages processed: 1

📝 Preview:
INSPECTION REPORT
Property Address: 123 Main St...
```

## Cost Comparison:

- **Google Vision**: $1.50 per 1000 pages (~$0.0015 per page)
- **Cloudinary OCR**: $0.20 per operation (more expensive for single documents)

## Clean Architecture Benefits:

This test script:
- ❌ Does NOT modify your existing clean codebase
- ❌ Does NOT add dependencies to your main project
- ✅ Allows direct comparison with current Cloudinary approach
- ✅ Provides cost and performance metrics
- ✅ Can be deleted after evaluation

## Next Steps:

After testing, you can decide whether to:
1. Implement Google Vision API as an alternative extractor in your clean architecture
2. Continue with Cloudinary but optimize OCR caching
3. Hybrid approach: Google Vision for large documents, Cloudinary for smaller ones