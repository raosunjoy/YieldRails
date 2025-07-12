const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * YieldRails Smart Contract Deployment Script
 * Deploys YieldEscrow, YieldVault, and CrossChainBridge contracts
 */

// Deployment configuration for different networks
const DEPLOYMENT_CONFIG = {
    sepolia: {
        chainId: 11155111,
        usdc: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", // USDC on Sepolia
        admin: "0x742d35Cc6634C0532925a3b8D0A79D1Ebbf3b7d0", // Replace with actual admin
        feeRecipient: "0x742d35Cc6634C0532925a3b8D0A79D1Ebbf3b7d0",
        supportedChains: [1, 137, 42161, 8453], // Ethereum, Polygon, Arbitrum, Base
        bridgeFee: 10 // 0.1% in basis points
    },
    mumbai: {
        chainId: 80001,
        usdc: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC on Mumbai
        admin: "0x742d35Cc6634C0532925a3b8D0A79D1Ebbf3b7d0",
        feeRecipient: "0x742d35Cc6634C0532925a3b8D0A79D1Ebbf3b7d0",
        supportedChains: [11155111, 1, 42161, 8453], // Sepolia, Ethereum, Arbitrum, Base
        bridgeFee: 10
    },
    arbitrumSepolia: {
        chainId: 421614,
        usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // USDC on Arbitrum Sepolia
        admin: "0x742d35Cc6634C0532925a3b8D0A79D1Ebbf3b7d0",
        feeRecipient: "0x742d35Cc6634C0532925a3b8D0A79D1Ebbf3b7d0",
        supportedChains: [11155111, 80001, 1, 137], // Sepolia, Mumbai, Ethereum, Polygon
        bridgeFee: 10
    }
};

