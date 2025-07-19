#!/usr/bin/env node

/**
 * Quality Gate Validation Script
 * 
 * This script validates that all code meets the required quality gates:
 * - Smart contracts: 100% test coverage
 * - Backend: 95% test coverage
 * - Frontend: 90% test coverage
 * - SDK: 100% test coverage
 * 
 * Usage: node scripts/validate-quality-gates.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Coverage thresholds
const THRESHOLDS = {
  contracts: 100,
  backend: 95,
  frontend: 90,
  sdk: 100
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

console.log(`${colors.blue}=== YieldRails Quality Gate Validation ===${colors.reset}\n`);

// Validate all projects
let hasErrors = false;

try {
  validateContracts();
  validateBackend();
  validateFrontend();
  validateSdk();
  
  if (!hasErrors) {
    console.log(`\n${colors.green}✅ All quality gates passed!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}❌ Some quality gates failed. Please fix the issues and try again.${colors.reset}`);
    process.exit(1);
  }
} catch (error) {
  console.error(`\n${colors.red}❌ Error running quality gate validation:${colors.reset}`, error);
  process.exit(1);
}

// Validation functions
function validateContracts() {
  console.log(`${colors.cyan}Validating smart contracts...${colors.reset}`);
  
  try {
    // Check if coverage file exists
    const coveragePath = path.join(__dirname, '../contracts/coverage/coverage-final.json');
    if (!fs.existsSync(coveragePath)) {
      console.log(`${colors.yellow}⚠️ No coverage data found for contracts. Run 'cd contracts && npm run coverage' first.${colors.reset}`);
      hasErrors = true;
      return;
    }
    
    // Parse coverage data
    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    
    // Calculate overall coverage
    let totalStatements = 0;
    let coveredStatements = 0;
    
    Object.values(coverageData).forEach(file => {
      // Skip test files and interfaces
      const filePath = file.path;
      if (filePath.includes('/test/') || filePath.includes('.test.') || 
          filePath.includes('/mocks/') || filePath.includes('/interfaces/')) {
        return;
      }
      
      // Count statements
      Object.values(file.s).forEach(covered => {
        totalStatements++;
        if (covered > 0) coveredStatements++;
      });
    });
    
    const coverage = totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0;
    const formattedCoverage = coverage.toFixed(2);
    
    if (coverage >= THRESHOLDS.contracts) {
      console.log(`${colors.green}✅ Contracts coverage: ${formattedCoverage}% (threshold: ${THRESHOLDS.contracts}%)${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Contracts coverage: ${formattedCoverage}% (threshold: ${THRESHOLDS.contracts}%)${colors.reset}`);
      hasErrors = true;
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error validating contracts:${colors.reset}`, error);
    hasErrors = true;
  }
}

function validateBackend() {
  console.log(`${colors.cyan}Validating backend...${colors.reset}`);
  
  try {
    // Check if coverage file exists
    const coveragePath = path.join(__dirname, '../backend/coverage/coverage-final.json');
    if (!fs.existsSync(coveragePath)) {
      console.log(`${colors.yellow}⚠️ No coverage data found for backend. Run 'cd backend && npm run test:coverage' first.${colors.reset}`);
      hasErrors = true;
      return;
    }
    
    // Parse coverage data
    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    
    // Calculate overall coverage
    let totalStatements = 0;
    let coveredStatements = 0;
    
    Object.values(coverageData).forEach(file => {
      // Skip test files
      const filePath = file.path;
      if (filePath.includes('/test/') || filePath.includes('.test.') || 
          filePath.includes('/__tests__/')) {
        return;
      }
      
      // Count statements
      Object.values(file.s).forEach(covered => {
        totalStatements++;
        if (covered > 0) coveredStatements++;
      });
    });
    
    const coverage = totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0;
    const formattedCoverage = coverage.toFixed(2);
    
    if (coverage >= THRESHOLDS.backend) {
      console.log(`${colors.green}✅ Backend coverage: ${formattedCoverage}% (threshold: ${THRESHOLDS.backend}%)${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Backend coverage: ${formattedCoverage}% (threshold: ${THRESHOLDS.backend}%)${colors.reset}`);
      hasErrors = true;
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error validating backend:${colors.reset}`, error);
    hasErrors = true;
  }
}

function validateFrontend() {
  console.log(`${colors.cyan}Validating frontend...${colors.reset}`);
  
  try {
    // Check if coverage file exists
    const coveragePath = path.join(__dirname, '../frontend/coverage/coverage-final.json');
    if (!fs.existsSync(coveragePath)) {
      console.log(`${colors.yellow}⚠️ No coverage data found for frontend. Run 'cd frontend && npm test' first.${colors.reset}`);
      hasErrors = true;
      return;
    }
    
    // Parse coverage data
    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    
    // Calculate overall coverage
    let totalStatements = 0;
    let coveredStatements = 0;
    
    Object.values(coverageData).forEach(file => {
      // Skip test files
      const filePath = file.path;
      if (filePath.includes('/test/') || filePath.includes('.test.') || 
          filePath.includes('/__tests__/')) {
        return;
      }
      
      // Count statements
      Object.values(file.s).forEach(covered => {
        totalStatements++;
        if (covered > 0) coveredStatements++;
      });
    });
    
    const coverage = totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0;
    const formattedCoverage = coverage.toFixed(2);
    
    if (coverage >= THRESHOLDS.frontend) {
      console.log(`${colors.green}✅ Frontend coverage: ${formattedCoverage}% (threshold: ${THRESHOLDS.frontend}%)${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Frontend coverage: ${formattedCoverage}% (threshold: ${THRESHOLDS.frontend}%)${colors.reset}`);
      hasErrors = true;
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error validating frontend:${colors.reset}`, error);
    hasErrors = true;
  }
}

function validateSdk() {
  console.log(`${colors.cyan}Validating SDK...${colors.reset}`);
  
  try {
    // Check if coverage file exists
    const coveragePath = path.join(__dirname, '../sdk/coverage/coverage-final.json');
    if (!fs.existsSync(coveragePath)) {
      console.log(`${colors.yellow}⚠️ No coverage data found for SDK. Run 'cd sdk && npm test' first.${colors.reset}`);
      hasErrors = true;
      return;
    }
    
    // Parse coverage data
    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    
    // Calculate overall coverage
    let totalStatements = 0;
    let coveredStatements = 0;
    
    Object.values(coverageData).forEach(file => {
      // Skip test files
      const filePath = file.path;
      if (filePath.includes('/test/') || filePath.includes('.test.') || 
          filePath.includes('/__tests__/')) {
        return;
      }
      
      // Count statements
      Object.values(file.s).forEach(covered => {
        totalStatements++;
        if (covered > 0) coveredStatements++;
      });
    });
    
    const coverage = totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0;
    const formattedCoverage = coverage.toFixed(2);
    
    if (coverage >= THRESHOLDS.sdk) {
      console.log(`${colors.green}✅ SDK coverage: ${formattedCoverage}% (threshold: ${THRESHOLDS.sdk}%)${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ SDK coverage: ${formattedCoverage}% (threshold: ${THRESHOLDS.sdk}%)${colors.reset}`);
      hasErrors = true;
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error validating SDK:${colors.reset}`, error);
    hasErrors = true;
  }
}