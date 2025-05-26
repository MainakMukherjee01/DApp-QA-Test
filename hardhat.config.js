require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
	solidity: {
		version: "0.8.20",
		settings: {
			optimizer: {
				enabled: true,
				runs: 200,
			},
		},
	},
	networks: {
		hardhat: {
			chainId: 1337,
			accounts: {
				count: 10,
				accountsBalance: "10000000000000000000000", // 10,000 ETH
			},
		},
		localhost: {
			url: "http://127.0.0.1:8545",
			chainId: 1337,
		},
	},
	gasReporter: {
		enabled: process.env.REPORT_GAS !== undefined,
		currency: "USD",
		gasPrice: 20,
		coinmarketcap: process.env.COINMARKETCAP_API_KEY,
	},
	mocha: {
		timeout: 40000,
	},
	paths: {
		sources: "./contracts",
		tests: "./test/hardhat",
		cache: "./cache",
		artifacts: "./artifacts",
	},
	contractSizer: {
		alphaSort: true,
		disambiguatePaths: false,
		runOnCompile: true,
		strict: true,
		only: [":ERC20$"],
	},
};
