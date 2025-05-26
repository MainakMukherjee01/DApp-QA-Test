const { ethers } = require("hardhat");

async function main() {
	console.log("🚀 Starting deployment process...\n");

	// Get the deployer account
	const [deployer] = await ethers.getSigners();
	console.log("📝 Deploying contracts with account:", deployer.address);

	// Check deployer balance
	const balance = await ethers.provider.getBalance(deployer.address);
	console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

	// Deploy the contract
	console.log("📦 Deploying SimpleStorage contract...");
	const initialValue = 42; // Starting value

	const SimpleStorage = await ethers.getContractFactory("SimpleStorage");
	const simpleStorage = await SimpleStorage.deploy(initialValue);

	await simpleStorage.waitForDeployment();

	const contractAddress = await simpleStorage.getAddress();
	console.log("✅ SimpleStorage deployed to:", contractAddress);
	console.log("🔢 Initial value set to:", initialValue);

	// Verify deployment
	console.log("\n🔍 Verifying deployment...");
	const deployedValue = await simpleStorage.getValue();
	const owner = await simpleStorage.owner();

	console.log("✅ Contract verification successful!");
	console.log("   - Stored value:", deployedValue.toString());
	console.log("   - Contract owner:", owner);
	console.log("   - Owner matches deployer:", owner === deployer.address);

	// Display deployment summary
	console.log("\n" + "=".repeat(50));
	console.log("📋 DEPLOYMENT SUMMARY");
	console.log("=".repeat(50));
	console.log(`Contract Address: ${contractAddress}`);
	console.log(`Network: ${hre.network.name}`);
	console.log(`Initial Value: ${initialValue}`);
	console.log(`Owner: ${owner}`);
	console.log(`Gas Used: Check transaction receipt`);
	console.log("=".repeat(50));

	// Save deployment info for frontend
	const deploymentInfo = {
		contractAddress,
		network: hre.network.name,
		deployer: deployer.address,
		initialValue,
		deploymentTime: new Date().toISOString(),
	};

	const fs = require("fs");
	const path = require("path");

	// Ensure frontend directory exists
	const frontendDir = path.join(__dirname, "..", "frontend");
	if (!fs.existsSync(frontendDir)) {
		fs.mkdirSync(frontendDir, { recursive: true });
	}

	// Save deployment info
	fs.writeFileSync(
		path.join(frontendDir, "deployment.json"),
		JSON.stringify(deploymentInfo, null, 2)
	);

	console.log("💾 Deployment info saved to frontend/deployment.json");

	return { simpleStorage, contractAddress, deployer };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error("❌ Deployment failed:");
		console.error(error);
		process.exit(1);
	});
