import pytest
from web3.exceptions import ContractLogicError
import time

class TestSimpleStorageBasicOperations:
    """Test basic contract operations"""
    
    def test_initial_state(self, deployed_contract, accounts):
        """Test contract initial state after deployment"""
        contract = deployed_contract["contract"]
        
        # Check initial value
        assert contract.functions.getValue().call() == 42
        
        # Check owner
        assert contract.functions.owner().call() == accounts["owner"]
        
        # Check lastUpdated is set
        storage_info = contract.functions.getStorageInfo().call()
        assert storage_info[0] == 42  # value
        assert storage_info[1] == accounts["owner"]  # owner
        assert storage_info[2] > 0  # lastUpdated timestamp
        
        print(f"✅ Initial state verified - Value: {storage_info[0]}, Owner: {storage_info[1]}")

    def test_get_value(self, deployed_contract):
        """Test getValue function"""
        contract = deployed_contract["contract"]
        
        value = contract.functions.getValue().call()
        assert value == 42
        
        print(f"✅ getValue() returned: {value}")

    def test_increment(self, deployed_contract, accounts, gas_tracker):
        """Test increment function"""
        contract = deployed_contract["contract"]
        web3 = contract.w3
        
        initial_value = contract.functions.getValue().call()
        
        # Increment the value
        tx_hash = contract.functions.increment().transact({'from': accounts["user1"]})
        tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        
        # Track gas usage
        gas_tracker.track("increment", tx_receipt)
        
        # Verify new value
        new_value = contract.functions.getValue().call()
        assert new_value == initial_value + 1
        
        print(f"✅ Increment successful: {initial_value} → {new_value}")

    def test_decrement(self, deployed_contract, accounts, gas_tracker):
        """Test decrement function"""
        contract = deployed_contract["contract"]
        web3 = contract.w3
        
        initial_value = contract.functions.getValue().call()
        
        # Decrement the value
        tx_hash = contract.functions.decrement().transact({'from': accounts["user1"]})
        tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        
        gas_tracker.track("decrement", tx_receipt)
        
        # Verify new value
        new_value = contract.functions.getValue().call()
        assert new_value == initial_value - 1
        
        print(f"✅ Decrement successful: {initial_value} → {new_value}")

    def test_add_value(self, deployed_contract, accounts, gas_tracker):
        """Test addValue function"""
        contract = deployed_contract["contract"]
        web3 = contract.w3
        
        initial_value = contract.functions.getValue().call()
        add_amount = 25
        
        # Add value
        tx_hash = contract.functions.addValue(add_amount).transact({'from': accounts["user1"]})
        tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        
        gas_tracker.track("addValue", tx_receipt)
        
        # Verify new value
        new_value = contract.functions.getValue().call()
        assert new_value == initial_value + add_amount
        
        print(f"✅ AddValue successful: {initial_value} + {add_amount} = {new_value}")

class TestSimpleStorageOwnerOperations:
    """Test owner-only operations"""
    
    def test_set_value_by_owner(self, deployed_contract, accounts, gas_tracker):
        """Test setValue function by owner"""
        contract = deployed_contract["contract"]
        web3 = contract.w3
        
        new_value = 100
        
        # Set value as owner
        tx_hash = contract.functions.setValue(new_value).transact({'from': accounts["owner"]})
        tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        
        gas_tracker.track("setValue_owner", tx_receipt)
        
        # Verify new value
        stored_value = contract.functions.getValue().call()
        assert stored_value == new_value
        
        print(f"✅ setValue by owner successful: {new_value}")

    def test_set_value_by_non_owner_fails(self, deployed_contract, accounts):
        """Test setValue function fails for non-owner"""
        contract = deployed_contract["contract"]
        
        new_value = 200
        
        # Try to set value as non-owner - should fail
        with pytest.raises(ContractLogicError) as exc_info:
            contract.functions.setValue(new_value).transact({'from': accounts["user1"]})
        
        assert "Not the owner" in str(exc_info.value)
        print("✅ setValue correctly rejected for non-owner")

    def test_reset_by_owner(self, deployed_contract, accounts, gas_tracker):
        """Test reset function by owner"""
        contract = deployed_contract["contract"]
        web3 = contract.w3
        
        # First set to non-zero value
        contract.functions.setValue(123).transact({'from': accounts["owner"]})
        assert contract.functions.getValue().call() == 123
        
        # Reset to zero
        tx_hash = contract.functions.reset().transact({'from': accounts["owner"]})
        tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        
        gas_tracker.track("reset", tx_receipt)
        
        # Verify reset
        assert contract.functions.getValue().call() == 0
        
        print("✅ Reset successful: value set to 0")

    def test_reset_by_non_owner_fails(self, deployed_contract, accounts):
        """Test reset function fails for non-owner"""
        contract = deployed_contract["contract"]
        
        # Try to reset as non-owner - should fail
        with pytest.raises(ContractLogicError) as exc_info:
            contract.functions.reset().transact({'from': accounts["user1"]})
        
        assert "Not the owner" in str(exc_info.value)
        print("✅ Reset correctly rejected for non-owner")

class TestSimpleStorageOwnership:
    """Test ownership transfer functionality"""

    def test_transfer_ownership(self, deployed_contract, accounts, gas_tracker):
        contract = deployed_contract["contract"]
        web3 = contract.w3
        new_owner = accounts["user1"]
        tx_hash = contract.functions.transferOwnership(new_owner).transact({'from': accounts["owner"]})
        tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        gas_tracker.track("transferOwnership", tx_receipt)
        assert contract.functions.owner().call() == new_owner

    def test_emit_ownership_transferred_event(self, deployed_contract, accounts, event_checker):
        contract = deployed_contract["contract"]
        web3 = contract.w3
        new_owner = accounts["user1"]
        tx_hash = contract.functions.transferOwnership(new_owner).transact({'from': accounts["owner"]})
        tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        assert event_checker.ownership_transferred(
            tx_receipt, accounts["owner"], new_owner
        )

    def test_non_owner_cannot_transfer_ownership(self, deployed_contract, accounts):
        contract = deployed_contract["contract"]
        with pytest.raises(ContractLogicError, match="Not the owner"):
            contract.functions.transferOwnership(accounts["user2"]).transact({'from': accounts["user1"]})

    def test_cannot_transfer_to_zero_address(self, deployed_contract, accounts):
        contract = deployed_contract["contract"]
        with pytest.raises(ContractLogicError, match="Invalid address"):
            contract.functions.transferOwnership("0x0000000000000000000000000000000000000000").transact({'from': accounts["owner"]})

    def test_cannot_transfer_to_same_owner(self, deployed_contract, accounts):
        contract = deployed_contract["contract"]
        with pytest.raises(ContractLogicError, match="Already the owner"):
            contract.functions.transferOwnership(accounts["owner"]).transact({'from': accounts["owner"]})

class TestSimpleStorageValueValidation:
    """Test value validation edge cases"""

    def test_rejects_too_large_value(self, deployed_contract, accounts):
        contract = deployed_contract["contract"]
        with pytest.raises(ContractLogicError, match="Value too large"):
            contract.functions.setValue(1_000_000).transact({'from': accounts["owner"]})

    def test_rejects_increment_when_too_large(self, deployed_contract, accounts):
        contract = deployed_contract["contract"]
        # Set value to max-1
        contract.functions.setValue(999_999).transact({'from': accounts["owner"]})
        with pytest.raises(ContractLogicError, match="Value too large"):
            contract.functions.increment().transact({'from': accounts["user1"]})

    def test_rejects_add_value_when_too_large(self, deployed_contract, accounts):
        contract = deployed_contract["contract"]
        contract.functions.setValue(999_990).transact({'from': accounts["owner"]})
        with pytest.raises(ContractLogicError, match="Value too large"):
            contract.functions.addValue(20).transact({'from': accounts["user1"]})

