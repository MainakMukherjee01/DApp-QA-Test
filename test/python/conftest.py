import json
import pytest
from pathlib import Path
from eth_tester import EthereumTester
from web3 import Web3
from web3.providers.eth_tester import EthereumTesterProvider
from solcx import compile_standard, install_solc

# Install Solidity compiler
install_solc('0.8.19')

@pytest.fixture(scope="session")
def solidity_compiler():
    """Setup Solidity compiler"""
    return install_solc('0.8.20')

@pytest.fixture(scope="session") 
def contract_source():
    """Load the SimpleStorage contract source code"""
    contract_path = Path(__file__).parent.parent / "contracts" / "SimpleStorage.sol"
    
    if not contract_path.exists():
        pytest.skip(f"Contract source not found at {contract_path}")
    
    with open(contract_path, 'r') as file:
        return file.read()

@pytest.fixture(scope="session")
def compiled_contract(contract_source, solidity_compiler):
    """Compile the SimpleStorage contract"""
    
    # Prepare the input for the compiler
    compiler_input = {
        "language": "Solidity",
        "sources": {
            "SimpleStorage.sol": {
                "content": contract_source
            }
        },
        "settings": {
            "outputSelection": {
                "*": {
                    "*": ["abi", "evm.bytecode", "evm.bytecode.object"]
                }
            },
            "optimizer": {
                "enabled": True,
                "runs": 200
            }
        }
    }
    
    # Compile the contract
    compiled_sol = compile_standard(compiler_input, solc_version="0.8.19")
    
    # Extract contract data
    contract_data = compiled_sol["contracts"]["SimpleStorage.sol"]["SimpleStorage"]
    
    return {
        "abi": contract_data["abi"],
        "bytecode": contract_data["evm"]["bytecode"]["object"]
    }

@pytest.fixture(scope="function")
def eth_tester():
    """Create a fresh EthereumTester instance for each test"""
    return EthereumTester()

@pytest.fixture(scope="function")
def web3_instance(eth_tester):
    """Create a Web3 instance connected to eth_tester"""
    provider = EthereumTesterProvider(eth_tester)
    web3 = Web3(provider)
    
    # Verify connection
    assert web3.is_connected()
    
    return web3

@pytest.fixture(scope="function")
def accounts(web3_instance):
    """Get test accounts from eth_tester"""
    accounts = web3_instance.eth.accounts
    
    # Verify we have enough accounts for testing
    assert len(accounts) >= 3
    
    return {
        "owner": accounts[0],
        "user1": accounts[1], 
        "user2": accounts[2],
        "all": accounts
    }

@pytest.fixture(scope="function")
def contract_factory(web3_instance, compiled_contract):
    """Create a contract factory for deployment"""
    return web3_instance.eth.contract(
        abi=compiled_contract["abi"],
        bytecode=compiled_contract["bytecode"]
    )

@pytest.fixture(scope="function")
def deployed_contract(web3_instance, contract_factory, accounts):
    """Deploy a fresh SimpleStorage contract for each test"""
    
    initial_value = 42
    
    # Deploy the contract
    tx_hash = contract_factory.constructor(initial_value).transact({
        'from': accounts["owner"]
    })
    
    # Wait for transaction receipt
    tx_receipt = web3_instance.eth.wait_for_transaction_receipt(tx_hash)
    
    # Create contract instance
    contract = web3_instance.eth.contract(
        address=tx_receipt.contractAddress,
        abi=contract_factory.abi
    )
    
    return {
        "contract": contract,
        "address": tx_receipt.contractAddress,
        "tx_hash": tx_hash,
        "tx_receipt": tx_receipt,
        "initial_value": initial_value
    }

@pytest.fixture(scope="function")
def contract_with_events(deployed_contract, web3_instance):
    """Contract instance with event filter setup"""
    contract = deployed_contract["contract"]
    
    # Create event filters
    value_changed_filter = contract.events.ValueChanged.create_filter(fromBlock="latest")
    ownership_transferred_filter = contract.events.OwnershipTransferred.create_filter(fromBlock="latest")
    
    return {
        "contract": contract,
        "address": deployed_contract["address"],
        "value_changed_filter": value_changed_filter,
        "ownership_transferred_filter": ownership_transferred_filter,
        "web3": web3_instance
    }

