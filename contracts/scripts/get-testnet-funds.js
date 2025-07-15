const { ethers } = require("hardhat");

/**
 * Testnet Funding Helper Script
 * Provides instructions and links for getting testnet funds
 */

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("🪙 YieldRails Testnet Funding Guide");
    console.log("=====================================\n");
    
    console.log(`📍 Deployer Address: ${deployer.address}`);
    console.log("Copy this address to request testnet funds from faucets below:\n");
    
    console.log("🌐 TESTNET FAUCETS:");
    console.log("==================");
    
    console.log("\n1. 🔵 SEPOLIA (Ethereum Testnet)");
    console.log("   • Chainlink Faucet (BEST - 0.5 ETH): https://faucets.chain.link/sepolia");
    console.log("   • Sepolia Faucet: https://sepoliafaucet.com/");
    console.log("   • Alchemy Faucet: https://sepoliafaucet.com/");
    console.log("   • Required: 0.1 ETH minimum");
    
    console.log("\n2. 🟣 MUMBAI (Polygon Testnet)");
    console.log("   • Official Polygon Faucet: https://faucet.polygon.technology/");
    console.log("   • Alchemy Faucet: https://mumbaifaucet.com/");
    console.log("   • Required: 5 MATIC minimum");
    
    console.log("\n3. 🔴 ARBITRUM SEPOLIA");
    console.log("   • Arbitrum Bridge: https://bridge.arbitrum.io/");
    console.log("   • Chainlink Faucet: https://faucets.chain.link/arbitrum-sepolia");
    console.log("   • Required: 0.05 ETH minimum");
    
    console.log("\n4. 🔵 BASE SEPOLIA");
    console.log("   • Coinbase Faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet");
    console.log("   • Required: 0.05 ETH minimum");
    
    console.log("\n📋 FUNDING CHECKLIST:");
    console.log("=====================");
    console.log("□ Get 0.1+ ETH on Sepolia");
    console.log("□ Get 5+ MATIC on Mumbai");
    console.log("□ Get 0.05+ ETH on Arbitrum Sepolia");
    console.log("□ Get 0.05+ ETH on Base Sepolia");
    
    console.log("\n🚀 DEPLOYMENT COMMANDS:");
    console.log("=======================");
    console.log("After getting funds, run these commands:");
    console.log("");
    console.log("# Deploy to Sepolia");
    console.log("npx hardhat run scripts/deploy-optimized.js --network sepolia");
    console.log("");
    console.log("# Deploy to Mumbai");
    console.log("npx hardhat run scripts/deploy-optimized.js --network mumbai");
    console.log("");
    console.log("# Deploy to Arbitrum Sepolia");
    console.log("npx hardhat run scripts/deploy-optimized.js --network arbitrumSepolia");
    console.log("");
    console.log("# Deploy to Base Sepolia");
    console.log("npx hardhat run scripts/deploy-optimized.js --network baseSepolia");
    
    console.log("\n🔍 VERIFICATION COMMANDS:");
    console.log("=========================");
    console.log("After deployment, verify contracts:");
    console.log("");
    console.log("# Verify on all networks");
    console.log("npx hardhat run scripts/verify-contracts.js --network sepolia");
    console.log("npx hardhat run scripts/verify-contracts.js --network mumbai");
    console.log("npx hardhat run scripts/verify-contracts.js --network arbitrumSepolia");
    console.log("npx hardhat run scripts/verify-contracts.js --network baseSepolia");
    
    console.log("\n💡 TIPS:");
    console.log("========");
    console.log("• Use Chainlink faucets first - they provide the most ETH");
    console.log("• Some faucets require social media verification");
    console.log("• Keep some extra funds for contract interactions and testing");
    console.log("• Deployment takes 2-5 minutes per network");
    console.log("• Verification can take 30-60 seconds after deployment");
    
    console.log("\n📞 SUPPORT:");
    console.log("===========");
    console.log("• Chainlink Discord: https://discord.gg/chainlink");
    console.log("• Polygon Support: https://support.polygon.technology/");
    console.log("• Arbitrum Discord: https://discord.gg/arbitrum");
    console.log("• Base Discord: https://discord.gg/buildonbase");
    
    console.log("\n✅ Ready to deploy once you have testnet funds!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });