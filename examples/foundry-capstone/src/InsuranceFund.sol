// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.35;

/// @notice Solidity port of openhl-liquidation Stage 10b's InsuranceFund.
/// Faithful field-by-field translation; same operations, same revert
/// conditions, same absorb-decomposition shape as the Rust source.
contract InsuranceFund {
    uint256 public balance;
    uint256 public totalDeposited;
    uint256 public totalWithdrawn;
    uint256 public totalAbsorbed;
    address public immutable owner;

    error ZeroAmount();
    error NotOwner();
    error InsufficientBalance(uint256 requested, uint256 available);

    constructor(address _owner) {
        owner = _owner;
    }

    /// Mirrors Rust's `fn deposit(&mut self, amount: u128)`.
    /// Anyone can deposit; only zero is rejected.
    function deposit(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        balance += amount;
        totalDeposited += amount;
    }

    /// Mirrors Rust's `fn withdraw(&mut self, amount: u128) -> Result<(), Error>`.
    /// Owner-only. Reverts on zero, non-owner, or insufficient balance.
    function withdraw(uint256 amount) external {
        if (msg.sender != owner) revert NotOwner();
        if (amount == 0) revert ZeroAmount();
        if (amount > balance) revert InsufficientBalance(amount, balance);
        balance -= amount;
        totalWithdrawn += amount;
    }

    /// Mirrors Rust's `fn absorb(&mut self, loss: u128) -> (u128, u128)`.
    /// Absorbs as much loss as the balance allows; returns (absorbed, remaining)
    /// where absorbed + remaining == loss. Remaining is what the fund
    /// couldn't cover — in the real system, this flows to ADL.
    function absorb(uint256 loss) external returns (uint256 absorbed, uint256 remaining) {
        if (loss == 0) revert ZeroAmount();
        absorbed = loss > balance ? balance : loss;
        remaining = loss - absorbed;
        balance -= absorbed;
        totalAbsorbed += absorbed;
    }
}