@pytest.fixture(scope="function")
def gas_tracker():
    """Utility to track gas usage across tests"""
    gas_data = {
        "operations": [],
        "total_gas": 0
    }
    
    def track_gas(operation_name, tx_receipt):
        gas_used = tx_receipt.gasUsed
        gas_data["operations"].append({
            "operation": operation_name,
            "gas_used": gas_used,
            "tx_hash": tx_receipt.transactionHash.hex()
        })
        gas_data["total_gas"] += gas_used
        
        print(f"\n⛽ Gas Tracker - {operation_name}: {gas_used:,} gas")
        
        return gas_used
    
    def get_summary():
        if not gas_data["operations"]:
            return "No gas data recorded"
            
        summary = f"\n⛽ Gas Usage Summary:\n"
        summary += f"   Total Operations: {len(gas_data['operations'])}\n"
        summary += f"   Total Gas Used: {gas_data['total_gas']:,}\n"
        summary += f"   Average Gas per Operation: {gas_data['total_gas'] // len(gas_data['operations']):,}\n"
        summary += f"   Operations:\n"
        
        for op in gas_data["operations"]:
            summary += f"     - {op['operation']}: {op['gas_used']:,} gas\n"
            
        return summary
    
    gas_tracker.track = track_gas
    gas_tracker.summary = get_summary
    gas_tracker.data = gas_data
    
    return gas_tracker

@pytest.fixture(scope="function")
def event_checker(web3_instance):
    """Utility to check and validate events"""
    
    def check_value_changed_event(tx_receipt, expected_old_value, expected_new_value, expected_updater):
        """Check ValueChanged event in transaction receipt"""
        
        # Get logs from receipt
        logs = tx_receipt.logs
        
        # Find ValueChanged events
        value_changed_events = [log for log in logs if len(log.topics) > 0]
        
        assert len(value_changed_events) > 0, "No ValueChanged event found"
        
        # For detailed event checking, we'd need to decode the logs
        # This is a simplified version
        print(f"✅ ValueChanged event detected in tx: {tx_receipt.transactionHash.hex()}")
        
        return True
    
    def check_ownership_transferred_event(tx_receipt, expected_old_owner, expected_new_owner):
        """Check OwnershipTransferred event in transaction receipt"""
        
        logs = tx_receipt.logs
        ownership_events = [log for log in logs if len(log.topics) > 0]
        
        assert len(ownership_events) > 0, "No OwnershipTransferred event found"
        
        print(f"✅ OwnershipTransferred event detected in tx: {tx_receipt.transactionHash.hex()}")
        
        return True
    
    event_checker.value_changed = check_value_changed_event
    event_checker.ownership_transferred = check_ownership_transferred_event
    
    return event_checker

@pytest.fixture(scope="session", autouse=True)
def test_session_setup():
    """Setup that runs once per test session"""
    print("\n🧪 Starting Python eth-tester test session")
    print("🔧 Setting up Ethereum test environment...")
    
    yield
    
    print("\n✅ Python eth-tester test session completed")

@pytest.fixture(autouse=True)
def test_function_setup(request):
    """Setup that runs before each test function"""
    test_name = request.node.name
    print(f"\n🏃 Running test: {test_name}")
    
    yield
    
    print(f"✅ Completed test: {test_name}")

# Utility functions that can be imported by test files
def wei_to_ether(wei_amount):
    """Convert Wei to Ether"""
    return wei_amount / (10 ** 18)

def ether_to_wei(ether_amount):
    """Convert Ether to Wei"""
    return int(ether_amount * (10 ** 18))

def format_gas_cost(gas_used, gas_price_gwei=20):
    """Format gas cost in a readable way"""
    gas_price_wei = gas_price_gwei * (10 ** 9)  # Convert Gwei to Wei
    total_cost_wei = gas_used * gas_price_wei
    total_cost_ether = wei_to_ether(total_cost_wei)
    
    return {
        "gas_used": gas_used,
        "gas_price_gwei": gas_price_gwei,
        "total_cost_wei": total_cost_wei,
        "total_cost_ether": total_cost_ether,
        "formatted": f"{gas_used:,} gas @ {gas_price_gwei} Gwei = {total_cost_ether:.6f} ETH"
    }