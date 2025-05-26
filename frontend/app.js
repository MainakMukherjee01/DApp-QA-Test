// Dynamically load contract address from deployment.json
let contractAddress;
(async () => {
	try {
		const res = await fetch("deployment.json");
		const deployment = await res.json();
		contractAddress = deployment.contractAddress;
	} catch (e) {
		alert("Could not load contract address from deployment.json");
		contractAddress = "";
	}
})();

// Paste your ABI here (update as needed)
const contractABI = [
	{
		inputs: [
			{ internalType: "uint256", name: "_initialValue", type: "uint256" },
		],
		stateMutability: "nonpayable",
		type: "constructor",
	},
	{
		inputs: [{ internalType: "uint256", name: "_value", type: "uint256" }],
		name: "setValue",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		inputs: [],
		name: "getValue",
		outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [],
		name: "increment",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		inputs: [],
		name: "decrement",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		inputs: [{ internalType: "uint256", name: "_amount", type: "uint256" }],
		name: "addValue",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		inputs: [],
		name: "getStorageInfo",
		outputs: [
			{ internalType: "uint256", name: "currentValue", type: "uint256" },
			{ internalType: "address", name: "currentOwner", type: "address" },
			{ internalType: "uint256", name: "timestamp", type: "uint256" },
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
		name: "transferOwnership",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		inputs: [],
		name: "reset",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		inputs: [],
		name: "owner",
		outputs: [{ internalType: "address", name: "", type: "address" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [],
		name: "lastUpdated",
		outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "uint256",
				name: "oldValue",
				type: "uint256",
			},
			{
				indexed: true,
				internalType: "uint256",
				name: "newValue",
				type: "uint256",
			},
			{
				indexed: true,
				internalType: "address",
				name: "updatedBy",
				type: "address",
			},
		],
		name: "ValueChanged",
		type: "event",
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "address",
				name: "previousOwner",
				type: "address",
			},
			{
				indexed: true,
				internalType: "address",
				name: "newOwner",
				type: "address",
			},
		],
		name: "OwnershipTransferred",
		type: "event",
	},
];

let provider;
let signer;
let contract;

const connectBtn = document.getElementById("connectBtn");
const walletAddress = document.getElementById("walletAddress");
const setBtn = document.getElementById("setBtn");
const getBtn = document.getElementById("getBtn");
const inputValue = document.getElementById("inputValue");
const storedValue = document.getElementById("storedValue");
const incrementBtn = document.getElementById("incrementBtn");
const decrementBtn = document.getElementById("decrementBtn");
const addValueBtn = document.getElementById("addValueBtn");
const addValueInput = document.getElementById("addValueInput");
const resetBtn = document.getElementById("resetBtn");
const transferOwnerBtn = document.getElementById("transferOwnerBtn");
const newOwnerInput = document.getElementById("newOwnerInput");
const storageInfoDiv = document.getElementById("storageInfo");

connectBtn.onclick = async () => {
	if (typeof window.ethereum !== "undefined") {
		await window.ethereum.request({ method: "eth_requestAccounts" });
		provider = new ethers.providers.Web3Provider(window.ethereum);
		signer = provider.getSigner();
		const address = await signer.getAddress();
		walletAddress.innerText = `Connected: ${address}`;
		contract = new ethers.Contract(contractAddress, contractABI, signer);
		await updateStorageInfo();
	} else {
		alert("MetaMask is not installed");
	}
};

setBtn.onclick = async () => {
	if (!contract) return alert("Connect wallet first");
	const value = inputValue.value;
	if (value === "") return alert("Please enter a number");
	try {
		const tx = await contract.setValue(value);
		await tx.wait();
		alert("Value set successfully!");
		await updateStorageInfo();
	} catch (err) {
		console.error(err);
		alert("Transaction failed: " + (err.reason || err.message));
	}
};

getBtn.onclick = async () => {
	if (!contract) return alert("Connect wallet first");
	try {
		const value = await contract.getValue();
		storedValue.innerText = `Stored Value: ${value}`;
	} catch (err) {
		console.error(err);
		alert("Failed to fetch stored value");
	}
};

incrementBtn.onclick = async () => {
	if (!contract) return alert("Connect wallet first");
	try {
		const tx = await contract.increment();
		await tx.wait();
		await updateStorageInfo();
	} catch (err) {
		console.error(err);
		alert("Increment failed: " + (err.reason || err.message));
	}
};

decrementBtn.onclick = async () => {
	if (!contract) return alert("Connect wallet first");
	try {
		const tx = await contract.decrement();
		await tx.wait();
		await updateStorageInfo();
	} catch (err) {
		console.error(err);
		alert("Decrement failed: " + (err.reason || err.message));
	}
};

addValueBtn.onclick = async () => {
	if (!contract) return alert("Connect wallet first");
	const addVal = addValueInput.value;
	if (addVal === "") return alert("Enter value to add");
	try {
		const tx = await contract.addValue(addVal);
		await tx.wait();
		await updateStorageInfo();
	} catch (err) {
		console.error(err);
		alert("Add value failed: " + (err.reason || err.message));
	}
};

resetBtn.onclick = async () => {
	if (!contract) return alert("Connect wallet first");
	try {
		const tx = await contract.reset();
		await tx.wait();
		await updateStorageInfo();
	} catch (err) {
		console.error(err);
		alert("Reset failed: " + (err.reason || err.message));
	}
};

transferOwnerBtn.onclick = async () => {
	if (!contract) return alert("Connect wallet first");
	const newOwner = newOwnerInput.value;
	if (!newOwner) return alert("Enter new owner address");
	try {
		const tx = await contract.transferOwnership(newOwner);
		await tx.wait();
		await updateStorageInfo();
		alert("Ownership transferred!");
	} catch (err) {
		console.error(err);
		alert("Transfer ownership failed: " + (err.reason || err.message));
	}
};

async function updateStorageInfo() {
	if (!contract) return;
	try {
		const [value, owner, timestamp] = await contract.getStorageInfo();
		storageInfoDiv.innerHTML = `
			<strong>Value:</strong> ${value}<br>
			<strong>Owner:</strong> ${owner}<br>
			<strong>Last Updated:</strong> ${new Date(
				Number(timestamp) * 1000
			).toLocaleString()}
		`;
		storedValue.innerText = `Stored Value: ${value}`;
	} catch (err) {
		console.error(err);
	}
}
