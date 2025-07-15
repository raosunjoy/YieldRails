const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("Checking balance for deployer:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    const balanceInEth = ethers.formatEther(balance);
    
    console.log("Balance:", balanceInEth, "ETH");
    
    // Check if we have enough for deployment (minimum 0.1 ETH recommended)
    const minRequired = ethers.parseEther("0.1");
    if (balance >= minRequired) {
        console.log("✅ Sufficient balance for deployment");
    } else {
        console.log("❌ Insufficient balance. Need at least 0.1 ETH for deployment");
        console.log("Please get testnet funds from faucets");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });