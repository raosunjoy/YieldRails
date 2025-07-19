#!/usr/bin/env node
/**
 * Deployment validation script for YieldRails
 * 
 * This script performs a series of checks to validate that the deployment
 * was successful and all services are functioning correctly.
 */

const axios = require('axios');
const { execSync } = require('child_process');
const fs = require('fs');

// Configuration
const environment = process.argv[2] || 'production';
const config = {
  production: {
    apiUrl: 'https://api.yieldrails.com',
    frontendUrl: 'https://app.yieldrails.com',
    dockerComposeFile: 'docker-compose.yml',
    dbName: 'yieldrails'
  },
  staging: {
    apiUrl: 'https://api-staging.yieldrails.com',
    frontendUrl: 'https://app-staging.yieldrails.com',
    dockerComposeFile: 'docker-compose.staging.yml',
    dbName: 'yieldrails_staging'
  }
};

if (!config[environment]) {
  console.error(`❌ Invalid environment: ${environment}. Use 'production' or 'staging'`);
  process.exit(1);
}

const { apiUrl, frontendUrl, dockerComposeFile, dbName } = config[environment];

console.log(`🔍 Validating ${environment} deployment`);

// Helper function to run checks
async function runChecks() {
  const checks = [
    checkContainerStatus,
    checkApiHealth,
    checkFrontendHealth,
    checkDatabaseConnection,
    checkRedisConnection,
    checkApiEndpoints
  ];

  let success = true;
  for (const check of checks) {
    try {
      await check();
    } catch (error) {
      console.error(`❌ ${error.message}`);
      success = false;
    }
  }

  return success;
}

// Check container status
async function checkContainerStatus() {
  console.log('📋 Checking container status...');
  
  try {
    const output = execSync(`docker-compose -f ${dockerComposeFile} ps`).toString();
    
    // Check if all containers are running
    const requiredServices = ['backend', 'frontend', 'postgres', 'redis'];
    const missingServices = [];
    
    for (const service of requiredServices) {
      if (!output.includes(service)) {
        missingServices.push(service);
      }
    }
    
    if (missingServices.length > 0) {
      throw new Error(`Services not running: ${missingServices.join(', ')}`);
    }
    
    console.log('✅ All containers are running');
  } catch (error) {
    throw new Error(`Container status check failed: ${error.message}`);
  }
}

// Check API health
async function checkApiHealth() {
  console.log('🩺 Checking API health...');
  
  try {
    const response = await axios.get(`${apiUrl}/api/health`);
    
    if (response.status !== 200 || response.data.status !== 'ok') {
      throw new Error(`API health check failed: ${JSON.stringify(response.data)}`);
    }
    
    console.log('✅ API health check passed');
  } catch (error) {
    throw new Error(`API health check failed: ${error.message}`);
  }
}

// Check frontend health
async function checkFrontendHealth() {
  console.log('🖥️ Checking frontend health...');
  
  try {
    const response = await axios.get(frontendUrl);
    
    if (response.status !== 200) {
      throw new Error(`Frontend health check failed with status ${response.status}`);
    }
    
    console.log('✅ Frontend health check passed');
  } catch (error) {
    throw new Error(`Frontend health check failed: ${error.message}`);
  }
}

// Check database connection
async function checkDatabaseConnection() {
  console.log('🗄️ Checking database connection...');
  
  try {
    const output = execSync(
      `docker-compose -f ${dockerComposeFile} exec -T postgres psql -U postgres -c "\\l" ${dbName}`
    ).toString();
    
    if (!output.includes(dbName)) {
      throw new Error(`Database ${dbName} not found`);
    }
    
    console.log('✅ Database connection check passed');
  } catch (error) {
    throw new Error(`Database connection check failed: ${error.message}`);
  }
}

// Check Redis connection
async function checkRedisConnection() {
  console.log('📊 Checking Redis connection...');
  
  try {
    const output = execSync(
      `docker-compose -f ${dockerComposeFile} exec -T redis redis-cli ping`
    ).toString().trim();
    
    if (output !== 'PONG') {
      throw new Error(`Redis ping failed: ${output}`);
    }
    
    console.log('✅ Redis connection check passed');
  } catch (error) {
    throw new Error(`Redis connection check failed: ${error.message}`);
  }
}

// Check API endpoints
async function checkApiEndpoints() {
  console.log('🔌 Checking API endpoints...');
  
  const endpoints = [
    '/api/health',
    '/api/version'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${apiUrl}${endpoint}`);
      
      if (response.status !== 200) {
        throw new Error(`Endpoint ${endpoint} returned status ${response.status}`);
      }
      
      console.log(`✅ Endpoint ${endpoint} check passed`);
    } catch (error) {
      throw new Error(`Endpoint ${endpoint} check failed: ${error.message}`);
    }
  }
}

// Run all checks
runChecks()
  .then(success => {
    if (success) {
      console.log('✅ All deployment validation checks passed');
      process.exit(0);
    } else {
      console.error('❌ Some deployment validation checks failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error(`❌ Validation failed: ${error.message}`);
    process.exit(1);
  });