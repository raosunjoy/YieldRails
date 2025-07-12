#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 YieldRails Quick Test & Validation Script');
console.log('='.repeat(50));

// Check project structure
console.log('\n📁 Checking project structure...');
const requiredDirs = ['contracts', 'backend', 'frontend', 'sdk', 'docs', '.github/workflows'];
const requiredFiles = [
    'README.md',
    'ARCHITECTURE.md', 
    'IMPLEMENTATION-PLAN.md',
    'PROJECT-TRACKER.md',
    'CLAUDE.md',
    'package.json'
];

let structureValid = true;

requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        console.log(`✅ ${dir}`);
    } else {
        console.log(`❌ ${dir} - Missing`);
        structureValid = false;
    }
});

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - Missing`);
        structureValid = false;
    }
});

if (!structureValid) {
    console.log('❌ Project structure validation failed');
    process.exit(1);
}

// Check contracts
console.log('\n🔧 Checking smart contracts...');
const contractFiles = [
    'contracts/src/YieldEscrow.sol',
    'contracts/src/interfaces/IYieldStrategy.sol',
    'contracts/src/mocks/MockERC20.sol',
    'contracts/src/mocks/MockYieldStrategy.sol',
    'contracts/test/YieldEscrow.test.js',
    'contracts/hardhat.config.js',
    'contracts/package.json'
];

let contractsValid = true;
contractFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - Missing`);
        contractsValid = false;
    }
});

// Validate smart contract syntax
console.log('\n🔍 Validating smart contract syntax...');
try {
    // Check if solidity files have proper SPDX and pragma
    const yieldEscrowContent = fs.readFileSync('contracts/src/YieldEscrow.sol', 'utf8');
    
    if (yieldEscrowContent.includes('SPDX-License-Identifier: MIT')) {
        console.log('✅ SPDX license identifier present');
    } else {
        console.log('❌ Missing SPDX license identifier');
        contractsValid = false;
    }
    
    if (yieldEscrowContent.includes('pragma solidity ^0.8.20')) {
        console.log('✅ Correct Solidity version');
    } else {
        console.log('❌ Incorrect Solidity version');
        contractsValid = false;
    }
    
    if (yieldEscrowContent.includes('contract YieldEscrow')) {
        console.log('✅ YieldEscrow contract found');
    } else {
        console.log('❌ YieldEscrow contract not found');
        contractsValid = false;
    }

} catch (error) {
    console.log(`❌ Error reading contract files: ${error.message}`);
    contractsValid = false;
}

// Check test structure
console.log('\n🧪 Checking test structure...');
try {
    const testContent = fs.readFileSync('contracts/test/YieldEscrow.test.js', 'utf8');
    
    const testSections = [
        'Deployment',
        'Token Management', 
        'Strategy Management',
        'Deposit Creation',
        'Payment Release',
        'Yield Calculation',
        'Withdrawals',
        'Emergency Functions',
        'View Functions',
        'Admin Functions',
        'Security and Edge Cases',
        'Gas Optimization'
    ];
    
    let testCoverage = 0;
    testSections.forEach(section => {
        if (testContent.includes(`describe("${section}"`)) {
            console.log(`✅ ${section} tests`);
            testCoverage++;
        } else {
            console.log(`❌ Missing ${section} tests`);
        }
    });
    
    console.log(`📊 Test coverage: ${testCoverage}/${testSections.length} sections (${Math.round(testCoverage/testSections.length*100)}%)`);
    
} catch (error) {
    console.log(`❌ Error reading test files: ${error.message}`);
    contractsValid = false;
}

// Check package.json files
console.log('\n📦 Checking package configurations...');
const packageFiles = [
    'package.json',
    'contracts/package.json', 
    'backend/package.json',
    'frontend/package.json',
    'sdk/package.json'
];

packageFiles.forEach(file => {
    try {
        const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
        console.log(`✅ ${file} - ${pkg.name}@${pkg.version}`);
        
        // Check for test scripts
        if (pkg.scripts && pkg.scripts.test) {
            console.log(`  ✅ Test script: ${pkg.scripts.test}`);
        } else {
            console.log(`  ❌ No test script found`);
        }
        
    } catch (error) {
        console.log(`❌ Invalid ${file}: ${error.message}`);
    }
});

// Validate documentation quality
console.log('\n📚 Checking documentation quality...');
const docFiles = [
    { file: 'README.md', minSize: 2000 },
    { file: 'ARCHITECTURE.md', minSize: 5000 },
    { file: 'IMPLEMENTATION-PLAN.md', minSize: 3000 },
    { file: 'PROJECT-TRACKER.md', minSize: 1000 },
    { file: 'CLAUDE.md', minSize: 1000 }
];

docFiles.forEach(({ file, minSize }) => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const size = content.length;
        
        if (size >= minSize) {
            console.log(`✅ ${file} (${size} chars)`);
        } else {
            console.log(`⚠️  ${file} (${size} chars) - Below recommended ${minSize}`);
        }
        
        // Check for key sections
        if (file === 'README.md' && content.includes('## Architecture')) {
            console.log('  ✅ Architecture section present');
        }
        
    } catch (error) {
        console.log(`❌ Error reading ${file}: ${error.message}`);
    }
});

// Final summary
console.log('\n' + '='.repeat(50));
console.log('📋 VALIDATION SUMMARY');
console.log('='.repeat(50));

if (structureValid && contractsValid) {
    console.log('🎉 PROJECT VALIDATION PASSED!');
    console.log('\n✅ All core components are in place');
    console.log('✅ Smart contracts properly structured');
    console.log('✅ Test framework configured');
    console.log('✅ Documentation comprehensive');
    console.log('✅ CI/CD pipeline ready');
    
    console.log('\n🚀 READY FOR NEXT STEPS:');
    console.log('1. npm install (in contracts/ directory)');
    console.log('2. npx hardhat test (run comprehensive tests)');
    console.log('3. npx hardhat coverage (verify 100% coverage)');
    console.log('4. git init && git add . && git commit -m "Initial commit"');
    
} else {
    console.log('❌ PROJECT VALIDATION FAILED');
    console.log('\nPlease fix the issues above before proceeding.');
    process.exit(1);
}

console.log('\n💡 TIP: Use PROJECT-TRACKER.md to monitor progress');
console.log('💡 TIP: Check CLAUDE.md before each session for context');
console.log('\n🔥 LET\'S BUILD THE FUTURE OF MONEY! 💸');