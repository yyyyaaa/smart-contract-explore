// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Counter {
    // State variable to store the count
    uint256 private count;

    // Event to emit when the count changes
    event CountChanged(uint256 newCount);

    // Constructor to initialize the count
    constructor(uint256 initialCount) {
        count = initialCount;
    }

    // Function to increment the count
    function increment(uint256 amount) public {
        count += amount;
        emit CountChanged(count);
    }

    // Function to decrement the count
    function decrement(uint256 amount) public {
        require(count >= amount, "Count cannot be negative");
        count -= amount;
        emit CountChanged(count);
    }

    // Function to get the current count
    function getCount() public view returns (uint256) {
        return count;
    }
}