class TestSimpleStorageEvents:
    """Test event emission"""

    def test_emit_value_changed_on_set_value(self, deployed_contract, accounts, event_checker):
        contract = deployed_contract["contract"]
        web3 = contract.w3
        old_value = contract.functions.getValue().call()
        new_value = 55
        tx_hash = contract.functions.setValue(new_value).transact({'from': accounts["owner"]})
        tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        assert event_checker.value_changed(tx_receipt, old_value, new_value, accounts["owner"])

    def test_emit_value_changed_on_increment(self, deployed_contract, accounts, event_checker):
        contract = deployed_contract["contract"]
        web3 = contract.w3
        old_value = contract.functions.getValue().call()
        tx_hash = contract.functions.increment().transact({'from': accounts["user1"]})
        tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        assert event_checker.value_changed(tx_receipt, old_value, old_value + 1, accounts["user1"])

    def test_emit_value_changed_on_decrement(self, deployed_contract, accounts, event_checker):
        contract = deployed_contract["contract"]
        web3 = contract.w3
        old_value = contract.functions.getValue().call()
        tx_hash = contract.functions.decrement().transact({'from': accounts["user1"]})
        tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        assert event_checker.value_changed(tx_receipt, old_value, old_value - 1, accounts["user1"])

    def test_emit_value_changed_on_add_value(self, deployed_contract, accounts, event_checker):
        contract = deployed_contract["contract"]
        web3 = contract.w3
        old_value = contract.functions.getValue().call()
        add_amount = 7
        tx_hash = contract.functions.addValue(add_amount).transact({'from': accounts["user1"]})
        tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        assert event_checker.value_changed(tx_receipt, old_value, old_value + add_amount, accounts["user1"])

    def test_emit_value_changed_on_reset(self, deployed_contract, accounts, event_checker):
        contract = deployed_contract["contract"]
        web3 = contract.w3
        old_value = contract.functions.getValue().call()
        tx_hash = contract.functions.reset().transact({'from': accounts["owner"]})
        tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        assert event_checker.value_changed(tx_receipt, old_value, 0, accounts["owner"])

class TestSimpleStorageStorageInfo:
    """Test getStorageInfo and timestamp updates"""

    def test_storage_info_correct(self, deployed_contract, accounts):
        contract = deployed_contract["contract"]
        info = contract.functions.getStorageInfo().call()
        assert info[0] == 42
        assert info[1] == accounts["owner"]
        assert info[2] > 0

    def test_timestamp_updates_on_value_change(self, deployed_contract, accounts):
        contract = deployed_contract["contract"]
        old_info = contract.functions.getStorageInfo().call()
        contract.functions.increment().transact({'from': accounts["user1"]})
        new_info = contract.functions.getStorageInfo().call()
        assert new_info[2] > old_info[2]

class TestSimpleStorageComplexScenarios:
    """Test complex and stateful scenarios"""

    def test_multiple_operations(self, deployed_contract, accounts):
        contract = deployed_contract["contract"]
        # increment, add, decrement, set, reset
        contract.functions.increment().transact({'from': accounts["user1"]})
        contract.functions.addValue(5).transact({'from': accounts["user2"]})
        contract.functions.decrement().transact({'from': accounts["user1"]})
        contract.functions.setValue(123).transact({'from': accounts["owner"]})
        contract.functions.reset().transact({'from': accounts["owner"]})
        assert contract.functions.getValue().call() == 0

    def test_state_after_ownership_transfer(self, deployed_contract, accounts):
        contract = deployed_contract["contract"]
        # Transfer ownership to user1
        contract.functions.transferOwnership(accounts["user1"]).transact({'from': accounts["owner"]})
        # Now user1 can set value, owner cannot
        contract.functions.setValue(77).transact({'from': accounts["user1"]})
        assert contract.functions.getValue().call() == 77
        # Old owner should not be able to set value
        from web3.exceptions import ContractLogicError
        try:
            contract.functions.setValue(88).transact({'from': accounts["owner"]})
            assert False, "Old owner should not be able to set value"
        except ContractLogicError as e:
            assert "Not the owner" in str(e)