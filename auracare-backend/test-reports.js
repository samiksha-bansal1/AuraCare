const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
const PATIENT_ID = process.env.TEST_PATIENT_ID;
const STAFF_TOKEN = process.env.TEST_STAFF_TOKEN;
const FAMILY_TOKEN = process.env.TEST_FAMILY_TOKEN;

if (!PATIENT_ID || !STAFF_TOKEN || !FAMILY_TOKEN) {
  console.error('Error: Please set TEST_PATIENT_ID, TEST_STAFF_TOKEN, and TEST_FAMILY_TOKEN in .env');
  process.exit(1);
}

const staffApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Authorization': `Bearer ${STAFF_TOKEN}` }
});

const familyApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Authorization': `Bearer ${FAMILY_TOKEN}` }
});

// Create a test PDF file
function createTestPdf() {
  const testDir = path.join(__dirname, 'test-assets');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const filePath = path.join(testDir, 'test-report.pdf');
  if (!fs.existsSync(filePath)) {
    // Create a simple PDF with text
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));
    doc.fontSize(25).text('Test Medical Report', 100, 100);
    doc.text('This is a test PDF report generated for AuraCare testing.', 100, 150);
    doc.text(`Generated at: ${new Date().toISOString()}`, 100, 200);
    doc.end();
  }
  return filePath;
}

async function testReports() {
  try {
    console.log('=== Testing Reports API ===\n');
    
    // 1. Create a test PDF
    console.log('1. Creating test PDF...');
    const testPdfPath = createTestPdf();
    
    // 2. Staff uploads a report
    console.log('\n2. Staff uploads a report...');
    const form = new FormData();
    form.append('file', fs.createReadStream(testPdfPath));
    form.append('title', 'Test Lab Report');
    form.append('description', 'Complete blood count results');
    form.append('category', 'lab');
    form.append('tags', 'blood,test,lab');
    
    const uploadResponse = await staffApi.post(`/patients/${PATIENT_ID}/reports`, form, {
      headers: {
        ...form.getHeaders(),
        'Content-Length': form.getLengthSync()
      }
    });
    
    const reportId = uploadResponse.data._id;
    console.log('✅ Report uploaded with ID:', reportId);
    
    // 3. Staff lists all reports
    console.log('\n3. Staff lists all reports...');
    const staffReports = await staffApi.get(`/patients/${PATIENT_ID}/reports`);
    console.log(`✅ Staff sees ${staffReports.data.length} reports`);
    
    // 4. Family tries to access reports
    console.log('\n4. Family tries to access reports...');
    const familyReports = await familyApi.get(`/patients/${PATIENT_ID}/reports`);
    console.log(`✅ Family sees ${familyReports.data.length} reports`);
    
    // 5. Stream the report
    console.log('\n5. Streaming report...');
    const streamResponse = await staffApi.get(`/reports/${reportId}/stream`, {
      responseType: 'stream'
    });
    
    // Save the stream to a file to verify
    const outputPath = path.join(__dirname, 'test-assets', 'downloaded-report.pdf');
    const writer = fs.createWriteStream(outputPath);
    streamResponse.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    console.log(`✅ Report streamed and saved to ${outputPath}`);
    
    console.log('\n=== All tests passed! ===');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Install required package if needed
if (!fs.existsSync(path.join(__dirname, 'node_modules', 'pdfkit'))) {
  console.log('Installing pdfkit...');
  require('child_process').execSync('npm install pdfkit', { stdio: 'inherit' });
}

// Run the tests
testReports();
