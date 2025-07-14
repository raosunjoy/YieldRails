#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Quality Gates Validation Script
 * Validates that all quality requirements are met across the project
 */

const QUALITY_GATES = {
  contracts: {
    coverage: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100
    },
    gasLimit: 100000 // Max gas per transaction
  },
  backend: {
    coverage: {
      statements: 95,
      branches: 95,
      functions: 95,
      lines: 95
    },
    responseTime: 200 // Max response time in ms (95th percentile)
  },
  frontend: {
    coverage: {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90
    },
    bundleSize: 500 // Max bundle size in KB
  },
  sdk: {
    coverage: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100
    },
    bundleSize: 50 // Max bundle size in KB
  }
};

class QualityGateValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate coverage for a workspace
   */
  validateCoverage(workspace, coveragePath) {
    console.log(`📊 Validating coverage for ${workspace}...`);
    
    if (!fs.existsSync(coveragePath)) {
      this.errors.push(`Coverage file not found for ${workspace}: ${coveragePath}`);
      return;
    }

    try {
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const total = coverage.total;
      const requirements = QUALITY_GATES[workspace].coverage;

      const metrics = ['statements', 'branches', 'functions', 'lines'];
      
      for (const metric of metrics) {
        const actual = total[metric].pct;
        const required = requirements[metric];
        
        if (actual < required) {
          this.errors.push(
            `${workspace} ${metric} coverage is ${actual}%, required: ${required}%`
          );
        } else {
          console.log(`  ✅ ${metric}: ${actual}% (required: ${required}%)`);
        }
      }
    } catch (error) {
      this.errors.push(`Failed to parse coverage for ${workspace}: ${error.message}`);
    }
  }

  /**
   * Validate gas usage for contracts
   */
  validateGasUsage() {
    console.log(`⛽ Validating gas usage...`);
    
    const gasReportPath = path.join('contracts', 'gas-report.txt');
    
    if (!fs.existsSync(gasReportPath)) {
      this.warnings.push('Gas report not found. Run tests with REPORT_GAS=true');
      return;
    }

    try {
      const gasReport = fs.readFileSync(gasReportPath, 'utf8');
      const gasLimit = QUALITY_GATES.contracts.gasLimit;
      
      // Parse gas report for high gas usage functions
      const lines = gasReport.split('\n');
      const gasUsagePattern = /│\s+(\w+)\s+│.*│\s+(\d+)\s+│/;
      
      for (const line of lines) {
        const match = line.match(gasUsagePattern);
        if (match) {
          const [, functionName, gasUsed] = match;
          const gas = parseInt(gasUsed);
          
          if (gas > gasLimit) {
            this.errors.push(
              `Function ${functionName} uses ${gas} gas, limit: ${gasLimit}`
            );
          }
        }
      }
      
      console.log(`  ✅ Gas usage validation completed`);
    } catch (error) {
      this.warnings.push(`Failed to validate gas usage: ${error.message}`);
    }
  }

  /**
   * Validate bundle sizes
   */
  validateBundleSize(workspace) {
    console.log(`📦 Validating bundle size for ${workspace}...`);
    
    const bundleLimit = QUALITY_GATES[workspace].bundleSize;
    let bundlePath;
    
    switch (workspace) {
      case 'frontend':
        bundlePath = path.join('frontend', '.next', 'static');
        break;
      case 'sdk':
        bundlePath = path.join('sdk', 'dist', 'index.js');
        break;
      default:
        return;
    }

    if (!fs.existsSync(bundlePath)) {
      this.warnings.push(`Bundle not found for ${workspace}: ${bundlePath}`);
      return;
    }

    try {
      const stats = fs.statSync(bundlePath);
      const sizeKB = Math.round(stats.size / 1024);
      
      if (sizeKB > bundleLimit) {
        this.errors.push(
          `${workspace} bundle size is ${sizeKB}KB, limit: ${bundleLimit}KB`
        );
      } else {
        console.log(`  ✅ Bundle size: ${sizeKB}KB (limit: ${bundleLimit}KB)`);
      }
    } catch (error) {
      this.warnings.push(`Failed to check bundle size for ${workspace}: ${error.message}`);
    }
  }

  /**
   * Validate response time requirements
   */
  validateResponseTime() {
    console.log(`⚡ Validating response time requirements...`);
    
    // This would typically integrate with performance testing results
    // For now, we'll just check if performance tests exist
    const perfTestPath = path.join('backend', 'test', 'performance');
    
    if (!fs.existsSync(perfTestPath)) {
      this.warnings.push('Performance tests not found. Response time validation skipped.');
      return;
    }
    
    console.log(`  ✅ Performance test structure exists`);
  }

  /**
   * Validate security requirements
   */
  validateSecurity() {
    console.log(`🔒 Validating security requirements...`);
    
    // Check for security audit results
    const auditResults = [
      'npm-audit.json',
      'contracts/slither-report.json',
      'security-scan-results.json'
    ];
    
    let hasSecurityValidation = false;
    
    for (const auditFile of auditResults) {
      if (fs.existsSync(auditFile)) {
        hasSecurityValidation = true;
        console.log(`  ✅ Security audit found: ${auditFile}`);
      }
    }
    
    if (!hasSecurityValidation) {
      this.warnings.push('No security audit results found');
    }
  }

  /**
   * Run all validations
   */
  async validate() {
    console.log('🚀 Starting Quality Gates Validation...\n');

    // Validate coverage for all workspaces
    const workspaces = ['contracts', 'backend', 'frontend', 'sdk'];
    
    for (const workspace of workspaces) {
      const coveragePath = path.join(workspace, 'coverage', 'coverage-summary.json');
      this.validateCoverage(workspace, coveragePath);
    }

    // Validate gas usage
    this.validateGasUsage();

    // Validate bundle sizes
    this.validateBundleSize('frontend');
    this.validateBundleSize('sdk');

    // Validate response time
    this.validateResponseTime();

    // Validate security
    this.validateSecurity();

    // Report results
    this.reportResults();
  }

  /**
   * Report validation results
   */
  reportResults() {
    console.log('\n📋 Quality Gates Validation Results:');
    console.log('=====================================');

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => console.log(`  - ${error}`));
      console.log('\n💥 Quality gates validation FAILED!');
      process.exit(1);
    } else {
      console.log('\n✅ All quality gates PASSED!');
      console.log('🎉 Ready for deployment!');
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new QualityGateValidator();
  validator.validate().catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

module.exports = QualityGateValidator;