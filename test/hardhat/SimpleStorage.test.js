const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("SimpleStorage", function () {
	// Fixture to deploy the contract
	async function deploySimpleStorageFixture() {
		const [owner, otherAccount, thirdAccount] = await ethers.getSigners();

		const SimpleStorage = await ethers.getContractFactory("SimpleStorage");
		const simpleStorage = await SimpleStorage.deploy(42);

		return { simpleStorage, owner, otherAccount, thirdAccount };
	}

	describe("Deployment", function () {
		it("Should set the right owner", async function () {
			const { simpleStorage, owner } = await loadFixture(
				deploySimpleStorageFixture
			);
			expect(await simpleStorage.owner()).to.equal(owner.address);
		});

		it("Should set the initial value", async function () {
			const { simpleStorage } = await loadFixture(deploySimpleStorageFixture);
			expect(await simpleStorage.getValue()).to.equal(42);
		});

		it("Should emit ValueChanged event on deployment", async function () {
			const SimpleStorage = await ethers.getContractFactory("SimpleStorage");
			const tx = await SimpleStorage.deploy(42);
			const receipt = await tx.deploymentTransaction().wait();

			// Find the ValueChanged event in the logs
			const event = receipt.logs
				.map((log) => {
					try {
						return SimpleStorage.interface.parseLog(log);
					} catch {
						return null;
					}
				})
				.find((e) => e && e.name === "ValueChanged");

			expect(event).to.not.be.undefined;
			expect(event.args.oldValue).to.equal(0);
			expect(event.args.newValue).to.equal(42);
			expect(event.args.updatedBy).to.match(/^0x[a-fA-F0-9]{40}$/);
		});

		it("Should set lastUpdated timestamp", async function () {
			const { simpleStorage } = await loadFixture(deploySimpleStorageFixture);
			const info = await simpleStorage.getStorageInfo();
			expect(info[2]).to.be.gt(0); // lastUpdated should be greater than 0
		});

		it("Should reject deployment with invalid initial value", async function () {
			const SimpleStorage = await ethers.getContractFactory("SimpleStorage");
			await expect(SimpleStorage.deploy(1000000)).to.be.revertedWith(
				"Value too large"
			);
		});
	});

	describe("Basic Operations", function () {
		it("Should return the correct value", async function () {
			const { simpleStorage } = await loadFixture(deploySimpleStorageFixture);
			expect(await simpleStorage.getValue()).to.equal(42);
		});

		it("Should increment the value", async function () {
			const { simpleStorage } = await loadFixture(deploySimpleStorageFixture);

			await simpleStorage.increment();
			expect(await simpleStorage.getValue()).to.equal(43);
		});

		it("Should decrement the value", async function () {
			const { simpleStorage } = await loadFixture(deploySimpleStorageFixture);

			await simpleStorage.decrement();
			expect(await simpleStorage.getValue()).to.equal(41);
		});

		it("Should add value", async function () {
			const { simpleStorage } = await loadFixture(deploySimpleStorageFixture);

			await simpleStorage.addValue(10);
			expect(await simpleStorage.getValue()).to.equal(52);
		});

		it("Should not decrement below zero", async function () {
			const { simpleStorage } = await loadFixture(deploySimpleStorageFixture);

			// First reset to 0
			await simpleStorage.reset();

			// Then try to decrement
			await expect(simpleStorage.decrement()).to.be.revertedWith(
				"Cannot decrement below zero"
			);
		});
	});

	describe("Owner Functions", function () {
		it("Should allow owner to set value", async function () {
			const { simpleStorage, owner } = await loadFixture(
				deploySimpleStorageFixture
			);

			await simpleStorage.connect(owner).setValue(100);
			expect(await simpleStorage.getValue()).to.equal(100);
		});

		it("Should not allow non-owner to set value", async function () {
			const { simpleStorage, otherAccount } = await loadFixture(
				deploySimpleStorageFixture
			);

			await expect(
				simpleStorage.connect(otherAccount).setValue(100)
			).to.be.revertedWith("Not the owner");
		});

		it("Should allow owner to reset value", async function () {
			const { simpleStorage, owner } = await loadFixture(
				deploySimpleStorageFixture
			);

			await simpleStorage.connect(owner).reset();
			expect(await simpleStorage.getValue()).to.equal(0);
		});

		it("Should not allow non-owner to reset", async function () {
			const { simpleStorage, otherAccount } = await loadFixture(
				deploySimpleStorageFixture
			);

			await expect(
				simpleStorage.connect(otherAccount).reset()
			).to.be.revertedWith("Not the owner");
		});
	});

	describe("Ownership Transfer", function () {
		it("Should transfer ownership", async function () {
			const { simpleStorage, owner, otherAccount } = await loadFixture(
				deploySimpleStorageFixture
			);

			await simpleStorage
				.connect(owner)
				.transferOwnership(otherAccount.address);
			expect(await simpleStorage.owner()).to.equal(otherAccount.address);
		});

		it("Should emit OwnershipTransferred event", async function () {
			const { simpleStorage, owner, otherAccount } = await loadFixture(
				deploySimpleStorageFixture
			);

			await expect(
				simpleStorage.connect(owner).transferOwnership(otherAccount.address)
			)
				.to.emit(simpleStorage, "OwnershipTransferred")
				.withArgs(owner.address, otherAccount.address);
		});

		it("Should not allow non-owner to transfer ownership", async function () {
			const { simpleStorage, otherAccount, thirdAccount } = await loadFixture(
				deploySimpleStorageFixture
			);

			await expect(
				simpleStorage
					.connect(otherAccount)
					.transferOwnership(thirdAccount.address)
			).to.be.revertedWith("Not the owner");
		});

		it("Should not allow transfer to zero address", async function () {
			const { simpleStorage, owner } = await loadFixture(
				deploySimpleStorageFixture
			);

			await expect(
				simpleStorage.connect(owner).transferOwnership(ethers.ZeroAddress)
			).to.be.revertedWith("Invalid address");
		});

		it("Should not allow transfer to same owner", async function () {
			const { simpleStorage, owner } = await loadFixture(
				deploySimpleStorageFixture
			);

			await expect(
				simpleStorage.connect(owner).transferOwnership(owner.address)
			).to.be.revertedWith("Already the owner");
		});
	});

	describe("Value Validation", function () {
		it("Should reject values that are too large", async function () {
			const { simpleStorage, owner } = await loadFixture(
				deploySimpleStorageFixture
			);

			await expect(
				simpleStorage.connect(owner).setValue(1000000)
			).to.be.revertedWith("Value too large");
		});

		it("Should reject increment when result would be too large", async function () {
			const { simpleStorage, owner } = await loadFixture(
				deploySimpleStorageFixture
			);

			// Set to maximum allowed value minus 1
			await simpleStorage.connect(owner).setValue(999998);

			// This should work (999998 -> 999999)
			await simpleStorage.increment();
			expect(await simpleStorage.getValue()).to.equal(999999);

			// This should fail (999999 + 1 = 1000000, which is too large)
			await expect(simpleStorage.increment()).to.be.revertedWith(
				"Value too large"
			);
		});

		it("Should reject addValue when result would be too large", async function () {
			const { simpleStorage, owner } = await loadFixture(
				deploySimpleStorageFixture
			);

			await simpleStorage.connect(owner).setValue(999990);

			await expect(simpleStorage.addValue(20)).to.be.revertedWith(
				"Value too large"
			);
		});
	});

	describe("Events", function () {
		it("Should emit ValueChanged on setValue", async function () {
			const { simpleStorage, owner } = await loadFixture(
				deploySimpleStorageFixture
			);

			await expect(simpleStorage.connect(owner).setValue(100))
				.to.emit(simpleStorage, "ValueChanged")
				.withArgs(42, 100, owner.address);
		});

		it("Should emit ValueChanged on increment", async function () {
			const { simpleStorage, otherAccount } = await loadFixture(
				deploySimpleStorageFixture
			);

			await expect(simpleStorage.connect(otherAccount).increment())
				.to.emit(simpleStorage, "ValueChanged")
				.withArgs(42, 43, otherAccount.address);
		});

		it("Should emit ValueChanged on decrement", async function () {
			const { simpleStorage, otherAccount } = await loadFixture(
				deploySimpleStorageFixture
			);

			await expect(simpleStorage.connect(otherAccount).decrement())
				.to.emit(simpleStorage, "ValueChanged")
				.withArgs(42, 41, otherAccount.address);
		});

		it("Should emit ValueChanged on addValue", async function () {
			const { simpleStorage, otherAccount } = await loadFixture(
				deploySimpleStorageFixture
			);

			await expect(simpleStorage.connect(otherAccount).addValue(25))
				.to.emit(simpleStorage, "ValueChanged")
				.withArgs(42, 67, otherAccount.address);
		});

		it("Should emit ValueChanged on reset", async function () {
			const { simpleStorage, owner } = await loadFixture(
				deploySimpleStorageFixture
			);

			await expect(simpleStorage.connect(owner).reset())
				.to.emit(simpleStorage, "ValueChanged")
				.withArgs(42, 0, owner.address);
		});
	});

	describe("Storage Info", function () {
		it("Should return correct storage info", async function () {
			const { simpleStorage, owner } = await loadFixture(
				deploySimpleStorageFixture
			);

			const info = await simpleStorage.getStorageInfo();
			expect(info[0]).to.equal(42); // currentValue
			expect(info[1]).to.equal(owner.address); // currentOwner
			expect(info[2]).to.be.gt(0); // timestamp should be greater than 0
		});

		it("Should update timestamp on value changes", async function () {
			const { simpleStorage } = await loadFixture(deploySimpleStorageFixture);

			const initialInfo = await simpleStorage.getStorageInfo();
			const initialTimestamp = initialInfo[2];

			// Wait a bit to ensure timestamp difference
			await new Promise((resolve) => setTimeout(resolve, 1000));

			await simpleStorage.increment();

			const newInfo = await simpleStorage.getStorageInfo();
			const newTimestamp = newInfo[2];

			expect(newTimestamp).to.be.gt(initialTimestamp);
		});
	});

	describe("Complex Scenarios", function () {
		it("Should handle multiple operations correctly", async function () {
			const { simpleStorage, owner, otherAccount } = await loadFixture(
				deploySimpleStorageFixture
			);

			// Start with 42, increment to 43
			await simpleStorage.connect(otherAccount).increment();
			expect(await simpleStorage.getValue()).to.equal(43);

			// Add 7 to get 50
			await simpleStorage.connect(otherAccount).addValue(7);
			expect(await simpleStorage.getValue()).to.equal(50);

			// Owner sets to 100
			await simpleStorage.connect(owner).setValue(100);
			expect(await simpleStorage.getValue()).to.equal(100);

			// Decrement to 99
			await simpleStorage.connect(otherAccount).decrement();
			expect(await simpleStorage.getValue()).to.equal(99);

			// Reset to 0
			await simpleStorage.connect(owner).reset();
			expect(await simpleStorage.getValue()).to.equal(0);
		});

		it("Should maintain state after ownership transfer", async function () {
			const { simpleStorage, owner, otherAccount } = await loadFixture(
				deploySimpleStorageFixture
			);

			// Set a value as original owner
			await simpleStorage.connect(owner).setValue(123);

			// Transfer ownership
			await simpleStorage
				.connect(owner)
				.transferOwnership(otherAccount.address);

			// Value should remain the same
			expect(await simpleStorage.getValue()).to.equal(123);

			// New owner should be able to modify
			await simpleStorage.connect(otherAccount).setValue(456);
			expect(await simpleStorage.getValue()).to.equal(456);

			// Original owner should not be able to modify
			await expect(
				simpleStorage.connect(owner).setValue(789)
			).to.be.revertedWith("Not the owner");
		});
	});
});
