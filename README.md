Steps to run:
    In root folder: (Sequentially)
        
        Step 1: Terminal 1: 
            1. `npm i` - Install all required Dependencies
            2. `npm run node:local` - Clean, Compile, Test, Check Coverage and Launch local Blockchain.
        
        Step 2: Terminal 2:
            1. `npm run start` - Deploy the Smart Contract
            2. Open `http://localhost:8080` in browser and explore
            3. Click on Connect Button.

    Prerequisites:
        1. Should have metamask wallet extension installed, account created.
        2. Set up localhost test network in metamask. [Left side to account name area]
            Config: 
                Network name
                    Localhost

                Default RPC URL
                    127.0.0.1:8545

                Chain ID
                    1337

                Currency symbol
                    ETH

        3. From connect to newly created localhost network instance
        4. After local blockchain node is running, you will see multiple accounts and private keys provided by hardhat for testing.
        5. Add one of these accounts 
            STEPS: 
                i. Click on Account name on top of extension
                ii. Select `Add account or hardware wallet` button
                iii. Choose option `Private Key`
                iv. Copy and paste any of the hardhat provided ETH filled dummy accounts private key from terminal
        
        Wallet is now connected to test network with dummy account.