async function main() {
    console.log("🚀 Starting YieldRails Contract Deployment...\n");
    
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const networkName = network.name === "unknown" ? "localhost" : network.name;
    
    console.log(`📡 Network: ${networkName} (Chain ID: ${network.chainId})`);
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);
    
    // Get network configuration
    const config = DEPLOYMENT_CONFIG[networkName] || {
        chainId: Number(network.chainId),
        usdc: "0x0000000000000000000000000000000000000000", // Placeholder for localhost
        admin: deployer.address,
        feeRecipient: deployer.address,
        supportedChains: [1, 137, 42161, 8453],
        bridgeFee: 10
    };
    
    console.log("📋 Deployment Configuration:");
    console.log(`   Admin: ${config.admin}`);
    console.log(`   Fee Recipient: ${config.feeRecipient}`);
    console.log(`   USDC Address: ${config.usdc}`);
    console.log(`   Bridge Fee: ${config.bridgeFee} basis points\n`);
    
    // Deploy Mock USDC for localhost testing
    let usdcAddress = config.usdc;
    if (networkName === "localhost" || networkName === "hardhat") {
        console.log("🪙 Deploying Mock USDC for testing...");
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const mockUsdc = await MockERC20.deploy(
            "USD Coin",    // name
            "USDC",        // symbol
            6              // decimals
        );
        await mockUsdc.waitForDeployment();
        usdcAddress = await mockUsdc.getAddress();
        console.log(`   ✅ Mock USDC deployed to: ${usdcAddress}\n`);
    }
    
    // Deploy YieldVault
    console.log("🏦 Deploying YieldVault...");
    const YieldVault = await ethers.getContractFactory("YieldVault");
    const yieldVault = await YieldVault.deploy(
        usdcAddress,           // Asset (USDC)
        config.admin,          // Admin
        config.feeRecipient    // Fee recipient
    );
    await yieldVault.waitForDeployment();
    const vaultAddress = await yieldVault.getAddress();
    console.log(`   ✅ YieldVault deployed to: ${vaultAddress}`);
    
    // Deploy YieldEscrow
    console.log("📦 Deploying YieldEscrow...");
    const YieldEscrow = await ethers.getContractFactory("YieldEscrow");
    const yieldEscrow = await YieldEscrow.deploy(
        config.admin,          // Admin
        config.feeRecipient    // Fee recipient
    );
    await yieldEscrow.waitForDeployment();
    const escrowAddress = await yieldEscrow.getAddress();
    console.log(`   ✅ YieldEscrow deployed to: ${escrowAddress}`);
    
    // Deploy CrossChainBridge
    console.log("🌉 Deploying CrossChainBridge...");
    const CrossChainBridge = await ethers.getContractFactory("CrossChainBridge");
    const crossChainBridge = await CrossChainBridge.deploy(
        escrowAddress,         // YieldEscrow address
        vaultAddress,          // YieldVault address
        config.feeRecipient    // Fee collector
    );
    await crossChainBridge.waitForDeployment();
    const bridgeAddress = await crossChainBridge.getAddress();
    console.log(`   ✅ CrossChainBridge deployed to: ${bridgeAddress}`);
    
    // Configure contracts
    console.log("\n⚙️  Configuring contracts...");
    
    // Add USDC as supported token to YieldEscrow
    console.log("   Adding USDC as supported token...");
    await yieldEscrow.addSupportedToken(usdcAddress, "USDC");
    console.log("   ✅ USDC added to YieldEscrow");
    
    // Add supported chains to CrossChainBridge
    console.log("   Adding supported chains to bridge...");
    for (const chainId of config.supportedChains) {
        try {
            await crossChainBridge.addSupportedChain(chainId);
            console.log(`   ✅ Chain ${chainId} added to bridge`);
        } catch (error) {
            console.log(`   ⚠️  Chain ${chainId} may already be supported`);
        }
    }
    
    // Add USDC as supported token to CrossChainBridge
    console.log("   Adding USDC as supported token to bridge...");
    await crossChainBridge.addSupportedToken(usdcAddress);
    console.log("   ✅ USDC added to CrossChainBridge");
    
    // Create deployment summary
    const deploymentSummary = {
        network: {
            name: networkName,
            chainId: Number(network.chainId),
            deployedAt: new Date().toISOString()
        },
        deployer: {
            address: deployer.address,
            balance: ethers.formatEther(await ethers.provider.getBalance(deployer.address))
        },
        contracts: {
            YieldVault: {
                address: vaultAddress,
                admin: config.admin,
                asset: usdcAddress
            },
            YieldEscrow: {
                address: escrowAddress,
                vault: vaultAddress,
                admin: config.admin
            },
            CrossChainBridge: {
                address: bridgeAddress,
                vault: vaultAddress,
                admin: config.admin,
                bridgeFee: config.bridgeFee
            },
            MockUSDC: networkName === "localhost" || networkName === "hardhat" ? usdcAddress : null
        },
        configuration: {
            supportedTokens: [usdcAddress],
            supportedChains: config.supportedChains,
            feeRecipient: config.feeRecipient
        }
    };
    
    // Save deployment data
    const deploymentDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
    }
    
    const deploymentFile = path.join(deploymentDir, `${networkName}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentSummary, null, 2));
    
    console.log("\n🎉 Deployment Complete!");
    console.log("==========================================");
    console.log(`📄 YieldVault:        ${vaultAddress}`);
    console.log(`📦 YieldEscrow:       ${escrowAddress}`);
    console.log(`🌉 CrossChainBridge:  ${bridgeAddress}`);
    if (deploymentSummary.contracts.MockUSDC) {
        console.log(`🪙 Mock USDC:         ${usdcAddress}`);
    }
    console.log(`💾 Deployment saved:  ${deploymentFile}`);
    console.log("==========================================");
    
    console.log("\n📋 Next Steps:");
    console.log("1. Verify contracts on block explorer");
    console.log("2. Set up monitoring and alerts");
    console.log("3. Configure frontend with contract addresses");
    console.log("4. Run integration tests");
    
    return deploymentSummary;
}

// Error handling
main()
    .then((summary) => {
        console.log("\n✅ Deployment script completed successfully!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Deployment failed:");
        console.error(error);
        process.exit(1);
    });