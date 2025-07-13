const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Optimized Contract Deployment Script
 * Deploys YieldEscrowOptimized for gas-efficient operations
 */

async function main() {
    console.log("🚀 Starting YieldRails Optimized Contract Deployment...\n");
    
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const networkName = network.name === "unknown" ? "localhost" : network.name;
    
    console.log(`📡 Network: ${networkName} (Chain ID: ${network.chainId})`);
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);
    
    // Deploy Mock USDC for testing
    console.log("🪙 Deploying Mock USDC for testing...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUsdc = await MockERC20.deploy(
        "USD Coin",    // name
        "USDC",        // symbol
        6              // decimals
    );
    await mockUsdc.waitForDeployment();
    const usdcAddress = await mockUsdc.getAddress();
    console.log(`   ✅ Mock USDC deployed to: ${usdcAddress}\n`);
    
    // Deploy YieldEscrowOptimized
    console.log("📦 Deploying YieldEscrowOptimized...");
    const YieldEscrowOptimized = await ethers.getContractFactory("YieldEscrowOptimized");
    const escrowOptimized = await YieldEscrowOptimized.deploy(
        deployer.address,      // Admin
        deployer.address       // Fee recipient
    );
    await escrowOptimized.waitForDeployment();
    const escrowAddress = await escrowOptimized.getAddress();
    console.log(`   ✅ YieldEscrowOptimized deployed to: ${escrowAddress}`);
    
    // Deploy YieldEscrowUltra
    console.log("⚡ Deploying YieldEscrowUltra...");
    const YieldEscrowUltra = await ethers.getContractFactory("YieldEscrowUltra");
    const escrowUltra = await YieldEscrowUltra.deploy();
    await escrowUltra.waitForDeployment();
    const ultraAddress = await escrowUltra.getAddress();
    console.log(`   ✅ YieldEscrowUltra deployed to: ${ultraAddress}`);
    
    // Configure contracts
    console.log("\n⚙️  Configuring contracts...");
    
    // Add USDC as supported token
    console.log("   Adding USDC as supported token...");
    await escrowOptimized.setSupportedToken(usdcAddress, true);
    await escrowUltra.setSupportedToken(usdcAddress, true);
    console.log("   ✅ USDC added to both contracts");
    
    // Test gas usage
    console.log("\n🧪 Testing gas usage...");
    
    // Mint USDC to deployer
    const depositAmount = ethers.parseUnits("100", 6); // 100 USDC
    await mockUsdc.mint(deployer.address, depositAmount * 10n);
    
    // Approve contracts
    await mockUsdc.approve(escrowAddress, depositAmount * 5n);
    await mockUsdc.approve(ultraAddress, depositAmount * 5n);
    
    // Test deposit gas usage
    const paymentHash1 = ethers.keccak256(ethers.toUtf8Bytes("test-payment-1"));
    const paymentHash2 = ethers.keccak256(ethers.toUtf8Bytes("test-payment-2"));
    
    console.log("   Testing YieldEscrowOptimized gas usage...");
    const tx1 = await escrowOptimized.createDeposit(
        depositAmount,
        usdcAddress,
        deployer.address,
        paymentHash1
    );
    const receipt1 = await tx1.wait();
    console.log(`   ✅ Optimized deposit gas: ${receipt1.gasUsed}`);
    
    console.log("   Testing YieldEscrowUltra gas usage...");
    const tx2 = await escrowUltra.createDeposit(
        depositAmount,
        usdcAddress,
        deployer.address,
        paymentHash2
    );
    const receipt2 = await tx2.wait();
    console.log(`   ✅ Ultra deposit gas: ${receipt2.gasUsed}`);
    
    // Calculate improvements
    const originalGas = 503368; // From our previous tests
    const optimizedImprovement = ((originalGas - Number(receipt1.gasUsed)) / originalGas * 100).toFixed(1);
    const ultraImprovement = ((originalGas - Number(receipt2.gasUsed)) / originalGas * 100).toFixed(1);
    
    console.log(`\n📊 Gas Optimization Results:`);
    console.log(`   Original YieldEscrow:    ${originalGas.toLocaleString()} gas`);
    console.log(`   Optimized Version:       ${Number(receipt1.gasUsed).toLocaleString()} gas (${optimizedImprovement}% improvement)`);
    console.log(`   Ultra Version:           ${Number(receipt2.gasUsed).toLocaleString()} gas (${ultraImprovement}% improvement)`);
    
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
            MockUSDC: {
                address: usdcAddress,
                symbol: "USDC",
                decimals: 6
            },
            YieldEscrowOptimized: {
                address: escrowAddress,
                admin: deployer.address,
                gasUsed: Number(receipt1.gasUsed),
                improvement: `${optimizedImprovement}%`
            },
            YieldEscrowUltra: {
                address: ultraAddress,
                gasUsed: Number(receipt2.gasUsed),
                improvement: `${ultraImprovement}%`
            }
        },
        gasOptimization: {
            original: originalGas,
            optimized: Number(receipt1.gasUsed),
            ultra: Number(receipt2.gasUsed),
            optimizedSavings: originalGas - Number(receipt1.gasUsed),
            ultraSavings: originalGas - Number(receipt2.gasUsed)
        }
    };
    
    // Save deployment data
    const deploymentDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
    }
    
    const deploymentFile = path.join(deploymentDir, `${networkName}-optimized.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentSummary, null, 2));
    
    console.log("\n🎉 Optimized Deployment Complete!");
    console.log("=============================================");
    console.log(`🪙 Mock USDC:             ${usdcAddress}`);
    console.log(`📦 YieldEscrowOptimized:  ${escrowAddress}`);
    console.log(`⚡ YieldEscrowUltra:      ${ultraAddress}`);
    console.log(`💾 Deployment saved:      ${deploymentFile}`);
    console.log("=============================================");
    
    console.log("\n📋 Next Steps:");
    console.log("1. Deploy to live testnets (Sepolia, Mumbai, Arbitrum)");
    console.log("2. Verify contracts on block explorers");
    console.log("3. Run verification scripts");
    console.log("4. Integrate with frontend dashboard");
    
    return deploymentSummary;
}

// Error handling
main()
    .then((summary) => {
        console.log("\n✅ Optimized deployment script completed successfully!");
        console.log(`\n🏆 Achievement: ${summary.gasOptimization.ultraSavings.toLocaleString()} gas saved per transaction!`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Deployment failed:");
        console.error(error);
        process.exit(1);
    });