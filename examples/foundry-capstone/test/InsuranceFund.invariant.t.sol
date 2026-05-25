// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.35;

import {Test} from "forge-std/Test.sol";
import {InsuranceFund} from "../src/InsuranceFund.sol";
import {InsuranceFundHandler} from "./InsuranceFundHandler.sol";

/// @notice The 4 conservation invariants ported from openhl-liquidation L13.
/// Same theorem, two languages, both mechanically proven.
contract InsuranceFundInvariantTest is Test {
    InsuranceFund public fund;
    InsuranceFundHandler public handler;
    address constant OWNER = address(0xBABE);

    function setUp() public {
        fund = new InsuranceFund(OWNER);
        handler = new InsuranceFundHandler(fund, OWNER);
        targetContract(address(handler));
    }

    /// Invariant 1: Conservation of capital.
    /// fund.balance() == ghostSumDeposits - ghostSumWithdrawn - ghostSumAbsorbed
    /// This is the load-bearing conservation law — every wei that entered as a
    /// deposit either still sits in the fund, or left via withdraw, or was
    /// consumed by absorb. No wei appears or disappears unaccounted-for.
    function invariant_Conservation() public view {
        assertEq(
            fund.balance(),
            handler.ghostSumDeposits() - handler.ghostSumWithdrawn() - handler.ghostSumAbsorbed()
        );
    }

    /// Invariant 2: Deposit-side accounting consistency.
    /// The fund's view of total deposits matches the handler's accounting.
    /// Catches: double-counting in deposit, ghost update missing or wrong scale.
    function invariant_DepositAccounting() public view {
        assertEq(fund.totalDeposited(), handler.ghostSumDeposits());
    }

    /// Invariant 3: Withdraw-side accounting consistency.
    /// The fund's view of total withdrawals matches the handler's accounting.
    /// Catches: similar bugs on the withdraw path.
    function invariant_WithdrawAccounting() public view {
        assertEq(fund.totalWithdrawn(), handler.ghostSumWithdrawn());
    }

    /// Invariant 4: Absorb-decomposition equivalence.
    /// For every absorb(loss): absorbed + remaining == loss.
    /// Aggregated: ghostSumAbsorbed + ghostSumUnabsorbed == ghostSumLossRequested.
    /// Catches: the fund's absorb math being wrong (e.g., remaining = loss - balance
    /// instead of loss - absorbed), or the handler forgetting to track unabsorbed.
    function invariant_AbsorbDecomposition() public view {
        assertEq(
            handler.ghostSumAbsorbed() + handler.ghostSumUnabsorbed(),
            handler.ghostSumLossRequested()
        );
    }
}
