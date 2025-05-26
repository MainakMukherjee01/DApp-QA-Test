// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleStorage {
    uint256 private value;
    address public owner;
    uint256 public lastUpdated;
    
    event ValueChanged(uint256 indexed oldValue, uint256 indexed newValue, address indexed updatedBy);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }
    
    modifier validValue(uint256 _value) {
        require(_value < 1000000, "Value too large");
        _;
    }
    
    constructor(uint256 _initialValue) validValue(_initialValue) {
        owner = msg.sender;
        value = _initialValue;
        lastUpdated = block.timestamp;
        emit ValueChanged(0, _initialValue, msg.sender);
    }
    
    function setValue(uint256 _value) public onlyOwner validValue(_value) {
        uint256 oldValue = value;
        value = _value;
        lastUpdated = block.timestamp;
        emit ValueChanged(oldValue, _value, msg.sender);
    }
    
    function getValue() public view returns (uint256) {
        return value;
    }
    
    function increment() public validValue(value + 1) {
        uint256 oldValue = value;
        value += 1;
        lastUpdated = block.timestamp;
        emit ValueChanged(oldValue, value, msg.sender);
    }
    
    function decrement() public {
        require(value > 0, "Cannot decrement below zero");
        uint256 oldValue = value;
        value -= 1;
        lastUpdated = block.timestamp;
        emit ValueChanged(oldValue, value, msg.sender);
    }
    
    function addValue(uint256 _amount) public validValue(value + _amount) {
        uint256 oldValue = value;
        value += _amount;
        lastUpdated = block.timestamp;
        emit ValueChanged(oldValue, value, msg.sender);
    }
    
    function getStorageInfo() public view returns (uint256 currentValue, address currentOwner, uint256 timestamp) {
        return (value, owner, lastUpdated);
    }
    
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Invalid address");
        require(newOwner != owner, "Already the owner");
        
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    function reset() public onlyOwner {
        uint256 oldValue = value;
        value = 0;
        lastUpdated = block.timestamp;
        emit ValueChanged(oldValue, 0, msg.sender);
    }
}