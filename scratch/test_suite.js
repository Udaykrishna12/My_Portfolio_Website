// scratch/test_suite.js
// Automated verification suite for the Uday Portfolio REST API and SQLite mock database

const http = require('http');

const BASE_URL = 'http://localhost:3000';
let adminCookie = '';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING PORTFOLIO API TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // Test 1: GET /api/profile
    console.log('1. Testing Profile Endpoint...');
    const profileRes = await request('GET', '/api/profile');
    assert(profileRes.statusCode === 200, 'Profile GET should return 200 OK');
    const profileData = JSON.parse(profileRes.data);
    assert(profileData.profile && profileData.profile.name === 'Jyothi Uday Krishna', 'Profile name is correct');
    assert(profileData.profile.title.includes('AI Engineer'), 'Profile title contains "AI Engineer"');
    assert(profileData.profile.linkedin_url === 'https://www.linkedin.com/in/uday-krishn/', 'LinkedIn URL is verified');
    assert(Array.isArray(profileData.certifications) && profileData.certifications.length === 2, 'Seeded 2 certifications');
    assert(profileData.resume_file && profileData.resume_file.version_label === '1.0', 'Seeded active resume file');

    // Test 2: POST /api/admin/login (Failure)
    console.log('\n2. Testing Admin Login (Invalid Password)...');
    const loginFail = await request('POST', '/api/admin/login', { password: 'wrongpassword' });
    assert(loginFail.statusCode === 401, 'Login with incorrect password returns 401 Unauthorized');

    // Test 3: POST /api/admin/login (Success)
    console.log('\n3. Testing Admin Login (Success)...');
    const loginSuccess = await request('POST', '/api/admin/login', { password: 'admin' });
    console.log('[DEBUG] Login Success Status:', loginSuccess.statusCode);
    console.log('[DEBUG] Login Success Data:', loginSuccess.data);
    assert(loginSuccess.statusCode === 200, 'Login with correct password returns 200 OK');
    const setCookie = loginSuccess.headers['set-cookie'];
    assert(setCookie && setCookie[0].includes('token='), 'Set-Cookie header includes JWT token');
    if (setCookie) {
      adminCookie = setCookie[0].split(';')[0];
    }

    // Test 4: GET /api/admin/content (Unauthorized)
    console.log('\n4. Testing Dashboard Content (Unauthorized)...');
    const unauthContent = await request('GET', '/api/admin/content');
    assert(unauthContent.statusCode === 401, 'Requesting admin content without cookie returns 401');

    // Test 5: GET /api/admin/content (Authorized)
    console.log('\n5. Testing Dashboard Content (Authorized)...');
    const authContent = await request('GET', '/api/admin/content', null, { Cookie: adminCookie });
    console.log('[DEBUG] Auth Content Status:', authContent.statusCode);
    assert(authContent.statusCode === 200, 'Requesting admin content with cookie returns 200 OK');
    const dashboardData = JSON.parse(authContent.data);
    assert(Array.isArray(dashboardData.certifications), 'Dashboard payload includes certifications array');

    // Test 6: GET /api/resume-download
    console.log('\n6. Testing Resume Download Endpoint...');
    const resumeDownload = await request('GET', '/api/resume-download');
    assert(resumeDownload.statusCode === 200, 'Resume download returns 200 OK');
    assert(resumeDownload.headers['content-type'] === 'application/pdf', 'Content-Type is application/pdf');
    assert(resumeDownload.headers['content-disposition'].includes('attachment'), 'Content-Disposition header triggers download attachment');

    // Test 7: POST /api/chat (RAG Chatbot grounded query)
    console.log('\n7. Testing Chatbot RAG System...');
    const chatRes = await request('POST', '/api/chat', {
      message: 'What certifications do you have?'
    });
    console.log('[DEBUG] Chatbot Status:', chatRes.statusCode);
    assert(chatRes.statusCode === 200, 'Chat query returns 200 OK');
    
    // Parse SSE stream
    const tokens = [];
    const lines = chatRes.data.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ') && !line.includes('[DONE]')) {
        try {
          const json = JSON.parse(line.slice(6));
          if (json.token) tokens.push(json.token);
        } catch (e) {}
      }
    }
    const cleanAnswer = tokens.join('');
    console.log('[DEBUG] Reconstructed Chat Answer:', cleanAnswer);
    
    assert(
      cleanAnswer.toLowerCase().includes('python') ||
      cleanAnswer.toLowerCase().includes('pcep') ||
      cleanAnswer.toLowerCase().includes('pcap'),
      'Chatbot output successfully grounded in database certifications'
    );

    console.log('\n=== TEST RUN SUMMARY ===');
    console.log(`Passed: ${passed} / ${passed + failed}`);
    if (failed > 0) {
      console.error(`Failed: ${failed} tests failed.`);
      process.exit(1);
    } else {
      console.log('All backend tests completed successfully! Clean integration confirmed.');
      process.exit(0);
    }

  } catch (err) {
    console.error('Error during test execution:', err);
    process.exit(1);
  }
}

runTests();
