import pytest
from web3.exceptions import ContractLogicError

class TestSimpleStorageDeployment:
    """Test contract deployment and constructor logic"""

    def test_deployment_sets_owner_and_value(self, deployed_contract, accounts):
        contract = deployed_contract["contract"]
        assert contract.functions.owner().call() == accounts["owner"]
        assert contract.functions.getValue().call() == 42

    def test_deployment_emits_value_changed_event(self, deployed_contract, event_checker):
        tx_receipt = deployed_contract["tx_receipt"]
        # Should emit ValueChanged(0, 42, owner)
        assert event_checker.value_changed(
            tx_receipt, 0, 42, deployed_contract["contract"].functions.owner().call()
        )

    def test_deployment_sets_last_updated(self, deployed_contract):
        contract = deployed_contract["contract"]
        storage_info = contract.functions.getStorageInfo().call()
        assert storage_info[2] > 0  # lastUpdated timestamp

    def test_deployment_rejects_invalid_initial_value(self, contract_factory, accounts, web3_instance):
        # Value >= 1,000,000 should revert
        with pytest.raises(ContractLogicError, match="Value too large"):
            tx_hash = contract_factory.constructor(1_000_000).transact({'from': accounts["owner"]})
            web3_instance.eth.wait_for_transaction_receipt(tx_hash)