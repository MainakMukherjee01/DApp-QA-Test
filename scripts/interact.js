const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
	console.log("🔄 Starting contract interaction...\n");

	// Try to load deployment info
	let contractAddress;
	try {
		const deploymentPath = path.join(
			__dirname,
			"..",
			"frontend",
			"deployment.json"
		);
		const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
		contractAddress = deploymentInfo.contractAddress;
		console.log(
			"📄 Loaded contract address from deployment.json:",
			contractAddress
		);
	} catch (error) {
		console.log(
			"⚠️  Could not load deployment info. Please provide contract address manually."
		);
		console.log(
			"Usage: CONTRACT_ADDRESS=0x... npx hardhat run scripts/interact.js --network localhost"
		);

		contractAddress = process.env.CONTRACT_ADDRESS;
		if (!contractAddress) {
			console.error("❌ No contract address provided. Exiting.");
			process.exit(1);
		}
	}

	// Get signers
	const [owner, user1, user2] = await ethers.getSigners();
	console.log("👤 Interacting as owner:", owner.address);
	console.log("👤 Additional users:", user1.address, user2.address);

	// Connect to the deployed contract
	const SimpleStorage = await ethers.getContractFactory("SimpleStorage");
	const simpleStorage = SimpleStorage.attach(contractAddress);

	console.log("\n🔍 Initial contract state:");
	const initialInfo = await simpleStorage.getStorageInfo();
	console.log("   - Value:", initialInfo[0].toString());
	console.log("   - Owner:", initialInfo[1]);
	console.log(
		"   - Last Updated:",
		new Date(Number(initialInfo[2]) * 1000).toLocaleString()
	);

	console.log("\n🎯 Performing contract interactions...");

	try {
		// Test 1: Increment value
		console.log("\n1️⃣ Testing increment function...");
		const tx1 = await simpleStorage.increment();
		await tx1.wait();
		const newValue1 = await simpleStorage.getValue();
		console.log("   ✅ Value after increment:", newValue1.toString());

		// Test 2: Add value
		console.log("\n2️⃣ Testing addValue function...");
		const tx2 = await simpleStorage.addValue(10);
		await tx2.wait();
		const newValue2 = await simpleStorage.getValue();
		console.log("   ✅ Value after adding 10:", newValue2.toString());

		// Test 3: Set value (owner only)
		console.log("\n3️⃣ Testing setValue function (owner only)...");
		const tx3 = await simpleStorage.setValue(100);
		await tx3.wait();
		const newValue3 = await simpleStorage.getValue();
		console.log("   ✅ Value after setValue(100):", newValue3.toString());

		// Test 4: Try setValue with non-owner (should fail)
		console.log("\n4️⃣ Testing setValue with non-owner (should fail)...");
		try {
			const simpleStorageAsUser = simpleStorage.connect(user1);
			await simpleStorageAsUser.setValue(200);
			console.log("   ❌ ERROR: Non-owner was able to set value!");
		} catch (error) {
			console.log("   ✅ Correctly rejected non-owner setValue attempt");
			console.log("   📝 Error:", error.message.split("(")[0]);
		}

		// Test 5: Decrement
		console.log("\n5️⃣ Testing decrement function...");
		const tx5 = await simpleStorage.decrement();
		await tx5.wait();
		const newValue5 = await simpleStorage.getValue();
		console.log("   ✅ Value after decrement:", newValue5.toString());

		// Test 6: Reset (owner only)
		console.log("\n6️⃣ Testing reset function...");
		const tx6 = await simpleStorage.reset();
		await tx6.wait();
		const newValue6 = await simpleStorage.getValue();
		console.log("   ✅ Value after reset:", newValue6.toString());

		// Test 7: Listen to events
		console.log("\n7️⃣ Testing event emission...");
		console.log("   🎧 Setting up event listener...");

		simpleStorage.on("ValueChanged", (oldValue, newValue, updatedBy, event) => {
			console.log("   📡 ValueChanged event received:");
			console.log("      - Old Value:", oldValue.toString());
			console.log("      - New Value:", newValue.toString());
			console.log("      - Updated By:", updatedBy);
		});

		// Trigger an event
		const tx7 = await simpleStorage.setValue(777);
		await tx7.wait();

		// Wait a bit for event processing
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Final state
		console.log("\n📊 Final contract state:");
		const finalInfo = await simpleStorage.getStorageInfo();
		console.log("   - Final Value:", finalInfo[0].toString());
		console.log("   - Owner:", finalInfo[1]);
		console.log(
			"   - Last Updated:",
			new Date(Number(finalInfo[2]) * 1000).toLocaleString()
		);

		console.log("\n✅ All interactions completed successfully!");
	} catch (error) {
		console.error("❌ Error during interactions:");
		console.error(error.message);
	}

	// Clean up event listeners
	simpleStorage.removeAllListeners();
}

main()
	.then(() => {
		console.log("\n🎉 Interaction script completed!");
		process.exit(0);
	})
	.catch((error) => {
		console.error("❌ Script failed:");
		console.error(error);
		process.exit(1);
	});
