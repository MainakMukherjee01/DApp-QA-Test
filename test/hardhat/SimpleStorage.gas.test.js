const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("SimpleStorage Gas Analysis", function () {
	// Fixture to deploy the contract
	async function deploySimpleStorageFixture() {
		const [owner, otherAccount] = await ethers.getSigners();

		const SimpleStorage = await ethers.getContractFactory("SimpleStorage");
		const simpleStorage = await SimpleStorage.deploy(42);

		return { simpleStorage, owner, otherAccount };
	}

	describe("Deployment Gas Costs", function () {
		it("Should track deployment gas usage", async function () {
			const SimpleStorage = await ethers.getContractFactory("SimpleStorage");

			const deployTx = await SimpleStorage.deploy(42);
			const receipt = await deployTx.deploymentTransaction().wait();

			console.log(`\n📊 Deployment Gas Analysis:`);
			console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
			console.log(`   Gas Price: ${receipt.gasPrice.toString()}`);
			console.log(
				`   Total Cost: ${ethers.formatEther(
					receipt.gasUsed * receipt.gasPrice
				)} ETH`
			);

			// Reasonable gas usage expectations
			expect(receipt.gasUsed).to.be.lt(2500000); // Less than 2.5M gas
			expect(receipt.gasUsed).to.be.gt(100000); // More than 100K gas
		});

		it("Should compare gas usage with different initial values", async function () {
			const SimpleStorage = await ethers.getContractFactory("SimpleStorage");

			const deployTx1 = await SimpleStorage.deploy(0);
			const receipt1 = await deployTx1.deploymentTransaction().wait();

			const deployTx2 = await SimpleStorage.deploy(999999);
			const receipt2 = await deployTx2.deploymentTransaction().wait();

			console.log(`\n📊 Initial Value Gas Comparison:`);
			console.log(`   Deploy with 0: ${receipt1.gasUsed.toString()} gas`);
			console.log(`   Deploy with 999999: ${receipt2.gasUsed.toString()} gas`);
			console.log(
				`   Difference: ${(receipt2.gasUsed - receipt1.gasUsed).toString()} gas`
			);

			// Gas usage should be similar regardless of initial value
			expect(Math.abs(Number(receipt2.gasUsed - receipt1.gasUsed))).to.be.lt(
				25000
			);
		});
	});

	describe("Function Gas Costs", function () {
		it("Should analyze getValue gas cost", async function () {
			const { simpleStorage } = await loadFixture(deploySimpleStorageFixture);

			const tx = await simpleStorage.getValue.staticCall();
			// Note: View functions don't consume gas when called statically
			console.log(
				`\n📊 getValue result: ${tx.toString()} (view function - no gas cost)`
			);
		});

		it("Should analyze increment gas cost", async function () {
			const { simpleStorage } = await loadFixture(deploySimpleStorageFixture);

			const tx = await simpleStorage.increment();
			const receipt = await tx.wait();

			console.log(`\n📊 increment() Gas Analysis:`);
			console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
			console.log(`   Gas Price: ${receipt.gasPrice.toString()}`);

			expect(receipt.gasUsed).to.be.lt(100000); // Should be relatively cheap
		});

		it("Should analyze setValue gas cost", async function () {
			const { simpleStorage, owner } = await loadFixture(
				deploySimpleStorageFixture
			);

			const tx = await simpleStorage.connect(owner).setValue(100);
			const receipt = await tx.wait();

			console.log(`\n📊 setValue() Gas Analysis:`);
			console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
			console.log(`   Gas Price: ${receipt.gasPrice.toString()}`);

			expect(receipt.gasUsed).to.be.lt(100000);
		});

		it("Should analyze addValue gas cost", async function () {
			const { simpleStorage } = await loadFixture(deploySimpleStorageFixture);

			const tx = await simpleStorage.addValue(25);
			const receipt = await tx.wait();

			console.log(`\n📊 addValue() Gas Analysis:`);
			console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
			console.log(`   Gas Price: ${receipt.gasPrice.toString()}`);

			expect(receipt.gasUsed).to.be.lt(100000);
		});

		it("Should analyze decrement gas cost", async function () {
			const { simpleStorage } = await loadFixture(deploySimpleStorageFixture);

			const tx = await simpleStorage.decrement();
			const receipt = await tx.wait();

			console.log(`\n📊 decrement() Gas Analysis:`);
			console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
			console.log(`   Gas Price: ${receipt.gasPrice.toString()}`);

			expect(receipt.gasUsed).to.be.lt(100000);
		});

		it("Should analyze transferOwnership gas cost", async function () {
			const { simpleStorage, owner, otherAccount } = await loadFixture(
				deploySimpleStorageFixture
			);

			const tx = await simpleStorage
				.connect(owner)
				.transferOwnership(otherAccount.address);
			const receipt = await tx.wait();

			console.log(`\n📊 transferOwnership() Gas Analysis:`);
			console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
			console.log(`   Gas Price: ${receipt.gasPrice.toString()}`);

			expect(receipt.gasUsed).to.be.lt(100000);
		});

		it("Should analyze reset gas cost", async function () {
			const { simpleStorage, owner } = await loadFixture(
				deploySimpleStorageFixture
			);

			const tx = await simpleStorage.connect(owner).reset();
			const receipt = await tx.wait();

			console.log(`\n📊 reset() Gas Analysis:`);
			console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
			console.log(`   Gas Price: ${receipt.gasPrice.toString()}`);

			expect(receipt.gasUsed).to.be.lt(100000);
		});
	});

	describe("Gas Optimization Analysis", function () {
		it("Should compare gas costs of different operations", async function () {
			const { simpleStorage, owner } = await loadFixture(
				deploySimpleStorageFixture
			);

			// Test increment
			const incrementTx = await simpleStorage.increment();
			const incrementReceipt = await incrementTx.wait();

			// Test setValue
			const setValueTx = await simpleStorage.connect(owner).setValue(100);
			const setValueReceipt = await setValueTx.wait();

			// Test addValue
			const addValueTx = await simpleStorage.addValue(5);
			const addValueReceipt = await addValueTx.wait();

			console.log(`\n📊 Gas Cost Comparison:`);
			console.log(`   increment(): ${incrementReceipt.gasUsed.toString()} gas`);
			console.log(`   setValue(): ${setValueReceipt.gasUsed.toString()} gas`);
			console.log(`   addValue(): ${addValueReceipt.gasUsed.toString()} gas`);

			// Increment should generally be cheaper than setValue due to fewer checks
			expect(incrementReceipt.gasUsed).to.be.lte(setValueReceipt.gasUsed);
		});

		it("Should analyze gas impact of event emissions", async function () {
			const { simpleStorage } = await loadFixture(deploySimpleStorageFixture);

			// All state-changing functions emit events, so we can't easily compare
			// But we can ensure events don't make gas costs excessive
			const tx = await simpleStorage.increment();
			const receipt = await tx.wait();

			// Check that events were emitted
			expect(receipt.logs.length).to.be.gt(0);

			console.log(`\n📊 Event Emission Analysis:`);
			console.log(`   Events emitted: ${receipt.logs.length}`);
			console.log(`   Gas used with events: ${receipt.gasUsed.toString()}`);

			// Gas should still be reasonable even with events
			expect(receipt.gasUsed).to.be.lt(100000);
		});

		it("Should analyze gas costs with storage changes", async function () {
			const { simpleStorage, owner } = await loadFixture(
				deploySimpleStorageFixture
			);

			// First write to storage (should be more expensive)
			const firstWriteTx = await simpleStorage.connect(owner).setValue(200);
			const firstWriteReceipt = await firstWriteTx.wait();

			// Second write to same storage slot (should be cheaper)
			const secondWriteTx = await simpleStorage.connect(owner).setValue(300);
			const secondWriteReceipt = await secondWriteTx.wait();

			console.log(`\n📊 Storage Write Analysis:`);
			console.log(
				`   First write: ${firstWriteReceipt.gasUsed.toString()} gas`
			);
			console.log(
				`   Second write: ${secondWriteReceipt.gasUsed.toString()} gas`
			);
			console.log(
				`   Difference: ${(
					firstWriteReceipt.gasUsed - secondWriteReceipt.gasUsed
				).toString()} gas`
			);

			// Both writes should have similar costs in this case since we're not going from 0 to non-zero
			expect(
				Math.abs(Number(firstWriteReceipt.gasUsed - secondWriteReceipt.gasUsed))
			).to.be.lt(5000);
		});

		it("Should provide gas usage summary", async function () {
			const { simpleStorage, owner, otherAccount } = await loadFixture(
				deploySimpleStorageFixture
			);

			const operations = [];

			// Test each operation
			let tx, receipt;

			tx = await simpleStorage.increment();
			receipt = await tx.wait();
			operations.push({ name: "increment", gas: receipt.gasUsed });

			tx = await simpleStorage.decrement();
			receipt = await tx.wait();
			operations.push({ name: "decrement", gas: receipt.gasUsed });

			tx = await simpleStorage.addValue(10);
			receipt = await tx.wait();
			operations.push({ name: "addValue", gas: receipt.gasUsed });

			tx = await simpleStorage.connect(owner).setValue(500);
			receipt = await tx.wait();
			operations.push({ name: "setValue", gas: receipt.gasUsed });

			tx = await simpleStorage.connect(owner).reset();
			receipt = await tx.wait();
			operations.push({ name: "reset", gas: receipt.gasUsed });

			tx = await simpleStorage
				.connect(owner)
				.transferOwnership(otherAccount.address);
			receipt = await tx.wait();
			operations.push({ name: "transferOwnership", gas: receipt.gasUsed });

			// Sort by gas usage
			operations.sort((a, b) => Number(a.gas - b.gas));

			console.log(`\n📊 Gas Usage Summary (sorted by cost):`);
			console.log(`   ${"Operation".padEnd(20)} | Gas Used`);
			console.log(`   ${"-".repeat(20)} | ${"-".repeat(10)}`);

			operations.forEach((op) => {
				console.log(`   ${op.name.padEnd(20)} | ${op.gas.toString()}`);
			});

			// Verify all operations are reasonable
			operations.forEach((op) => {
				expect(op.gas).to.be.lt(100000);
				expect(op.gas).to.be.gt(20000); // Should have some minimum cost
			});
		});
	});

	describe("Failed Transaction Gas Analysis", function () {
		it("Should analyze gas usage of failed transactions", async function () {
			const { simpleStorage, otherAccount } = await loadFixture(
				deploySimpleStorageFixture
			);

			try {
				// This should fail - non-owner trying to setValue
				const tx = await simpleStorage.connect(otherAccount).setValue(100);
				await tx.wait();

				// Should not reach here
				expect.fail("Transaction should have failed");
			} catch (error) {
				console.log(`\n📊 Failed Transaction Analysis:`);
				console.log(`   Error: ${error.message.split("(")[0]}`);
				console.log(`   Gas estimation failed as expected`);

				// Verify the error is what we expect
				expect(error.message).to.include("Not the owner");
			}
		});

		it("Should analyze gas for value validation failures", async function () {
			const { simpleStorage, owner } = await loadFixture(
				deploySimpleStorageFixture
			);

			try {
				// This should fail - value too large
				const tx = await simpleStorage.connect(owner).setValue(1000000);
				await tx.wait();

				expect.fail("Transaction should have failed");
			} catch (error) {
				console.log(`\n📊 Validation Failure Analysis:`);
				console.log(`   Error: ${error.message.split("(")[0]}`);

				expect(error.message).to.include("Value too large");
			}
		});
	});
});
