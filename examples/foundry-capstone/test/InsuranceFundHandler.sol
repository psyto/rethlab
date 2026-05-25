// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.35;

import {Test} from "forge-std/Test.sol";
import {InsuranceFund} from "../src/InsuranceFund.sol";

/// @notice Handler for InsuranceFund invariant testing.
/// Wraps the 3 fund operations, bounds inputs to productive ranges,
/// maintains 5 ghost variables that mirror the conservation-law expectations.
contract InsuranceFundHandler is Test {
    InsuranceFund public fund;
    address public immutable fundOwner;

    // Five ghost variables — the shadow specification of the fund's accounting.
    uint256 public ghostSumDeposits;
    uint256 public ghostSumWithdrawn;
    uint256 public ghostSumAbsorbed;
    uint256 public ghostSumUnabsorbed;        // total of `remaining` returns from absorb
    uint256 public ghostSumLossRequested;     // total of `loss` parameters passed to absorb

    constructor(InsuranceFund _fund, address _owner) {
        fund = _fund;
        fundOwner = _owner;
    }

    /// Wraps fund.deposit(). Bounds input to a reasonable range so the
    /// random uint256 from forge-invariant doesn't blow past uint96.
    /// Updates the deposit ghost in lockstep.
    function wrappedDeposit(uint256 amount) public {
        amount = bound(amount, 1, type(uint96).max);
        fund.deposit(amount);
        ghostSumDeposits += amount;
    }

    /// Wraps fund.withdraw(). Only callable when there's balance to withdraw.
    /// Uses vm.prank to simulate owner authorization (the handler is not the
    /// owner; the owner is a separate constructor-set address).
    function wrappedWithdraw(uint256 amount) public {
        uint256 currentBalance = fund.balance();
        if (currentBalance == 0) return;  // can't withdraw from empty fund
        amount = bound(amount, 1, currentBalance);
        vm.prank(fundOwner);
        fund.withdraw(amount);
        ghostSumWithdrawn += amount;
    }

    /// Wraps fund.absorb(). Tracks both the requested loss and the actual
    /// decomposition (absorbed + remaining). This is the trickiest ghost
    /// update — three counters must move in lockstep.
    function wrappedAbsorb(uint256 loss) public {
        loss = bound(loss, 1, type(uint96).max);
        ghostSumLossRequested += loss;
        (uint256 absorbed, uint256 remaining) = fund.absorb(loss);
        ghostSumAbsorbed += absorbed;
        ghostSumUnabsorbed += remaining;
    }
}
