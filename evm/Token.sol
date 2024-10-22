// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Token {
    // Token details
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;

    // Mapping of address to token balance
    mapping(address => uint256) private balances;

    // Mapping of address to mapping of spender to allowance amount
    mapping(address => mapping(address => uint256)) private allowances;

    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // Constructor to initialize token details and mint initial supply
    constructor(string memory _name, string memory _symbol, uint8 _decimals, uint256 _initialSupply) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _initialSupply * (10**uint256(_decimals));
        balances[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    // Function to get the balance of an account
    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
    }

    // Function to transfer tokens
    function transfer(address recipient, uint256 amount) public returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[recipient] += amount;
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }

    // Function to check the amount of tokens that an owner allowed to a spender
    function allowance(address owner, address spender) public view returns (uint256) {
        return allowances[owner][spender];
    }

    // Function to approve a spender to spend a specific amount of tokens
    function approve(address spender, uint256 amount) public returns (bool) {
        allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    // Function to transfer tokens from one address to another
    function transferFrom(address sender, address recipient, uint256 amount) public returns (bool) {
        require(balances[sender] >= amount, "Insufficient balance");
        require(allowances[sender][msg.sender] >= amount, "Insufficient allowance");
        balances[sender] -= amount;
        balances[recipient] += amount;
        allowances[sender][msg.sender] -= amount;
        emit Transfer(sender, recipient, amount);
        return true;
    }
}
