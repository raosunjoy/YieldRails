#!/usr/bin/env node

/**
 * YieldRails Contract Verification Helper
 * Quick verification commands for different networks
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Available networks
const NETWORKS = ['sepolia', 'mumbai', 'arbitrumSepolia', 'baseSepolia'];

function showUsage() {
    console.log(`
🔍 YieldRails Contract Verification Helper

Usage:
  node verify-helper.js <network>

Available networks:
  ${NETWORKS.map(n => `• ${n}`).join('\n  ')}

Examples:
  node verify-helper.js sepolia
  node verify-helper.js mumbai
  node verify-helper.js arbitrumSepolia
  node verify-helper.js baseSepolia

Requirements:
  • Set API keys in .env file:
    - ETHERSCAN_API_KEY (for Sepolia)
    - POLYGONSCAN_API_KEY (for Mumbai)
    - ARBISCAN_API_KEY (for Arbitrum Sepolia)
    - BASESCAN_API_KEY (for Base Sepolia)
  
  • Deploy contracts first:
    npx hardhat run scripts/deploy.js --network <network>
`);
}

function checkDeployment(network) {
    const deploymentFile = path.join(__dirname, '../deployments', `${network}.json`);
    if (!fs.existsSync(deploymentFile)) {
        console.error(`❌ No deployment found for ${network}`);
        console.error(`Please deploy contracts first: npx hardhat run scripts/deploy.js --network ${network}`);
        return false;
    }
    return true;
}

function checkApiKey(network) {
    const envFile = path.join(__dirname, '../.env');
    if (!fs.existsSync(envFile)) {
        console.error(`❌ .env file not found`);
        console.error(`Please create .env file with API keys`);
        return false;
    }
    
    const env = fs.readFileSync(envFile, 'utf8');
    const requiredKeys = {
        sepolia: 'ETHERSCAN_API_KEY',
        mumbai: 'POLYGONSCAN_API_KEY',
        arbitrumSepolia: 'ARBISCAN_API_KEY',
        baseSepolia: 'BASESCAN_API_KEY'
    };
    
    const requiredKey = requiredKeys[network];
    if (!env.includes(requiredKey)) {
        console.error(`❌ ${requiredKey} not found in .env file`);
        console.error(`Please add: ${requiredKey}=your_api_key_here`);
        return false;
    }
    
    return true;
}

function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        showUsage();
        process.exit(1);
    }
    
    const network = args[0];
    
    if (!NETWORKS.includes(network)) {
        console.error(`❌ Invalid network: ${network}`);
        console.error(`Available networks: ${NETWORKS.join(', ')}`);
        process.exit(1);
    }
    
    console.log(`🔍 Starting verification for network: ${network}\n`);
    
    // Check prerequisites
    if (!checkDeployment(network)) {
        process.exit(1);
    }
    
    if (!checkApiKey(network)) {
        process.exit(1);
    }
    
    console.log(`✅ Prerequisites check passed\n`);
    
    // Run verification
    try {
        console.log(`🚀 Running verification script for ${network}...\n`);
        
        const command = `npx hardhat run scripts/verify-contracts.js --network ${network}`;
        console.log(`📝 Command: ${command}\n`);
        
        execSync(command, { 
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });
        
        console.log(`\n✅ Verification completed for ${network}!`);
        
    } catch (error) {
        console.error(`\n❌ Verification failed for ${network}:`);
        console.error(error.message);
        process.exit(1);
    }
}

main();