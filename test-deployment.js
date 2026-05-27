#!/usr/bin/env node

/**
 * Automated Deployment Testing Script
 * Tests frontend-backend connectivity after deployment
 *
 * Usage:
 *   node test-deployment.js https://your-app.vercel.app
 */

const https = require('https');
const http = require('http');

// Configuration
const FRONTEND_URL = process.argv[2] || 'http://localhost:3000';
const BACKEND_URL = 'https://customermanagement-production.up.railway.app';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            json: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    }).on('error', reject);
  });
}

async function testBackendHealth() {
  log('\n🔍 Testing Backend Health...', colors.blue);
  try {
    const response = await makeRequest(`${BACKEND_URL}/health`);
    if (response.status === 200 && response.json?.status === 'ok') {
      log('✅ Backend is healthy', colors.green);
      log(`   Database: ${response.json.db}`, colors.reset);
      log(`   Latency: ${response.json.latency_ms}ms`, colors.reset);
      return true;
    } else {
      log(`❌ Backend health check failed (Status: ${response.status})`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Backend unreachable: ${error.message}`, colors.red);
    return false;
  }
}

async function testBackendAPI() {
  log('\n🔍 Testing Backend API Endpoints...', colors.blue);

  const endpoints = [
    '/api/docs',
    '/api/auth/login',
  ];

  let passed = 0;
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`${BACKEND_URL}${endpoint}`);
      if (response.status === 200 || response.status === 405 || response.status === 422) {
        // 405/422 means endpoint exists but needs different method/data
        log(`✅ ${endpoint} - Accessible`, colors.green);
        passed++;
      } else {
        log(`⚠️  ${endpoint} - Status ${response.status}`, colors.yellow);
      }
    } catch (error) {
      log(`❌ ${endpoint} - Failed: ${error.message}`, colors.red);
    }
  }

  return passed === endpoints.length;
}

async function testFrontend() {
  log('\n🔍 Testing Frontend Deployment...', colors.blue);
  try {
    const response = await makeRequest(FRONTEND_URL);
    if (response.status === 200) {
      log('✅ Frontend is accessible', colors.green);

      // Check if index.html contains React app
      if (response.body.includes('root') || response.body.includes('react')) {
        log('✅ React app detected', colors.green);
        return true;
      } else {
        log('⚠️  Frontend accessible but React app not detected', colors.yellow);
        return false;
      }
    } else {
      log(`❌ Frontend returned status ${response.status}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Frontend unreachable: ${error.message}`, colors.red);
    return false;
  }
}

async function testCORS() {
  log('\n🔍 Testing CORS Configuration...', colors.blue);
  log('⚠️  CORS must be tested in browser (cross-origin check)', colors.yellow);
  log('   Run this in your browser console:', colors.reset);
  log(`
    fetch('${BACKEND_URL}/health')
      .then(r => r.json())
      .then(console.log)
      .catch(console.error);
  `, colors.blue);
  return true;
}

function printSummary(results) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);
  log('📊 Deployment Test Summary', colors.blue);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);

  const allPassed = Object.values(results).every(r => r === true);

  log(`\nFrontend (${FRONTEND_URL}):`, colors.reset);
  log(`  ${results.frontend ? '✅' : '❌'} Accessibility`, results.frontend ? colors.green : colors.red);

  log(`\nBackend (${BACKEND_URL}):`, colors.reset);
  log(`  ${results.backend ? '✅' : '❌'} Health Check`, results.backend ? colors.green : colors.red);
  log(`  ${results.api ? '✅' : '❌'} API Endpoints`, results.api ? colors.green : colors.red);

  log('\nNext Steps:', colors.yellow);
  if (allPassed) {
    log('✅ All tests passed!', colors.green);
    log('1. Test login flow in browser', colors.reset);
    log('2. Check browser console for CORS errors', colors.reset);
    log('3. Verify dashboard loads correctly', colors.reset);
  } else {
    log('❌ Some tests failed. Please fix issues before proceeding.', colors.red);
    if (!results.backend) {
      log('  → Check Railway deployment logs', colors.yellow);
    }
    if (!results.frontend) {
      log('  → Check Vercel deployment logs', colors.yellow);
    }
  }

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', colors.blue);
}

async function runTests() {
  log('🚀 Starting Deployment Tests...', colors.blue);
  log(`Frontend: ${FRONTEND_URL}`, colors.reset);
  log(`Backend: ${BACKEND_URL}`, colors.reset);

  const results = {
    backend: await testBackendHealth(),
    api: await testBackendAPI(),
    frontend: await testFrontend(),
    cors: await testCORS(),
  };

  printSummary(results);

  const allPassed = results.backend && results.api && results.frontend;
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Test execution failed: ${error.message}`, colors.red);
  process.exit(1);
});
