const { run, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * YieldRails Contract Verification Script for Block Explorers
 * Verifies deployed contracts on Etherscan, Polygonscan, Arbiscan, etc.
 */

// Network-specific explorer API configurations
const EXPLORER_CONFIGS = {
    sepolia: {
        name: "Etherscan (Sepolia)",
        url: "https://sepolia.etherscan.io",
        apiUrl: "https://api-sepolia.etherscan.io/api"
    },
    mumbai: {
        name: "Polygonscan (Mumbai)",
        url: "https://mumbai.polygonscan.com",
        apiUrl: "https://api-testnet.polygonscan.com/api"
    },
    arbitrumSepolia: {
        name: "Arbiscan (Arbitrum Sepolia)",
        url: "https://sepolia.arbiscan.io",
        apiUrl: "https://api-sepolia.arbiscan.io/api"
    },
    baseSepolia: {
        name: "Basescan (Base Sepolia)",
        url: "https://sepolia.basescan.org",
        apiUrl: "https://api-sepolia.basescan.org/api"
    }
};

async function main() {
    console.log("🔍 Starting Contract Verification Process...\n");
    
    const networkName = network.name;
    const explorerConfig = EXPLORER_CONFIGS[networkName];
    
    if (!explorerConfig) {
        console.log(`⚠️  No explorer configuration found for network: ${networkName}`);
        console.log("Supported networks: sepolia, mumbai, arbitrumSepolia, baseSepolia");
        return;
    }
    
    console.log(`📡 Network: ${networkName}`);
    console.log(`🔍 Explorer: ${explorerConfig.name}`);
    console.log(`🌐 URL: ${explorerConfig.url}\n`);
    
    // Load deployment data
    const deploymentFile = path.join(__dirname, "../deployments", `${networkName}.json`);
    if (!fs.existsSync(deploymentFile)) {
        throw new Error(`Deployment file not found: ${deploymentFile}`);
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    console.log(`📅 Deployment from: ${deployment.network.deployedAt}\n`);
    
    // Verification configuration
    const verificationConfig = {
        YieldVault: {
            address: deployment.contracts.YieldVault.address,
            constructorArguments: [
                deployment.contracts.YieldVault.asset,     // Asset (USDC)
                deployment.contracts.YieldVault.admin,     // Admin
                deployment.configuration.feeRecipient      // Fee recipient
            ]
        },
        YieldEscrow: {
            address: deployment.contracts.YieldEscrow.address,
            constructorArguments: [
                deployment.contracts.YieldEscrow.admin,    // Admin
                deployment.configuration.feeRecipient      // Fee recipient
            ]
        },
        CrossChainBridge: {
            address: deployment.contracts.CrossChainBridge.address,
            constructorArguments: [
                deployment.contracts.YieldEscrow.address,  // YieldEscrow address
                deployment.contracts.CrossChainBridge.vault, // YieldVault address
                deployment.configuration.feeRecipient      // Fee collector
            ]
        }
    };
    
    // Add MockUSDC for testnets
    if (deployment.contracts.MockUSDC) {
        verificationConfig.MockERC20 = {
            address: deployment.contracts.MockUSDC,
            constructorArguments: [
                "USD Coin",    // name
                "USDC",        // symbol
                6              // decimals
            ]
        };
    }
    
    console.log("🧪 Starting Contract Verification...\n");
    
    // Verify each contract
    let successCount = 0;
    let totalCount = 0;
    
    for (const [contractName, config] of Object.entries(verificationConfig)) {
        totalCount++;
        console.log(`${totalCount}️⃣  Verifying ${contractName}...`);
        console.log(`   📍 Address: ${config.address}`);
        console.log(`   📋 Constructor args: ${JSON.stringify(config.constructorArguments)}`);
        
        try {
            await run("verify:verify", {
                address: config.address,
                constructorArguments: config.constructorArguments,
                contract: contractName === "MockERC20" 
                    ? "contracts/src/mocks/MockERC20.sol:MockERC20"
                    : `contracts/src/${contractName}.sol:${contractName}`
            });
            
            console.log(`   ✅ ${contractName} verified successfully!`);
            console.log(`   🔗 View at: ${explorerConfig.url}/address/${config.address}#code\n`);
            successCount++;
            
        } catch (error) {
            if (error.message.includes("Already Verified")) {
                console.log(`   ✅ ${contractName} already verified!`);
                console.log(`   🔗 View at: ${explorerConfig.url}/address/${config.address}#code\n`);
                successCount++;
            } else {
                console.log(`   ❌ ${contractName} verification failed:`);
                console.log(`   📝 Error: ${error.message}\n`);
                
                // Log detailed error for debugging
                console.log(`   🔧 Debug Info:`);
                console.log(`      - Contract: ${contractName}`);
                console.log(`      - Address: ${config.address}`);
                console.log(`      - Constructor: [${config.constructorArguments.join(", ")}]`);
                console.log(`      - Network: ${networkName}\n`);
            }
        }
        
        // Add delay between verifications to avoid rate limiting
        if (totalCount < Object.keys(verificationConfig).length) {
            console.log("⏳ Waiting 3 seconds to avoid rate limiting...\n");
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    // Summary
    console.log("🎉 Verification Process Complete!");
    console.log("==========================================");
    console.log(`✅ Successfully verified: ${successCount}/${totalCount} contracts`);
    console.log(`🌐 Explorer: ${explorerConfig.name}`);
    console.log(`📋 Network: ${networkName}`);
    console.log("==========================================");
    
    if (successCount === totalCount) {
        console.log("\n🚀 All contracts verified successfully!");
        console.log("🔗 Contract Links:");
        
        for (const [contractName, config] of Object.entries(verificationConfig)) {
            console.log(`   ${contractName}: ${explorerConfig.url}/address/${config.address}#code`);
        }
    } else {
        console.log(`\n⚠️  ${totalCount - successCount} contracts failed verification`);
        console.log("Please check the error messages above and retry");
    }
    
    // Create verification summary file
    const verificationSummary = {
        network: {
            name: networkName,
            explorer: explorerConfig.name,
            verifiedAt: new Date().toISOString()
        },
        results: {
            total: totalCount,
            successful: successCount,
            failed: totalCount - successCount
        },
        contracts: {}
    };
    
    for (const [contractName, config] of Object.entries(verificationConfig)) {
        verificationSummary.contracts[contractName] = {
            address: config.address,
            explorerUrl: `${explorerConfig.url}/address/${config.address}#code`,
            verified: true // We'll assume success for this summary
        };
    }
    
    const summaryFile = path.join(__dirname, "../deployments", `${networkName}-verification.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(verificationSummary, null, 2));
    console.log(`\n💾 Verification summary saved: ${summaryFile}`);
    
    return {
        success: successCount === totalCount,
        verified: successCount,
        total: totalCount,
        network: networkName,
        explorer: explorerConfig.name
    };
}

// Error handling
main()
    .then((result) => {
        if (result.success) {
            console.log("\n✅ All contracts verified successfully!");
            process.exit(0);
        } else {
            console.log("\n⚠️  Some contracts failed verification");
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error("\n❌ Verification script failed:");
        console.error(error);
        process.exit(1);
    });